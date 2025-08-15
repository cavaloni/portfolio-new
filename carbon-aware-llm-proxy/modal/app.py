import os
import json
import time
import uuid
from pathlib import Path
from typing import Any, AsyncGenerator, Dict, List
import asyncio

import modal
from fastapi import FastAPI, Request
from fastapi.responses import JSONResponse, StreamingResponse

"""
Heavy dependencies (vLLM, transformers) are imported at runtime inside the
FastAPI startup event to avoid local import errors during `modal deploy`.
"""


# Ensure required dependencies are present in the Modal image via requirements.txt
requirements_path = str(Path(__file__).parent / "requirements.txt")
image = (
    modal.Image.debian_slim()
    .pip_install_from_requirements(requirements_path)
    .env({
        # Speed up HF downloads when available
        "HF_HUB_ENABLE_HF_TRANSFER": "1",
    })
)

# Caching volumes for HF weights and vLLM artifacts
HF_CACHE_DIR = "/root/.cache/huggingface"
VLLM_CACHE_DIR = "/root/.cache/vllm"
hf_cache_vol = modal.Volume.from_name("huggingface-cache", create_if_missing=True)
vllm_cache_vol = modal.Volume.from_name("vllm-cache", create_if_missing=True)

# Model/config defaults
# Default to a widely available public instruct model. Override via DEFAULT_MODEL_ID env.
DEFAULT_MODEL_ID = os.environ.get("DEFAULT_MODEL_ID", "Qwen/Qwen2.5-7B-Instruct")
DEFAULT_TEMPERATURE = float(os.environ.get("DEFAULT_TEMPERATURE", "0.7"))
DEFAULT_TOP_P = float(os.environ.get("DEFAULT_TOP_P", "0.9"))
DEFAULT_MAX_TOKENS = int(os.environ.get("DEFAULT_MAX_TOKENS", "512"))

fastapi_app = FastAPI()
app = modal.App("carbon-aware-modal-app")


# Global LLM/tokenizer handles initialized on startup
_llm: Any = None
_tokenizer: Any = None
_configured_model_id: str = DEFAULT_MODEL_ID
_init_error: str | None = None


@fastapi_app.on_event("startup")
async def _startup() -> None:
    global _llm, _tokenizer, _configured_model_id, _init_error

    # Respect HF token if provided
    hf_token = os.environ.get("HUGGING_FACE_HUB_TOKEN")
    if hf_token:
        os.environ["HF_TOKEN"] = hf_token

    os.environ.setdefault("HF_HOME", HF_CACHE_DIR)

    # Import heavy deps at runtime inside the container
    from transformers import AutoTokenizer  # type: ignore
    from vllm import LLM  # type: ignore

    try:
        # Initialize tokenizer for chat templating and token counting
        _tokenizer = AutoTokenizer.from_pretrained(
            _configured_model_id,
            use_fast=True,
            token=hf_token,
            trust_remote_code=True,
        )

        # Create vLLM LLM with async support
        _llm = LLM(
            model=_configured_model_id,
            tokenizer=_configured_model_id,
            download_dir=HF_CACHE_DIR,
            tensor_parallel_size=int(os.environ.get("TENSOR_PARALLEL_SIZE", "1")),
            gpu_memory_utilization=float(os.environ.get("GPU_MEMORY_UTILIZATION", "0.90")),
            # Disable torch.compile for faster cold starts; set to 0 later for max throughput
            enforce_eager=bool(int(os.environ.get("VLLM_ENFORCE_EAGER", "1"))),
            trust_remote_code=True,
            enable_prefix_caching=True,  # Better for streaming
        )
        _init_error = None
    except Exception as e:
        _llm = None
        _tokenizer = None
        _init_error = f"startup_failed: {type(e).__name__}: {e}"


def _apply_chat_template(messages: List[Dict[str, Any]]) -> str:
    # Use tokenizer-provided chat template if available; fall back to simple concatenation
    global _tokenizer
    try:
        return _tokenizer.apply_chat_template(
            messages,
            tokenize=False,
            add_generation_prompt=True,
        )
    except Exception:
        # Basic fallback formatting
        parts: List[str] = []
        for m in messages:
            role = m.get("role", "user")
            content = m.get("content", "")
            if role == "system":
                parts.append(f"[SYSTEM]\n{content}\n")
            elif role == "user":
                parts.append(f"User: {content}\n")
            elif role == "assistant":
                parts.append(f"Assistant: {content}\n")
        parts.append("Assistant:")
        return "\n".join(parts)


def _build_sampling_params(body: Dict[str, Any]):
    from vllm import SamplingParams  # type: ignore
    temperature = body.get("temperature", DEFAULT_TEMPERATURE)
    top_p = body.get("top_p", DEFAULT_TOP_P)
    max_tokens = body.get("max_tokens", DEFAULT_MAX_TOKENS)
    stop = body.get("stop") or None
    repetition_penalty = body.get("repetition_penalty", 1.0)

    return SamplingParams(
        temperature=temperature,
        top_p=top_p,
        max_tokens=max_tokens,
        stop=stop,
        repetition_penalty=repetition_penalty,
    )


def _stream_chat_sse(
    request_id: str,
    model_id: str,
    prompt: str,
    sampling_params: Any,
):
    global _llm
    assert _llm is not None

    created = int(time.time())

    # Initial role chunk (OpenAI-compatible)
    first_event = {
        "id": request_id,
        "object": "chat.completion.chunk",
        "created": created,
        "model": model_id,
        "choices": [
            {"index": 0, "delta": {"role": "assistant"}, "finish_reason": None}
        ],
    }
    yield f"data: {json.dumps(first_event)}\n\n".encode("utf-8")
    # Send an immediate SSE comment to keep some proxies from buffering/closing
    yield b": keep-alive\n\n"

    # Generate the complete response first (vLLM doesn't support streaming in generate method)
    outputs = _llm.generate([prompt], sampling_params=sampling_params)
    if not outputs or not outputs[0].outputs:
        return
    
    full_text = outputs[0].outputs[0].text or ""
    
    # Simulate streaming by sending chunks of the complete response
    # This provides a better user experience than sending all at once
    chunk_size = 4  # Send 4 characters at a time
    previous_text = ""
    
    for i in range(0, len(full_text), chunk_size):
        chunk_text = full_text[i:i+chunk_size]
        previous_text += chunk_text
        
        chunk = {
            "id": request_id,
            "object": "chat.completion.chunk",
            "created": created,
            "model": model_id,
            "choices": [
                {
                    "index": 0,
                    "delta": {"content": chunk_text},
                    "finish_reason": None,
                }
            ],
        }
        yield f"data: {json.dumps(chunk)}\n\n".encode("utf-8")
        
        # Add a small delay to simulate streaming
        time.sleep(0.01)  # 10ms delay between chunks

    # Final stop
    final_chunk = {
        "id": request_id,
        "object": "chat.completion.chunk",
        "created": created,
        "model": model_id,
        "choices": [
            {"index": 0, "delta": {}, "finish_reason": "stop"}
        ],
    }
    yield f"data: {json.dumps(final_chunk)}\n\n".encode("utf-8")
    yield b"data: [DONE]\n\n"


@app.function(
    image=image,
    gpu="A10G",  # cost-effective default for 7B models
    volumes={
        HF_CACHE_DIR: hf_cache_vol,
        VLLM_CACHE_DIR: vllm_cache_vol,
    },
    scaledown_window=300,  # scale-to-zero after idle
    # Optional: mount a secret named "hf-token" that contains HUGGING_FACE_HUB_TOKEN
    # Create with: modal secret create hf-token HUGGING_FACE_HUB_TOKEN=xxx
    secrets=[modal.Secret.from_name("hf-token")],
)
@modal.asgi_app()
def asgi_app():
    return fastapi_app


@fastapi_app.post("/v1/chat/completions")
async def chat_completions(request: Request):
    body = await request.json()
    model = body.get("model") or _configured_model_id
    messages: List[Dict[str, Any]] = body.get("messages", [])
    stream: bool = bool(body.get("stream", False))

    # Validate/normalize model: for now, enforce the configured model
    if model != _configured_model_id:
        model = _configured_model_id

    prompt = _apply_chat_template(messages)
    sampling_params = _build_sampling_params(body)

    # If init isn't done yet, wait briefly (handles early requests racing startup)
    global _llm, _tokenizer, _init_error
    start_wait = time.time()
    while (_llm is None or _tokenizer is None) and (time.time() - start_wait < 300):
        await asyncio.sleep(0.1)
    if _llm is None or _tokenizer is None:
        return JSONResponse(
            {
                "error": {
                    "message": _init_error or "Model is warming up. Try again shortly.",
                    "type": "service_unavailable",
                }
            },
            status_code=503,
        )

    request_id = f"chatcmpl-{uuid.uuid4()}"

    if stream:
        # Use async generator for streaming
        return StreamingResponse(
            _stream_chat_sse(
                request_id=request_id,
                model_id=model,
                prompt=prompt,
                sampling_params=sampling_params,
            ),
            media_type="text/event-stream",
            headers={
                "Cache-Control": "no-cache, no-transform",
                "Connection": "keep-alive",
                # Helps some reverse proxies (e.g., Nginx) avoid buffering SSE
                "X-Accel-Buffering": "no",
            },
        )

    # Non-streaming path using synchronous generate
    outputs = _llm.generate([prompt], sampling_params=sampling_params)
    full_text = outputs[0].outputs[0].text if outputs and outputs[0].outputs else ""

    prompt_tokens = len(_tokenizer.encode(prompt))
    completion_tokens = len(_tokenizer.encode(full_text))
    usage = {
        "prompt_tokens": prompt_tokens,
        "completion_tokens": completion_tokens,
        "total_tokens": prompt_tokens + completion_tokens,
    }

    resp = {
        "id": request_id,
        "object": "chat.completion",
        "created": int(time.time()),
        "model": model,
        "choices": [
            {
                "index": 0,
                "message": {"role": "assistant", "content": full_text},
                "finish_reason": "stop",
            }
        ],
        "usage": usage,
    }
    return JSONResponse(resp)


