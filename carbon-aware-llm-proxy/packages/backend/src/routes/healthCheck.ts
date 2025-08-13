import { Router } from "express";
import { logger } from "../utils/logger";

export const healthCheckRouter = Router();

healthCheckRouter.get("/", (req, res) => {
  logger.info("Health check endpoint called");

  // Add any additional health checks here (e.g., database connection)
  const healthCheck = {
    status: "UP",
    timestamp: new Date().toISOString(),
    uptime: process.uptime(),
    memoryUsage: process.memoryUsage(),
    nodeVersion: process.version,
    platform: process.platform,
    provider: process.env.LLM_PROVIDER || "modal",
  };

  res.status(200).json(healthCheck);
});
