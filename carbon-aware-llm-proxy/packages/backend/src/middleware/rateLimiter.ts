import { RateLimiterRedis, RateLimiterRes } from "rate-limiter-flexible";
import Redis from "ioredis";
import { Request, Response, NextFunction, RequestHandler } from "express";
import { logger } from "../utils/logger";

// Initialize Redis client
const redisHost = process.env.REDIS_HOST || "localhost";
const redisPort = process.env.REDIS_PORT || "6379";
const redisUrl = process.env.REDIS_URL || `redis://${redisHost}:${redisPort}`;

// Check if we need TLS based on the URL scheme and port
const urlObj = new URL(redisUrl);
const needsTls = urlObj.protocol === "rediss:" || 
                (urlObj.hostname.includes("upstash.io") && urlObj.port === "6380") ||
                urlObj.hostname.includes("redis.cloud") ||
                urlObj.hostname.includes("amazonaws.com");

logger.info(`Rate limiter Redis config - URL: ${redisUrl.replace(/\/\/[^:]*:[^@]*@/, '//[CREDENTIALS]@')}, TLS: ${needsTls}`);

const redisClient = new Redis(redisUrl, {
  enableOfflineQueue: false,
  retryStrategy: (times) => {
    const delay = Math.min(times * 1000, 5000);
    return delay;
  },
  tls: needsTls ? {
    rejectUnauthorized: false, // Accept self-signed certificates for some services
  } : undefined,
  connectTimeout: 30000, // 30 second timeout
  lazyConnect: true, // Don't connect immediately
});

// Handle Redis connection events
redisClient.on("error", (err: Error) => {
  const sanitizedUrl = redisUrl.replace(/\/\/[^:]*:[^@]*@/, '//[CREDENTIALS]@');
  logger.error(`Rate limiter Redis error connecting to ${sanitizedUrl}:`, err);
});

redisClient.on("connect", () => {
  const sanitizedUrl = redisUrl.replace(/\/\/[^:]*:[^@]*@/, '//[CREDENTIALS]@');
  logger.info(`Rate limiter Redis connected to ${sanitizedUrl}`);
});

redisClient.on("ready", () => {
  logger.info("Rate limiter Redis ready for commands");
});

redisClient.on("reconnecting", () => {
  logger.info("Rate limiter Redis reconnecting...");
});

// Rate limiting options
const rateLimiter = new RateLimiterRedis({
  storeClient: redisClient as any, // Type assertion needed for ioredis with rate-limiter-flexible
  keyPrefix: "ratelimit",
  points: 100, // 100 requests
  duration: 60, // per 60 seconds by IP
  blockDuration: 60 * 5, // Block for 5 minutes if limit is exceeded
});

// Rate limiting middleware
export const rateLimiterMiddleware: RequestHandler = async (req, res, next) => {
  try {
    // Use IP + user agent as a key to identify unique clients
    const key = `${req.ip}_${req.headers["user-agent"]}`;

    // Apply rate limiting
    const rateLimitRes = (await rateLimiter.consume(key)) as RateLimiterRes;

    // Calculate remaining points and reset time
    const remainingPoints = rateLimiter.points - rateLimitRes.consumedPoints;
    const resetTime = new Date(Date.now() + rateLimitRes.msBeforeNext);

    // Set rate limit headers
    res.set({
      "X-RateLimit-Limit": rateLimiter.points.toString(),
      "X-RateLimit-Remaining": remainingPoints.toString(),
      "X-RateLimit-Reset": Math.ceil(resetTime.getTime() / 1000).toString(),
      "Retry-After": Math.ceil(rateLimitRes.msBeforeNext / 1000).toString(),
    });

    next();
  } catch (error) {
    if (error instanceof Error) {
      logger.error("Rate limiter error:", error);
    }

    // Rate limit exceeded
    res.status(429).json({
      success: false,
      error: "Too many requests, please try again later.",
    });
  }
};

// Export the rate limiter instance for use in specific routes if needed
export { rateLimiter };

// Default export for backward compatibility
export default rateLimiterMiddleware;
