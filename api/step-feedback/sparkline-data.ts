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
  // Get last 30 feedbacks for sparkline (slider, recorded_at)
  const { data, error } = await supabase
    .from('feedback_records')
    .select('slider, recorded_at')
    .eq('profile_id', profile_id)
    .order('recorded_at', { ascending: false })
    .limit(30);
  if (error) {
    return res.status(500).json({ error: error.message });
  }
  // Return as array of { slider, recorded_at }
  const sparkline = (data || []).map(r => ({
    slider: r.slider,
    recorded_at: r.recorded_at
  }));
  return res.status(200).json({ sparkline });
}
