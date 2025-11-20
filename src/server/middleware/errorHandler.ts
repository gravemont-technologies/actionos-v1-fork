/**
 * Centralized Error Handling Middleware
 * 
 * Standardized error response format and classification.
 * Sanitizes error messages for production (no stack traces).
 * Integrates with logging infrastructure.
 */

import { Request, Response, NextFunction } from "express";
import { logger } from "../utils/logger.js";
import { isProduction } from "../config/env.js";

export class AppError extends Error {
  constructor(
    public code: string,
    message: string,
    public statusCode: number = 500,
    public isOperational: boolean = true
  ) {
    super(message);
    this.name = "AppError";
    Error.captureStackTrace(this, this.constructor);
  }
}

export class ValidationError extends AppError {
  constructor(message: string) {
    super("VALIDATION_ERROR", message, 400);
  }
}

export class AuthenticationError extends AppError {
  constructor(message: string = "Authentication required") {
    super("AUTHENTICATION_ERROR", message, 401);
  }
}

export class AuthorizationError extends AppError {
  constructor(message: string = "Access denied") {
    super("AUTHORIZATION_ERROR", message, 403);
  }
}

export class NotFoundError extends AppError {
  constructor(message: string = "Resource not found") {
    super("NOT_FOUND", message, 404);
  }
}

export class RateLimitError extends AppError {
  constructor(message: string = "Rate limit exceeded", retryAfter?: number) {
    super("RATE_LIMIT_EXCEEDED", message, 429);
    this.retryAfter = retryAfter;
  }
  retryAfter?: number;
}

export class ExternalServiceError extends AppError {
  constructor(message: string, public service: string) {
    super("EXTERNAL_SERVICE_ERROR", message, 502);
  }
}

/**
 * Error handling middleware (must be last)
 */
export function errorHandler(
  err: Error | AppError,
  req: Request,
  res: Response,
  next: NextFunction
): void {
  // Create request logger with context
  const requestLogger = logger.child({
    requestId: req.id,
    path: req.path,
    method: req.method,
  });

  // Determine error details
  let statusCode = 500;
  let code = "INTERNAL_ERROR";
  let message = "An internal error occurred";
  let retryAfter: number | undefined;

  if (err instanceof AppError) {
    statusCode = err.statusCode;
    code = err.code;
    message = err.message;
    if (err instanceof RateLimitError) {
      retryAfter = err.retryAfter;
    }
  } else {
    // Unknown error - log full details
    requestLogger.error(
      {
        error: err.message,
        stack: err.stack,
        name: err.name,
      },
      "Unhandled error"
    );
  }

  // Log error (with stack trace in development)
  if (statusCode >= 500) {
    requestLogger.error(
      {
        code,
        message,
        stack: isProduction() ? undefined : err.stack,
      },
      "Server error"
    );
  } else {
    requestLogger.warn({ code, message }, "Client error");
  }

  // Build response
  const response: {
    error: string;
    code: string;
    requestId?: string;
    retryAfter?: number;
    details?: unknown;
  } = {
    error: message,
    code,
    requestId: req.id,
  };

  if (retryAfter !== undefined) {
    response.retryAfter = retryAfter;
  }

  // Include error details in development
  if (!isProduction() && err instanceof AppError && !err.isOperational) {
    response.details = {
      stack: err.stack,
      name: err.name,
    };
  }

  res.status(statusCode).json(response);
}

/**
 * 404 handler for unmatched routes
 */
export function notFoundHandler(req: Request, res: Response, next: NextFunction): void {
  const err = new NotFoundError(`Route ${req.method} ${req.path} not found`);
  next(err);
}

