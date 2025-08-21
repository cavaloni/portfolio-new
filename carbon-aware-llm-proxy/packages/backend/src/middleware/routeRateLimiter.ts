import { Request, Response, NextFunction } from "express";
import { redisService } from "../services/redis.service";
import { logger } from "../utils/logger";

interface RateLimitOptions {
  windowMs: number;
  max: number;
  keyGenerator?: (req: Request) => string;
  skipSuccessfulRequests?: boolean;
}

const defaultOptions: RateLimitOptions = {
  windowMs: 60 * 1000, // 1 minute
  max: 10, // 10 requests per minute
  keyGenerator: (req) => req.user?.id || req.ip || "anonymous",
  skipSuccessfulRequests: false,
};

export function createRouteRateLimiter(
  options: Partial<RateLimitOptions> = {},
) {
  const opts = { ...defaultOptions, ...options };

  return async (req: Request, res: Response, next: NextFunction) => {
    try {
      const key = `rate_limit:route:${opts.keyGenerator!(req)}`;
      const window = Math.floor(Date.now() / opts.windowMs);
      const redisKey = `${key}:${window}`;

      // Get current count
      const current = (await redisService.get(redisKey)) || 0;

      if (current >= opts.max) {
        logger.warn(`Rate limit exceeded for ${key}`, {
          current,
          max: opts.max,
          ip: req.ip,
          userId: req.user?.id,
        });

        return res.status(429).json({
          error: "rate_limit_exceeded",
          message: "Too many routing requests. Try again later.",
          retryAfter: Math.ceil(opts.windowMs / 1000),
        });
      }

      // Increment counter with expiration
      await redisService.set(
        redisKey,
        current + 1,
        Math.ceil(opts.windowMs / 1000),
      );

      // Add rate limit headers
      res.setHeader("X-RateLimit-Limit", opts.max);
      res.setHeader(
        "X-RateLimit-Remaining",
        Math.max(0, opts.max - current - 1),
      );
      res.setHeader("X-RateLimit-Reset", (window + 1) * opts.windowMs);

      next();
    } catch (error) {
      logger.error("Rate limiter error:", error);
      // Don't block on rate limiter errors
      next();
    }
  };
}

// Export pre-configured rate limiter for route endpoint
export const routeRateLimiter = createRouteRateLimiter({
  windowMs: 60 * 1000, // 1 minute
  max: 10, // 10 route requests per minute per user/IP
});
