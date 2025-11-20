/**
 * Authentication mocking for tests
 * 
 * In test environment, we bypass Clerk verification and use x-clerk-user-id header directly
 */

import { Request, Response, NextFunction } from "express";

/**
 * Mock authentication middleware for tests
 * Reads userId from x-clerk-user-id header (no actual token verification)
 */
export function mockAuthMiddleware(req: Request, res: Response, next: NextFunction) {
  const userId = req.headers["x-clerk-user-id"] as string;
  
  if (!userId) {
    return res.status(401).json({ error: "Unauthorized: Missing x-clerk-user-id header" });
  }
  
  req.userId = userId;
  next();
}

