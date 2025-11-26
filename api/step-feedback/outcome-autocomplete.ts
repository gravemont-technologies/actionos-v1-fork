import { VercelRequest, VercelResponse } from '@vercel/node';
import { getSupabaseClient } from '../lib/supabase';
import { validateEnvVars } from '../lib/validateEnvVars';

export default async function handler(req: VercelRequest, res: VercelResponse) {
  try {
    validateEnvVars(['SUPABASE_URL', 'SUPABASE_SERVICE_ROLE_KEY']);
  } catch (e) {
    return res.status(500).json({ error: 'Missing environment variables', details: (e as Error).message });
  }
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' });
  }
  const profile_id = req.query.profile_id as string;
  if (!profile_id) {
    return res.status(400).json({ error: 'Missing profile_id' });
  }
  const supabase = getSupabaseClient();
  // Get last 100 outcomes for deduplication
  const { data, error } = await supabase
    .from('feedback_records')
    .select('outcome')
    .eq('profile_id', profile_id)
    .not('outcome', 'is', null)
    .order('recorded_at', { ascending: false })
    .limit(100);
  if (error) {
    return res.status(500).json({ error: error.message });
  }
  const uniqueOutcomes = new Set<string>();
  (data || []).forEach(r => {
    if (r.outcome) {
      const trimmed = r.outcome.trim();
      if (trimmed.length > 0) {
        uniqueOutcomes.add(trimmed);
      }
    }
  });
  const outcomes = Array.from(uniqueOutcomes).slice(0, 20);
  return res.status(200).json({ outcomes });
}
