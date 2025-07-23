import { Request, Response, NextFunction } from "express";
import { logger } from "../utils/logger";

export class ApiError extends Error {
  constructor(
    public statusCode: number,
    message: string,
    public isOperational: boolean = true,
    public details?: Record<string, unknown>,
  ) {
    super(message);
    this.name = this.constructor.name;
    Error.captureStackTrace(this, this.constructor);
  }
}

export const errorHandler = (
  err: Error | ApiError,
  req: Request,
  res: Response,
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  next: NextFunction,
) => {
  // Default to 500 if status code is not set
  const statusCode =
    "statusCode" in err && err.statusCode ? err.statusCode : 500;
  const message = err.message || "Internal Server Error";
  const details = "details" in err ? err.details : undefined;

  // Log the error for debugging
  logger.error({
    message: err.message,
    stack: err.stack,
    statusCode,
    path: req.path,
    method: req.method,
    details,
  });

  // Don't leak error details in production for non-API errors
  const response: Record<string, unknown> = {
    status: "error",
    message,
  };

  // Include error details in development or for operational errors
  if (
    process.env.NODE_ENV !== "production" ||
    ("isOperational" in err && err.isOperational)
  ) {
    response.error = {
      name: err.name,
      message: err.message,
      ...(details && { details }),
      ...(process.env.NODE_ENV !== "production" && { stack: err.stack }),
    };
  }

  res.status(statusCode).json(response);
};

// 404 handler
export const notFoundHandler = (req: Request, res: Response) => {
  throw new ApiError(404, `Not Found - ${req.originalUrl}`);
};
