import { Router } from "express";
import { z } from "zod";
import {
  selectDeploymentAndWarm,
  joystickToWeights,
  EnhancedRouteResponse,
} from "../../services/deployment-routing.service";
import { routeRateLimiter } from "../../middleware/routeRateLimiter";

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
  const result = await selectDeploymentAndWarm({
    joystick,
    weights: weights as any,
    region,
    strictRegion,
  });
  
  // Handle error cases
  if ("error" in result) {
    return res.status(404).json(result);
  }
  
  return res.json(result);
});
