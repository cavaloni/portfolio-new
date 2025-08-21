#!/bin/bash

# Modal deployment script with safeguards against serialization issues

set -e  # Exit on any error

echo "🚀 Starting Modal deployment..."

# Check if we're in the right directory
if [ ! -f "app.py" ]; then
    echo "❌ Error: app.py not found. Please run this script from the modal directory."
    exit 1
fi

# Check if modal CLI is available
if ! command -v modal &> /dev/null; then
    echo "❌ Error: Modal CLI not found. Please install it with: pip install modal"
    exit 1
fi

# Test the app before deployment
echo "🧪 Testing app serialization..."
if python test_deploy.py; then
    echo "✅ App test passed"
else
    echo "❌ App test failed. Please fix the issues before deploying."
    exit 1
fi

# Set default environment variables if not already set
export DEFAULT_MODEL_ID=${DEFAULT_MODEL_ID:-"Qwen/Qwen2.5-7B-Instruct"}
export APP_NAME=${APP_NAME:-"routly-worker-default"}
export FUNCTION_NAME=${FUNCTION_NAME:-"asgi-app"}
export GPU_CLASS=${GPU_CLASS:-"A10G"}

echo "📋 Deployment configuration:"
echo "  - Model: $DEFAULT_MODEL_ID"
echo "  - App Name: $APP_NAME"
echo "  - Function Name: $FUNCTION_NAME"
echo "  - GPU Class: $GPU_CLASS"
echo "  - Region: ${REGION:-'auto'}"

# Deploy with error handling
echo "🚀 Deploying to Modal..."
if modal deploy app.py; then
    echo "✅ Deployment successful!"
    
    # Get the deployment URL
    echo "🔗 Getting deployment URL..."
    if modal app list --json | grep -q "$APP_NAME"; then
        echo "✅ App deployed successfully!"
        echo "📊 You can monitor the deployment with: modal app logs $APP_NAME"
    else
        echo "⚠️  App may still be starting up. Check with: modal app list"
    fi
else
    echo "❌ Deployment failed!"
    echo "🔍 Troubleshooting tips:"
    echo "  1. Check your Modal credentials: modal token new"
    echo "  2. Verify your environment variables"
    echo "  3. Check the logs: modal app logs $APP_NAME"
    echo "  4. Try deploying with verbose output: modal deploy app.py --verbose"
    exit 1
fi
