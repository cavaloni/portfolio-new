import { query, body, ValidationChain } from 'express-validator';
import { Request, Response, NextFunction } from 'express';
import { validationResult } from 'express-validator';

interface WeightsQuery {
  carbonWeight?: string;
  performanceWeight?: string;
  costWeight?: string;
  [key: string]: any;
}

interface UpdateWeightsBody {
  weights?: {
    carbonEfficiency: number;
    performance: number;
    cost: number;
  };
  [key: string]: any;
}

export const getOptimalModelValidator = [
  query('region')
    .optional()
    .isString()
    .withMessage('Region must be a string'),
    
  query('capabilities')
    .optional()
    .custom((value) => {
      if (Array.isArray(value)) {
        return value.every(item => typeof item === 'string');
      }
      return typeof value === 'string';
    })
    .withMessage('Capabilities must be a string or an array of strings'),
    
  query('providers')
    .optional()
    .custom((value) => {
      if (Array.isArray(value)) {
        return value.every(item => typeof item === 'string');
      }
      return typeof value === 'string';
    })
    .withMessage('Providers must be a string or an array of strings'),
    
  query('carbonWeight')
    .optional()
    .isFloat({ min: 0, max: 1 })
    .withMessage('Carbon weight must be a number between 0 and 1'),
    
  query('performanceWeight')
    .optional()
    .isFloat({ min: 0, max: 1 })
    .withMessage('Performance weight must be a number between 0 and 1'),
    
  query('costWeight')
    .optional()
    .isFloat({ min: 0, max: 1 })
    .withMessage('Cost weight must be a number between 0 and 1'),
    
  (req: Request<{}, {}, UpdateWeightsBody, WeightsQuery>, res: Response, next: NextFunction) => {
    const { carbonWeight, performanceWeight, costWeight } = req.query;
    const weights = [carbonWeight, performanceWeight, costWeight].filter(w => w !== undefined);
    
    if (weights.length > 0 && weights.length < 3) {
      return res.status(400).json({
        success: false,
        message: 'If any weight is provided, all weights must be provided',
      });
    }
    
    next();
  },
  
  (req: Request<{}, {}, UpdateWeightsBody, WeightsQuery>, res: Response, next: NextFunction) => {
    const { carbonWeight, performanceWeight, costWeight } = req.query;
    
    if (carbonWeight !== undefined) {
      const sum = parseFloat(carbonWeight) + parseFloat(performanceWeight || '0') + parseFloat(costWeight || '0');
      
      if (Math.abs(sum - 1) > 0.001) { // Allow for floating point imprecision
        return res.status(400).json({
          success: false,
          message: 'Weights must sum to 1',
        });
      }
    }
    
    next();
  },
];

export const getRecommendationsValidator = [
  query('region')
    .optional()
    .isString()
    .withMessage('Region must be a string'),
];

export const updatePreferencesValidator = [
  body('weights')
    .optional()
    .isObject()
    .withMessage('Weights must be an object'),
    
  body('weights.carbonEfficiency')
    .optional()
    .isFloat({ min: 0, max: 1 })
    .withMessage('Carbon efficiency weight must be a number between 0 and 1'),
    
  body('weights.performance')
    .optional()
    .isFloat({ min: 0, max: 1 })
    .withMessage('Performance weight must be a number between 0 and 1'),
    
  body('weights.cost')
    .optional()
    .isFloat({ min: 0, max: 1 })
    .withMessage('Cost weight must be a number between 0 and 1'),
    
  body('preferredProviders')
    .optional()
    .isArray()
    .withMessage('Preferred providers must be an array'),
    
  body('preferredProviders.*')
    .isString()
    .withMessage('Each provider must be a string'),
    
  body('carbonAware')
    .optional()
    .isBoolean()
    .withMessage('Carbon aware must be a boolean'),
    
  body('costSensitive')
    .optional()
    .isBoolean()
    .withMessage('Cost sensitive must be a boolean'),
    
  (req: Request<{}, {}, UpdateWeightsBody, WeightsQuery>, res: Response, next: NextFunction) => {
    const { weights } = req.body;
    
    if (weights) {
      const { carbonEfficiency, performance, cost } = weights;
      const providedWeights = [carbonEfficiency, performance, cost].filter(w => w !== undefined);
      
      if (providedWeights.length > 0 && providedWeights.length < 3) {
        return res.status(400).json({
          success: false,
          message: 'If any weight is provided, all weights must be provided',
        });
      }
      
      if (providedWeights.length === 3) {
        const sum = carbonEfficiency + performance + cost;
        
        if (Math.abs(sum - 1) > 0.001) { // Allow for floating point imprecision
          return res.status(400).json({
            success: false,
            message: 'Weights must sum to 1',
          });
        }
      }
    }
    
    next();
  },
];
