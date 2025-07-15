import { Router } from 'express';
import { logger } from '../../utils/logger';

export const modelsRouter = Router();

// Mock data - in a real app, this would come from a database
const availableModels = [
  {
    id: 'gpt-4',
    object: 'model',
    created: 1649358449,
    owned_by: 'openai',
    capabilities: {
      text_completion: true,
      chat_completion: true,
      embeddings: false,
    },
    limits: {
      max_tokens: 8192,
    },
    carbon_footprint: {
      gco2_per_1k_tokens: 2.5,
      region: 'us-west-2',
      last_updated: '2023-06-01T00:00:00Z',
    },
  },
  {
    id: 'claude-2',
    object: 'model',
    created: 1653331200,
    owned_by: 'anthropic',
    capabilities: {
      text_completion: true,
      chat_completion: true,
      embeddings: false,
    },
    limits: {
      max_tokens: 100000,
    },
    carbon_footprint: {
      gco2_per_1k_tokens: 1.8,
      region: 'us-east-1',
      last_updated: '2023-07-01T00:00:00Z',
    },
  },
  // Add more models as needed
];

// GET /v1/models
modelsRouter.get('/', (req, res) => {
  logger.info('Fetching available models');
  
  // In a real app, you might want to filter models based on user permissions
  // or other criteria before returning them
  res.status(200).json({
    object: 'list',
    data: availableModels,
  });
});

// GET /v1/models/:id
modelsRouter.get('/:id', (req, res, next) => {
  const modelId = req.params.id;
  logger.info(`Fetching model: ${modelId}`);
  
  const model = availableModels.find(m => m.id === modelId);
  
  if (!model) {
    return res.status(404).json({
      error: {
        message: `The model '${modelId}' does not exist`,
        type: 'invalid_request_error',
        param: 'id',
        code: 'model_not_found',
      },
    });
  }
  
  res.status(200).json(model);
});
