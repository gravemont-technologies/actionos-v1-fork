/**
 * Clerk Token Verification Middleware
 * 
 * Verifies Clerk JWT tokens using @clerk/backend SDK.
 * Extracts user ID from verified token and attaches to request.
 * Handles token expiration and invalid tokens.
 */

import { Request, Response, NextFunction } from "express";
import { createClerkClient } from "@clerk/backend";
import { env } from "../config/env.js";
import { AuthenticationError } from "./errorHandler.js";
import { logger } from "../utils/logger.js";

declare global {
  namespace Express {
    interface Request {
      userId?: string;
    }
  }
}

/**
 * Middleware to verify Clerk JWT token
 * 
 * Extracts token from Authorization header or x-clerk-token header.
 * Verifies token and attaches userId to request.
 * 
 * @param options.skipVerification - Skip token verification (for development only)
 */
export async function clerkAuthMiddleware(
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> {
  const isTest = process.env.NODE_ENV === "test" || env.NODE_ENV === "test";
  const isDevelopment = env.NODE_ENV === "development";
  
  // In development mode, prioritize header-based auth for easier workflow
  // This allows using x-clerk-user-id header even when CLERK_SECRET_KEY is set
  // Production always requires proper token verification
  if (isDevelopment && req.header("x-clerk-user-id")) {
    const userId = req.header("x-clerk-user-id") || req.headers["x-clerk-user-id"] as string | undefined;
    if (userId) {
      req.userId = userId;
      return next();
    }
  }
  
  // Skip in test mode or if CLERK_SECRET_KEY not set
  if (isTest || !env.CLERK_SECRET_KEY) {
    // Fallback to header for development/testing
    const userId = req.header("x-clerk-user-id") || req.headers["x-clerk-user-id"] as string | undefined;
    if (userId) {
      req.userId = userId;
      return next();
    }
    // In test mode, allow requests without auth (for health checks, etc.)
    if (isTest) {
      // Set a default test user ID if none provided (for tests that don't need auth)
      req.userId = "test_user_default";
      return next();
    }
    // In dev mode without key, require header
    return next(new AuthenticationError("Missing x-clerk-user-id header"));
  }

  try {
    // Extract token from Authorization header or x-clerk-token
    const authHeader = req.header("authorization");
    const tokenHeader = req.header("x-clerk-token");

    let token: string | undefined;

    if (authHeader?.startsWith("Bearer ")) {
      token = authHeader.substring(7);
    } else if (tokenHeader) {
      token = tokenHeader;
    }

    if (!token) {
      return next(new AuthenticationError("Missing authentication token"));
    }

    // Verify token using Clerk backend SDK
    try {
      const client = createClerkClient({
        secretKey: env.CLERK_SECRET_KEY!,
      });
      const session = await client.verifyToken(token);

      // Extract user ID from verified session
      req.userId = session.sub; // Clerk uses 'sub' for user ID
      next();
    } catch (error) {
      const requestLogger = logger.child({
        requestId: req.id,
        path: req.path,
      });

      const errorMessage = error instanceof Error ? error.message : String(error);
      requestLogger.warn({ error: errorMessage }, "Token verification failed");

      if (errorMessage.includes("expired")) {
        return next(new AuthenticationError("Token expired"));
      } else {
        return next(new AuthenticationError("Invalid authentication token"));
      }
    }
  } catch (error) {
    next(new AuthenticationError("Authentication failed"));
  }
}

/**
 * Optional middleware - only verifies if token is present
 * Useful for routes that work with or without authentication
 */
export async function optionalClerkAuthMiddleware(
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> {
  // Try to verify, but don't fail if no token
  const authHeader = req.header("authorization");
  const tokenHeader = req.header("x-clerk-token");

  if (!authHeader && !tokenHeader) {
    // No token present, skip verification
    return next();
  }

  // Token present, verify it
  return clerkAuthMiddleware(req, res, next);
}

