# RunPod Deployment Examples

This document provides practical examples for deploying and managing LLM models on RunPod.

## Quick Start

### 1. Set up your environment

```bash
# Copy the environment template
cp packages/backend/.env.example packages/backend/.env

# Add your RunPod API key
echo "RUNPOD_API_KEY=your_actual_api_key_here" >> packages/backend/.env
echo "ENABLE_RUNPOD_INTEGRATION=true" >> packages/backend/.env
```

### 2. Start the application

```bash
# Start the development environment
npm run dev

# Or start just the backend for CLI usage
npm run dev:backend
```

### 3. Deploy your first model

```bash
# Deploy Llama 3 8B to the most carbon-efficient region (Oregon)
npm run runpod deploy -m llama-3-8b-instruct -r US-OR-1

# Check deployment status
npm run runpod list
```

## Deployment Examples

### Basic Deployments

```bash
# Deploy to single region with defaults
npm run runpod deploy -m llama-3-8b-instruct -r US-OR-1

# Deploy to multiple regions for redundancy
npm run runpod deploy -m llama-3-8b-instruct -r US-OR-1,EU-SE-1,EU-NO-1

# Deploy larger model with more resources
npm run runpod deploy -m llama-3-70b-instruct -r US-OR-1 -g "NVIDIA RTX A6000"
```

### Advanced Deployments

```bash
# Deploy with custom scaling parameters
npm run runpod deploy \
  -m llama-3-8b-instruct \
  -r US-OR-1 \
  --min-replicas 2 \
  --max-replicas 5 \
  --gpu "NVIDIA GeForce RTX 4090"

# Deploy without auto-scaling (fixed replicas)
npm run runpod deploy \
  -m llama-3-8b-instruct \
  -r EU-SE-1 \
  --min-replicas 1 \
  --max-replicas 1 \
  --no-auto-scaling

# Dry run to see what would be deployed
npm run runpod deploy \
  -m llama-3-70b-instruct \
  -r US-OR-1,EU-NO-1 \
  --dry-run
```

### Carbon-Optimized Deployments

```bash
# Deploy to the most carbon-efficient regions
npm run runpod deploy -m llama-3-8b-instruct -r EU-NO-1,EU-SE-1

# Check carbon efficiency of different regions
npm run runpod info

# Deploy with carbon efficiency priority
npm run runpod deploy \
  -m llama-3-8b-instruct \
  -r EU-NO-1,EU-SE-1,US-OR-1 \
  --min-replicas 1 \
  --max-replicas 2
```

## Management Examples

### Monitoring Deployments

```bash
# List all deployments
npm run runpod list

# Filter by model
npm run runpod list --model llama-3-8b-instruct

# Filter by region
npm run runpod list --region US-OR-1

# Filter by status
npm run runpod list --status running

# Get detailed status of a specific deployment
npm run runpod status <deployment-id>
```

### Health Checks

```bash
# Run health checks on all deployments
npm run runpod health-check

# Check specific deployment (via API)
curl -X POST http://localhost:3001/api/v1/runpod/deployments/<deployment-id>/health-check
```

### API Usage Examples

```bash
# Get deployment statistics
curl http://localhost:3001/api/v1/runpod/stats

# List deployments via API
curl http://localhost:3001/api/v1/runpod/deployments

# Get available models and regions
curl http://localhost:3001/api/v1/runpod/models

# Get specific deployment details
curl http://localhost:3001/api/v1/runpod/deployments/<deployment-id>
```

## Chat Completion Examples

### Using the API

```bash
# Send a chat completion request
curl -X POST http://localhost:3001/api/v1/chat/completions \
  -H "Content-Type: application/json" \
  -d '{
    "model": "llama-3-8b-instruct",
    "messages": [
      {
        "role": "user",
        "content": "Explain the importance of renewable energy for reducing carbon emissions."
      }
    ],
    "temperature": 0.7,
    "max_tokens": 500
  }'
```

### Response with Carbon Footprint

```json
{
  "id": "chatcmpl-1703000000",
  "object": "chat.completion",
  "created": 1703000000,
  "model": "llama-3-8b-instruct",
  "choices": [
    {
      "index": 0,
      "message": {
        "role": "assistant",
        "content": "Renewable energy plays a crucial role in reducing carbon emissions..."
      },
      "finish_reason": "stop"
    }
  ],
  "usage": {
    "prompt_tokens": 15,
    "completion_tokens": 120,
    "total_tokens": 135
  },
  "carbon_footprint": {
    "emissions_gco2e": 0.45,
    "energy_consumed_kwh": 0.000027,
    "region": "US-OR-1",
    "model_name": "llama-3-8b-instruct"
  }
}
```

## Cost Optimization Examples

### Choosing Cost-Effective Configurations

```bash
# Use the most cost-effective GPU for small models
npm run runpod deploy -m llama-3-8b-instruct -r US-OR-1 -g "NVIDIA GeForce RTX 4090"

# For larger models, balance cost and performance
npm run runpod deploy -m llama-3-70b-instruct -r US-OR-1 -g "NVIDIA RTX A6000"

# Enable auto-scaling to optimize costs
npm run runpod deploy \
  -m llama-3-8b-instruct \
  -r US-OR-1 \
  --min-replicas 0 \
  --max-replicas 3 \
  --auto-scaling
```

### Monitoring Costs

```bash
# Check current costs
npm run runpod stats

# Get detailed cost breakdown for a deployment
npm run runpod status <deployment-id>
```

## Troubleshooting Examples

### Common Issues and Solutions

```bash
# Check if deployment is healthy
npm run runpod list --status running
npm run runpod health-check

# Get detailed error information
npm run runpod status <deployment-id>

# Check logs (if deployment fails)
# Look for error_message in the deployment status

# Verify API key is working
curl -H "Authorization: Bearer $RUNPOD_API_KEY" https://api.runpod.io/graphql \
  -d '{"query": "query { myself { id } }"}'
```

### Debug Mode

```bash
# Enable debug logging
LOG_LEVEL=debug npm run dev:backend

# Run deployment with verbose output
DEBUG=* npm run runpod deploy -m llama-3-8b-instruct -r US-OR-1
```

## Production Deployment Examples

### Multi-Region Setup

```bash
# Deploy to multiple regions for high availability
npm run runpod deploy -m llama-3-8b-instruct -r US-OR-1,EU-SE-1,EU-NO-1 --min-replicas 1 --max-replicas 2

# Deploy different model sizes to different regions based on demand
npm run runpod deploy -m llama-3-8b-instruct -r US-OR-1,US-CA-1 --max-replicas 3
npm run runpod deploy -m llama-3-70b-instruct -r EU-NO-1 --max-replicas 1
```

### Load Balancing

The system automatically load balances between deployments based on:

- Carbon efficiency (prioritizes lower carbon intensity regions)
- Availability (current replicas vs capacity)
- Health status
- Regional preferences

### Monitoring and Alerting

```bash
# Set up periodic health checks (add to cron)
*/5 * * * * cd /path/to/app && npm run runpod health-check

# Monitor costs and carbon footprint
npm run runpod stats | jq '.data.totalCostPerHour'
npm run runpod stats | jq '.data.totalCarbonFootprintPerHour'
```

## Integration Examples

### Frontend Integration

```javascript
// Example React component using the chat API
const ChatComponent = () => {
  const [messages, setMessages] = useState([]);

  const sendMessage = async (content) => {
    const response = await fetch("/api/v1/chat/completions", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        model: "llama-3-8b-instruct",
        messages: [...messages, { role: "user", content }],
        temperature: 0.7,
      }),
    });

    const data = await response.json();

    // Display carbon footprint to user
    console.log("Carbon footprint:", data.carbon_footprint);

    return data.choices[0].message.content;
  };
};
```

### Webhook Integration

```bash
# Set up webhooks for deployment status changes (future feature)
# This would notify external systems when deployments change status
```

## Best Practices

1. **Start Small**: Begin with `llama-3-8b-instruct` in one region
2. **Monitor Costs**: Regularly check deployment costs and optimize
3. **Use Auto-Scaling**: Enable auto-scaling to optimize costs and carbon footprint
4. **Prefer Green Regions**: Deploy to regions with lower carbon intensity
5. **Health Monitoring**: Set up regular health checks
6. **Gradual Scaling**: Increase replicas gradually based on actual demand

## Next Steps

1. Deploy your first model using the examples above
2. Monitor performance and costs
3. Scale to additional regions as needed
4. Integrate with your application using the chat API
5. Set up monitoring and alerting for production use
