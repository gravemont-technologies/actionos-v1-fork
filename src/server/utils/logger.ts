/**
 * Structured Logging Infrastructure
 * 
 * Production-grade logging using Pino.
 * - JSON output for production, pretty for development
 * - Request ID tracking (correlation IDs)
 * - Contextual logging (user ID, profile ID, request path)
 */

import pino from "pino";
import { env, isDevelopment } from "../config/env.js";

// Create base logger
const baseLogger = pino({
  level: process.env.LOG_LEVEL || (isDevelopment() ? "debug" : "info"),
  transport: isDevelopment()
    ? {
        target: "pino-pretty",
        options: {
          colorize: true,
          translateTime: "HH:MM:ss Z",
          ignore: "pid,hostname",
        },
      }
    : undefined,
  base: {
    env: env.NODE_ENV,
  },
});

/**
 * Logger instance with context support
 */
export const logger = {
  error: (obj: object | string, msg?: string, ...args: unknown[]) => {
    if (typeof obj === "string") {
      baseLogger.error({ msg: obj }, ...args);
    } else {
      baseLogger.error(obj, msg, ...args);
    }
  },

  warn: (obj: object | string, msg?: string, ...args: unknown[]) => {
    if (typeof obj === "string") {
      baseLogger.warn({ msg: obj }, ...args);
    } else {
      baseLogger.warn(obj, msg, ...args);
    }
  },

  info: (obj: object | string, msg?: string, ...args: unknown[]) => {
    if (typeof obj === "string") {
      baseLogger.info({ msg: obj }, ...args);
    } else {
      baseLogger.info(obj, msg, ...args);
    }
  },

  debug: (obj: object | string, msg?: string, ...args: unknown[]) => {
    if (typeof obj === "string") {
      baseLogger.debug({ msg: obj }, ...args);
    } else {
      baseLogger.debug(obj, msg, ...args);
    }
  },

  /**
   * Create a child logger with additional context
   */
  child: (bindings: Record<string, unknown>) => {
    return baseLogger.child(bindings);
  },
};

/**
 * Create a logger with request context
 */
export function createRequestLogger(requestId: string, userId?: string, profileId?: string) {
  const context: Record<string, unknown> = { requestId };
  if (userId) context.userId = userId;
  if (profileId) context.profileId = profileId;

  return logger.child(context);
}

