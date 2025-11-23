import { Router } from "express";
import { z } from "zod";
import {
  collectInsights,
  generateProfile,
  getOption,
  listQuestions,
  QuizResponseMap,
} from "../../onboarding/profile_generator.js";
import { getSupabaseClient } from "../db/supabase.js";
import { clerkAuthMiddleware } from "../middleware/clerkAuth.js";
import { onboardingRateLimiter, insightsRateLimiter } from "../middleware/rateLimiter.js";
import { AppError } from "../middleware/errorHandler.js";
import { logger } from "../utils/logger.js";
import { asyncHandler } from "../middleware/asyncHandler.js";
import { trackEvent } from "../../analytics/events.js";

const router = Router();

// Public endpoints for the quiz questions and insights
router.get("/questions", onboardingRateLimiter, (_req, res) => {
  res.json({ questions: listQuestions() });
});

router.get("/insights", insightsRateLimiter, (req, res, next) => {
  const { questionId, optionId } = req.query;

  if (typeof questionId !== "string" || typeof optionId !== "string") {
    return next(new AppError('MISSING_QUERY_PARAMS', 'Missing required query params: questionId and optionId', 400));
  }

  try {
    const option = getOption(questionId, optionId);
    res.json({
      questionId,
      optionId,
      insight: option.insight,
    });
  } catch (error: any) {
    next(new AppError('INVALID_OPTION', error.message, 400));
  }
});

// Authenticated endpoint to submit quiz answers and create/update a profile
const responsesSchema = z.record(
  z.string().max(100).trim(), // question ID
  z.string().max(500).trim() // response value
);

router.post("/submit", clerkAuthMiddleware, onboardingRateLimiter, asyncHandler(async (req, res, next) => {
  const userId = res.locals.userId;
  const { responses, consent_to_store } = req.body;

  const parsed = responsesSchema.safeParse(responses);
  if (!parsed.success) {
    return next(new AppError('VALIDATION_ERROR', 'Invalid responses format.', 400));
  }

  // Generate profile from quiz answers
  const profileData = generateProfile(parsed.data as QuizResponseMap);
  const insights = collectInsights(parsed.data);

  const supabase = getSupabaseClient();

  // Upsert the profile linked to the authenticated user
  const { data: upsertedProfile, error: upsertError } = await supabase
    .from("profiles")
    .upsert(
      {
        user_id: userId, // Use authenticated user ID
        tags: profileData.tags,
        baseline_ipp: profileData.baseline.ipp,
        baseline_but: profileData.baseline.but,
        strengths: profileData.strengths,
        metadata: profileData.metadata,
        consent_to_store: consent_to_store === true,
      },
      {
        onConflict: "user_id", // A user can only have one profile
        ignoreDuplicates: false,
      }
    )
    .select()
    .single();

  if (upsertError) {
    logger.error({ userId, error: upsertError }, "Failed to save profile");
    throw new AppError('DB_UPSERT_FAILED', 'Failed to save profile.', 500);
  }

  trackEvent("onboard.complete", {
    profileId: upsertedProfile.profile_id,
    userId: userId,
    tags: upsertedProfile.tags,
  });

  res.status(201).json({ profile: upsertedProfile, insights });
}));

export default router;

