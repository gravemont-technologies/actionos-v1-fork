import { Router } from "express";
import { z } from "zod";
import { clerkAuthMiddleware } from "../middleware/clerkAuth.js";
import { validateOwnership } from "../middleware/validateOwnership.js";
import { ValidationError } from "../middleware/errorHandler.js";
import { recordStepMetrics, getProfileMetrics, getMetricsHistory } from "../utils/metricsCalculator.js";
import { logger } from "../utils/logger.js";
import { getSupabaseClient } from "../db/supabase.js";
import obs from "../utils/observability.js";

const router = Router();

// Apply auth middleware
router.use(clerkAuthMiddleware);

/**
 * POST /api/metrics/record
 * Record Step-1 completion metrics
 */
const recordMetricsSchema = z.object({
  profile_id: z.string().min(1),
  step_id: z.string().uuid(),
  signature: z.string().min(32),
  
  // IPP
  magnitude: z.number().int().min(1).max(10),
  reach: z.number().int().min(0),
  depth: z.number().min(0.1).max(3.0),
  
  // BUT
  ease_score: z.number().int().min(1).max(10),
  alignment_score: z.number().int().min(1).max(10),
  friction_score: z.number().int().min(0).max(10),
  had_unexpected_wins: z.boolean(),
  unexpected_wins_description: z.string().max(500).optional(),
  
  // Time
  estimated_minutes: z.number().int().min(1),
  actual_minutes: z.number().int().min(1),
  
  // Outcome
  outcome_description: z.string().max(1000).optional(),
});

router.post("/record", validateOwnership, async (req, res, next) => {
  const parsed = recordMetricsSchema.safeParse(req.body);
  
  if (!parsed.success) {
    return next(new ValidationError(parsed.error.message));
  }
  
  const data = parsed.data;
  
    try {
      await recordStepMetrics({
        stepId: data.step_id,
        profileId: data.profile_id,
        signature: data.signature,
        magnitude: data.magnitude,
        reach: data.reach,
        depth: data.depth,
        easeScore: data.ease_score,
        alignmentScore: data.alignment_score,
        frictionScore: data.friction_score,
        hadUnexpectedWins: data.had_unexpected_wins,
        unexpectedWinsDescription: data.unexpected_wins_description,
        estimatedMinutes: data.estimated_minutes,
        actualMinutes: data.actual_minutes,
        outcomeDescription: data.outcome_description,
      });
    
    res.json({ success: true });
  } catch (error) {
    logger.error({ error, profileId: data.profile_id }, "Failed to record metrics");
    return next(error);
  }
});

/**
 * GET /api/metrics/current/:profileId
 * Get current day metrics for a profile
 */
router.get("/current/:profileId", validateOwnership, async (req, res, next) => {
  const { profileId } = req.params;
  
  try {
    const metrics = await getProfileMetrics(profileId);
    
    if (!metrics) {
      return res.json({ 
        profile_id: profileId,
        daily_ipp: 0,
        seven_day_ipp: 0,
        thirty_day_ipp: 0,
        daily_but: 0,
        seven_day_but: 0,
        s1sr: 0,
        rsi: 0,
        taa: 0,
        hlad: 0,
      });
    }
    
    res.json(metrics);
  } catch (error) {
    logger.error({ error, profileId }, "Failed to fetch current metrics");
    return next(error);
  }
});

/**
 * GET /api/metrics/history/:profileId?days=30
 * Get metrics history for a profile
 */
router.get("/history/:profileId", validateOwnership, async (req, res, next) => {
  const { profileId } = req.params;
  const days = parseInt(req.query.days as string) || 30;
  
  if (days < 1 || days > 365) {
    return next(new ValidationError("days must be between 1 and 365"));
  }
  
  try {
    const history = await getMetricsHistory(profileId, days);
    res.json({ history });
  } catch (error) {
    logger.error({ error, profileId }, "Failed to fetch metrics history");
    return next(error);
  }
});

export default router;

// Internal observability endpoint (authenticated)
router.get("/internal", async (req, res) => {
  try {
    res.json({ metrics: obs.getAll() });
  } catch (error) {
    logger.error({ error }, "Failed to fetch internal observability metrics");
    res.status(500).json({ error: "failed_to_get_metrics" });
  }
});
