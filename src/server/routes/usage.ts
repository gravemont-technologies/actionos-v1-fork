import express, { Request, Response } from "express";
import { tokenTracker } from "../llm/tokenTracker.js";
import { optionalClerkAuthMiddleware } from "../middleware/auth.js";
import { logger } from "../utils/logger.js";

const router = express.Router();

/**
 * GET /api/usage/tokens
 * 
 * Get token usage statistics for the authenticated user
 * Returns current usage, remaining tokens, limit, and percentage
 * 
 * Response format:
 * {
 *   used: number,        // Tokens used today
 *   remaining: number,   // Tokens remaining today
 *   limit: number,       // Daily token limit (50,000)
 *   percentage: number   // Percentage of limit used (0-100)
 * }
 */
router.get("/tokens", optionalClerkAuthMiddleware, async (req: Request, res: Response) => {
  try {
    const userId = (req as any).userId || null;

    if (!userId) {
      return res.status(401).json({ 
        error: "Authentication required",
        message: "You must be logged in to view token usage"
      });
    }

    const usage = await tokenTracker.getUsage(userId);

    logger.info({ userId, usage }, "Token usage retrieved");

    res.json(usage);
  } catch (error) {
    logger.error({ error }, "Error fetching token usage");
    res.status(500).json({ 
      error: "Failed to fetch token usage",
      message: (error as Error).message
    });
  }
});

export default router;
