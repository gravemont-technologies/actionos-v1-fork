import { getSupabaseClient, executeQuery } from "../db/supabase.js";
import { LLMResponse } from "../llm/schema.js";
import { logger } from "../utils/logger.js";

// Enhanced CacheEntry type (backward compatible)
type CacheEntry = {
  signature: string;
  profileId: string;
  response: LLMResponse;
  normalizedInput: {
    situation: string;
    goal: string;
    constraints: string[];
    current_steps: string;
  };
  baselineIpp: number;
  baselineBut: number;
  createdAt: number;
  // NEW: Insight fields (optional for backward compatibility)
  userId?: string;
  isSaved?: boolean;
  title?: string;
  tags?: string[];
};

export class SignatureCache {
  private readonly ttlMs = 24 * 60 * 60 * 1000;

  /**
   * Extract title from summary text
   * Takes first sentence or first 60 characters, cleans and capitalizes
   */
  private extractTitleFromSummary(summary: string): string {
    if (!summary || summary.trim().length === 0) {
      return "Untitled Analysis";
    }

    // Try to extract first sentence (ending with . ! or ?)
    const sentenceMatch = summary.match(/^[^.!?]+[.!?]/);
    if (sentenceMatch) {
      let title = sentenceMatch[0].trim();
      // Remove trailing punctuation
      title = title.replace(/[.!?]+$/, "");
      // Limit to 60 chars
      if (title.length > 60) {
        title = title.substring(0, 57) + "...";
      }
      // Capitalize first letter
      return title.charAt(0).toUpperCase() + title.slice(1);
    }

    // Fallback: first 60 characters
    let title = summary.trim().substring(0, 60);
    if (summary.length > 60) {
      title += "...";
    }
    // Capitalize first letter
    return title.charAt(0).toUpperCase() + title.slice(1);
  }

  // Enhanced get() - handles both cache and saved insights
  async get(
    signature: string,
    options?: { includeSaved?: boolean; userId?: string }
  ): Promise<CacheEntry | null> {
    const startTime = Date.now();
    try {
      const supabase = getSupabaseClient();
      
      if (options?.includeSaved && options?.userId) {
        // For saved insights: check both saved and non-expired cache
        const now = new Date().toISOString();
        
        // First, try saved insight (expires_at IS NULL) - permanent storage
        const { data: savedData, error: savedError } = await supabase
          .from("signature_cache")
          .select("*")
          .eq("signature", signature)
          .eq("is_saved", true)
          .is("expires_at", null)
          .maybeSingle();
        
        // If found and belongs to user, return it
        if (savedData && !savedError) {
          const entry = this.mapToCacheEntry(savedData);
          // Verify ownership (user_id must match)
          if (entry.userId === options.userId || !entry.userId) {
            // If user_id is null, update it (legacy entry) - but only if not already claimed
            if (!entry.userId) {
              // Use atomic update with conflict detection
              const { data: updateResult, error: updateError } = await supabase
                .from("signature_cache")
                .update({ user_id: options.userId })
                .eq("signature", signature)
                .is("user_id", null) // Only update if still null (prevents race condition)
                .select("user_id")
                .maybeSingle();
              
              if (!updateError && updateResult) {
                entry.userId = options.userId;
              } else if (updateError || !updateResult) {
                // Another request claimed it first, re-fetch
                const { data: refreshed } = await supabase
                  .from("signature_cache")
                  .select("*")
                  .eq("signature", signature)
                  .maybeSingle();
                if (refreshed) {
                  const refreshedEntry = this.mapToCacheEntry(refreshed);
                  // Only return if it belongs to this user
                  if (refreshedEntry.userId === options.userId) {
                    return refreshedEntry;
                  }
                  return null; // Belongs to another user
                }
              }
            }
            return entry;
          }
        }
        
        // If not saved, try non-expired cache (or expired but user_id matches)
        const { data: cacheData, error: cacheError } = await supabase
          .from("signature_cache")
          .select("*")
          .eq("signature", signature)
          .maybeSingle();
        
        if (cacheData && !cacheError) {
          const entry = this.mapToCacheEntry(cacheData);
          // Return if not expired OR if user_id matches (even if expired, user might want to save it)
          if (!entry.isSaved && (
            (entry.createdAt && entry.createdAt + this.ttlMs > Date.now()) ||
            entry.userId === options.userId
          )) {
            return entry;
          }
        }
        
        return null;
      } else {
        // Standard cache lookup (non-expired only)
        const { data, error } = await supabase
          .from("signature_cache")
          .select("*")
          .eq("signature", signature)
          .gt("expires_at", new Date().toISOString())
          .maybeSingle();

        if (error) {
          const errorCode = (error as { code?: string })?.code;
          if (errorCode === "PGRST116") {
            return null; // Cache miss
          }
          logger.warn({ signature, error: errorCode || error }, "Cache query error");
          return null;
        }

        if (!data) {
          return null;
        }

        return this.mapToCacheEntry(data);
      }
    } catch (error) {
      const duration = Date.now() - startTime;
      logger.error({ signature, error, duration }, "Cache get failed");
      return null;
    }
  }

  // Helper to map database row to CacheEntry
  private mapToCacheEntry(data: any): CacheEntry {
    return {
      signature: data.signature,
      profileId: data.profile_id,
      response: data.response as LLMResponse,
      normalizedInput: data.normalized_input as CacheEntry["normalizedInput"],
      baselineIpp: Number(data.baseline_ipp),
      baselineBut: Number(data.baseline_but),
      createdAt: new Date(data.created_at).getTime(),
      userId: data.user_id || undefined,
      isSaved: data.is_saved || false,
      title: data.title || undefined,
      tags: data.tags || undefined,
    };
  }

  // Enhanced set() with insight options
  async set(
    entry: Omit<CacheEntry, "createdAt">,
    options?: {
      userId?: string;
      isSaved?: boolean;
      title?: string;
      tags?: string[];
      expiresAt?: string | null; // NULL for permanent storage
    }
  ): Promise<void> {
    const startTime = Date.now();
    try {
      const supabase = getSupabaseClient();
      const expiresAt = options?.expiresAt !== undefined
        ? options.expiresAt
        : new Date(Date.now() + this.ttlMs).toISOString();

      // Auto-extract title from summary if not provided
      let title = options?.title;
      if (!title && entry.response?.summary) {
        title = this.extractTitleFromSummary(entry.response.summary);
      }

      await executeQuery(
        async () => {
          const result = await supabase.from("signature_cache").upsert(
            {
              signature: entry.signature,
              profile_id: entry.profileId,
              response: entry.response as unknown,
              normalized_input: entry.normalizedInput as unknown,
              baseline_ipp: entry.baselineIpp,
              baseline_but: entry.baselineBut,
              expires_at: expiresAt, // Can be NULL for saved insights
              user_id: options?.userId || null,
              is_saved: options?.isSaved || false,
              title: title || null,
              tags: options?.tags || [],
            },
            {
              onConflict: "signature",
              ignoreDuplicates: false,
            }
          );
          return { data: result.data, error: result.error };
        },
        { timeoutMs: 5000, allowNull: true }
      );

      const duration = Date.now() - startTime;
      logger.debug({ signature: entry.signature, duration }, "Cache set completed");
    } catch (error) {
      const duration = Date.now() - startTime;
      logger.error({ signature: entry.signature, error, duration }, "Cache set failed");
      // Don't throw - cache failures shouldn't break the request
    }
  }

  async invalidate(signature: string): Promise<void> {
    try {
      const supabase = getSupabaseClient();
      await executeQuery(
        async () => {
          const result = await supabase.from("signature_cache").delete().eq("signature", signature);
          return { data: result.data, error: result.error };
        },
        { timeoutMs: 5000 }
      );
      logger.debug({ signature }, "Cache invalidated");
    } catch (error) {
      logger.error({ signature, error }, "Cache invalidation failed");
      // Don't throw - cache invalidation failures shouldn't break the request
    }
  }

  async invalidateProfile(profileId: string): Promise<void> {
    try {
      const supabase = getSupabaseClient();
      await executeQuery(
        async () => {
          const result = await supabase.from("signature_cache").delete().eq("profile_id", profileId);
          return { data: result.data, error: result.error };
        },
        { timeoutMs: 5000 }
      );
      logger.debug({ profileId }, "Profile cache invalidated");
    } catch (error) {
      logger.error({ profileId, error }, "Profile cache invalidation failed");
      // Don't throw - cache invalidation failures shouldn't break the request
    }
  }

  async invalidateOnBaselineShift(profileId: string, shift: number): Promise<void> {
    if (Math.abs(shift) < 8) {
      return;
    }
    await this.invalidateProfile(profileId);
  }

  // NEW: Save insight (mark as saved, set expires_at to NULL)
  async saveInsight(
    signature: string,
    userId: string,
    title?: string,
    tags?: string[]
  ): Promise<void> {
    const startTime = Date.now();
    try {
      const supabase = getSupabaseClient();
      
      // CRITICAL: Use atomic update with ownership check to prevent race conditions
      // Only update if entry exists AND (user_id is null OR matches current user)
      await executeQuery(
        async () => {
          // First, check current state to prevent race conditions
          const { data: current, error: checkError } = await supabase
            .from("signature_cache")
            .select("user_id, is_saved")
            .eq("signature", signature)
            .maybeSingle();
          
          if (checkError) {
            throw checkError;
          }
          
          if (!current) {
            throw new Error("Analysis not found. Please run analysis first.");
          }
          
          // Ownership check: if user_id is set and doesn't match, deny
          if (current.user_id && current.user_id !== userId) {
            throw new Error("This analysis belongs to another user.");
          }
          
          // Atomic update with ownership constraint
          const result = await supabase
            .from("signature_cache")
            .update({
              user_id: userId,
              is_saved: true,
              expires_at: null, // CRITICAL: NULL = permanent storage (never expires)
              title: title || null,
              tags: tags || [],
            })
            .eq("signature", signature)
            .or(`user_id.is.null,user_id.eq.${userId}`); // Only update if unowned or owned by this user
          
          if (result.error) {
            throw result.error;
          }
          
          // Verify rows affected
          if (result.data && Array.isArray(result.data) && result.data.length === 0) {
            throw new Error("Update failed: ownership conflict or entry not found");
          }
          
          return { data: result.data, error: result.error };
        },
        { timeoutMs: 5000, allowNull: true }
      );

      // Log success (removed verification query to improve performance)
      logger.info({ 
        signature, 
        userId, 
        duration: Date.now() - startTime,
        title: title || null,
        tagsCount: tags?.length || 0
      }, "Insight saved successfully");
    } catch (error) {
      logger.error({ signature, userId, error }, "Failed to save insight");
      throw error;
    }
  }

  // NEW: Get user's insights (with pagination and search)
  async getUserInsights(
    userId: string,
    options?: { limit?: number; offset?: number; search?: string }
  ): Promise<CacheEntry[]> {
    const startTime = Date.now();
    try {
      const supabase = getSupabaseClient();
      const limit = Math.min(options?.limit || 20, 100);
      const offset = options?.offset || 0;

      // Fetch all saved insights for user (no search filter on DB side for simplicity)
      const { data, error } = await supabase
        .from("signature_cache")
        .select("*")
        .eq("user_id", userId)
        .eq("is_saved", true)
        .is("expires_at", null)
        .order("created_at", { ascending: false })
        .range(offset, offset + limit - 1);

      if (error) {
        logger.error({ userId, error }, "Failed to get user insights");
        throw error;
      }

      // Map to CacheEntry
      let insights: CacheEntry[] = (data || []).map((row) => this.mapToCacheEntry(row));

      // Client-side filtering for search (simpler and more reliable)
      if (options?.search && options.search.trim()) {
        const searchLower = options.search.toLowerCase().trim();
        insights = insights.filter((insight) => {
          if (insight.title?.toLowerCase().includes(searchLower)) return true;
          if (insight.tags?.some(tag => tag.toLowerCase().includes(searchLower))) return true;
          if (insight.normalizedInput.situation?.toLowerCase().includes(searchLower)) return true;
          if (insight.normalizedInput.goal?.toLowerCase().includes(searchLower)) return true;
          if (insight.response.summary?.toLowerCase().includes(searchLower)) return true;
          return false;
        });
      }

      logger.debug({ 
        userId, 
        count: insights.length, 
        duration: Date.now() - startTime,
        limit,
        offset,
        hasSearch: !!options?.search
      }, "User insights retrieved");
      return insights;
    } catch (error) {
      logger.error({ userId, error }, "Get user insights failed");
      throw error;
    }
  }

  // NEW: Get single insight by signature (with ownership check)
  async getInsight(signature: string, userId: string): Promise<CacheEntry | null> {
    const insight = await this.get(signature, { includeSaved: true, userId });
    
    if (!insight || !insight.isSaved || insight.userId !== userId) {
      return null;
    }
    
    return insight;
  }

  /**
   * Batch fetch multiple insights by signatures (optimized single query)
   * Returns map of signature -> CacheEntry for efficient lookup
   * 
   * Fetches both saved insights (is_saved=true, expires_at IS NULL) and
   * non-expired cache entries (expires_at > NOW()) using proven two-query pattern.
   */
  async getBatchInsights(
    signatures: string[],
    userId: string
  ): Promise<Map<string, CacheEntry>> {
    const startTime = Date.now();
    if (signatures.length === 0) {
      return new Map();
    }

    try {
      const supabase = getSupabaseClient();
      const now = new Date().toISOString();
      
      // PROVEN PATTERN: Two separate queries (matches get() method pattern)
      // Query 1: Saved insights (is_saved=true, expires_at IS NULL)
      // Query 2: Non-expired cache (expires_at > NOW())
      const [savedResult, cacheResult] = await Promise.all([
        supabase
          .from("signature_cache")
          .select("*")
          .in("signature", signatures)
          .eq("is_saved", true)
          .is("expires_at", null),
        supabase
          .from("signature_cache")
          .select("*")
          .in("signature", signatures)
          .gt("expires_at", now)
      ]);

      const savedData = savedResult.data || [];
      const cacheData = cacheResult.data || [];
      
      // Deduplicate by signature (saved takes precedence over cache)
      const allData = [...savedData, ...cacheData];
      const uniqueData = Array.from(
        new Map(allData.map(item => [item.signature, item])).values()
      );

      // Map to CacheEntry and filter by ownership (matches getInsight pattern)
      const result = new Map<string, CacheEntry>();
      uniqueData.forEach((row) => {
        const entry = this.mapToCacheEntry(row);
        // Only include if owned by user or no user_id (legacy)
        if (!entry.userId || entry.userId === userId) {
          // Additional check: if saved, must belong to user
          // If not saved, must be non-expired OR belong to user
          if (entry.isSaved) {
            if (entry.userId === userId || !entry.userId) {
              result.set(entry.signature, entry);
            }
          } else {
            // Non-saved: include if non-expired OR belongs to user
            const isNonExpired = entry.createdAt && (entry.createdAt + this.ttlMs > Date.now());
            if (isNonExpired || entry.userId === userId) {
              result.set(entry.signature, entry);
            }
          }
        }
      });

      logger.debug({ 
        userId, 
        requested: signatures.length, 
        found: result.size,
        duration: Date.now() - startTime 
      }, "Batch insights retrieved");

      return result;
    } catch (error) {
      logger.error({ userId, signatures: signatures.length, error }, "Get batch insights failed");
      throw error;
    }
  }

  // NEW: Update insight metadata
  async updateInsight(
    signature: string,
    userId: string,
    updates: { title?: string; tags?: string[] }
  ): Promise<void> {
    const startTime = Date.now();
    try {
      const supabase = getSupabaseClient();
      
      const updateData: any = {};
      if (updates.title !== undefined) updateData.title = updates.title;
      if (updates.tags !== undefined) updateData.tags = updates.tags;
      
      await executeQuery(
        async () => {
          const result = await supabase
            .from("signature_cache")
            .update(updateData)
            .eq("signature", signature)
            .eq("user_id", userId)
            .eq("is_saved", true);
          return { data: result.data, error: result.error };
        },
        { timeoutMs: 5000, allowNull: true }
      );

      logger.debug({ signature, userId, duration: Date.now() - startTime }, "Insight updated");
    } catch (error) {
      logger.error({ signature, userId, error }, "Failed to update insight");
      throw error;
    }
  }

  // NEW: Unsave insight (restore TTL)
  async unsaveInsight(signature: string, userId: string): Promise<void> {
    const startTime = Date.now();
    try {
      const supabase = getSupabaseClient();
      const expiresAt = new Date(Date.now() + this.ttlMs).toISOString();
      
      await executeQuery(
        async () => {
          const result = await supabase
            .from("signature_cache")
            .update({
              is_saved: false,
              expires_at: expiresAt, // Restore TTL
            })
            .eq("signature", signature)
            .eq("user_id", userId);
          return { data: result.data, error: result.error };
        },
        { timeoutMs: 5000, allowNull: true }
      );

      logger.debug({ signature, userId, duration: Date.now() - startTime }, "Insight unsaved");
    } catch (error) {
      logger.error({ signature, userId, error }, "Failed to unsave insight");
      throw error;
    }
  }
}

