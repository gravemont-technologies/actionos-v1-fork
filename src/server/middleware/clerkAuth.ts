/**
 * Clerk Token Verification Middleware
 * 
 * Verifies Clerk JWT tokens using @clerk/backend SDK.
 * Extracts user ID from verified token and attaches to request.
 * Handles token expiration and invalid tokens.
 */

import { Request, Response, NextFunction } from 'express';
import { verifyToken } from '@clerk/backend';
import { AppError } from './errorHandler.js';

/**
 * Middleware to verify a Clerk JWT token.
 * It extracts the token from the Authorization header, verifies it using the Clerk SDK,
 * and attaches the user ID and session ID to `res.locals`.
 *
 * This middleware provides robust error handling by passing structured `AppError`
 * instances to the central error handler.
 */
export async function clerkAuthMiddleware(
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    const secretKey = process.env.CLERK_SECRET_KEY;
    if (!secretKey) {
      console.error('[clerkAuth] CLERK_SECRET_KEY is not configured.');
      // Pass a structured error to the central handler
      return next(new AppError('MISSING_SECRET_KEY', 'Server configuration error', 500));
    }

    const authHeader = req.headers.authorization;
    const token = authHeader?.replace('Bearer ', '').trim();

    if (!token) {
      return next(new AppError('NO_TOKEN', 'Missing authentication token', 401));
    }

    const payload = await verifyToken(token, { secretKey });
    
    // Use standard Clerk claims: sub for userId, jti for session identifier
    const userId = payload.userId || payload.sub;
    if (!userId || typeof userId !== 'string') {
      return next(new AppError('TOKEN_MISSING_USERID', 'Token is valid but missing a valid userId claim', 401));
    }
    
    // Use jti (JWT ID) as session identifier since sid is not included by Clerk
    const sessionId = (payload.sid || payload.jti) as string;
    if (!sessionId) {
        return next(new AppError('TOKEN_MISSING_SID', 'Token is valid but missing session ID (sid/jti) claim', 401));
    }

    // Store in res.locals (type-safe due to src/types/express.d.ts)
    res.locals.userId = userId;
    res.locals.sessionId = sessionId;
    
    next();
  } catch (error: any) {
    const errorCode = error.code || 'TOKEN_INVALID';
    const errorMessage = error.message || 'Authentication failed';
    
    console.error(`[clerkAuth] ${errorCode}:`, errorMessage);
    
    // Pass a structured AppError to the central error handler
    next(new AppError(errorCode, 'Authentication failed', 401));
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

