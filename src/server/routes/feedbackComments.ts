import { Router } from "express";
import { z } from "zod";
import { optionalClerkAuthMiddleware } from "../middleware/optionalClerkAuth.js";
import rateLimit from "express-rate-limit";
import { getSupabaseClient } from "../db/supabase.js";
import { logger } from "../utils/logger.js";
import { asyncHandler } from "../middleware/asyncHandler.js";
import { AppError } from "../middleware/errorHandler.js";

const router = Router();

// Rate limiter: anonymous users (by IP) are limited more strictly than authenticated users (by userId).
const feedbackLimiter = rateLimit({
  windowMs: 60 * 60 * 1000, // 1 hour
  max: (req: any) => (res.locals.userId ? 1000 : 60),
  keyGenerator: (req: any, res: any) => res.locals.userId || req.ip,
  standardHeaders: true,
  legacyHeaders: false,
});

// Apply optional auth first, then the rate limiter that depends on its result.
router.use(optionalClerkAuthMiddleware);
router.use(feedbackLimiter);

const schema = z.object({
  profile_id: z.string().optional(),
  category: z.enum(["Bugs", "Improvements", "Thoughts", "Secrets 😉"]),
  message: z.string().min(1).max(5000).trim(),
  metadata: z.any().optional(),
});

router.post("/", asyncHandler(async (req, res, next) => {
  const parsed = schema.safeParse(req.body);
  if (!parsed.success) {
    return next(new AppError('VALIDATION_ERROR', parsed.error.message, 400));
  }

  const supabase = getSupabaseClient();
  const userId = res.locals.userId || null; // Get userId from optional auth, or null if anonymous
  const { profile_id, category, message, metadata } = parsed.data;

  const { error } = await supabase.from("feedback_comments").insert({
    profile_id: profile_id ?? null,
    user_id: userId,
    category: category,
    message: message,
    metadata: metadata ?? {},
  });

  if (error) {
    logger.error({ userId, profileId: profile_id, error }, "Failed to store feedback comment");
    throw new AppError('DB_INSERT_FAILED', 'Failed to store feedback comment', 500);
  }
  
  logger.info({ userId, profileId: profile_id }, "Feedback comment stored");
  res.status(201).json({ status: "ok" });
}));

export default router;
