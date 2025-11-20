import { Router, Request, Response, NextFunction } from "express";
import { z } from "zod";
import { clerkAuthMiddleware } from "../middleware/clerkAuth.js";
import { SignatureCache } from "../cache/signatureCache.js";
import { ValidationError, AuthenticationError } from "../middleware/errorHandler.js";
import { logger } from "../utils/logger.js";
import { insightsRateLimiter } from "../middleware/rateLimiter.js";

const router = Router();
router.use(clerkAuthMiddleware);

// Helper middleware to ensure userId exists (guarantees non-null after clerkAuthMiddleware)
function requireUserId(req: Request, res: Response, next: NextFunction): void {
  if (!req.userId) {
    return next(new AuthenticationError("User ID required. Please sign in."));
  }
  next();
}

// Save insight
const saveInsightSchema = z.object({
  signature: z.string().min(32).max(128).regex(/^[a-f0-9]+$/i),
  title: z.string().max(200).trim().optional(),
  tags: z.array(z.string().max(50)).max(10).optional(),
});

router.post("/save", insightsRateLimiter, requireUserId, async (req, res, next) => {
  const requestLogger = logger.child({
    requestId: req.id,
    userId: req.userId,
    signature: req.body?.signature,
  });

  const parsed = saveInsightSchema.safeParse(req.body);
  if (!parsed.success) {
    return next(new ValidationError(parsed.error.message));
  }

  const cache: SignatureCache | undefined = req.app.locals.signatureCache;
  if (!cache) {
    return next(new Error("Server not initialized"));
  }

  try {
    // Check if signature exists (even if expired)
    const existing = await cache.get(parsed.data.signature, { 
      includeSaved: true, 
      userId: req.userId! // Guaranteed non-null by requireUserId
    });
    
    if (!existing) {
      return next(new ValidationError("Analysis not found. Please run analysis first."));
    }

    // Check if already saved (idempotent) - prevents race conditions
    if (existing.isSaved && existing.userId === req.userId) {
      // Update metadata if provided
      if (parsed.data.title !== undefined || parsed.data.tags !== undefined) {
        await cache.updateInsight(
          parsed.data.signature,
          req.userId!,
          { title: parsed.data.title, tags: parsed.data.tags }
        );
      }
      return res.json({ status: "success", message: "Already saved" });
    }

    // Save insight (atomic operation)
    await cache.saveInsight(
      parsed.data.signature,
      req.userId!,
      parsed.data.title,
      parsed.data.tags
    );

    requestLogger.info({ signature: parsed.data.signature }, "Insight saved");
    return res.json({ status: "success" });
  } catch (error) {
    requestLogger.error({ error }, "Save insight failed");
    return next(error);
  }
});

// Get user's insights
router.get("/", insightsRateLimiter, requireUserId, async (req, res, next) => {
  const requestLogger = logger.child({
    requestId: req.id,
    userId: req.userId,
  });

  const cache: SignatureCache | undefined = req.app.locals.signatureCache;
  if (!cache) {
    return next(new Error("Server not initialized"));
  }

  try {
    const limit = Math.min(parseInt(req.query.limit as string) || 20, 100);
    const offset = parseInt(req.query.offset as string) || 0;
    const search = req.query.search as string | undefined;

    const insights = await cache.getUserInsights(req.userId!, { // Guaranteed non-null by requireUserId
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
});

// Get single insight
router.get("/:signature", insightsRateLimiter, requireUserId, async (req, res, next) => {
  const cache: SignatureCache | undefined = req.app.locals.signatureCache;
  if (!cache) {
    return next(new Error("Server not initialized"));
  }

  try {
    const insight = await cache.getInsight(req.params.signature, req.userId!); // Guaranteed non-null by requireUserId
    if (!insight) {
      return res.status(404).json({ 
        status: "error", 
        message: "Insight not found or not owned by user" 
      });
    }
    return res.json({ status: "success", insight });
  } catch (error) {
    return next(error);
  }
});

// Update insight
router.patch("/:signature", insightsRateLimiter, requireUserId, async (req, res, next) => {
  const updateInsightSchema = z.object({
    title: z.string().max(200).trim().optional(),
    tags: z.array(z.string().max(50)).max(10).optional(),
  });

  const parsed = updateInsightSchema.safeParse(req.body);
  if (!parsed.success) {
    return next(new ValidationError(parsed.error.message));
  }

  const cache: SignatureCache | undefined = req.app.locals.signatureCache;
  if (!cache) {
    return next(new Error("Server not initialized"));
  }

  try {
    await cache.updateInsight(
      req.params.signature,
      req.userId!, // Guaranteed non-null by requireUserId
      parsed.data
    );
    return res.json({ status: "success" });
  } catch (error) {
    return next(error);
  }
});

// Unsave insight
router.delete("/:signature", insightsRateLimiter, requireUserId, async (req, res, next) => {
  const cache: SignatureCache | undefined = req.app.locals.signatureCache;
  if (!cache) {
    return next(new Error("Server not initialized"));
  }

  try {
    await cache.unsaveInsight(req.params.signature, req.userId!); // Guaranteed non-null by requireUserId
    return res.json({ status: "success" });
  } catch (error) {
    return next(error);
  }
});

export default router;

