/**
 * Request Context Middleware
 * 
 * Generates unique request ID per request and attaches to request/response.
 * Enables request tracing across the application.
 */

import { Request, Response, NextFunction } from "express";
import { randomUUID } from "crypto";

declare global {
  namespace Express {
    interface Request {
      id: string;
    }
  }
}

/**
 * Middleware to generate and attach request ID
 */
export function requestContextMiddleware(req: Request, res: Response, next: NextFunction): void {
  // Generate unique request ID
  const requestId = randomUUID();
  req.id = requestId;

  // Attach to response headers for client correlation
  res.setHeader("X-Request-ID", requestId);

  next();
}

