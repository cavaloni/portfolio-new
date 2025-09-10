import { Router } from "express";
import { authController } from "../../controllers/auth.controller";
import { authenticate } from "../../middleware/auth";

const router = Router();

// All user routes require authentication
router.use(authenticate);

// Get current user profile
router.get("/me", authController.getCurrentUser);

// Update current user profile
router.put("/me", authController.updateProfile);

// Get user preferences
router.get("/me/preferences", authController.getUserPreferences);

// Update user preferences
router.put("/me/preferences", authController.updateUserPreferences);

// Get user carbon stats
router.get("/me/carbon-stats", authController.getUserCarbonStats);

export { router as usersRouter };

