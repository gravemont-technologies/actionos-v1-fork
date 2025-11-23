import { getSupabaseClient, executeQuery } from "../db/supabase.js";
import { logger } from "../utils/logger.js";

/**
 * Profile cache configuration
 */
const CACHE_TTL_MS = 5 * 60 * 1000; // 5 minutes
const MAX_CACHE_SIZE = 100; // Maximum number of profiles to cache

/**
 * In-memory cache for profile data
 * Key: profile_id, Value: { data: ProfileData, timestamp: number }
 */
const profileCache = new Map<string, { data: ProfileData; timestamp: number }>();

type Baseline = {
  ipp: number;
  but: number;
  updatedAt: number;
};

type ActiveStep = {
  signature: string;
  stepDescription: string;
  createdAt: number;
  startedAt?: number;
  completedAt?: number;
  outcome?: string;
};

export type FeedbackRecord = {
  profileId: string;
  signature: string;
  slider: number;
  outcome?: string;
  recordedAt: number;
  deltaIpp: number;
  deltaBut: number;
};

export type ProfileData = {
  profileId: string;
  tags: string[];
  baseline: Baseline;
  strengths: string[];
};

export class ProfileStore {
  /**
   * Get profile with caching and retry logic
   */
  async getProfile(profileId: string): Promise<ProfileData | null> {
    // Check cache first
    const cached = profileCache.get(profileId);
    if (cached && Date.now() - cached.timestamp < CACHE_TTL_MS) {
      logger.debug({ profileId }, "Profile cache hit");
      return cached.data;
    }

      const startTime = Date.now();
    try {
      const supabase = getSupabaseClient();
      let data;
      try {
        data = await executeQuery(
          async () => {
            const result = await supabase
              .from("profiles")
              .select("profile_id, tags, baseline_ipp, baseline_but, strengths, updated_at")
              .eq("profile_id", profileId)
              .single();
            return { data: result.data, error: result.error };
          },
          { timeoutMs: 10000 } // 10 second timeout for profile queries
        );
      } catch (error) {
        // executeQuery throws on null data, but null is valid for "not found"
        if (error instanceof Error && error.message.includes("null data")) {
          return null;
        }
        throw error;
      }

      if (!data) {
        return null;
      }

      const profile: ProfileData = {
        profileId: data.profile_id,
        tags: data.tags || [],
        baseline: {
          ipp: Number(data.baseline_ipp),
          but: Number(data.baseline_but),
          updatedAt: new Date(data.updated_at).getTime(),
        },
        strengths: data.strengths || [],
      };

      // Update cache
      if (profileCache.size >= MAX_CACHE_SIZE) {
        // Remove oldest entry (simple eviction)
        const firstKey = profileCache.keys().next().value;
        if (firstKey) {
          profileCache.delete(firstKey);
        }
      }
      profileCache.set(profileId, { data: profile, timestamp: Date.now() });

      const duration = Date.now() - startTime;
      logger.debug({ profileId, duration }, "Profile query completed");
      if (duration > 1000) {
        logger.warn({ profileId, duration }, "Slow profile query detected");
      }

      return profile;
    } catch (error) {
      const duration = Date.now() - startTime;
      logger.error({ profileId, error, duration }, "Profile query failed");
      return null;
    }
  }

  /**
   * Get profile by user ID with retry logic and performance logging
   */
  async getProfileByUserId(userId: string): Promise<ProfileData | null> {
      const startTime = Date.now();
    try {
      const supabase = getSupabaseClient();
      let data;
      try {
        data = await executeQuery(
          async () => {
            const result = await supabase
              .from("profiles")
              .select("profile_id, tags, baseline_ipp, baseline_but, strengths, updated_at")
              .eq("user_id", userId)
              .single();
            return { data: result.data, error: result.error };
          },
          { timeoutMs: 10000 }
        );
      } catch (error) {
        if (error instanceof Error && error.message.includes("null data")) {
          return null;
        }
        throw error;
      }

      if (!data) {
        return null;
      }

      const profile: ProfileData = {
        profileId: data.profile_id,
        tags: data.tags || [],
        baseline: {
          ipp: Number(data.baseline_ipp),
          but: Number(data.baseline_but),
          updatedAt: new Date(data.updated_at).getTime(),
        },
        strengths: data.strengths || [],
      };

      // Cache by profile_id
      if (profileCache.size >= MAX_CACHE_SIZE) {
        const firstKey = profileCache.keys().next().value;
        if (firstKey) {
          profileCache.delete(firstKey);
        }
      }
      profileCache.set(profile.profileId, { data: profile, timestamp: Date.now() });

      const duration = Date.now() - startTime;
      logger.debug({ userId, profileId: profile.profileId, duration }, "Profile by user ID query completed");
      if (duration > 1000) {
        logger.warn({ userId, duration }, "Slow profile by user ID query detected");
      }

      return profile;
    } catch (error) {
      const duration = Date.now() - startTime;
      logger.error({ userId, error, duration }, "Profile by user ID query failed");
      return null;
    }
  }

  /**
   * Get baseline with retry logic and performance logging
   */
  async getBaseline(profileId: string): Promise<Baseline> {
      const startTime = Date.now();
    try {
      const supabase = getSupabaseClient();
      let data;
      try {
        data = await executeQuery(
          async () => {
            const result = await supabase
              .from("profiles")
              .select("baseline_ipp, baseline_but, updated_at")
              .eq("profile_id", profileId)
              .single();
            return { data: result.data, error: result.error };
          },
          { timeoutMs: 10000 }
        );
      } catch (error) {
        // executeQuery throws on null, but null is valid for "not found" - return default
        if (error instanceof Error && error.message.includes("null data")) {
          return { ipp: 50, but: 50, updatedAt: Date.now() };
        }
        throw error;
      }

      if (!data) {
        // Default baseline if profile doesn't exist
        return { ipp: 50, but: 50, updatedAt: Date.now() };
      }

      const baseline: Baseline = {
        ipp: Number(data.baseline_ipp),
        but: Number(data.baseline_but),
        updatedAt: new Date(data.updated_at).getTime(),
      };

      const duration = Date.now() - startTime;
      logger.debug({ profileId, duration }, "Baseline query completed");
      if (duration > 500) {
        logger.warn({ profileId, duration }, "Slow baseline query detected");
      }

      return baseline;
    } catch (error) {
      const duration = Date.now() - startTime;
      logger.error({ profileId, error, duration }, "Baseline query failed");
      // Return default on error
      return { ipp: 50, but: 50, updatedAt: Date.now() };
    }
  }

  /**
   * Set active step with retry logic
   */
  async setActiveStep(
    profileId: string,
    signature: string,
    stepDescription: string,
    deltaBucket?: string // GAP FIX: Store delta_bucket from LLM response
  ): Promise<void> {
    const startTime = Date.now();
    try {
      const supabase = getSupabaseClient();

      // CRITICAL FIX: Check if active step exists to preserve first_started_at
      const { data: existing } = await supabase
        .from("active_steps")
        .select("first_started_at")
        .eq("profile_id", profileId)
        .maybeSingle();

      const now = new Date().toISOString();
      const firstStartedAt = existing?.first_started_at || now;

      // Atomic upsert: use Supabase's upsert with onConflict to handle UNIQUE constraint
      // This prevents race conditions between delete and insert operations
      // Note: Supabase upsert can return null data on success, so we allow null
      await executeQuery(
        async () => {
          const result = await supabase.from("active_steps").upsert(
            {
              profile_id: profileId,
              signature,
              step_description: stepDescription,
              delta_bucket: deltaBucket || null, // Store LLM prediction
              started_at: now, // Current timestamp (may be reset on re-analyze)
              first_started_at: firstStartedAt, // Preserve first start time for accurate TAA
              completed_at: null,
              outcome: null,
            },
            {
              onConflict: "profile_id",
              ignoreDuplicates: false,
            }
          );
          return { data: result.data, error: result.error };
        },
        { timeoutMs: 10000, allowNull: true } // Upsert operations can return null data on success
      );

      const duration = Date.now() - startTime;
      logger.debug({ profileId, duration }, "Set active step completed");
    } catch (error) {
      const duration = Date.now() - startTime;
      logger.error({ profileId, error, duration }, "Set active step failed");
      throw new Error(`Failed to set active step: ${error instanceof Error ? error.message : String(error)}`);
    }
  }

  /**
   * Get active step with retry logic and performance logging
   */
  async getActiveStep(profileId: string): Promise<ActiveStep | undefined> {
    const startTime = Date.now();
    try {
      const supabase = getSupabaseClient();
      
      // CRITICAL: Use direct query without executeQuery wrapper to avoid 10s timeout
      // This is a simple read query that should be fast
      const result = await supabase
        .from("active_steps")
        .select("signature, step_description, created_at, started_at, completed_at, outcome")
        .eq("profile_id", profileId)
        .is("completed_at", null)
        .order("created_at", { ascending: false })
        .limit(1)
        .maybeSingle();

      // Handle Supabase errors
      if (result.error) {
        // PGRST116 = not found, which is valid
        if (result.error.code === "PGRST116") {
          logger.debug({ profileId }, "No active step found");
          return undefined;
        }
        throw result.error;
      }

      if (!result.data) {
        logger.debug({ profileId }, "No active step found");
        return undefined;
      }

      const step: ActiveStep = {
        signature: result.data.signature,
        stepDescription: result.data.step_description,
        createdAt: new Date(result.data.created_at).getTime(),
        startedAt: result.data.started_at ? new Date(result.data.started_at).getTime() : undefined,
        completedAt: result.data.completed_at ? new Date(result.data.completed_at).getTime() : undefined,
        outcome: result.data.outcome ?? undefined,
      };

      const duration = Date.now() - startTime;
      logger.debug({ profileId, duration }, "Active step query completed");
      if (duration > 500) {
        logger.warn({ profileId, duration }, "Slow active step query detected");
      }

      return step;
    } catch (error) {
      const duration = Date.now() - startTime;
      logger.error({ profileId, error, duration }, "Active step query failed");
      // Return undefined instead of throwing to prevent cascading failures
      return undefined;
    }
  }

  /**
   * Mark step complete with retry logic and cache invalidation
   */
  async markStepComplete(
    profileId: string,
    signature: string,
    slider: number,
    outcome?: string
  ): Promise<{ delta: number; baseline: Baseline; previous_baseline: Baseline }> {
    const startTime = Date.now();
    try {
      const supabase = getSupabaseClient();
      const baseline = await this.getBaseline(profileId);
      
      // Store previous baseline for animation
      const previous_baseline: Baseline = {
        ipp: baseline.ipp,
        but: baseline.but,
        updatedAt: baseline.updatedAt,
      };

      const normalizedSlider = clamp(slider, 0, 10);
      const deltaIpp = (normalizedSlider - 5) * 2;
      const deltaBut = deltaIpp * 0.8;

      const newIpp = clamp(baseline.ipp + deltaIpp, 20, 95);
      const newBut = clamp(baseline.but + deltaBut, 20, 95);

      // Update profile baseline with retry
      await executeQuery(
        async () => {
          const result = await supabase
            .from("profiles")
            .update({
              baseline_ipp: newIpp,
              baseline_but: newBut,
            })
            .eq("profile_id", profileId);
          return { data: result.data, error: result.error };
        },
        { timeoutMs: 10000 }
      );

      // Invalidate cache since baseline changed
      this.clearCache(profileId);

      // Mark step as completed with retry (clears active step)
      await executeQuery(
        async () => {
          const result = await supabase
            .from("active_steps")
            .update({
              completed_at: new Date().toISOString(),
              outcome: outcome ?? null,
            })
            .eq("profile_id", profileId)
            .eq("signature", signature);
          return { data: result.data, error: result.error };
        },
        { timeoutMs: 10000 }
      );
      
      logger.debug({ profileId, signature }, "Active step marked as completed");

      // Insert feedback record with retry
      await executeQuery(
        async () => {
          const result = await supabase.from("feedback_records").insert({
            profile_id: profileId,
            signature,
            slider: normalizedSlider,
            outcome: outcome ?? null,
            delta_ipp: deltaIpp,
            delta_but: deltaBut,
          });
          return { data: result.data, error: result.error };
        },
        { timeoutMs: 10000 }
      );

      const duration = Date.now() - startTime;
      logger.debug({ profileId, duration }, "Mark step complete completed");

      return {
        delta: Math.max(Math.abs(deltaIpp), Math.abs(deltaBut)),
        baseline: {
          ipp: newIpp,
          but: newBut,
          updatedAt: Date.now(),
        },
        previous_baseline,
      };
    } catch (error) {
      const duration = Date.now() - startTime;
      logger.error({ profileId, error, duration }, "Mark step complete failed");
      throw error;
    }
  }

  /**
   * List feedback with retry logic and performance logging
   */
  async listFeedback(profileId: string, limit = 20): Promise<FeedbackRecord[]> {
    const startTime = Date.now();
    try {
      const supabase = getSupabaseClient();
      let data;
      try {
        data = await executeQuery(
          async () => {
            const result = await supabase
              .from("feedback_records")
              .select("*")
              .eq("profile_id", profileId)
              .order("recorded_at", { ascending: false })
              .limit(limit);
            return { data: result.data, error: result.error };
          },
          { timeoutMs: 10000 }
        );
      } catch (error) {
        // executeQuery throws on null, but empty array is valid
        if (error instanceof Error && error.message.includes("null data")) {
          return [];
        }
        throw error;
      }

      if (!data || !Array.isArray(data)) {
        return [];
      }

      const feedback = data.map((row) => ({
        profileId: row.profile_id,
        signature: row.signature,
        slider: Number(row.slider),
        outcome: row.outcome ?? undefined,
        recordedAt: new Date(row.recorded_at).getTime(),
        deltaIpp: Number(row.delta_ipp),
        deltaBut: Number(row.delta_but),
      }));

      const duration = Date.now() - startTime;
      logger.debug({ profileId, limit, count: feedback.length, duration }, "Feedback list query completed");
      if (duration > 1000) {
        logger.warn({ profileId, duration }, "Slow feedback list query detected");
      }

      return feedback;
    } catch (error) {
      const duration = Date.now() - startTime;
      logger.error({ profileId, error, duration }, "Feedback list query failed");
      return [];
    }
  }

  /**
   * Clear profile cache (useful for testing or when profile is updated)
   */
  clearCache(profileId?: string): void {
    if (profileId) {
      profileCache.delete(profileId);
    } else {
      profileCache.clear();
    }
  }
}

function clamp(value: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, value));
}

