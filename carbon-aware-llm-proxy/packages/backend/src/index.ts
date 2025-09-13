import "dotenv/config";
import "reflect-metadata";
import express from "express";
import helmet from "helmet";
import cors from "cors";
import { createServer } from "http";
import { logger, httpLogger } from "./utils/logger";
import { errorHandler, notFoundHandler } from "./middleware/errorHandler";
import { rateLimiterMiddleware } from "./middleware/rateLimiter";
import { healthCheckRouter } from "./routes/healthCheck";
import { v1Router } from "./routes/v1";
import { supabaseService } from "./services/supabase.service";
import { webSocketService } from "./services/websocket.service";
import { redisService } from "./services/redis.service";
import { v4 as uuidv4 } from "uuid";
// Removed RunPod integration and scheduler

const app = express();
const PORT = process.env.PORT || 3000;

// Middleware
app.use(helmet());

// Attach/propagate a request ID for correlation across FE/BE
app.use((req, res, next) => {
  let reqId = (req.headers["x-request-id"] as string) || "";
  if (!reqId) {
    reqId = uuidv4();
  }
  res.setHeader("X-Request-Id", reqId);
  (req as any).requestId = reqId;
  next();
});

// Structured HTTP logging (method, url, status, timing) with request ID
app.use(httpLogger as any);

// CORS configuration with explicit origin function + logging for clarity
const rawCorsOrigins = process.env.CORS_ORIGINS || "";
const allowedOrigins = rawCorsOrigins
  .split(",")
  .map((o) => o.trim())
  .filter(Boolean);

logger.info(
  `CORS configuration: allowedOrigins=${
    allowedOrigins.length ? allowedOrigins.join("|") : "<ALL>"
  }`,
);

const corsOptions: cors.CorsOptions = {
  origin: (origin, callback) => {
    // Allow non-browser or same-origin requests with no Origin header
    if (!origin) return callback(null, true);

    if (allowedOrigins.length === 0 || allowedOrigins.includes(origin)) {
      return callback(null, true);
    }

    logger.warn(
      `CORS blocked request from origin=${origin}; allowed=${allowedOrigins.join(",")}`,
    );
    return callback(new Error("Not allowed by CORS"));
  },
  credentials: true,
  methods: ["GET", "POST", "PUT", "DELETE", "OPTIONS"],
  // Let the cors package reflect Access-Control-Request-Headers automatically
  preflightContinue: false,
  optionsSuccessStatus: 204,
};
app.use(cors(corsOptions));
// Handle CORS preflight for all routes
app.options("*", cors(corsOptions));

app.use(express.json());
app.use(express.urlencoded({ extended: true }));
// Apply rate limiting middleware
app.use(rateLimiterMiddleware);

// Lightweight human-readable request log including origin and referer
app.use((req, res, next) => {
  const requestId = (req as any).requestId || req.headers["x-request-id"];
  const origin = req.headers["origin"];
  const referer = req.headers["referer"];
  logger.info("HTTP request", { method: req.method, url: req.originalUrl, requestId, origin, referer });
  next();
});

// Routes
app.use("/health", healthCheckRouter);
app.use("/v1", v1Router);

// 404 handler
app.use(notFoundHandler);

// Error handler - must be last middleware
app.use(errorHandler);

// Start server
const server = createServer(app);

const startServer = async () => {
  try {
    // Initialize Supabase service (optional - don't fail if it fails)
    try {
      await supabaseService.initialize();
    } catch (error) {
      logger.warn("Supabase initialization failed, continuing without Supabase:", error);
    }

    // Initialize Redis connection
    await redisService.connect();

    // Start the HTTP server - bind to 0.0.0.0 for Fly.io compatibility
    server.listen(Number(PORT), "0.0.0.0", () => {
      logger.info(`Server is running on 0.0.0.0:${PORT}`);
      logger.info(`Environment: ${process.env.NODE_ENV || "development"}`);
    });

    // Initialize WebSocket service after server is listening
    webSocketService.initialize(server);

    // RunPod scheduler removed; no background provider schedulers in Modal setup

    // Graceful shutdown
    const shutdown = async () => {
      logger.info("Shutting down server...");

      // No background provider schedulers to stop

      // Close WebSocket service
      webSocketService.shutdown();

      // Close Redis connection
      await redisService.disconnect();

      // Close HTTP server
      server.close(async () => {
        // Supabase client doesn't need explicit cleanup
        logger.info("Server has been shut down");
        process.exit(0);
      });

      // Force close after 5 seconds
      setTimeout(() => {
        logger.error("Forcing server shutdown");
        process.exit(1);
      }, 5000);
    };

    // Handle shutdown signals
    process.on("SIGTERM", shutdown);
    process.on("SIGINT", shutdown);
  } catch (error) {
    logger.error("Failed to start server:", error);

    await redisService
      .disconnect()
      .catch((e: any) => logger.error("Error closing Redis connection:", e));
    process.exit(1);
  }
};

startServer();

// Handle unhandled promise rejections
process.on("unhandledRejection", (reason, promise) => {
  logger.error("Unhandled Rejection at:", promise, "reason:", reason);
  // Consider restarting the server or performing cleanup
});

// Handle uncaught exceptions
process.on("uncaughtException", (error) => {
  logger.error("=== UNCAUGHT EXCEPTION ===");
  logger.error("Error:", error);
  logger.error("Error name:", error?.name || "Unknown");
  logger.error("Error message:", error?.message || "No message");
  logger.error("Error stack:", error?.stack || "No stack trace");
  logger.error("Error cause:", (error as any)?.cause || "No cause");
  logger.error("=======================");
  process.exit(1);
});

export { app };
