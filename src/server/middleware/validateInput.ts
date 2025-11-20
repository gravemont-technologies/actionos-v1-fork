/**
 * Input Validation & Sanitization Middleware
 * 
 * Sanitizes text inputs (trim, normalize whitespace) before validation.
 * Can be applied globally or per-route.
 */

import { Request, Response, NextFunction } from "express";

/**
 * Sanitize a string value
 */
function sanitizeString(value: unknown): string {
  if (typeof value !== "string") {
    return String(value);
  }
  // Trim and normalize whitespace (collapse multiple spaces to single)
  return value.trim().replace(/\s+/g, " ");
}

/**
 * Sanitize an object's string properties recursively
 */
function sanitizeObject(obj: unknown): unknown {
  if (obj === null || obj === undefined) {
    return obj;
  }

  if (typeof obj === "string") {
    return sanitizeString(obj);
  }

  if (Array.isArray(obj)) {
    return obj.map(sanitizeObject);
  }

  if (typeof obj === "object") {
    const sanitized: Record<string, unknown> = {};
    for (const [key, value] of Object.entries(obj)) {
      sanitized[key] = sanitizeObject(value);
    }
    return sanitized;
  }

  return obj;
}

/**
 * Middleware to sanitize request body and query parameters
 */
export function sanitizeInput(req: Request, res: Response, next: NextFunction): void {
  // Sanitize body
  if (req.body && typeof req.body === "object") {
    req.body = sanitizeObject(req.body) as typeof req.body;
  }

  // Sanitize query parameters
  if (req.query && typeof req.query === "object") {
    for (const [key, value] of Object.entries(req.query)) {
      if (typeof value === "string") {
        req.query[key] = sanitizeString(value);
      }
    }
  }

  next();
}

