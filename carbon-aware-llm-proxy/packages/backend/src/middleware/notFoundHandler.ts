import { Request, Response, NextFunction } from "express";
import { logger } from "../utils/logger";

/**
 * Middleware to handle 404 Not Found errors
 */
export const notFoundHandler = (
  req: Request,
  res: Response,
  next: NextFunction,
) => {
  const error = new Error(`Not Found - ${req.originalUrl}`);
  logger.warn(`404 Not Found: ${req.method} ${req.originalUrl}`);
  res.status(404);
  next(error);
};

/**
 * Error handling middleware
 */
export const errorHandler = (
  err: Error,
  req: Request,
  res: Response,
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  _next: NextFunction,
) => {
  const statusCode = res.statusCode === 200 ? 500 : res.statusCode;

  logger.error("Request error", {
    message: err.message,
    stack: process.env.NODE_ENV === "production" ? "🥞" : err.stack,
    path: req.path,
    method: req.method,
  });

  res.status(statusCode).json({
    success: false,
    message: err.message,
    stack: process.env.NODE_ENV === "production" ? undefined : err.stack,
  });
};

// For backward compatibility
const errorHandlers = {
  notFoundHandler,
  errorHandler,
};

export default errorHandlers;
