import pino from "pino";
import pinoHttp from "pino-http";
import { Request, Response } from "express";

const isProduction = process.env.NODE_ENV === "production";

// Base pino instance
const baseLogger = pino({
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

function normalizeMeta(meta?: unknown, rest: unknown[] = []) {
  if (meta === undefined && rest.length === 0) return undefined as unknown;
  const extra = rest.length ? { args: rest } : {};
  if (meta instanceof Error) {
    return {
      err: {
        name: meta.name,
        message: meta.message,
        stack: meta.stack,
        cause: (meta as any)?.cause,
      },
      ...extra,
    };
  }
  if (typeof meta === "object" && meta !== null) {
    return { ...(meta as Record<string, unknown>), ...extra };
  }
  return { value: String(meta), ...extra };
}

type LogMethod = (message: string, meta?: unknown, ...rest: unknown[]) => void;

const logger: {
  info: LogMethod;
  warn: LogMethod;
  error: LogMethod;
  debug: LogMethod;
} = {
  info: (message, meta, ...rest) => {
    const obj = normalizeMeta(meta, rest);
    obj === (undefined as unknown)
      ? baseLogger.info(message)
      : baseLogger.info(obj as any, message);
  },
  warn: (message, meta, ...rest) => {
    const obj = normalizeMeta(meta, rest);
    obj === (undefined as unknown)
      ? baseLogger.warn(message)
      : baseLogger.warn(obj as any, message);
  },
  error: (message, meta, ...rest) => {
    const obj = normalizeMeta(meta, rest);
    obj === (undefined as unknown)
      ? baseLogger.error(message)
      : baseLogger.error(obj as any, message);
  },
  debug: (message, meta, ...rest) => {
    const obj = normalizeMeta(meta, rest);
    obj === (undefined as unknown)
      ? baseLogger.debug(message)
      : baseLogger.debug(obj as any, message);
  },
};

// HTTP request logger middleware (use baseLogger as required by pino-http)
const httpLogger = pinoHttp({
  logger: baseLogger,
  customLogLevel: (res: Response, err: Error) => {
    if ((res as any)?.statusCode >= 500 || err) {
      return "error";
    } else if ((res as any)?.statusCode >= 400) {
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
      body: req.body ? "[REDACTED]" : undefined,
    }),
    res: (res: Response) => {
      const anyRes = res as any;
      let headers: any = undefined;
      try {
        if (typeof anyRes?.getHeaders === "function") {
          headers = anyRes.getHeaders();
        } else if (anyRes?.headers) {
          headers = anyRes.headers;
        } else if (anyRes?._headers) {
          headers = anyRes._headers;
        }
      } catch {
        // ignore header serialization errors
      }
      return {
        statusCode: anyRes?.statusCode,
        headers,
      };
    },
  },
});

export { logger, httpLogger };
