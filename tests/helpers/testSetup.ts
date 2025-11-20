/**
 * Test helpers and setup utilities
 */

import { Request, Response, NextFunction } from "express";

/**
 * Mock Clerk authentication middleware for testing
 * Sets userId from x-clerk-user-id header
 */
export function mockClerkAuth(req: Request, res: Response, next: NextFunction) {
  const userId = req.headers["x-clerk-user-id"] as string;
  if (userId) {
    req.userId = userId;
    next();
  } else {
    res.status(401).json({ error: "Unauthorized" });
  }
}

/**
 * Create test profile data
 */
export function createTestProfile(profileId: string, userId: string) {
  return {
    profile_id: profileId,
    user_id: userId,
    tags: ["SYSTEMATIC", "ACTION_READY"],
    baseline_ipp: 65,
    baseline_but: 72,
    strengths: ["Quick execution", "Strategic thinking"],
  };
}

/**
 * Compute test signature (simplified for testing)
 */
export function computeTestSignature(payload: Record<string, any>): string {
  return Buffer.from(JSON.stringify(payload))
    .toString("hex")
    .slice(0, 64)
    .padEnd(64, "0");
}

