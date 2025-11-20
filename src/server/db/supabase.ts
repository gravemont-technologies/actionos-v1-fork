import { createClient, SupabaseClient } from "@supabase/supabase-js";
import { env } from "../config/env.ts";
import { logger } from "../utils/logger.ts";

/* -----------------------------------------------------
 * Types — define table types BEFORE Database to avoid
 * circular reference issues
 * ---------------------------------------------------*/

export type ProfilesRow = {
  profile_id: string;
  tags: string[];
  baseline_ipp: number;
  baseline_but: number;
  strengths: string[];
  metadata: Record<string, unknown>;
  created_at: string;
  updated_at: string;
  user_id: string | null;
  consent_to_store: boolean;
};

export type ProfilesInsert = Omit<ProfilesRow, "created_at" | "updated_at">;
export type ProfilesUpdate = Partial<ProfilesInsert>;

export type SignatureCacheRow = {
  signature: string;
  profile_id: string;
  response: unknown;
  normalized_input: unknown;
  baseline_ipp: number;
  baseline_but: number;
  created_at: string;
  expires_at: string;
};

export type SignatureCacheInsert = Omit<
  SignatureCacheRow,
  "created_at" | "expires_at"
>;
export type SignatureCacheUpdate = Partial<SignatureCacheInsert>;

export type ActiveStepsRow = {
  id: string;
  profile_id: string;
  signature: string;
  step_description: string;
  created_at: string;
  completed_at: string | null;
  outcome: string | null;
};

export type ActiveStepsInsert = Omit<ActiveStepsRow, "id" | "created_at">;
export type ActiveStepsUpdate = Partial<ActiveStepsInsert>;

export type FeedbackRecordsRow = {
  id: string;
  profile_id: string;
  signature: string;
  slider: number;
  outcome: string | null;
  delta_ipp: number;
  delta_but: number;
  recorded_at: string;
};

export type FeedbackRecordsInsert = Omit<FeedbackRecordsRow, "id" | "recorded_at">;
export type FeedbackRecordsUpdate = Partial<FeedbackRecordsInsert>;

export type AnalyticsEventsRow = {
  id: string;
  event_type: string;
  profile_id: string | null;
  payload: unknown;
  recorded_at: string;
};

export type AnalyticsEventsInsert = Omit<
  AnalyticsEventsRow,
  "id" | "recorded_at"
>;

/* -----------------------------------------------------
 * DATABASE TYPE
 * ---------------------------------------------------*/

export type Database = {
  public: {
    Tables: {
      profiles: {
        Row: ProfilesRow;
        Insert: ProfilesInsert;
        Update: ProfilesUpdate;
      };
      signature_cache: {
        Row: SignatureCacheRow;
        Insert: SignatureCacheInsert;
        Update: SignatureCacheUpdate;
      };
      active_steps: {
        Row: ActiveStepsRow;
        Insert: ActiveStepsInsert;
        Update: ActiveStepsUpdate;
      };
      feedback_records: {
        Row: FeedbackRecordsRow;
        Insert: FeedbackRecordsInsert;
        Update: FeedbackRecordsUpdate;
      };
      analytics_events: {
        Row: AnalyticsEventsRow;
        Insert: AnalyticsEventsInsert;
        Update: never;
      };
    };
  };
};

/* -----------------------------------------------------
 * SINGLETON SUPABASE CLIENT
 * ---------------------------------------------------*/

let supabase: SupabaseClient<Database> | null = null;

/**
 * Get Supabase client with connection pooling
 */
export function getSupabaseClient(): SupabaseClient<Database> {
  if (supabase) return supabase;

  if (!env.SUPABASE_URL || !env.SUPABASE_SERVICE_ROLE_KEY) {
    throw new Error("Missing SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY in environment.");
  }

  supabase = createClient<Database>(
    env.SUPABASE_URL,
    env.SUPABASE_SERVICE_ROLE_KEY,
    {
      auth: {
        autoRefreshToken: false,
        persistSession: false,
      },
      db: { schema: "public" },
      global: {
        headers: {
          "x-client-info": "action-os-server",
        },
      },
    }
  );

  logger.info("Supabase client initialized.");

  return supabase;
}

/* -----------------------------------------------------
 * SCHEMA VALIDATION
 * ---------------------------------------------------*/

export async function validateDatabaseSchema(): Promise<{
  valid: boolean;
  error?: string;
}> {
  try {
    const client = getSupabaseClient();

    const { error } = await client.from("profiles").select("profile_id").limit(1);

    if (error) {
      const message = error.message ?? "";

      if (message.includes("schema") || message.includes("table") || message.includes("PGRST205")) {
        return {
          valid: false,
          error: "Database schema not initialized. Run supabase/schema.sql inside your Supabase SQL Editor.",
        };
      }

      return { valid: false, error: `Database connection issue: ${message}` };
    }

    return { valid: true };
  } catch (err) {
    return {
      valid: false,
      error: `Database validation failed: ${
        err instanceof Error ? err.message : String(err)
      }`,
    };
  }
}

/* -----------------------------------------------------
 * QUERY EXECUTION WITH RETRY + TIMEOUT
 * ---------------------------------------------------*/

export async function executeQuery<T>(
  queryFn: () => Promise<{ data: T | null; error: unknown }>,
  options: { maxRetries?: number; timeoutMs?: number; allowNull?: boolean } = {}
): Promise<T> {
  const maxRetries = options.maxRetries ?? 3;
  const timeoutMs = options.timeoutMs ?? 30_000;
  const allowNull = options.allowNull ?? false;

  let lastError: unknown;

  for (let attempt = 0; attempt < maxRetries; attempt++) {
    try {
      const timeoutPromise = new Promise<never>((_, reject) =>
        setTimeout(() => reject(new Error("Query timeout")), timeoutMs)
      );

      const result = await Promise.race([queryFn(), timeoutPromise]);

      if (result.error) throw result.error;

      if (result.data === null && !allowNull) {
        throw new Error("Query returned null data");
      }

      return result.data as T;
    } catch (error) {
      lastError = error;
      const msg = error instanceof Error ? error.message : String(error);

      // Errors that should NOT retry
      if (msg.includes("timeout") || msg.includes("PGRST")) {
        logger.warn({ attempt: attempt + 1, error: msg }, "Non-retryable query error");
        throw error;
      }

      // Retry if possible
      if (attempt < maxRetries - 1) {
        const delay = Math.min(1000 * 2 ** attempt, 5000);
        logger.warn(
          { attempt: attempt + 1, delay, error: msg },
          "Query failed, retrying"
        );
        await new Promise((resolve) => setTimeout(resolve, delay));
      }
    }
  }

  logger.error({ error: lastError }, "Query failed after all retries");
  throw lastError;
}
