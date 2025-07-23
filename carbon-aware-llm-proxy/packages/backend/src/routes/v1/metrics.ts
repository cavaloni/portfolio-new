import { Router } from "express";
import { metricsController } from "../../controllers/metrics.controller";
import { auth } from "../../middleware/auth";

export const metricsRouter = Router();

// All routes require authentication
metricsRouter.use(auth.authenticate);

// Get system metrics
metricsRouter.get("/system", metricsController.getSystemMetrics);

// Get current user's metrics
metricsRouter.get("/me", metricsController.getUserMetrics);

// Get aggregated metrics (admin only)
metricsRouter.get(
  "/aggregated",
  auth.authorize(["admin"]),
  metricsController.getAggregatedMetrics,
);

// Export the router
export default metricsRouter;
