import { Router } from "express";
import { getSupabaseClient } from "../db/supabase.js";
import { clerkAuthMiddleware } from "../middleware/clerkAuth.js";
import { logger } from "../utils/logger.js";
import { asyncHandler } from "../middleware/asyncHandler.js";
import { AppError } from "../middleware/errorHandler.js";

const router = Router();

// Apply auth middleware to all routes in this router
router.use(clerkAuthMiddleware);

/**
 * GET /api/auth/status
 * Checks if the authenticated user has a profile and returns it.
 */
router.get("/status", asyncHandler(async (req, res) => {
  const userId = res.locals.userId; // Use res.locals
  const supabase = getSupabaseClient();
  
  const { data: profile, error } = await supabase
    .from("profiles")
    .select("*")
    .eq("user_id", userId)
    .single();

  if (error && error.code !== 'PGRST116') { // PGRST116 = no rows found, which is not an error here
    logger.error({ userId, error }, "Error checking profile status");
    throw new AppError('DB_FETCH_FAILED', 'Failed to fetch profile status', 500);
  }

  res.json({
    authenticated: true,
    userId,
    profile: profile || null, // Return the full profile or null
  });
}));

/**
 * POST /api/auth/create-profile
 * Auto-creates a minimal profile for an authenticated user if one doesn't exist.
 * This is idempotent.
 */
router.post("/create-profile", asyncHandler(async (req, res) => {
  const userId = res.locals.userId; // Use res.locals
  const supabase = getSupabaseClient();

  // 1. Check if profile already exists
  const { data: existingProfile, error: selectError } = await supabase
    .from("profiles")
    .select("profile_id")
    .eq("user_id", userId)
    .single();

  if (selectError && selectError.code !== 'PGRST116') {
    logger.error({ userId, error: selectError }, "Error checking for existing profile");
    throw new AppError('DB_CHECK_FAILED', 'Failed to check for existing profile', 500);
  }

  if (existingProfile) {
    return res.status(200).json({ profile: existingProfile, message: 'Profile already exists.' });
  }

  // 2. Create a new profile with default values
  const { data: newProfile, error: insertError } = await supabase
    .from("profiles")
    .insert({
      user_id: userId,
      tags: [],
      baseline_ipp: 50.0,
      baseline_but: 50.0,
      strengths: [],
      consent_to_store: true,
    })
    .select()
    .single();

  if (insertError) {
    logger.error({ userId, error: insertError }, "Failed to create profile");
    throw new AppError('DB_INSERT_FAILED', 'Failed to create profile', 500);
  }

  res.status(201).json({ profile: newProfile });
}));

export default router;
