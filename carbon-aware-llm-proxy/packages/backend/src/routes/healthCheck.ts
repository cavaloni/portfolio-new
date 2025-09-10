import { Router } from "express";
import { logger } from "../utils/logger";
import { supabaseService } from "../services/supabase.service";
import { redisService } from "../services/redis.service";

export const healthCheckRouter = Router();

healthCheckRouter.get("/", async (req, res) => {
  logger.info("Health check endpoint called");

  try {
    // Check Supabase health
    const supabaseHealth = await supabaseService.healthCheck();

    // Check Redis health
    const redisHealth = redisService.getConnectionStatus();

    const healthCheck = {
      status: supabaseHealth && redisHealth ? "UP" : "DEGRADED",
      timestamp: new Date().toISOString(),
      uptime: process.uptime(),
      memoryUsage: process.memoryUsage(),
      nodeVersion: process.version,
      platform: process.platform,
      provider: process.env.LLM_PROVIDER || "modal",
      database: {
        supabase: supabaseHealth
      },
      redis: {
        connected: redisHealth
      }
    };

    const statusCode = healthCheck.status === "UP" ? 200 : 503;
    res.status(statusCode).json(healthCheck);
  } catch (error) {
    logger.error("Health check failed:", error);
    res.status(503).json({
      status: "DOWN",
      timestamp: new Date().toISOString(),
      error: error instanceof Error ? error.message : "Unknown error"
    });
  }
});
