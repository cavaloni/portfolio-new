import { Router } from "express";
import { z } from "zod";
import {
  selectDeploymentAndWarm,
  joystickToWeights,
  EnhancedRouteResponse,
} from "../../services/deployment-routing.service";
import { routeRateLimiter } from "../../middleware/routeRateLimiter";
import { logger } from "../../utils/logger";

export const routeRouter = Router();

const routeSchema = z.object({
  joystick: z.object({ x: z.number(), y: z.number() }).optional(),
  weights: z
    .object({
      cost: z.number(),
      speed: z.number(),
      quality: z.number(),
      green: z.number(),
    })
    .partial()
    .optional(),
  region: z.string().optional(),
  strictRegion: z.boolean().optional(),
});

routeRouter.post("/", routeRateLimiter, async (req, res) => {
  const parsed = routeSchema.safeParse(req.body || {});
  if (!parsed.success) {
    return res
      .status(400)
      .json({ error: "invalid_request", details: parsed.error.issues });
  }
  const { joystick, weights, region, strictRegion } = parsed.data;
  const requestId = (req as any).requestId || req.headers["x-request-id"]; 
  logger.info("/v1/route received", {
    requestId,
    joystick,
    weights,
    region,
    strictRegion,
  });
  const result = await selectDeploymentAndWarm({
    joystick,
    weights: weights as any,
    region,
    strictRegion,
  });
  
  // Handle error cases
  if ("error" in result) {
    logger.warn("/v1/route error", { requestId, error: result });
    return res.status(404).json(result);
  }
  logger.info("/v1/route success", {
    requestId,
    chosen: {
      id: result.chosen.id,
      modelId: result.chosen.modelId,
      region: result.chosen.region,
      hasIngressUrl: Boolean(result.chosen.ingressUrl),
      co2_g_per_kwh: result.chosen.co2_g_per_kwh,
    },
    ideal: {
      id: result.ideal.id,
      modelId: result.ideal.modelId,
      region: result.ideal.region,
      co2_g_per_kwh: result.ideal.co2_g_per_kwh,
    },
    expectedDelay: result.expectedDelay,
    timeoutStrategy: result.timeoutStrategy,
    fallbackOptionsCount: result.fallbackOptions?.length || 0,
  });

  return res.json(result);
});
