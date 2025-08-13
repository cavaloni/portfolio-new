from fastapi import FastAPI, Request
from fastapi.responses import JSONResponse
import modal
from pathlib import Path

# Ensure required dependencies are present in the Modal image via requirements.txt
requirements_path = str(Path(__file__).parent / "requirements.txt")
image = modal.Image.debian_slim().pip_install_from_requirements(requirements_path)

# FastAPI application instance
fastapi_app = FastAPI()

# Modal App (named `app` so `modal serve file.py` picks it up by default)
app = modal.App("carbon-aware-modal-app")

@app.function(image=image)
@modal.asgi_app()
def asgi_app():
    return fastapi_app

@fastapi_app.post("/v1/chat/completions")
async def chat_completions(request: Request):
    body = await request.json()
    # Minimal echo implementation; replace with vLLM/Transformers logic as needed
    messages = body.get("messages", [])
    last_user = next((m for m in reversed(messages) if m.get("role") == "user"), {"content": ""})
    content = f"Echo: {last_user.get('content','')}"
    resp = {
        "id": f"chatcmpl-modal",
        "object": "chat.completion",
        "created": 0,
        "model": body.get("model", "modal-model"),
        "choices": [
            {
                "index": 0,
                "message": {"role": "assistant", "content": content},
                "finish_reason": "stop",
            }
        ],
        "usage": {"prompt_tokens": 0, "completion_tokens": 0, "total_tokens": 0},
    }
    return JSONResponse(resp)


