# RunPod Integration Guide

This document describes the RunPod integration for deploying and managing VLLM models in the Carbon-Aware LLM Proxy.

## Overview

The RunPod integration allows you to:

- Deploy Llama 3 models (8B and 70B) to RunPod serverless endpoints
- Automatically scale based on demand
- Route requests to the most carbon-efficient regions
- Track carbon footprint per request
- Monitor deployment health and performance

## Setup

### 1. Environment Configuration

Add the following environment variables to your `.env` file:

```bash
# RunPod Configuration
RUNPOD_API_KEY=your_runpod_api_key_here
RUNPOD_DEFAULT_GPU_TYPE=NVIDIA GeForce RTX 4090
RUNPOD_AUTO_SCALING=true
RUNPOD_MAX_PODS_PER_MODEL=3
RUNPOD_MIN_PODS_PER_MODEL=1

# Feature Flags
ENABLE_RUNPOD_INTEGRATION=true
```

### 2. Database Migration

Run the database migration to create the RunPod tables:

```bash
cd packages/backend
npm run migration:run
```

## Usage

### Deploying Models

Use the deployment CLI script to deploy models to RunPod:

```bash
# Deploy Llama 3 8B to Oregon (most carbon-efficient region)
npm run runpod deploy -m llama-3-8b-instruct -r US-OR-1

# Deploy to multiple regions
npm run runpod deploy -m llama-3-8b-instruct -r US-OR-1,EU-SE-1

# Deploy with custom scaling settings
npm run runpod deploy -m llama-3-70b-instruct -r US-OR-1 --min-replicas 1 --max-replicas 5

# Dry run to see what would be deployed
npm run runpod deploy -m llama-3-8b-instruct -r US-OR-1 --dry-run
```

### Available Commands

```bash
# Show available models, regions, and GPU types
npm run runpod info

# List all deployments
npm run runpod list

# Filter deployments
npm run runpod list --model llama-3-8b-instruct
npm run runpod list --region US-OR-1
npm run runpod list --status running

# Get detailed deployment status
npm run runpod status <deployment-id>

# Perform health checks
npm run runpod health-check

# Stop a deployment (TODO: implement)
npm run runpod stop <deployment-id>
```

## Architecture

### Components

1. **RunPod Service** (`runpod.service.ts`)
   - Manages RunPod API interactions
   - Creates and manages serverless endpoints
   - Handles deployment lifecycle

2. **RunPod Provider Service** (`runpod-provider.service.ts`)
   - Handles chat completion requests
   - Implements carbon-aware routing
   - Provides failover and retry logic

3. **Database Entities**
   - `RunPodDeployment`: Tracks deployment configurations and status
   - `RunPodInstance`: Tracks individual pod instances and metrics

4. **Configuration** (`runpod.config.ts`)
   - Model configurations (Llama 3 variants)
   - GPU types and specifications
   - Regional carbon intensity data

### Request Flow

1. Client sends chat completion request
2. RunPod Provider Service selects optimal deployment based on:
   - Carbon efficiency (regional carbon intensity)
   - Availability (current replicas vs capacity)
   - Regional preferences
   - Health status
3. Request is routed to selected RunPod endpoint
4. Response includes carbon footprint calculation
5. Metrics are recorded for monitoring

## Carbon Efficiency

The system prioritizes deployments in regions with lower carbon intensity:

- **Norway (EU-NO-1)**: 0.017 kg CO2e/kWh (hydroelectric power)
- **Sweden (EU-SE-1)**: 0.045 kg CO2e/kWh (renewable energy)
- **Oregon (US-OR-1)**: 0.155 kg CO2e/kWh (hydroelectric power)
- **California (US-CA-1)**: 0.233 kg CO2e/kWh (mixed grid)

## Model Configurations

### Llama 3 8B Instruct

- **Parameters**: 8 billion
- **Min GPU Memory**: 16GB
- **Recommended GPUs**: RTX 4090, RTX A6000
- **Tensor Parallelism**: 1
- **Max Sequence Length**: 8192

### Llama 3 70B Instruct

- **Parameters**: 70 billion
- **Min GPU Memory**: 48GB
- **Recommended GPUs**: RTX A6000, A100 80GB
- **Tensor Parallelism**: 2
- **Max Sequence Length**: 8192

## Monitoring

### Health Checks

- Automatic health checks every 30 seconds
- Endpoint availability monitoring
- Automatic failover on consecutive failures

### Metrics Tracked

- Request count and response times
- Token processing rates
- Cost per hour per deployment
- Carbon footprint per request
- Instance utilization

### Carbon Footprint Calculation

The system calculates carbon footprint based on:

- Tokens processed per request
- Regional carbon intensity
- GPU power consumption
- Data center PUE (Power Usage Effectiveness)
- Infrastructure overhead

## Future Enhancements

### Planned Features (Comments in Code)

1. **Advanced Carbon Tracking**
   - Real-time carbon intensity data integration
   - More sophisticated energy modeling
   - Carbon budget management

2. **Enhanced Auto-Scaling**
   - Predictive scaling based on usage patterns
   - Cost optimization algorithms
   - Multi-provider load balancing

3. **Streaming Support**
   - Server-sent events for streaming responses
   - Chunked response processing
   - Real-time token streaming

4. **Advanced Monitoring**
   - Grafana dashboards
   - Alerting on high carbon footprint
   - Performance optimization recommendations

## Troubleshooting

### Common Issues

1. **Deployment Fails**
   - Check RunPod API key is valid
   - Verify GPU availability in selected region
   - Check model memory requirements vs GPU capacity

2. **Health Check Failures**
   - Verify endpoint URL is accessible
   - Check model loading status
   - Review RunPod pod logs

3. **High Carbon Footprint**
   - Consider deploying to regions with lower carbon intensity
   - Optimize model selection (smaller models when appropriate)
   - Review request patterns and caching opportunities

### Debugging

Enable debug logging:

```bash
LOG_LEVEL=debug npm run dev:backend
```

Check deployment status:

```bash
npm run runpod list
npm run runpod status <deployment-id>
```

## Security Considerations

- RunPod API keys should be stored securely
- Endpoint URLs should use HTTPS
- Consider implementing request authentication
- Monitor for unusual usage patterns

## Cost Management

- Monitor deployment costs through the CLI
- Set appropriate min/max replica limits
- Use auto-scaling to optimize costs
- Consider regional pricing differences

## Support

For issues related to:

- **RunPod API**: Check RunPod documentation and support
- **VLLM**: Refer to VLLM documentation
- **Integration**: Check application logs and database state
