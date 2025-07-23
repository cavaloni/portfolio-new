import pino from "pino";
import pinoHttp from "pino-http";
import { Request, Response } from "express";

const isProduction = process.env.NODE_ENV === "production";

// Create a logger instance
const logger = pino({
  level: process.env.LOG_LEVEL || "info",
  transport: isProduction
    ? undefined
    : {
        target: "pino-pretty",
        options: {
          colorize: true,
          translateTime: "SYS:yyyy-mm-dd HH:MM:ss",
          ignore: "pid,hostname",
        },
      },
});

// HTTP request logger middleware
const httpLogger = pinoHttp({
  logger,
  customLogLevel: (res: Response, err: Error) => {
    if (res.statusCode >= 500 || err) {
      return "error";
    } else if (res.statusCode >= 400) {
      return "warn";
    }
    return "info";
  },
  serializers: {
    req: (req: Request) => ({
      method: req.method,
      url: req.url,
      query: req.query,
      params: req.params,
      headers: {
        "user-agent": req.headers["user-agent"],
        "x-request-id": req.headers["x-request-id"],
      },
      // Don't log the entire body as it might contain sensitive data
      body: req.body ? "[REDACTED]" : undefined,
    }),
    res: (res: Response) => ({
      statusCode: res.statusCode,
      headers: res.getHeaders(),
    }),
  },
});

export { logger, httpLogger };
