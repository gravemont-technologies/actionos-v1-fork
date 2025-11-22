import { Router } from "express";
import { z } from "zod";
import { randomUUID } from "crypto";
import { trackEvent } from "../../analytics/events.js";
import {
  collectInsights,
  generateProfile,
  getOption,
  listQuestions,
  QuizResponseMap,
} from "../../onboarding/profile_generator.js";
import { getSupabaseClient } from "../db/supabase.js";
import { optionalClerkAuthMiddleware } from "../middleware/clerkAuth.js";
import { onboardingRateLimiter, insightsRateLimiter } from "../middleware/rateLimiter.js";
import { ValidationError } from "../middleware/errorHandler.js";
import { logger } from "../utils/logger.js";

const router = Router();

// Apply middleware (optional auth for signup flow)
router.use(optionalClerkAuthMiddleware);
// Note: Rate limiters are applied per-route, not router-wide, to allow different limits per endpoint

const responsesSchema = z.record(
  z.string().max(100).trim(), // question ID
  z.string().max(500).trim() // response value
);

router.get("/questions", onboardingRateLimiter, (_req, res) => {
  res.json({ questions: listQuestions() });
});

// Insights endpoint: No rate limiting in dev, lenient in production for smooth quiz flow
router.get("/insights", insightsRateLimiter, (req, res) => {
  const questionId = req.query.questionId;
  const optionId = req.query.optionId;

  if (typeof questionId !== "string" || typeof optionId !== "string") {
    return res.status(400).json({
      error: "Missing required query params: questionId and optionId",
    });
  }

  try {
    const option = getOption(questionId, optionId);
    return res.json({
      questionId,
      optionId,
      insight: option.insight,
    });
  } catch (error) {
    return res.status(400).json({ error: (error as Error).message });
  }
});

// Check if user has a profile
router.get("/profile", onboardingRateLimiter, async (req, res) => {
  const userId = req.query.user_id as string | undefined;
  if (!userId) {
    return res.status(400).json({ error: "user_id query parameter required" });
  }

  try {
    const supabase = getSupabaseClient();
    const { data, error } = await supabase
      .from("profiles")
      .select("profile_id")
      .eq("user_id", userId)
      .maybeSingle(); // Use maybeSingle() instead of single() to handle 0 rows gracefully

    if (error) {
      logger.error(
        { userId, error: error.message, code: error.code },
        "Failed to fetch profile from database"
      );
      throw error;
    }

    // Return profile if found, null otherwise
    return res.json({ profile: data || null });
  } catch (error) {
    const errorMessage = (error as Error).message;
    const errorCode = (error as { code?: string })?.code;
    
    logger.error(
      { userId, error: errorMessage, code: errorCode },
      "Error in GET /api/onboarding/profile"
    );
    
    // Provide helpful error message for common database issues
    if (errorCode === "PGRST205" || errorMessage.includes("table") || errorMessage.includes("schema cache")) {
      return res.status(500).json({ 
        error: "Database schema not initialized. Please run supabase/schema.sql in your Supabase SQL Editor.",
        code: "DATABASE_SCHEMA_MISSING",
        hint: "See docs/README.md for database setup instructions"
      });
    }
    
    return res.status(500).json({ 
      error: errorMessage,
      code: "PROFILE_FETCH_ERROR"
    });
  }
});

router.post("/profile", onboardingRateLimiter, async (req, res) => {
  const parsed = responsesSchema.safeParse(req.body?.responses);
  if (!parsed.success) {
    return res.status(400).json({ error: parsed.error.flatten() });
  }

  try {
    // Get Clerk user ID from header or body (body takes precedence for explicit passing)
    const clerkUserId = req.body?.user_id || req.header("x-clerk-user-id") || null;
    const existingProfileId = req.body?.existing_profile_id || null;

    // Support empty responses for auto-created profiles (when onboarding is disabled)
    const isAutoCreate = Object.keys(parsed.data).length === 0;
    
    const profile = isAutoCreate 
      ? {
          profile_id: existingProfileId || randomUUID().slice(0, 12),
          tags: ["SYSTEMATIC", "HIGH_LEVERAGE", "MEDIUM_RISK", "ACTION_READY"],
          baseline: { ipp: 50, but: 50 },
          strengths: ["Operational rigor", "Action bias"],
          metadata: {}
        }
      : generateProfile(parsed.data as QuizResponseMap, existingProfileId || undefined);
    
    const insights = isAutoCreate ? [] : collectInsights(parsed.data);

    // Save profile to Supabase (with consent flag from request if provided)
    const consentToStore = req.body?.consent_to_store === true;
    const supabase = getSupabaseClient();

    const { data: upsertedData, error: upsertError } = await supabase.from("profiles").upsert(
      {
        profile_id: profile.profile_id,
        tags: profile.tags,
        baseline_ipp: profile.baseline.ipp,
        baseline_but: profile.baseline.but,
        strengths: profile.strengths,
        metadata: profile.metadata,
        consent_to_store: consentToStore,
        user_id: clerkUserId, // Clerk user ID when available
      },
      {
        onConflict: "profile_id",
        ignoreDuplicates: false,
      }
    );

    if (upsertError) {
      logger.error(
        { 
          profileId: profile.profile_id, 
          userId: clerkUserId, 
          error: upsertError.message,
          code: (upsertError as { code?: string })?.code
        },
        "Failed to save profile to database"
      );
      
      // Provide helpful error for schema issues
      const errorCode = (upsertError as { code?: string })?.code;
      if (errorCode === "PGRST205" || upsertError.message.includes("table") || upsertError.message.includes("schema cache")) {
        return res.status(500).json({ 
          error: "Database schema not initialized. Please run supabase/schema.sql in your Supabase SQL Editor.",
          code: "DATABASE_SCHEMA_MISSING",
          hint: "See docs/README.md for database setup instructions"
        });
      }
      
      return res.status(500).json({ 
        error: "Failed to save profile. Please try again.",
        code: "PROFILE_SAVE_ERROR",
        details: upsertError.message
      });
    }

    // Verify the profile was actually saved (upsert returns data in some Supabase versions)
    // Note: Supabase upsert may return empty array, so we verify by querying
    const { data: verifyData, error: verifyError } = await supabase
      .from("profiles")
      .select("profile_id")
      .eq("profile_id", profile.profile_id)
      .maybeSingle();

    if (verifyError || !verifyData) {
      logger.error(
        { profileId: profile.profile_id, userId: clerkUserId, verifyError },
        "Profile verification failed after upsert"
      );
      return res.status(500).json({ 
        error: "Profile was not saved correctly. Please try again.",
        code: "PROFILE_VERIFY_ERROR"
      });
    }

    trackEvent("onboard.complete", {
      profileId: profile.profile_id,
      tags: profile.tags,
    });

    return res.json({ profile, insights });
  } catch (error) {
    return res.status(400).json({ error: (error as Error).message });
  }
});

export default router;

