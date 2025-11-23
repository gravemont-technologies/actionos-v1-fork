import { Request, Response, NextFunction } from 'express';
import { verifyToken } from '@clerk/backend';

/**
 * An optional authentication middleware for Clerk.
 * If a valid token is provided in the Authorization header, it will be verified,
 * and `res.locals.userId` and `res.locals.sessionId` will be set.
 * If no token is provided, it will simply pass through to the next middleware
 * without setting any user information and without erroring.
 * It will only error if a token is provided but is invalid.
 */
export async function optionalClerkAuthMiddleware(
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    const authHeader = req.headers.authorization;
    const token = authHeader?.replace('Bearer ', '').trim();

    // If no token is present, just continue to the next middleware.
    if (!token) {
      return next();
    }

    const secretKey = process.env.CLERK_SECRET_KEY;
    // If a token is present but the server is not configured to verify it,
    // it's better to log an error and proceed without authentication.
    if (!secretKey) {
      console.error('[optionalClerkAuth] A token was provided, but CLERK_SECRET_KEY is not configured.');
      return next();
    }

    // A token is present, so we attempt to verify it.
    const payload = await verifyToken(token, { secretKey });
    
    const userId = payload.userId;
    if (userId && typeof userId === 'string') {
      res.locals.userId = userId;
      res.locals.sessionId = payload.sid;
    }
    
    next();
  } catch (error: any) {
    // If the token is present but invalid (expired, malformed, etc.),
    // we pass an error to the central handler. This is an actual error state.
    const errorCode = error.code || 'TOKEN_INVALID';
    const errorMessage = error.message || 'Authentication failed';
    
    console.error(`[optionalClerkAuth] ${errorCode}:`, errorMessage);
    
    next({ status: 401, message: 'Provided token is invalid', code: errorCode, detail: errorMessage });
  }
}
