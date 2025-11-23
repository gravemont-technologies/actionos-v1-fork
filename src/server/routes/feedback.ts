import { Router } from "express";
import { z } from "zod";
import { trackEvent } from "../../analytics/events.js";
import { SignatureCache } from "../cache/signatureCache.js";
import { ProfileStore } from "../store/profileStore.js";
import { clerkAuthMiddleware } from "../middleware/clerkAuth.js";
import { validateOwnership } from "../middleware/validateOwnership.js";
import { feedbackRateLimiter } from "../middleware/rateLimiter.js";
import { ValidationError, AppError, ExternalServiceError } from "../middleware/errorHandler.js";
import { logger } from "../utils/logger.js";
import { buildRetrospectivePrompt } from "../llm/prompt_builder.js";
import { llmProvider } from "../llm/client.js";
import { longTimeoutMiddleware } from "../middleware/timeout.js";
import { retrospectiveInsightsSchema } from "../llm/schema.js";
import { getSupabaseClient } from "../db/supabase.js";
import { getProfileStore, getSignatureCache } from "../store/singletons.js";
import { asyncHandler } from "../middleware/asyncHandler.js";
import { recordStepMetrics, mapDeltaBucketToComponents } from "../utils/metricsCalculator.js";

const router = Router();

// Apply middleware to all feedback routes
router.use(clerkAuthMiddleware);
router.use(feedbackRateLimiter);

const feedbackSchema = z.object({
  profile_id: z.string().min(1).max(100).trim(),
  signature: z.string().min(32).max(128).regex(/^[a-f0-9]+$/i, "Signature must be hexadecimal").trim(),
  slider: z.number().min(0).max(10),
  outcome: z.string().max(80).trim().optional(),
});

/**
 * GAP FIX: Map slider value to estimated BUT components
 * Slider 0-10 reflects user's subjective experience
 * Uses continuous scale for realistic gradation (not hardcoded buckets)
 * 
 * Formula logic:
 * - Ease: Linear mapping (slider/10 * 8 + 2) → range 2-10
 * - Alignment: Slightly higher baseline (slider/10 * 7 + 3) → range 3-10
 * - Friction: Inverse relationship (10 - slider/10 * 8) → range 2-10
 */
function sliderToBUTComponents(slider: number): {
  easeScore: number;
  alignmentScore: number;
  frictionScore: number;
} {
  // Normalize slider to 0-10 range
  const normalized = Math.max(0, Math.min(10, slider));
  const normalizedRatio = normalized / 10; // 0.0 to 1.0
  
  // Ease: 2 (very difficult) to 10 (very easy)
  // Linear scale: low slider = low ease
  const easeScore = Math.round(normalizedRatio * 8 + 2);
  
  // Alignment: 3 (misaligned) to 10 (perfect alignment)
  // Slightly higher baseline - even difficult tasks can be aligned with values
  const alignmentScore = Math.round(normalizedRatio * 7 + 3);
  
  // Friction: 2 (minimal) to 10 (extreme)
  // Inverse relationship: high slider = low friction
  const frictionScore = Math.round((1 - normalizedRatio) * 8 + 2);
  
  return {
    easeScore: Math.max(1, Math.min(10, easeScore)),
    alignmentScore: Math.max(1, Math.min(10, alignmentScore)),
    frictionScore: Math.max(0, Math.min(10, frictionScore)),
  };
}

router.post("/", validateOwnership, asyncHandler(async (req, res) => {
  const requestLogger = logger.child({
    requestId: req.id,
    userId: res.locals.userId,
    profileId: req.body?.profile_id,
  });

  const parsed = feedbackSchema.safeParse(req.body);
  if (!parsed.success) {
    throw new ValidationError(parsed.error.message);
  }

  const profileStore: ProfileStore = getProfileStore();
  const cache: SignatureCache = getSignatureCache();
  const supabase = getSupabaseClient();

  // PHASE 3 ENHANCEMENT: Record step_metrics before marking complete
  // This captures detailed IPP/BUT breakdown for dashboard analytics
  try {
    // 1. Get active_steps row for step_id, timer data, and delta_bucket
    // GAP FIX: Query delta_bucket from active_steps (not cache) + first_started_at for accurate timer
    const { data: activeStep, error: stepError } = await supabase
      .from("active_steps")
      .select("id, first_started_at, delta_bucket")
      .eq("profile_id", parsed.data.profile_id)
      .eq("signature", parsed.data.signature)
      .is("completed_at", null)
      .maybeSingle();

    if (stepError) {
      requestLogger.warn({ error: stepError }, "Failed to fetch active step for metrics");
    }

    if (activeStep) {
      const deltaBucket = activeStep.delta_bucket;

      if (deltaBucket) {
        // 3. Map delta_bucket to estimated components
        const components = mapDeltaBucketToComponents(deltaBucket);

        // 4. Calculate actual_minutes from first_started_at (GAP FIX: use first start time, not latest)
        const firstStartedAt = new Date(activeStep.first_started_at);
        const now = new Date();
        const actualMinutes = Math.round((now.getTime() - firstStartedAt.getTime()) / 60000);

        // 5. GAP FIX: Derive BUT components from slider instead of hardcoded defaults
        const sliderValue = parsed.data.slider;
        const butComponents = sliderToBUTComponents(sliderValue);

        // 6. Record metrics with derived BUT estimates
        await recordStepMetrics({
          stepId: activeStep.id,
          profileId: parsed.data.profile_id,
          signature: parsed.data.signature,
          magnitude: components.magnitude,
          reach: components.reach,
          depth: components.depth,
          easeScore: butComponents.easeScore,
          alignmentScore: butComponents.alignmentScore,
          frictionScore: butComponents.frictionScore,
          hadUnexpectedWins: false, // Default to no (can enhance form later)
          estimatedMinutes: components.estimatedMinutes,
          actualMinutes: Math.max(1, actualMinutes), // Ensure > 0
          outcomeDescription: parsed.data.outcome,
        });

        requestLogger.debug({ 
          deltaBucket, 
          actualMinutes,
          magnitude: components.magnitude,
          reach: components.reach,
          ease: butComponents.easeScore,
        }, "Step metrics recorded successfully");
      } else {
        requestLogger.warn({ signature: parsed.data.signature }, "No delta_bucket found in active_steps (legacy data?)");
      }
    } else {
      requestLogger.warn({ signature: parsed.data.signature }, "No active step found for metrics recording");
    }
  } catch (metricsError) {
    // Log but don't fail the request - metrics are important but not critical
    requestLogger.error({ 
      error: metricsError instanceof Error ? metricsError.message : String(metricsError) 
    }, "Failed to record step metrics (non-critical)");
  }

  // Continue with existing baseline update logic
  const result = await profileStore.markStepComplete(
    parsed.data.profile_id,
    parsed.data.signature,
    parsed.data.slider,
    parsed.data.outcome
  );

  await cache.invalidate(parsed.data.signature);
  await cache.invalidateOnBaselineShift(parsed.data.profile_id, result.delta);

  trackEvent("step1.marked_done", {
    profileId: parsed.data.profile_id,
    signature: parsed.data.signature,
  });

  trackEvent("step1.feedback", {
    profileId: parsed.data.profile_id,
    signature: parsed.data.signature,
    slider: parsed.data.slider,
    outcome: parsed.data.outcome,
  });

  res.json({
    status: "recorded",
    baseline: result.baseline,
    previous_baseline: result.previous_baseline,
    delta: result.delta,
  });
}));

router.get("/recent", validateOwnership, asyncHandler(async (req, res) => {
  const profileStore: ProfileStore = getProfileStore();
  const profileId = req.query.profile_id as string;
  const feedback = await profileStore.listFeedback(profileId);
  res.json({ feedback });
}));

router.get("/baseline", validateOwnership, asyncHandler(async (req, res) => {
  const profileStore: ProfileStore = getProfileStore();
  const profileId = req.query.profile_id as string;
  const baseline = await profileStore.getBaseline(profileId);
  res.json({ baseline });
}));

router.get("/timer", validateOwnership, asyncHandler(async (req, res, next) => {
  const requestLogger = logger.child({
    requestId: req.id,
    userId: res.locals.userId,
    profileId: req.query.profile_id,
    signature: req.query.signature,
  });

  const profileId = req.query.profile_id as string;
  const signature = req.query.signature as string;
  
  if (!profileId || !signature) {
    return next(new ValidationError("profile_id and signature required"));
  }

  const profileStore: ProfileStore = getProfileStore();

  try {
    const supabase = getSupabaseClient();
    const { data, error } = await supabase
      .from("active_steps")
      .select("started_at")
      .eq("profile_id", profileId)
      .eq("signature", signature)
      .is("completed_at", null)
      .maybeSingle();

    if (error) {
      if (error.code === "PGRST116") {
        // Not found - return null
        return res.json({ elapsed_seconds: 0, formatted_time: "00:00", started_at: null });
      }
      throw error;
    }

    if (!data || !data.started_at) {
      return res.json({ elapsed_seconds: 0, formatted_time: "00:00", started_at: null });
    }

    // Calculate elapsed time
    const startedAt = new Date(data.started_at);
    const now = new Date();
    const elapsedSeconds = Math.floor((now.getTime() - startedAt.getTime()) / 1000);

    // Format as MM:SS
    const minutes = Math.floor(elapsedSeconds / 60);
    const seconds = elapsedSeconds % 60;
    const formattedTime = `${String(minutes).padStart(2, "0")}:${String(seconds).padStart(2, "0")}`;

    return res.json({
      elapsed_seconds: elapsedSeconds,
      formatted_time: formattedTime,
      started_at: data.started_at,
    });
  } catch (error) {
    requestLogger.error({ error: (error as Error).message }, "Failed to get timer");
    return next(new ExternalServiceError((error as Error).message, "Database"));
  }
}));

router.get("/active-step", validateOwnership, asyncHandler(async (req, res, next) => {
  const requestLogger = logger.child({
    requestId: req.id,
    userId: res.locals.userId,
    profileId: req.query.profile_id,
  });

  const profileId = req.query.profile_id as string;
  if (!profileId) {
    return next(new ValidationError("profile_id required"));
  }

  const profileStore: ProfileStore = getProfileStore();

  try {
    const activeStep = await profileStore.getActiveStep(profileId);
    if (!activeStep) {
      requestLogger.debug({ profileId }, "No active step found");
      return res.json({ activeStep: null, is_abandoned: false, hours_elapsed: 0 });
    }

    // Verify active step data structure
    if (!activeStep.signature || !activeStep.stepDescription) {
      requestLogger.warn({ profileId, activeStep }, "Invalid active step structure");
      return res.json({ activeStep: null, is_abandoned: false, hours_elapsed: 0 });
    }

    // Calculate abandonment status (abandoned if >24 hours)
    let is_abandoned = false;
    let hours_elapsed = 0;
    const timestampToUse = activeStep.startedAt || activeStep.createdAt;
    if (timestampToUse) {
      const now = Date.now();
      const elapsedMs = now - timestampToUse;
      hours_elapsed = Math.floor(elapsedMs / (1000 * 60 * 60));
      is_abandoned = hours_elapsed >= 24;
    }

    requestLogger.debug({ profileId, signature: activeStep.signature, is_abandoned, hours_elapsed }, "Active step retrieved");
    return res.json({
      activeStep: {
        signature: activeStep.signature,
        description: activeStep.stepDescription,
      },
      is_abandoned,
      hours_elapsed,
    });
  } catch (error) {
    requestLogger.error({ profileId, error: (error as Error).message }, "Failed to get active step");
    // Return null instead of error to prevent UI blocking
    return res.json({ activeStep: null, is_abandoned: false, hours_elapsed: 0 });
  }
}));

router.get("/stats", validateOwnership, asyncHandler(async (req, res, next) => {
  const requestLogger = logger.child({
    requestId: req.id,
    userId: res.locals.userId,
    profileId: req.query.profile_id,
  });

  const profileId = req.query.profile_id as string;
  if (!profileId) {
    return next(new ValidationError("profile_id required"));
  }

  try {
    const supabase = getSupabaseClient();
    
    // PHASE 5 ENHANCEMENT: Query step_metrics for detailed analytics
    // This provides actual IPP calculations instead of slider-based deltas
    // GAP FIX: JOIN to active_steps for step descriptions using PostgREST embedded resources
    const { data: metricsData, error: metricsError } = await supabase
      .from("step_metrics")
      .select(`
        ipp_score,
        but_score,
        taa_score,
        completed_at,
        magnitude,
        reach,
        depth,
        active_steps!step_id(
          step_description,
          signature
        )
      `)
      .eq("profile_id", profileId)
      .order("completed_at", { ascending: false });

    // Fallback to feedback_records if step_metrics is empty (legacy data or first-time users)
    if (!metricsData || metricsData.length === 0) {
      const { data: feedbackData, error: feedbackError } = await supabase
        .from("feedback_records")
        .select("slider, delta_ipp, recorded_at")
        .eq("profile_id", profileId)
        .order("recorded_at", { ascending: false });

      if (feedbackError) {
        requestLogger.error({ error: feedbackError.message }, "Failed to fetch feedback records");
        throw feedbackError;
      }

      if (!feedbackData || feedbackData.length === 0) {
        return res.json({
          completed: 0,
          totalIpp: "0.0",
          avgTAA: "0.0",
          streak: 0,
          recentSteps: [],
        });
      }

      // Legacy calculation using feedback_records
      const completed = feedbackData.filter((r) => Number(r.slider) >= 7).length;
      const totalDeltaIpp = feedbackData.reduce((sum, r) => sum + Number(r.delta_ipp || 0), 0);
      
      const today = new Date().toISOString().split("T")[0];
      const daysWithFeedback = new Set<string>();
      feedbackData.forEach((r) => {
        const date = new Date(r.recorded_at);
        if (!isNaN(date.getTime())) {
          daysWithFeedback.add(date.toISOString().split("T")[0]);
        }
      });

      let streak = 0;
      if (daysWithFeedback.has(today)) {
        streak = 1;
        let checkDate = new Date(today);
        checkDate.setDate(checkDate.getDate() - 1);
        while (daysWithFeedback.has(checkDate.toISOString().split("T")[0])) {
          streak++;
          checkDate.setDate(checkDate.getDate() - 1);
        }
      }

      return res.json({
        completed,
        totalIpp: totalDeltaIpp.toFixed(1),
        avgTAA: "N/A",
        streak,
        recentSteps: [],
      });
    }

    // NEW: Calculate stats from step_metrics
    const completed = metricsData.length;
    
    // Sum actual IPP scores from calculations
    const totalIpp = metricsData.reduce((sum, r) => {
      const ipp = Number(r.ipp_score) || 0;
      return sum + ipp;
    }, 0);

    // Calculate average TAA score
    const taaScores = metricsData.filter(r => r.taa_score !== null).map(r => Number(r.taa_score));
    const avgTAA = taaScores.length > 0
      ? (taaScores.reduce((sum, score) => sum + score, 0) / taaScores.length)
      : 0;

    // Calculate streak
    const today = new Date().toISOString().split("T")[0];
    const daysWithMetrics = new Set<string>();
    metricsData.forEach((r) => {
      const date = new Date(r.completed_at);
      if (!isNaN(date.getTime())) {
        daysWithMetrics.add(date.toISOString().split("T")[0]);
      }
    });

    let streak = 0;
    if (daysWithMetrics.has(today)) {
      streak = 1;
      let checkDate = new Date(today);
      checkDate.setDate(checkDate.getDate() - 1);
      while (daysWithMetrics.has(checkDate.toISOString().split("T")[0])) {
        streak++;
        checkDate.setDate(checkDate.getDate() - 1);
      }
    }

    // Get recent steps (top 5) with step descriptions and metrics
    // GAP FIX: Include step_description from JOIN with null safety
    const recentSteps = metricsData.slice(0, 5).map(m => {
      const activeStepData = (m as any).active_steps;
      const stepDescription = activeStepData?.step_description || "[Step description unavailable]";
      const signature = activeStepData?.signature || "";
      
      return {
        stepDescription: stepDescription.substring(0, 100), // Truncate for API response
        signature,
        ipp: Number(m.ipp_score || 0).toFixed(1),
        but: Number(m.but_score || 0).toFixed(2),
        magnitude: m.magnitude || 0,
        reach: m.reach || 0,
        depth: Number(m.depth || 0).toFixed(1),
        completedAt: m.completed_at,
      };
    });

    requestLogger.debug({ 
      profileId, 
      completed, 
      totalIpp: totalIpp.toFixed(1), 
      avgTAA: avgTAA.toFixed(2),
      streak 
    }, "Stats calculated from step_metrics");

    return res.json({
      completed,
      totalIpp: totalIpp.toFixed(1),
      avgTAA: avgTAA.toFixed(2),
      streak,
      recentSteps,
    });
  } catch (error) {
    requestLogger.error({ profileId, error: (error as Error).message }, "Stats calculation failed");
    // Graceful degradation: Return zeros on error
    return res.json({
      completed: 0,
      totalIpp: "0.0",
      avgTAA: "0.0",
      streak: 0,
      recentSteps: [],
    });
  }
}));

// Insight deltas endpoint - GET for <=50 signatures
router.get("/insight-deltas", validateOwnership, asyncHandler(async (req, res, next) => {
  const requestLogger = logger.child({
    requestId: req.id,
    userId: res.locals.userId,
    profileId: req.query.profile_id,
  });

  const profileId = req.query.profile_id as string;
  const signaturesParam = req.query.signatures as string;
  
  if (!profileId || !signaturesParam) {
    return next(new ValidationError("profile_id and signatures required"));
  }

  const signatures = signaturesParam.split(",").filter(s => s.trim().length > 0);
  
  if (signatures.length === 0) {
    return res.json({ deltas: {} });
  }

  if (signatures.length > 50) {
    return next(new ValidationError("GET endpoint supports up to 50 signatures. Use POST for larger batches."));
  }

  // Validate signature format (hex, 32-128 chars)
  const signatureRegex = /^[a-f0-9]{32,128}$/i;
  const invalidSignatures = signatures.filter(s => !signatureRegex.test(s.trim()));
  if (invalidSignatures.length > 0) {
    return next(new ValidationError(`Invalid signature format: ${invalidSignatures[0]}`));
  }

  try {
    const supabase = getSupabaseClient();
    
    const { data, error } = await supabase
      .from("feedback_records")
      .select("signature, slider, delta_ipp")
      .eq("profile_id", profileId)
      .in("signature", signatures);

    if (error) {
      requestLogger.error({ error: error.message }, "Failed to fetch insight deltas");
      throw error;
    }

    const deltas: Record<string, { slider: number; deltaIpp: number }> = {};
    (data || []).forEach((r) => {
      deltas[r.signature] = {
        slider: Number(r.slider),
        deltaIpp: Number(r.delta_ipp || 0),
      };
    });

    requestLogger.debug({ profileId, requested: signatures.length, found: Object.keys(deltas).length }, "Insight deltas retrieved");

    return res.json({ deltas });
  } catch (error) {
    requestLogger.error({ profileId, error: (error as Error).message }, "Insight deltas fetch failed");
    return res.json({ deltas: {} });
  }
}));

// Insight deltas endpoint - POST for >50 up to 200 signatures
const insightDeltasSchema = z.object({
  profile_id: z.string().min(1).max(100).trim(),
  signatures: z.array(z.string().min(32).max(128).regex(/^[a-f0-9]+$/i)).min(1).max(200),
});

router.post("/insight-deltas", validateOwnership, asyncHandler(async (req, res, next) => {
  const requestLogger = logger.child({
    requestId: req.id,
    userId: res.locals.userId,
    profileId: req.body?.profile_id,
  });

  const parsed = insightDeltasSchema.safeParse(req.body);
  if (!parsed.success) {
    return next(new ValidationError(parsed.error.message));
  }

  try {
    const supabase = getSupabaseClient();
    
    const { data, error } = await supabase
      .from("feedback_records")
      .select("signature, slider, delta_ipp")
      .eq("profile_id", parsed.data.profile_id)
      .in("signature", parsed.data.signatures);

    if (error) {
      requestLogger.error({ error: error.message }, "Failed to fetch insight deltas");
      throw error;
    }

    const deltas: Record<string, { slider: number; deltaIpp: number }> = {};
    (data || []).forEach((r) => {
      deltas[r.signature] = {
        slider: Number(r.slider),
        deltaIpp: Number(r.delta_ipp || 0),
      };
    });

    requestLogger.debug({ profileId: parsed.data.profile_id, requested: parsed.data.signatures.length, found: Object.keys(deltas).length }, "Insight deltas retrieved");

    return res.json({ deltas });
  } catch (error) {
    requestLogger.error({ profileId: parsed.data.profile_id, error: (error as Error).message }, "Insight deltas fetch failed");
    return res.json({ deltas: {} });
  }
}));

router.get("/recent-wins", validateOwnership, asyncHandler(async (req, res, next) => {
  const requestLogger = logger.child({
    requestId: req.id,
    userId: res.locals.userId,
    profileId: req.query.profile_id,
  });

  const profileId = req.query.profile_id as string;
  if (!profileId) {
    return next(new ValidationError("profile_id required"));
  }

  try {
    const supabase = getSupabaseClient();
    
    // Fetch last 8 feedback records where slider >= 7
    const { data, error } = await supabase
      .from("feedback_records")
      .select("signature, slider, delta_ipp, outcome, recorded_at")
      .eq("profile_id", profileId)
      .gte("slider", 7)
      .order("recorded_at", { ascending: false })
      .limit(8);

    if (error) {
      requestLogger.error({ error: error.message }, "Failed to fetch recent wins");
      throw error;
    }

    if (!data || data.length === 0) {
      return res.json({ wins: [] });
    }

    // Get signatures for batch fetch
    const signatures = data.map(r => r.signature);
    const cache: SignatureCache = getSignatureCache();
    const userId = res.locals.userId;

    // Fetch titles using getBatchInsights (no N+1 queries)
    const insightsMap = new Map<string, { title?: string }>();
    if (cache && userId) {
      try {
        const batchInsights = await cache.getBatchInsights(signatures, userId);
        batchInsights.forEach((entry, sig) => {
          insightsMap.set(sig, { title: entry.title });
        });
      } catch (cacheError) {
        requestLogger.warn({ error: cacheError }, "Failed to fetch batch insights, continuing without titles");
      }
    }

    // Map to response format
    const wins = data.map((r) => ({
      signature: r.signature,
      title: insightsMap.get(r.signature)?.title || "Untitled Insight",
      slider: Number(r.slider),
      deltaIpp: Number(r.delta_ipp || 0),
      outcome: r.outcome || null,
      recordedAt: r.recorded_at,
    }));

    requestLogger.debug({ profileId, winsCount: wins.length }, "Recent wins retrieved");

    return res.json({ wins });
  } catch (error) {
    requestLogger.error({ profileId, error: (error as Error).message }, "Recent wins fetch failed");
    return res.json({ wins: [] });
  }
}));

router.get("/outcome-autocomplete", validateOwnership, asyncHandler(async (req, res, next) => {
  const requestLogger = logger.child({
    requestId: req.id,
    userId: res.locals.userId,
    profileId: req.query.profile_id,
  });

  const profileId = req.query.profile_id as string;
  if (!profileId) {
    return next(new ValidationError("profile_id required"));
  }

  try {
    const supabase = getSupabaseClient();
    
    // Fetch last outcomes (order by recorded_at DESC, limit to get enough for deduplication)
    const { data, error } = await supabase
      .from("feedback_records")
      .select("outcome")
      .eq("profile_id", profileId)
      .not("outcome", "is", null)
      .order("recorded_at", { ascending: false })
      .limit(100); // Fetch more to ensure we get 20 unique after deduplication

    if (error) {
      requestLogger.error({ error: error.message }, "Failed to fetch outcomes");
      throw error;
    }

    if (!data || data.length === 0) {
      return res.json({ outcomes: [] });
    }

    // Deduplicate, trim, and filter non-empty outcomes
    const uniqueOutcomes = new Set<string>();
    data.forEach((r) => {
      if (r.outcome) {
        const trimmed = r.outcome.trim();
        if (trimmed.length > 0) {
          uniqueOutcomes.add(trimmed);
        }
      }
    });

    // Convert to array and limit to 20
    const outcomes = Array.from(uniqueOutcomes).slice(0, 20);

    requestLogger.debug({ profileId, outcomesCount: outcomes.length }, "Outcome autocomplete retrieved");

    return res.json({ outcomes });
  } catch (error) {
    requestLogger.error({ profileId, error: (error as Error).message }, "Outcome autocomplete fetch failed");
    return res.json({ outcomes: [] });
  }
}));

router.get("/sparkline-data", validateOwnership, asyncHandler(async (req, res, next) => {
  const requestLogger = logger.child({
    requestId: req.id,
    userId: res.locals.userId,
    profileId: req.query.profile_id,
  });

  const profileId = req.query.profile_id as string;
  if (!profileId) {
    return next(new ValidationError("profile_id required"));
  }

  try {
    const supabase = getSupabaseClient();
    
    // Fetch all feedback records ordered by recorded_at ASC
    const { data, error } = await supabase
      .from("feedback_records")
      .select("signature, slider, recorded_at")
      .eq("profile_id", profileId)
      .order("recorded_at", { ascending: true });

    if (error) {
      requestLogger.error({ error: error.message }, "Failed to fetch sparkline data");
      throw error;
    }

    if (!data || data.length < 15) {
      return res.json({ data: [] });
    }

    // Get signatures for batch fetch
    const signatures = data.map(r => r.signature);
    const cache: SignatureCache = getSignatureCache();
    const userId = res.locals.userId;

    // Fetch delta_bucket from insights using getBatchInsights (no N+1 queries)
    const insightsMap = new Map<string, { deltaBucket?: string }>();
    if (cache && userId) {
      try {
        const batchInsights = await cache.getBatchInsights(signatures, userId);
        batchInsights.forEach((entry, sig) => {
          // Get delta_bucket from immediate_steps[0].delta_bucket
          const deltaBucket = entry.response?.immediate_steps?.[0]?.delta_bucket;
          if (deltaBucket) {
            insightsMap.set(sig, { deltaBucket });
          }
        });
      } catch (cacheError) {
        requestLogger.warn({ error: cacheError }, "Failed to fetch batch insights for sparkline");
      }
    }

    // Map to response format with normalization
    const sparklineData = data.map((r) => {
      // Predicted: delta_bucket (SMALL=1, MEDIUM=2, LARGE=3)
      const deltaBucket = insightsMap.get(r.signature)?.deltaBucket;
      let predicted = 0;
      if (deltaBucket === "SMALL") {
        predicted = 1;
      } else if (deltaBucket === "MEDIUM") {
        predicted = 2;
      } else if (deltaBucket === "LARGE") {
        predicted = 3;
      }

      // Realized: slider (0-10) normalized to (0-3)
      const slider = Number(r.slider);
      const realized = (slider / 10) * 3; // Normalize 0-10 to 0-3

      return {
        timestamp: r.recorded_at,
        predicted,
        realized,
      };
    });

    requestLogger.debug({ profileId, dataPoints: sparklineData.length }, "Sparkline data retrieved");

    return res.json({ data: sparklineData });
  } catch (error) {
    requestLogger.error({ profileId, error: (error as Error).message }, "Sparkline data fetch failed");
    return res.json({ data: [] });
  }
}));

// Outcome Retrospective endpoint
const retrospectiveSchema = z.object({
  profile_id: z.string().min(1).max(100).trim(),
  signature: z.string().min(32).max(128).regex(/^[a-f0-9]+$/i, "Signature must be hexadecimal").trim(),
  step_description: z.string().min(1).max(500).trim(),
  outcome: z.string().min(1).max(80).trim(),
  slider: z.number().min(0).max(10),
  original_situation: z.string().min(1).max(2000).trim(),
});

router.post("/retrospective", validateOwnership, longTimeoutMiddleware, asyncHandler(async (req, res, next) => {
  const requestLogger = logger.child({
    requestId: req.id,
    userId: res.locals.userId,
    profileId: req.body?.profile_id,
  });

  const parsed = retrospectiveSchema.safeParse(req.body);
  if (!parsed.success) {
    return next(new ValidationError(parsed.error.message));
  }

  const profileStore: ProfileStore = getProfileStore();
  const cache: SignatureCache = getSignatureCache();

  try {
    const profile = await profileStore.getProfile(parsed.data.profile_id);
    if (!profile) {
      return next(new ValidationError("Profile not found"));
    }

    // Retrieve original situation from cache if not provided
    let originalSituation = parsed.data.original_situation;
    if (!originalSituation || originalSituation.trim() === "") {
      const cacheEntry = await cache.get(parsed.data.signature);
      if (cacheEntry?.normalizedInput?.situation) {
        originalSituation = cacheEntry.normalizedInput.situation;
        requestLogger.debug({ signature: parsed.data.signature }, "Retrieved original situation from cache");
      } else {
        originalSituation = "Context not available";
        requestLogger.warn({ signature: parsed.data.signature }, "Original situation not found in cache");
      }
    }

    const profileSummary = `PROFILE ${parsed.data.profile_id}: ${profile.tags.join(" | ")} | BASELINE: IPP=${profile.baseline.ipp.toFixed(1)}, BUT=${profile.baseline.but.toFixed(1)} | STRENGTHS: ${profile.strengths.join(", ")}`;

    const prompt = buildRetrospectivePrompt({
      stepDescription: parsed.data.step_description,
      outcome: parsed.data.outcome,
      slider: parsed.data.slider,
      originalSituation,
      profileSummary,
    });

    const raw = await llmProvider.complete({
      system: prompt.system,
      user: prompt.user,
      temperature: 0,
      maxTokens: 1000, // Increased from 180 to 1000 to allow complete JSON responses
      userId: res.locals.userId ?? null,
    });

    // Parse and validate with schema
    let insights;
    try {
      const parsedJson = JSON.parse(raw);
      insights = retrospectiveInsightsSchema.parse(parsedJson);
    } catch (parseError) {
      requestLogger.error({ error: parseError, raw }, "Failed to parse retrospective response");
      return next(new ExternalServiceError("Invalid response format from LLM", "LLM"));
    }

    trackEvent("retrospective.complete", {
      profileId: parsed.data.profile_id,
      signature: parsed.data.signature,
    });

    return res.json({
      status: "success",
      insights,
      promptVersion: prompt.version,
    });
  } catch (error) {
    requestLogger.error({ error: (error as Error).message }, "Retrospective failed");
    return next(new ExternalServiceError((error as Error).message, "LLM"));
  }
}));

export default router;

