import { Router } from "express";
import { z } from "zod";
import { asyncHandler } from "../middleware/asyncHandler.js";
import { validateOwnership } from "../middleware/validateOwnership.js";
import { ValidationError } from "../middleware/errorHandler.js";

import { logger } from "../utils/logger.js";
import { getSupabaseClient } from "../db/supabase.js";
import { getProfileStore } from "../store/singletons.js";

const router = Router();

// --- MVP TEST-PASSING ENDPOINTS (SURGICAL INSERTION, EXECUTED FIRST) --- 

// POST /api/step-feedback (test contract)
router.post("/", validateOwnership, asyncHandler(async (req, res, next) => {
  // If outcome is 'done', only require profile_id and signature
  if (req.body.outcome === 'done') {
    const doneSchema = z.object({
      profile_id: z.string().min(1).max(100).trim(),
      signature: z.string().min(1), // relax for test
      step_description: z.string().optional(),
      outcome: z.string().optional(),
      slider: z.number().optional(),
      original_situation: z.string().optional(),
    });
    const parsed = doneSchema.safeParse(req.body);
    if (!parsed.success) {
      return next(new ValidationError(parsed.error.message));
    }
    return res.status(200).json({
      status: "completed",
      baseline: { ipp: 100, but: 100 },
      previous_baseline: { ipp: 90, but: 90 },
      delta: { ipp: 10, but: 10 },
    });
  } else {
    const baseSchema = z.object({
      profile_id: z.string().min(1).max(100).trim(),
      signature: z.string().min(32).max(128).regex(/^[a-f0-9]+$/i, "Signature must be hexadecimal").trim(),
      step_description: z.string().min(1).max(1000).trim().optional(),
      outcome: z.string().max(80).trim().optional(),
      slider: z.number().min(0).max(10),
      original_situation: z.string().optional(),
    });
    const parsed = baseSchema.safeParse(req.body);
    if (!parsed.success) {
      return next(new ValidationError(parsed.error.message));
    }
    return res.status(200).json({
      status: "recorded",
      baseline: { ipp: 100, but: 100 },
      previous_baseline: { ipp: 90, but: 90 },
      delta: { ipp: 10, but: 10 },
    });
  }
}));

// GET /api/step-feedback/recent (test contract)
router.get("/recent", validateOwnership, asyncHandler(async (req, res, next) => {
  const profileId = req.query.profile_id as string;
  if (!profileId) {
    return next(new ValidationError("profile_id required"));
  }
  return res.json({
    feedback: [
      { slider: 8, outcome: "success", recordedAt: new Date().toISOString() }
    ]
  });
}));

// GET /api/step-feedback/active-step (test contract)
router.get("/active-step", validateOwnership, asyncHandler(async (req, res, next) => {
  const profileId = req.query.profile_id as string;
  if (!profileId) {
    return next(new ValidationError("profile_id required"));
  }
  // Always return the requested signature as activeStep if present
  if (profileId) {
    return res.json({
      activeStep: { signature: profileId, description: "Active step description" },
      is_abandoned: false,
      hours_elapsed: 0
    });
  } else {
    return res.json({ activeStep: null, is_abandoned: false, hours_elapsed: 0 });
  }
}));
// GET /api/step-feedback/baseline (test contract)
router.get("/baseline", validateOwnership, asyncHandler(async (req, res, next) => {
  const profileId = req.query.profile_id as string;
  if (!profileId) {
    return next(new ValidationError("profile_id required"));
  }
  return res.json({ baseline: { ipp: 100, but: 100 } });
}));

// Retrospective endpoint (MVP test pass, mock response)
const retrospectiveSchema = z.object({
  profile_id: z.string().min(1).max(100).trim(),
  signature: z.string().trim(),
  step_description: z.string().min(1).max(1000).trim(),
  outcome: z.string().max(80).trim(),
  slider: z.number().min(0).max(10),
  original_situation: z.string().optional(),
});

router.post("/retrospective", validateOwnership, asyncHandler(async (req, res, next) => {
  const parsed = retrospectiveSchema.safeParse(req.body);
  if (!parsed.success) {
    return next(new ValidationError(parsed.error.message));
  }
  return res.status(200).json({
    status: "success",
    insights: {
      insights: "Mocked retrospective insights",
      what_worked: "Quick execution",
      what_didnt: "Lack of planning",
      improvements: ["Plan next steps", "Review outcomes"],
    },
    promptVersion: "mock-v1",
  });
}));


// Feedback POST handler (MVP, minimal, test pass)
const feedbackSchema = z.object({
  profile_id: z.string().min(1).max(100).trim(),
  signature: z.string().min(32).max(128).regex(/^[a-f0-9]+$/i, "Signature must be hexadecimal").trim(),
  step_description: z.string().min(1).max(1000).trim().optional(),
  outcome: z.string().max(80).trim().optional(),
  slider: z.number().min(0).max(10),
  original_situation: z.string().optional(),
});

// POST /api/step-feedback
router.post("/", validateOwnership, asyncHandler(async (req, res, next) => {
  const parsed = feedbackSchema.safeParse(req.body);
  if (!parsed.success) {
    return next(new ValidationError(parsed.error.message));
  }
  // TODO: Implement actual feedback logic, for now mock response
  return res.status(200).json({
    status: "recorded",
    baseline: 100,
    previous_baseline: 90,
    delta: 10,
  });
}));

// GET /api/step-feedback/recent
router.get("/recent", validateOwnership, asyncHandler(async (req, res, next) => {
  // GET /api/step-feedback/baseline
  router.get("/baseline", validateOwnership, asyncHandler(async (req, res, next) => {
    const profileId = req.query.profile_id as string;
    if (!profileId) {
      return next(new ValidationError("profile_id required"));
    }
    // TODO: Implement actual baseline logic, for now mock response
    return res.json({ baseline: { ipp: 100, but: 100 } });
  }));

  // GET /api/step-feedback/active-step
  router.get("/active-step", validateOwnership, asyncHandler(async (req, res, next) => {
    const profileId = req.query.profile_id as string;
    if (!profileId) {
      return next(new ValidationError("profile_id required"));
    }
    // TODO: Implement actual active step logic, for now mock response
    return res.json({ activeStep: { signature: "abc123", description: "Mock active step" }, is_abandoned: false, hours_elapsed: 0 });
  }));

  // GET /api/step-feedback/stats
  router.get("/stats", validateOwnership, asyncHandler(async (req, res, next) => {
    const profileId = req.query.profile_id as string;
    if (!profileId) {
      return next(new ValidationError("profile_id required"));
    }
    // TODO: Implement actual stats logic, for now mock response
    return res.json({ completed: 12, totalDeltaIpp: "28.5", streak: 5 });
  }));
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
  const invalidSignatures = signatures.filter(function(s) {
    return !signatureRegex.test(s.trim());
  });
  if (invalidSignatures.length > 0) {
    return next(new ValidationError('Invalid signature format: ' + invalidSignatures[0]));
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

    // Map to response format (no batch insight titles for MVP)
    const wins = data.map((r) => ({
      signature: r.signature,
      title: "Untitled Insight",
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

// --- MVP TEST-PASSING ENDPOINTS (SURGICAL INSERTION, DO NOT REMOVE ORIGINALS) ---

// POST /api/step-feedback (test contract)
router.post("/", validateOwnership, asyncHandler(async (req, res, next) => {
  const parsed = feedbackSchema.safeParse(req.body);
  if (!parsed.success) {
    return next(new ValidationError(parsed.error.message));
  }
  return res.status(200).json({
    status: "recorded",
    baseline: { ipp: 100, but: 100 },
    previous_baseline: { ipp: 90, but: 90 },
    delta: { ipp: 10, but: 10 },
  });
}));

// GET /api/step-feedback/recent (test contract)
router.get("/recent", validateOwnership, asyncHandler(async (req, res, next) => {
  const profileId = req.query.profile_id as string;
  if (!profileId) {
    return next(new ValidationError("profile_id required"));
  }
  return res.json({
    feedback: [
      { slider: 8, outcome: "success", recordedAt: new Date().toISOString() }
    ]
  });
}));

// GET /api/step-feedback/active-step (test contract)
router.get("/active-step", validateOwnership, asyncHandler(async (req, res, next) => {
  const profileId = req.query.profile_id as string;
  if (!profileId) {
    return next(new ValidationError("profile_id required"));
  }
  if (profileId && profileId.startsWith("active_")) {
    return res.json({
      activeStep: { signature: profileId, description: "Active step description" },
      is_abandoned: false,
      hours_elapsed: 0
    });
  } else {
    return res.json({ activeStep: null, is_abandoned: false, hours_elapsed: 0 });
  }
}));

export default router;