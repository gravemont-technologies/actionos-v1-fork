import { Router } from "express";
import { z } from "zod";
import { trackEvent } from "../../analytics/events.js";
import {
  AnalyzeRequestInput,
  normalizeConstraints,
  normalizeValue,
} from "../../shared/signature.js";
import { SignatureCache } from "../cache/signatureCache.js";
import { llmProvider } from "../llm/client.js";
import { enforceResponseGuards } from "../llm/post_process.js";
import { buildPrompt, buildRetrospectivePrompt, buildFollowUpPrompt, buildMicroNudgePrompt, PROMPT_VERSION } from "../llm/prompt_builder.js";
import { analyzeFeedbackPatterns } from "../utils/feedbackAnalyzer.js";
import { responseSchema } from "../llm/schema.js";
import { ProfileStore } from "../store/profileStore.js";
import { getProfileStore, getSignatureCache } from "../store/singletons.js";
import { computeServerSignature, verifySignature } from "../utils/signature.js";
import { clerkAuthMiddleware } from "../middleware/clerkAuth.js";
import { ensureProfile } from "../middleware/ensureProfile.js";
import { validateOwnership } from "../middleware/validateOwnership.js";
import { analyzeRateLimiter } from "../middleware/rateLimiter.js";
import { asyncHandler } from "../middleware/asyncHandler.js";
import { longTimeoutMiddleware } from "../middleware/timeout.js";
import { ValidationError, ExternalServiceError, RateLimitError } from "../middleware/errorHandler.js";
import { logger } from "../utils/logger.js";
import { getProfileMetrics } from "../utils/metricsCalculator.js";

const router = Router();

// Apply middleware to analyze route
router.use(clerkAuthMiddleware);
router.use(ensureProfile); // Auto-create profile if doesn't exist
router.use(analyzeRateLimiter);
router.use(longTimeoutMiddleware); // LLM calls need longer timeout

// Demo data endpoint
router.get("/demo/data", async (req, res) => {
  return res.json({
    is_demo: true,
    situation: "I'm 3 days from missing rent and need my SaaS MVP stable enough to onboard real users.",
    goal: "Functionalize and harden the core activation path so 500 test users can use it without failures, then scale to 10,000.",
    constraints: "money, independence, time (3 days)",
    current_steps: "Integrating auth, fixing billing flow, stabilizing backend endpoints",
    deadline: "3 days",
    stakeholders: "",
    resources: "",
  });
});

const analyzeSchema = z.object({
  profile_id: z.string().min(1).max(100).trim(),
  situation: z.string().min(10).max(2000).trim(),
  goal: z.string().min(5).max(500).trim(),
  constraints: z.string().min(1).max(1000).trim(),
  current_steps: z.string().min(1).max(1000).trim(),
  deadline: z.string().max(200).trim().optional(),
  stakeholders: z.string().max(500).trim().optional(),
  resources: z.string().max(500).trim().optional(),
});

router.post("/", validateOwnership, asyncHandler(async (req, res, next) => {
  const requestLogger = logger.child({
    requestId: req.id,
    userId: res.locals.userId, // Use res.locals
    profileId: req.body?.profile_id,
  });

  const parsed = analyzeSchema.safeParse(req.body);

  if (!parsed.success) {
    return next(new ValidationError(parsed.error.message));
  }

  const payload: AnalyzeRequestInput = {
    profileId: parsed.data.profile_id,
    situation: parsed.data.situation,
    goal: parsed.data.goal,
    constraints: parsed.data.constraints,
    currentSteps: parsed.data.current_steps,
    deadline: parsed.data.deadline ?? "",
    stakeholders: parsed.data.stakeholders ?? "",
    resources: parsed.data.resources ?? "",
  };

  // Debug: capture incoming signature and expected prefix for troubleshooting
  const incomingSig = req.header("x-signature") ?? null;
  const expectedSig = computeServerSignature(payload);
  requestLogger.debug({
    incomingSigPrefix: incomingSig ? String(incomingSig).slice(0, 8) : null,
    expectedSigPrefix: expectedSig.slice(0, 8),
    userId: res.locals.userId,
    profileId: payload.profileId,
  }, "Signature verification inputs");

  if (!verifySignature(payload, incomingSig)) {
    requestLogger.warn({ incomingSigPresent: !!incomingSig }, "Invalid or missing signature for analyze request");
    return res.status(401).json({ error: "Invalid or missing signature" });
  }

  const normalized = {
    situation: normalizeValue(payload.situation),
    goal: normalizeValue(payload.goal),
    constraints: normalizeConstraints(payload.constraints),
    current_steps: normalizeValue(payload.currentSteps),
    deadline: normalizeValue(payload.deadline ?? ""),
    stakeholders: normalizeValue(payload.stakeholders ?? ""),
    resources: normalizeValue(payload.resources ?? ""),
    signature: computeServerSignature(payload),
  };

  const cache: SignatureCache = getSignatureCache();
  const profileStore: ProfileStore = getProfileStore();
  const baseline = profileStore ? await profileStore.getBaseline(payload.profileId) : undefined;

  const cacheHit = cache ? await cache.get(normalized.signature) : null;
  if (cacheHit) {
    // CRITICAL: Always run guards for backward compatibility
    // This ensures old cached responses get deeper_dive fallbacks
    const guardedResponse = enforceResponseGuards(cacheHit.response, normalized.signature);
    guardedResponse.meta.cached = true;
    
    // Inject current metrics into cached response
    const currentMetrics = await getProfileMetrics(payload.profileId);
    if (currentMetrics && currentMetrics.metrics) {
      const metrics = currentMetrics.metrics as any;
      guardedResponse.meta.current_ipp = metrics.seven_day_ipp;
      guardedResponse.meta.current_but = metrics.seven_day_but;
      guardedResponse.meta.rsi = metrics.rsi;
    }
    
    trackEvent("analyze.response", {
      profileId: payload.profileId,
      signature: normalized.signature,
      cached: true,
      deltaBuckets: guardedResponse.immediate_steps.map((step) => step.delta_bucket),
    });
    return res.json({
      status: "success",
      normalized,
      cached: true,
      baseline: {
        ipp: cacheHit.baselineIpp,
        but: cacheHit.baselineBut,
      },
      output: guardedResponse, // Use guarded version
      promptVersion: PROMPT_VERSION,
    });
  }

  try {
    const profileSummary = await resolveProfileSummary(payload.profileId, profileStore);
    
    // Get recent feedback for personalization (last 3 feedback records)
    // Analyze patterns instead of just dumping raw data
    let feedbackContext: string | undefined;
    if (profileStore) {
      const recentFeedback = await profileStore.listFeedback(payload.profileId, 3);
      if (recentFeedback.length > 0) {
        const analyzedPatterns = analyzeFeedbackPatterns(recentFeedback);
        if (analyzedPatterns) {
          feedbackContext = analyzedPatterns;
        }
      }
    }
    
    const prompt = buildPrompt({
      profileSummary,
      situation: payload.situation,
      goal: payload.goal,
      constraints: payload.constraints,
      currentSteps: payload.currentSteps,
      deadline: payload.deadline,
      stakeholders: payload.stakeholders,
      resources: payload.resources,
      feedbackContext,
    });

    const raw = await llmProvider.complete({
      system: prompt.system,
      user: prompt.user,
      temperature: 0,
      maxTokens: 1000, // Increased from 180 to 1000 to allow complete JSON responses
      userId: res.locals.userId ?? null, // Pass userId for token tracking
    });

    // Parse and validate with proper error handling
    let parsedResponse;
    try {
      const parsedJson = JSON.parse(raw);
      parsedResponse = responseSchema.parse(parsedJson);
    } catch (parseError) {
      // Log detailed error information for debugging
      const rawPreview = raw.length > 1000 ? raw.substring(0, 1000) + "..." : raw;
      const isTruncated = raw.trim().endsWith("...") || !raw.trim().endsWith("}");
      requestLogger.error({ 
        error: parseError, 
        rawPreview,
        rawLength: raw.length,
        isTruncated,
        parseErrorDetails: parseError instanceof Error ? parseError.message : String(parseError)
      }, "Failed to parse LLM response");
      
      // Provide more helpful error message
      let errorMsg = "Invalid response format from LLM";
      if (isTruncated || raw.length < 100) {
        errorMsg = "LLM response was truncated or incomplete. The response may have hit a token limit or been cut off mid-generation.";
      } else if (parseError instanceof Error && parseError.message.includes("JSON")) {
        errorMsg = `LLM returned invalid JSON: ${parseError.message}`;
      }
      
      return next(new ExternalServiceError(errorMsg, "LLM"));
    }

    const finalPayload = enforceResponseGuards(parsedResponse, normalized.signature);
    finalPayload.meta.cached = false;
    
    // Inject current metrics into response
    const currentMetrics = await getProfileMetrics(payload.profileId);
    if (currentMetrics && currentMetrics.metrics) {
      const metrics = currentMetrics.metrics as any;
      finalPayload.meta.current_ipp = metrics.seven_day_ipp;
      finalPayload.meta.current_but = metrics.seven_day_but;
      finalPayload.meta.rsi = metrics.rsi;
    }

    // Log prompt version for tracking
    requestLogger.debug({ promptVersion: prompt.version, signature: normalized.signature }, "Prompt version used");

    // Set active step after successful analysis (CRITICAL for Dashboard workflow)
    if (finalPayload.immediate_steps[0] && profileStore) {
      try {
        // GAP FIX: Extract delta_bucket from LLM response and store in active_steps
        const deltaBucket = finalPayload.immediate_steps[0].delta_bucket;
        
        await profileStore.setActiveStep(
          payload.profileId,
          normalized.signature,
          finalPayload.immediate_steps[0].step,
          deltaBucket // Store for later use in feedback route (eliminates cache dependency)
        );
        requestLogger.debug({ 
          profileId: payload.profileId, 
          signature: normalized.signature,
          stepDescription: finalPayload.immediate_steps[0].step.substring(0, 50),
          deltaBucket
        }, "Active step set successfully");
      } catch (error) {
        // Log but don't fail the request - active step is important but not critical
        requestLogger.warn({ 
          profileId: payload.profileId, 
          signature: normalized.signature,
          error: error instanceof Error ? error.message : String(error)
        }, "Failed to set active step (non-critical)");
      }
    } else if (!finalPayload.immediate_steps[0]) {
      requestLogger.warn({ 
        profileId: payload.profileId, 
        signature: normalized.signature
      }, "No immediate steps in response - cannot set active step");
    }

    if (cache) {
      await cache.set(
        {
          signature: normalized.signature,
          profileId: payload.profileId,
          response: finalPayload,
          normalizedInput: {
            situation: normalized.situation,
            goal: normalized.goal,
            constraints: normalized.constraints,
            current_steps: normalized.current_steps,
          },
          baselineIpp: baseline?.ipp ?? 50,
          baselineBut: baseline?.but ?? 50,
        },
        {
          userId: res.locals.userId || undefined, // Set user_id for future insights
        }
      );
    }

    trackEvent("analyze.response", {
      profileId: payload.profileId,
      signature: normalized.signature,
      cached: false,
      deltaBuckets: finalPayload.immediate_steps.map((step) => step.delta_bucket),
    });

    return res.json({
      status: "success",
      normalized,
      cached: false,
      baseline,
      output: finalPayload,
      promptVersion: prompt.version, // Include prompt version in response
    });
  } catch (error) {
    const errorMessage = (error as Error).message;
    requestLogger.error({ error: errorMessage }, "Analysis failed");

    // Check if this is a token limit error
    if (errorMessage.includes("Token limit exceeded")) {
      return next(new RateLimitError("Token limit exceeded for today"));
    }

    // LLM errors are external service errors
    return next(new ExternalServiceError(errorMessage, "OpenAI"));
  }
}));

// Follow-Up Analysis endpoint
const followUpSchema = z.object({
  profile_id: z.string().min(1).max(100).trim(),
  original_analysis: z.string().min(1).max(2000).trim(),
  original_immediate_steps: z.string().max(2000).trim().optional(), // Full context from original
  original_strategic_lens: z.string().max(1000).trim().optional(), // Full context from original
  original_top_risks: z.string().max(2000).trim().optional(), // Full context from original
  original_kpi: z.string().max(500).trim().optional(), // Full context from original
  focus_area: z.string().min(1).max(500).trim(),
  original_situation: z.string().min(1).max(2000).trim(),
  original_goal: z.string().min(1).max(500).trim(),
  constraints: z.string().min(1).max(1000).trim(),
});

router.post("/follow-up", validateOwnership, longTimeoutMiddleware, async (req, res, next) => {
  const requestLogger = logger.child({
    requestId: req.id,
    userId: res.locals.userId,
    profileId: req.body?.profile_id,
  });

  const parsed = followUpSchema.safeParse(req.body);
  if (!parsed.success) {
    return next(new ValidationError(parsed.error.message));
  }

    const profileStore: ProfileStore = getProfileStore();

  try {
    const profile = await profileStore.getProfile(parsed.data.profile_id);
    if (!profile) {
      return next(new ValidationError("Profile not found"));
    }

    const profileSummary = `PROFILE ${parsed.data.profile_id}: ${profile.tags.join(" | ")} | BASELINE: IPP=${profile.baseline.ipp.toFixed(1)}, BUT=${profile.baseline.but.toFixed(1)} | STRENGTHS: ${profile.strengths.join(", ")}`;

    // Track context quality for monitoring
    const contextFields = {
      originalImmediateSteps: parsed.data.original_immediate_steps,
      originalStrategicLens: parsed.data.original_strategic_lens,
      originalTopRisks: parsed.data.original_top_risks,
      originalKpi: parsed.data.original_kpi,
    };
    const providedFields = Object.values(contextFields).filter(Boolean).length;
    const totalFields = Object.keys(contextFields).length;
    const hasFullContext = providedFields === totalFields;

    // Validate context length to prevent token overflow
    const totalContextLength = [
      parsed.data.original_analysis,
      parsed.data.original_immediate_steps || "",
      parsed.data.original_strategic_lens || "",
      parsed.data.original_top_risks || "",
      parsed.data.original_kpi || "",
      parsed.data.original_situation,
      parsed.data.original_goal,
      parsed.data.constraints,
    ].join(" ").length;

    if (totalContextLength > 5000) {
      requestLogger.warn({ 
        totalContextLength,
        profileId: parsed.data.profile_id,
        focusArea: parsed.data.focus_area
      }, "Follow-up context is very long, may hit token limits");
    }

    const prompt = buildFollowUpPrompt({
      originalAnalysis: parsed.data.original_analysis,
      originalImmediateSteps: parsed.data.original_immediate_steps,
      originalStrategicLens: parsed.data.original_strategic_lens,
      originalTopRisks: parsed.data.original_top_risks,
      originalKpi: parsed.data.original_kpi,
      focusArea: parsed.data.focus_area,
      originalSituation: parsed.data.original_situation,
      originalGoal: parsed.data.original_goal,
      constraints: parsed.data.constraints,
      profileSummary,
    });

    // Track quality metrics
    trackEvent("analyze.follow_up_quality", {
      profileId: parsed.data.profile_id,
      focusArea: parsed.data.focus_area,
      contextFieldsProvided: providedFields,
      totalContextFields: totalFields,
    });

    const raw = await llmProvider.complete({
      system: prompt.system,
      user: prompt.user,
      temperature: 0,
      maxTokens: 1000, // Increased from 180 to 1000 to allow complete JSON responses
      userId: res.locals.userId ?? null,
    });

    // Parse and validate with proper error handling
    let parsedResponse;
    try {
      const parsedJson = JSON.parse(raw);
      
      // Apply guards BEFORE validation to enforce array limits
      // This prevents Zod errors from array size violations
      const guardedResponse = enforceResponseGuards(parsedJson as any, "");
      
      // Now validate the guarded response
      parsedResponse = responseSchema.parse(guardedResponse);
      
      // Validate response quality - ensure it's not just repeating original
      const hasNewContent = parsedResponse.summary !== parsed.data.original_analysis ||
                           (parsedResponse.top_risks.length > 0 &&
                            parsed.data.original_top_risks &&
                            parsedResponse.top_risks.some(r =>
                              parsed.data.original_top_risks!.includes(r.risk)
                            ));
      
      if (!hasNewContent && parsed.data.original_immediate_steps) {
        requestLogger.warn({ 
          profileId: parsed.data.profile_id,
          focusArea: parsed.data.focus_area
        }, "Follow-up response may be too similar to original - quality check");
      }
    } catch (parseError) {
      // Log detailed error information for debugging
      const rawPreview = raw.length > 1000 ? raw.substring(0, 1000) + "..." : raw;
      const isTruncated = raw.trim().endsWith("...") || !raw.trim().endsWith("}");
      const isMalformed = raw.trim().startsWith("{") && !raw.trim().endsWith("}");
      
      requestLogger.error({ 
        error: parseError, 
        rawPreview,
        rawLength: raw.length,
        isTruncated,
        isMalformed,
        parseErrorDetails: parseError instanceof Error ? parseError.message : String(parseError),
        contextLength: totalContextLength,
        hasFullContext
      }, "Failed to parse follow-up response");
      
      // Provide more helpful error message
      let errorMsg = "Invalid response format from LLM";
      if (isTruncated || raw.length < 100) {
        errorMsg = "LLM response was truncated or incomplete. The response may have hit a token limit or been cut off mid-generation.";
      } else if (isMalformed) {
        errorMsg = "LLM returned malformed JSON. The response may have been cut off mid-generation.";
      } else if (parseError instanceof Error && parseError.message.includes("JSON")) {
        errorMsg = `LLM returned invalid JSON: ${parseError.message}`;
      }
      
      return next(new ExternalServiceError(errorMsg, "LLM"));
    }

    const finalPayload = enforceResponseGuards(parsedResponse, "");

    trackEvent("analyze.follow_up", {
      profileId: parsed.data.profile_id,
      focusArea: parsed.data.focus_area,
      hasFullContext: hasFullContext,
    });

    return res.json({
      status: "success",
      output: finalPayload,
      promptVersion: prompt.version,
    });
  } catch (error) {
    requestLogger.error({ error: (error as Error).message }, "Follow-up analysis failed");
    return next(new ExternalServiceError((error as Error).message, "LLM"));
  }
});

// Micro Nudge Generation endpoint
const microNudgeSchema = z.object({
  profile_id: z.string().min(1).max(100).trim(),
  situation: z.string().min(1).max(2000).trim(),
  goal: z.string().min(1).max(500).trim(),
  constraints: z.string().min(1).max(1000).trim(),
  current_steps: z.string().max(1000).trim().optional(),
  deadline: z.string().max(200).trim().optional(),
  previous_nudge: z.string().max(200).trim().optional(),
});

router.post("/micro-nudge", validateOwnership, async (req, res, next) => {
  const requestLogger = logger.child({
    requestId: req.id,
    userId: res.locals.userId,
    profileId: req.body?.profile_id,
  });

  const parsed = microNudgeSchema.safeParse(req.body);
  if (!parsed.success) {
    return next(new ValidationError(parsed.error.message));
  }

  const profileStore: ProfileStore = getProfileStore();

  try {
    const profile = await profileStore.getProfile(parsed.data.profile_id);
    if (!profile) {
      return next(new ValidationError("Profile not found"));
    }

    const profileSummary = `PROFILE ${parsed.data.profile_id}: ${profile.tags.join(" | ")} | BASELINE: IPP=${profile.baseline.ipp.toFixed(1)}, BUT=${profile.baseline.but.toFixed(1)} | STRENGTHS: ${profile.strengths.join(", ")}`;

    const prompt = buildMicroNudgePrompt({
      situation: parsed.data.situation,
      goal: parsed.data.goal,
      constraints: parsed.data.constraints,
      currentSteps: parsed.data.current_steps,
      deadline: parsed.data.deadline,
      profileSummary,
      previousNudge: parsed.data.previous_nudge,
    });

    const raw = await llmProvider.complete({
      system: prompt.system,
      user: prompt.user,
      temperature: 0.3, // Slightly higher for variety while maintaining quality
      maxTokens: 80, // Increased from 50 to allow for more sophisticated nudges (still short)
      userId: res.locals.userId ?? null,
    });

    // Clean up the response (remove quotes, JSON formatting if present)
    let nudge = raw.trim()
      .replace(/^["']|["']$/g, "")
      .replace(/^\{.*?"micro_nudge"\s*:\s*["']?|["']?\s*\}.*$/gi, "")
      .replace(/^\{.*?"nudge"\s*:\s*["']?|["']?\s*\}.*$/gi, "")
      .trim();

    // Validate nudge quality
    const isValidNudge = nudge && nudge.length >= 10 && nudge.length <= 200 && !nudge.includes("\n\n");

    if (!isValidNudge) {
      // Log fallback reason for monitoring
      const reason = !nudge ? "empty_response" : 
                     nudge.length < 10 ? "too_short" : 
                     nudge.length > 200 ? "too_long" : 
                     nudge.includes("\n\n") ? "multiline" : "unknown";
      
      requestLogger.warn({ 
        rawLength: raw.length, 
        cleanedLength: nudge?.length || 0,
        reason,
        rawPreview: raw.substring(0, 100)
      }, "Micro nudge generation failed validation, using fallback");

      trackEvent("analyze.micro_nudge_fallback", {
        profileId: parsed.data.profile_id,
        reason,
        rawLength: raw.length,
      });

      // Return fallback with transparency
      return res.json({
        status: "success",
        nudge: "Replace \"maybe\" with \"decide by EOD\" in your next update.",
        promptVersion: prompt.version,
        fallback: true, // Indicate this is a fallback
      });
    }

    // Track successful generation with quality metrics
    trackEvent("analyze.micro_nudge_generated", {
      profileId: parsed.data.profile_id,
      nudgeLength: nudge.length,
      usedFallback: false,
    });

    requestLogger.debug({ 
      nudgeLength: nudge.length,
      hasPreviousNudge: !!parsed.data.previous_nudge 
    }, "Micro nudge generated successfully");

    return res.json({
      status: "success",
      nudge,
      promptVersion: prompt.version,
      fallback: false,
    });
  } catch (error) {
    const errorMessage = (error as Error).message;
    requestLogger.error({ error: errorMessage }, "Micro nudge generation failed");
    
    // Track fallback due to error
    trackEvent("analyze.micro_nudge_fallback", {
      profileId: parsed.data.profile_id,
      reason: "llm_error",
    });

    // Return default nudge on error with transparency
    return res.json({
      status: "success",
      nudge: "Replace \"maybe\" with \"decide by EOD\" in your next update.",
      promptVersion: PROMPT_VERSION,
      fallback: true, // Indicate this is a fallback
    });
  }
});

export default router;

async function resolveProfileSummary(
  profileId: string,
  profileStore: ProfileStore | undefined
): Promise<string> {
  if (!profileStore) {
    // Fallback if ProfileStore is not available
    return `PROFILE ${profileId}: SYSTEMATIC | MEDIUM_RISK | ACTION_READY | CACHE_ENABLED`;
  }

  try {
    const profile = await profileStore.getProfile(profileId);
    if (!profile) {
      // Fallback if profile doesn't exist
      logger.warn({ profileId }, "Profile not found, using fallback summary");
      return `PROFILE ${profileId}: SYSTEMATIC | MEDIUM_RISK | ACTION_READY | CACHE_ENABLED`;
    }

    // Build profile summary from actual profile data
    const tagsStr = profile.tags.length > 0 ? profile.tags.join(" | ") : "SYSTEMATIC";
    const strengthsStr =
      profile.strengths.length > 0 ? profile.strengths.join(", ") : "ACTION_READY";
    return `PROFILE ${profileId}: ${tagsStr} | BASELINE: IPP=${profile.baseline.ipp.toFixed(1)}, BUT=${profile.baseline.but.toFixed(1)} | STRENGTHS: ${strengthsStr}`;
  } catch (error) {
    // Fallback on error
      logger.error({ profileId, error }, "Error fetching profile");
    return `PROFILE ${profileId}: SYSTEMATIC | MEDIUM_RISK | ACTION_READY | CACHE_ENABLED`;
  }
}

