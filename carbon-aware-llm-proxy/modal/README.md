# Modal LLM Service

This directory contains the Modal deployment for the LLM service that provides OpenAI-compatible chat completions using vLLM.

## Recent Fix: Serialization Error Resolution

The Modal deployment was experiencing a recursion error during serialization:
```
RecursionError: maximum recursion depth exceeded
modal.exception.DeserializationError: Encountered an error when deserializing an object in the remote environment
```

### Root Cause
The issue was caused by the FastAPI app being created at module level, which created circular references during Modal's serialization process.

### Solution
- **Moved FastAPI app creation inside a function**: The `create_fastapi_app()` function now creates a fresh FastAPI instance when called
- **Avoided module-level FastAPI app**: This prevents circular references during serialization
- **Added serialization safeguards**: The app is now created fresh each time it's needed

## Files

- `app.py` - Main Modal application with FastAPI endpoints
- `requirements.txt` - Python dependencies
- `test_deploy.py` - Test script to verify deployment readiness
- `deploy.sh` - Deployment script with error handling
- `get_web_url.py` - Utility to get deployment URLs

## Deployment

### Prerequisites

1. Install Modal CLI:
   ```bash
   pip install modal
   ```

2. Authenticate with Modal:
   ```bash
   modal token new
   ```

3. Set up environment variables (optional, defaults provided):
   ```bash
   export DEFAULT_MODEL_ID="Qwen/Qwen2.5-7B-Instruct"
   export APP_NAME="routly-worker-default"
   export FUNCTION_NAME="asgi-app"
   export GPU_CLASS="A10G"
   export REGION="us-west-1"  # Optional
   ```

### Quick Deployment

Use the deployment script:
```bash
cd modal
./deploy.sh
```

### Manual Deployment

1. Test the app first:
   ```bash
   python test_deploy.py
   ```

2. Deploy to Modal:
   ```bash
   modal deploy app.py
   ```

3. Check deployment status:
   ```bash
   modal app list
   ```

## Endpoints

The service provides the following endpoints:

- `POST /v1/chat/completions` - OpenAI-compatible chat completions
- `GET /health` - Health check
- `POST /warmup` - Warm up the model

## Troubleshooting

### Serialization Errors
If you encounter serialization errors:
1. Run the test script: `python test_deploy.py`
2. Check that all dependencies are properly installed
3. Verify environment variables are set correctly

### Deployment Failures
1. Check Modal credentials: `modal token new`
2. Verify environment variables
3. Check logs: `modal app logs <app-name>`
4. Try verbose deployment: `modal deploy app.py --verbose`

### Model Loading Issues
1. Check Hugging Face token is set (if using private models)
2. Verify model ID is accessible
3. Check GPU availability in your region

## Configuration

### Environment Variables

| Variable | Default | Description |
|----------|---------|-------------|
| `DEFAULT_MODEL_ID` | `Qwen/Qwen2.5-7B-Instruct` | Hugging Face model ID |
| `APP_NAME` | `routly-worker-default` | Modal app name |
| `FUNCTION_NAME` | `asgi-app` | Modal function name |
| `GPU_CLASS` | `A10G` | GPU class for deployment |
| `REGION` | Auto | Modal deployment region |
| `DEPLOYMENT_SECRET` | None | Secret for request authentication |
| `HUGGING_FACE_HUB_TOKEN` | None | HF token for private models |

### GPU Classes
- `A10G` - Good balance of cost and performance
- `A100` - Higher performance, higher cost
- `H100` - Maximum performance, highest cost

## Monitoring

Monitor your deployment:
```bash
# List all apps
modal app list

# View logs
modal app logs <app-name>

# Get deployment URL
python get_web_url.py
```

## Security

The service supports HMAC signature verification for requests. Set `DEPLOYMENT_SECRET` to enable this feature.
