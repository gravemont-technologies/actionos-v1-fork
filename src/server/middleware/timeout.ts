/**
 * Request Timeout Middleware
 * 
 * Sets request timeout with cleanup on timeout.
 * Per-route timeouts can be configured.
 */

import { Request, Response, NextFunction } from "express";
import { logger } from "../utils/logger.js";

/**
 * Create timeout middleware with configurable timeout
 */
export function createTimeoutMiddleware(timeoutMs: number) {
  return (req: Request, res: Response, next: NextFunction): void => {
    const timeout = setTimeout(() => {
      if (!res.headersSent) {
        const requestLogger = logger.child({
          requestId: req.id,
          path: req.path,
          method: req.method,
        });
        requestLogger.warn({ timeoutMs }, "Request timeout");

        res.status(504).json({
          error: "Request timeout",
          code: "TIMEOUT",
          requestId: req.id,
        });
      }
    }, timeoutMs);

    // Clear timeout when response is sent
    res.on("finish", () => {
      clearTimeout(timeout);
    });

    next();
  };
}

/**
 * Default timeout middleware (30 seconds)
 */
export const timeoutMiddleware = createTimeoutMiddleware(30000);

/**
 * Long timeout middleware for LLM calls (60 seconds)
 */
export const longTimeoutMiddleware = createTimeoutMiddleware(60000);

