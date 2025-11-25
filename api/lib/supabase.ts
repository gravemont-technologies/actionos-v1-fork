import { createClient, SupabaseClient } from '@supabase/supabase-js';

let supabase: SupabaseClient | undefined;

export function getSupabaseClient(): SupabaseClient {
  if (supabase) return supabase;
  if (!process.env.SUPABASE_URL || !process.env.SUPABASE_SERVICE_ROLE_KEY) {
    throw new Error('Missing SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY in environment.');
  }
  supabase = createClient(
    process.env.SUPABASE_URL,
    process.env.SUPABASE_SERVICE_ROLE_KEY,
    {
      auth: { autoRefreshToken: false, persistSession: false },
      db: { schema: 'public' },
      global: { headers: { 'x-client-info': 'action-os-serverless' } },
    }
  );
  return supabase;
}
