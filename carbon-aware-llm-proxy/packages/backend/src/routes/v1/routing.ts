import { Router } from 'express';
import { routingController } from '../../controllers/routing.controller';
import { 
  getOptimalModelValidator, 
  getRecommendationsValidator, 
  updatePreferencesValidator 
} from '../../middleware/validators/routing.validator';
import { auth } from '../../middleware/auth';

export const routingRouter = Router();

// Public endpoint to get optimal model based on parameters
routingRouter.get(
  '/optimal-model',
  getOptimalModelValidator,
  routingController.getOptimalModel
);

// Protected endpoints (require authentication)
routingRouter.use(auth.authenticate);

// Get model recommendations based on user preferences
routingRouter.get(
  '/recommendations',
  getRecommendationsValidator,
  routingController.getRecommendations
);

// Update user preferences
routingRouter.put(
  '/preferences',
  updatePreferencesValidator,
  routingController.updatePreferences
);

// Get user preferences
routingRouter.get(
  '/preferences',
  routingController.getPreferences
);

// Export the router
export default routingRouter;
