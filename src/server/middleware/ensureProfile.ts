import { Request, Response, NextFunction } from "express";
import { getSupabaseClient } from "../db/supabase.js";
import { logger } from "../utils/logger.js";

/**
 * Middleware to ensure authenticated user has a profile
 * Creates one with defaults if it doesn't exist
 * Must be called AFTER clerkAuthMiddleware
 */
export async function ensureProfile(req: Request, res: Response, next: NextFunction): Promise<void> {
  const userId = res.locals.userId;

  if (!userId) {
    // This should never happen if used after clerkAuthMiddleware
    logger.error({ requestId: req.id }, "ensureProfile called without userId in res.locals");
    return next();
  }

  try {
    const supabase = getSupabaseClient();

    // Check if profile exists
    const { data: existingProfile, error: selectError } = await supabase
      .from("profiles")
      .select("profile_id")
      .eq("user_id", userId)
      .single();

    if (selectError && selectError.code !== 'PGRST116') {
      // PGRST116 = no rows found, which is expected for new users
      logger.error({ userId, error: selectError }, "Error checking for profile");
      return next();
    }

    if (existingProfile) {
      // Profile exists, continue
      return next();
    }

    // Profile doesn't exist, create it
    logger.info({ userId }, "Auto-creating profile with defaults");

    const { error: insertError } = await supabase
      .from("profiles")
      .insert({
        user_id: userId,
        tags: [],
        baseline_ipp: 50.0,
        baseline_but: 50.0,
        strengths: [],
        consent_to_store: true,
      });

    if (insertError) {
      logger.error({ userId, error: insertError }, "Failed to auto-create profile");
      // Continue anyway - validateOwnership will handle the error
      return next();
    }

    logger.info({ userId }, "Profile auto-created successfully");
    next();
  } catch (error) {
    logger.error({ userId, error }, "Unexpected error in ensureProfile middleware");
    next();
  }
}
