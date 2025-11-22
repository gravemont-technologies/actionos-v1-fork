import { Router } from "express";
import { randomUUID } from "crypto";
import { getSupabaseClient } from "../db/supabase.js";
import { clerkAuthMiddleware } from "../middleware/clerkAuth.js";
import { logger } from "../utils/logger.js";

const router = Router();

// Apply auth middleware to all routes
router.use(clerkAuthMiddleware);

/**
 * GET /api/auth/status
 * Checks if the authenticated user has a profile and returns their onboarding status.
 * Used by the frontend to determine whether to show the dashboard or onboarding flow.
 */
router.get("/status", async (req, res) => {
  const userId = req.userId;

  if (!userId) {
    return res.status(401).json({ error: "Unauthorized" });
  }

  try {
    const supabase = getSupabaseClient();
    
    // Check if profile exists for this user
    const { data, error } = await supabase
      .from("profiles" as any)
      .select("profile_id")
      .eq("user_id", userId)
      .maybeSingle();

    if (error) {
      logger.error({ userId, error }, "Error checking auth status");
      throw error;
    }

    const profileId = (data as any)?.profile_id || null;

    return res.json({
      isAuthenticated: true,
      userId,
      hasProfile: !!profileId,
      profileId,
      onboarded: !!profileId
    });
  } catch (error) {
    logger.error({ userId, error }, "Failed to check auth status");
    return res.status(500).json({ error: "Failed to check status" });
  }
});

/**
 * POST /api/auth/create-profile
 * Auto-creates a minimal profile for authenticated user
 * No onboarding required - instant access to app
 */
router.post("/create-profile", async (req, res) => {
  const userId = req.userId;

  if (!userId) {
    return res.status(401).json({ error: "Unauthorized" });
  }

  try {
    const supabase = getSupabaseClient();
    
    // Check if profile already exists
    const { data: existing } = await supabase
      .from("profiles" as any)
      .select("profile_id")
      .eq("user_id", userId)
      .maybeSingle();

    if (existing) {
      return res.json({ profileId: (existing as any).profile_id });
    }

    // Create minimal profile
    const profileId = randomUUID();
    const { error: insertError } = await supabase
      .from("profiles" as any)
      .insert({
        profile_id: profileId,
        user_id: userId,
        tags: [],
        created_at: new Date().toISOString(),
      });

    if (insertError) {
      logger.error({ userId, error: insertError }, "Failed to create profile");
      return res.status(500).json({ error: "Failed to create profile" });
    }

    logger.info({ userId, profileId }, "Auto-created profile");
    return res.json({ profileId });
  } catch (error) {
    logger.error({ userId, error }, "Error in create-profile");
    return res.status(500).json({ error: "Failed to create profile" });
  }
});

export default router;
