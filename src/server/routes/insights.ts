import { Router } from "express";
import { z } from "zod";
import { clerkAuthMiddleware } from "../middleware/clerkAuth.js";
import { SignatureCache } from "../cache/signatureCache.js";
import { getSupabaseClient } from "../db/supabase.js";
import { getSignatureCache } from "../store/singletons.js";
import { ValidationError, AppError } from "../middleware/errorHandler.js";
import { logger } from "../utils/logger.js";
import { insightsRateLimiter } from "../middleware/rateLimiter.js";
import { asyncHandler } from "../middleware/asyncHandler.js";

const router = Router();
// Apply auth middleware to all insight routes
router.use(clerkAuthMiddleware);

// Schema for saving an insight
const saveInsightSchema = z.object({
  signature: z.string().min(32).max(128).regex(/^[a-f0-9]+$/i),
  title: z.string().max(200).trim().optional(),
  tags: z.array(z.string().max(50)).max(10).optional(),
});

router.post(
  "/save",
  insightsRateLimiter,
  asyncHandler(async (req, res, next) => {
    const userId = res.locals.userId; // Use res.locals
    const requestLogger = logger.child({
      requestId: req.id,
      userId: userId,
      signature: req.body?.signature,
    });

    const parsed = saveInsightSchema.safeParse(req.body);
    if (!parsed.success) {
      return next(new ValidationError(parsed.error.message));
    }

    const { signature, title, tags } = parsed.data;
    const cache: SignatureCache = getSignatureCache();

    // Check if signature exists (even if expired)
    const existing = await cache.get(signature, {
      includeSaved: true,
      userId: userId,
    });

    if (!existing) {
      return next(new ValidationError("Analysis not found. Please run analysis first."));
    }

    // Check if already saved by this user (idempotent)
    if (existing.isSaved && existing.userId === userId) {
      // If already saved, update metadata if provided
      if (title !== undefined || tags !== undefined) {
        await cache.updateInsight(signature, userId, { title, tags });
      }
      return res.json({ status: "success", message: "Already saved" });
    }

    // Enforce project limit: maximum 5 saved insights per user
    const supabase = getSupabaseClient();
    const { count, error: countError } = await supabase
      .from("signature_cache")
      .select("signature", { count: "exact", head: true })
      .eq("user_id", userId)
      .eq("is_saved", true)
      .is("expires_at", null);

    if (countError) {
      // Log and continue (allow save) - don't block saves on counting errors
      requestLogger.warn({ error: countError }, "Failed to get saved insights count");
    } else if (typeof count === "number" && count >= 5) {
      return next(new AppError("PROJECT_LIMIT_REACHED", "Maximum 5 projects allowed.", 403));
    }

    // Save insight (atomic operation)
    await cache.saveInsight(signature, userId, title, tags);

    requestLogger.info({ signature }, "Insight saved");
    res.json({ status: "success" });
  })
);

// Get user's insights
router.get(
  "/",
  insightsRateLimiter,
  asyncHandler(async (req, res, next) => {
    const userId = res.locals.userId; // Use res.locals
    const requestLogger = logger.child({
      requestId: req.id,
      userId: userId,
    });

    const cache: SignatureCache = getSignatureCache();

    try {
      const limit = Math.min(parseInt(req.query.limit as string) || 20, 100);
      const offset = parseInt(req.query.offset as string) || 0;
      const search = req.query.search as string | undefined;

      const insights = await cache.getUserInsights(userId, {
        // Guaranteed non-null by requireUserId
        limit,
        offset,
        search,
      });

      return res.json({
        status: "success",
        insights: insights.map((insight) => ({
          signature: insight.signature,
          title: insight.title,
          tags: insight.tags,
          situation: insight.normalizedInput.situation,
          goal: insight.normalizedInput.goal,
          createdAt: insight.createdAt,
          summary: insight.response.summary,
        })),
        pagination: {
          limit,
          offset,
          hasMore: insights.length === limit,
        },
      });
    } catch (error) {
      requestLogger.error({ error }, "Get insights failed");
      return next(error);
    }
  })
);

// Get count of saved insights (projects) for current user
// IMPORTANT: Must be defined BEFORE /:signature route to avoid matching "count" as a signature
router.get(
  "/count",
  insightsRateLimiter,
  asyncHandler(async (req, res, next) => {
    const userId = res.locals.userId; // Use res.locals
    try {
      const supabase = getSupabaseClient();
      const { count, error } = await supabase
        .from("signature_cache")
        .select("signature", { count: "exact", head: true })
        .eq("user_id", userId)
        .eq("is_saved", true)
        .is("expires_at", null);

      if (error) {
        return next(error);
      }

      return res.json({ status: "success", count: count ?? 0 });
    } catch (error) {
      return next(error);
    }
  })
);

// Get single insight
router.get(
  "/:signature",
  insightsRateLimiter,
  asyncHandler(async (req, res, next) => {
    const userId = res.locals.userId; // Use res.locals
    const cache: SignatureCache = getSignatureCache();

    try {
      const insight = await cache.getInsight(req.params.signature, userId); // Guaranteed non-null by requireUserId
      if (!insight) {
        return res.status(404).json({
          status: "error",
          message: "Insight not found or not owned by user",
        });
      }
      return res.json({ status: "success", insight });
    } catch (error) {
      return next(error);
    }
  })
);

// Update insight
router.patch(
  "/:signature",
  insightsRateLimiter,
  asyncHandler(async (req, res, next) => {
    const userId = res.locals.userId; // Use res.locals
    const updateInsightSchema = z.object({
      title: z.string().max(200).trim().optional(),
      tags: z.array(z.string().max(50)).max(10).optional(),
    });

    const parsed = updateInsightSchema.safeParse(req.body);
    if (!parsed.success) {
      return next(new ValidationError(parsed.error.message));
    }

    const cache: SignatureCache = getSignatureCache();

    try {
      await cache.updateInsight(req.params.signature, userId, parsed.data);
      return res.json({ status: "success" });
    } catch (error) {
      return next(error);
    }
  })
);

// Unsave insight
router.delete(
  "/:signature",
  insightsRateLimiter,
  asyncHandler(async (req, res, next) => {
    const userId = res.locals.userId; // Use res.locals
    const cache: SignatureCache = getSignatureCache();

    try {
      await cache.unsaveInsight(req.params.signature, userId); // Guaranteed non-null by requireUserId
      return res.json({ status: "success" });
    } catch (error) {
      return next(error);
    }
  })
);

export default router;

