import { Router } from "express";
import { z } from "zod";
import { optionalClerkAuthMiddleware } from "../middleware/clerkAuth.js";
import rateLimit from "express-rate-limit";
import { getSupabaseClient } from "../db/supabase.js";
import { logger } from "../utils/logger.js";

const router = Router();

// Allow anonymous feedback submissions to reduce friction.
// If a user is authenticated via Clerk, `req.userId` will be set by the middleware.
// We intentionally do NOT force authentication here.

// Apply optional auth so if a token is present it's validated, but
// lack of token will not cause a 401. This protects against environments
// that might run global auth checks earlier in the middleware chain.
router.use(optionalClerkAuthMiddleware);

// Rate limiter: anonymous users limited to 60 requests/hour by IP.
// Authenticated users (with req.userId) receive a much higher limit.
const feedbackLimiter = rateLimit({
  windowMs: 60 * 60 * 1000, // 1 hour
  max: (req: any) => {
    return req.userId ? 1000 : 60;
  },
  keyGenerator: (req: any) => {
    // Prefer userId for authenticated users, otherwise fall back to IP
    return req.userId ?? req.ip;
  },
  standardHeaders: true,
  legacyHeaders: false,
});

router.use(feedbackLimiter);

const schema = z.object({
  profile_id: z.string().optional(),
  category: z.enum(["Bugs", "Improvements", "Thoughts", "Secrets"]),
  message: z.string().min(1).max(5000).transform((v) => v.trim()),
  metadata: z.any().optional(),
});

router.post("/", async (req, res, next) => {
  const parsed = schema.safeParse(req.body);
  if (!parsed.success) {
    return res.status(400).json({ error: parsed.error.message || "Invalid payload" });
  }

  const supabase = getSupabaseClient();
  try {
    const { data, error } = await supabase.from("feedback_comments").insert({
      profile_id: parsed.data.profile_id ?? null,
      user_id: (req as any).userId ?? null,
      category: parsed.data.category,
      message: parsed.data.message,
      metadata: parsed.data.metadata ?? {},
    });
    if (error) throw error;
    logger.info({ userId: (req as any).userId, profileId: parsed.data.profile_id }, "Feedback comment stored");
    return res.json({ status: "ok" });
  } catch (err) {
    logger.error({ err }, "Failed to store feedback comment");
    return next(err);
  }
});

export default router;
