/**
 * User Ownership Validation Middleware
 * 
 * Verifies that profile_id belongs to the authenticated user.
 * Reusable middleware for any route that uses profile_id.
 * Returns 403 if ownership check fails.
 */

import { Request, Response, NextFunction } from "express";
import { getSupabaseClient } from "../db/supabase.js";
import { AuthorizationError, AppError } from "./errorHandler.js";
import { logger } from "../utils/logger.js";

/**
 * Middleware to validate that the `profile_id` provided in the request
 * belongs to the authenticated user.
 *
 * Expects:
 * - `res.locals.userId` (from `clerkAuthMiddleware`)
 * - `req.body.profile_id` or `req.query.profile_id`
 */
export async function validateOwnership(
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    const profileId = (req.body?.profile_id || req.query?.profile_id) as string | undefined;
    const userId = res.locals.userId;

    if (!profileId) {
      return next(new AppError("MISSING_PROFILE_ID", "profile_id is required for ownership validation", 400));
    }

    if (!userId) {
      // This should not happen if clerkAuthMiddleware is applied first, but it's a good safeguard.
      return next(new AppError("MISSING_USER_ID", "User ID not found in request context", 500));
    }

    const supabase = getSupabaseClient();
    const { data, error } = await supabase
      .from("profiles")
      .select("user_id")
      .eq("profile_id", profileId)
      .single(); // Use single() to enforce that profile_id is unique

    if (error) {
      // If no profile is found, Supabase returns an error with code PGRST116
      if (error.code === 'PGRST116') {
        logger.warn({ userId, profileId }, "Attempted to access a non-existent profile.");
        return next(new AuthorizationError("Profile not found."));
      }
      // For other database errors
      logger.error({ userId, profileId, error }, "Database error during ownership check");
      return next(new AppError('DB_OWNERSHIP_CHECK_FAILED', 'Database error during ownership validation', 500));
    }

    if (data.user_id !== userId) {
      logger.warn({
        userId,
        profileId,
        expectedOwner: data.user_id,
      }, "Ownership validation failed: profile belongs to another user.");
      return next(new AuthorizationError("You do not have permission to access this profile."));
    }

    // Ownership is validated, proceed to the next middleware/handler
    next();
  } catch (error) {
    // Catch any unexpected errors during the process
    next(error);
  }
}

