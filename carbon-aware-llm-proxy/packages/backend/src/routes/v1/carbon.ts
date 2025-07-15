import { Router } from 'express';
import { z } from 'zod';
import { logger } from '../../utils/logger';
import { ApiError } from '../../middleware/errorHandler';

// Mock data - in a real app, this would come from WattTime or ElectricityMap API
const mockCarbonIntensity = {
  'us-west-2': {
    value: 120, // gCO2/kWh
    units: 'gCO2/kWh',
    source: 'mock',
    last_updated: new Date().toISOString(),
  },
  'us-east-1': {
    value: 95,
    units: 'gCO2/kWh',
    source: 'mock',
    last_updated: new Date().toISOString(),
  },
  'eu-west-1': {
    value: 80,
    units: 'gCO2/kWh',
    source: 'mock',
    last_updated: new Date().toISOString(),
  },
};

// Define Zod schemas for request validation
const carbonEstimateSchema = z.object({
  model: z.string().min(1, 'Model is required'),
  region: z.string().optional(),
  prompt_tokens: z.number().int().positive().optional(),
  completion_tokens: z.number().int().positive().optional(),
  total_tokens: z.number().int().positive().optional(),
}).refine(
  (data) => data.prompt_tokens || data.completion_tokens || data.total_tokens,
  {
    message: 'At least one of prompt_tokens, completion_tokens, or total_tokens must be provided',
  },
);

export const carbonRouter = Router();

// GET /v1/carbon/intensity
carbonRouter.get('/intensity', (req, res) => {
  const { region } = req.query;
  
  if (typeof region === 'string') {
    const intensity = mockCarbonIntensity[region as keyof typeof mockCarbonIntensity];
    
    if (!intensity) {
      throw new ApiError(404, `No carbon intensity data available for region: ${region}`);
    }
    
    return res.status(200).json({
      region,
      ...intensity,
    });
  }
  
  // Return all regions if no specific region is requested
  res.status(200).json(
    Object.entries(mockCarbonIntensity).map(([region, data]) => ({
      region,
      ...data,
    }))
  );
});

// POST /v1/carbon/estimate
carbonRouter.post('/estimate', (req, res) => {
  // Validate request body
  const validatedBody = carbonEstimateSchema.safeParse(req.body);
  
  if (!validatedBody.success) {
    throw new ApiError(400, 'Invalid request body', true, {
      errors: validatedBody.error.issues,
    });
  }
  
  const { model, region, prompt_tokens, completion_tokens, total_tokens } = validatedBody.data;
  
  logger.info('Carbon estimate request', {
    model,
    region,
    prompt_tokens,
    completion_tokens,
    total_tokens,
  });
  
  // Mock model data - in a real app, this would come from a database
  const modelData = {
    'gpt-4': {
      watts_per_1k_tokens: 50, // Example value
      default_region: 'us-west-2',
    },
    'claude-2': {
      watts_per_1k_tokens: 40, // Example value
      default_region: 'us-east-1',
    },
  }[model];
  
  if (!modelData) {
    throw new ApiError(404, `Model not found: ${model}`);
  }
  
  // Use provided region or fall back to model's default region
  const effectiveRegion = region || modelData.default_region;
  const intensity = mockCarbonIntensity[effectiveRegion as keyof typeof mockCarbonIntensity];
  
  if (!intensity) {
    throw new ApiError(404, `No carbon intensity data available for region: ${effectiveRegion}`);
  }
  
  // Calculate energy use (kWh)
  const tokens = total_tokens || (prompt_tokens || 0) + (completion_tokens || 0);
  const energyUseKWh = (tokens / 1000) * (modelData.watts_per_1k_tokens / 1000);
  
  // Calculate carbon emissions (gCO2)
  const carbonEmissionsGrams = energyUseKWh * intensity.value;
  
  res.status(200).json({
    model,
    region: effectiveRegion,
    tokens: {
      prompt: prompt_tokens,
      completion: completion_tokens,
      total: tokens,
    },
    energy: {
      value: energyUseKWh,
      units: 'kWh',
    },
    carbon: {
      value: carbonEmissionsGrams,
      units: 'gCO2e',
      intensity: {
        value: intensity.value,
        units: intensity.units,
      },
    },
    timestamp: new Date().toISOString(),
  });
});

// POST /v1/carbon/routing/preferences
carbonRouter.post('/routing/preferences', (req, res) => {
  // This endpoint would handle saving user preferences for carbon vs performance
  // For now, we'll just return a success response
  
  // In a real app, you would:
  // 1. Validate the request body
  // 2. Save the preferences to a database
  // 3. Return the saved preferences
  
  const preferences = {
    carbon_weight: 0.7, // Default weight for carbon efficiency (0.0 to 1.0)
    performance_weight: 0.3, // Default weight for performance (0.0 to 1.0)
    ...req.body, // Allow overriding defaults
  };
  
  // Ensure weights sum to 1.0
  const totalWeight = preferences.carbon_weight + preferences.performance_weight;
  preferences.carbon_weight /= totalWeight;
  preferences.performance_weight /= totalWeight;
  
  res.status(200).json({
    status: 'success',
    message: 'Routing preferences updated successfully',
    preferences,
  });
});
