// Token usage tracker to enforce 50,000 token limit per user per day
import { getSupabaseClient } from "../db/supabase.js";
import { logger } from "../utils/logger.js";

class TokenTracker {
  private readonly MAX_TOKENS_PER_USER_PER_DAY = 50000;
  private readonly WARNING_THRESHOLD = 40000; // Warn at 80%

  /**
   * Estimate tokens for a request (rough approximation: ~4 characters per token)
   * @param systemPrompt System prompt text
   * @param userPrompt User prompt text
   * @param maxOutputTokens Maximum output tokens requested
   * @returns Estimated total tokens (input + output)
   */
  estimateTokens(systemPrompt: string, userPrompt: string, maxOutputTokens: number): number {
    const inputChars = systemPrompt.length + userPrompt.length;
    const estimatedInputTokens = Math.ceil(inputChars / 4);
    return estimatedInputTokens + maxOutputTokens;
  }

  /**
   * Get current day's token usage for a user
   * Uses unique constraint index (user_id, date) for O(1) lookup
   * Trigger ensures one row per user per day with accumulated tokens
   */
  private async getTodayUsage(userId: string): Promise<number> {
    try {
      const supabase = getSupabaseClient();
      const today = new Date().toISOString().split("T")[0]; // YYYY-MM-DD

      // Unique constraint ensures one row per user per day - direct lookup, no SUM needed
      const { data, error } = await supabase
        .from("token_usage")
        .select("tokens_used")
        .eq("user_id", userId)
        .eq("date", today)
        .single();

      if (error) {
        // PGRST116 is "not found" which is acceptable (no usage yet today)
        if (error.code === "PGRST116") {
          return 0;
        }
        logger.warn({ userId, error }, "Failed to fetch token usage");
        return 0;
      }

      return data?.tokens_used ?? 0;
    } catch (error) {
      logger.error({ userId, error }, "Error fetching token usage");
      return 0;
    }
  }

  /**
   * Check if adding tokens would exceed the daily limit for a user
   * @param userId User ID (Clerk user ID)
   * @param tokensToAdd Estimated tokens for the request
   * @returns true if allowed, false if would exceed limit
   */
  async canUseTokens(userId: string | null, tokensToAdd: number): Promise<boolean> {
    if (!userId) {
      // Allow if no user ID (development/testing)
      return true;
    }

    try {
      const currentUsage = await this.getTodayUsage(userId);
      return currentUsage + tokensToAdd <= this.MAX_TOKENS_PER_USER_PER_DAY;
    } catch (error) {
      logger.error({ userId, error }, "Error checking token limit");
      // Fail open in case of error (allow request)
      return true;
    }
  }

  /**
   * Record token usage after a request
   * @param userId User ID (Clerk user ID)
   * @param tokensUsed Actual tokens used (from API response if available, otherwise estimated)
   */
  async recordUsage(userId: string | null, tokensUsed: number): Promise<void> {
    if (!userId) {
      // Skip persistence if no user ID (development/testing)
      logger.debug({ tokensUsed }, "Token usage recorded (no user ID)");
      return;
    }

    try {
      const supabase = getSupabaseClient();
      const today = new Date().toISOString().split("T")[0]; // YYYY-MM-DD

      // Primary: Use database function for optimal token accumulation (atomic UPSERT with increment)
      // Function handles INSERT or UPDATE with token accumulation atomically
      const { data: funcData, error: funcError } = await supabase.rpc("increment_token_usage", {
        p_user_id: userId,
        p_tokens: tokensUsed,
        p_date: today,
      });

      if (funcError) {
        // Fallback: If function doesn't exist, implement proper increment logic
        // Fetch current value, add to it, then upsert (ensures we never replace when we should increment)
        logger.warn({ userId, error: funcError }, "Token increment function unavailable, using fallback increment pattern");
        
        // Fetch current usage for today
        const { data: currentData, error: fetchError } = await supabase
          .from("token_usage")
          .select("tokens_used")
          .eq("user_id", userId)
          .eq("date", today)
          .single();

        const currentTokens = currentData?.tokens_used ?? 0;
        const newTotal = currentTokens + tokensUsed;

        // Upsert with accumulated total (ensures proper increment, not replace)
        const { error: upsertError } = await supabase
          .from("token_usage")
          .upsert(
            {
              user_id: userId,
              tokens_used: newTotal,
        date: today,
            },
            {
              onConflict: "user_id,date",
              ignoreDuplicates: false,
            }
          );

        if (upsertError) {
          logger.error({ userId, tokensUsed, error: upsertError }, "Failed to record token usage (fallback)");
        return;
        }
      }

      // Check if we should warn
      const currentUsage = await this.getTodayUsage(userId);
      if (currentUsage >= this.WARNING_THRESHOLD && currentUsage < this.MAX_TOKENS_PER_USER_PER_DAY) {
        logger.warn(
          {
            userId,
            usage: currentUsage,
            limit: this.MAX_TOKENS_PER_USER_PER_DAY,
            percentage: Math.round((currentUsage / this.MAX_TOKENS_PER_USER_PER_DAY) * 100),
          },
          "Token usage warning"
        );
      }

      if (currentUsage >= this.MAX_TOKENS_PER_USER_PER_DAY) {
        logger.error(
          {
            userId,
            usage: currentUsage,
            limit: this.MAX_TOKENS_PER_USER_PER_DAY,
          },
          "Token limit reached"
        );
      }
    } catch (error) {
      logger.error({ userId, tokensUsed, error }, "Error recording token usage");
    }
  }

  /**
   * Get current token usage statistics for a user
   */
  async getUsage(userId: string | null): Promise<{
    used: number;
    remaining: number;
    limit: number;
    percentage: number;
  }> {
    if (!userId) {
      return {
        used: 0,
        remaining: this.MAX_TOKENS_PER_USER_PER_DAY,
        limit: this.MAX_TOKENS_PER_USER_PER_DAY,
        percentage: 0,
      };
    }

    try {
      const used = await this.getTodayUsage(userId);
      const remaining = Math.max(0, this.MAX_TOKENS_PER_USER_PER_DAY - used);
      const percentage = Math.round((used / this.MAX_TOKENS_PER_USER_PER_DAY) * 100);

      return {
        used,
        remaining,
        limit: this.MAX_TOKENS_PER_USER_PER_DAY,
        percentage,
      };
    } catch (error) {
      logger.error({ userId, error }, "Error getting token usage");
      return {
        used: 0,
        remaining: this.MAX_TOKENS_PER_USER_PER_DAY,
        limit: this.MAX_TOKENS_PER_USER_PER_DAY,
        percentage: 0,
      };
    }
  }

  /**
   * Check if daily limit has been reached for a user
   */
  async isLimitReached(userId: string | null): Promise<boolean> {
    if (!userId) {
      return false;
    }

    try {
      const usage = await this.getTodayUsage(userId);
      return usage >= this.MAX_TOKENS_PER_USER_PER_DAY;
    } catch (error) {
      logger.error({ userId, error }, "Error checking if limit reached");
      return false;
    }
  }
}

export const tokenTracker = new TokenTracker();
