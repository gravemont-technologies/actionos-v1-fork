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
  const { data: feedbacks = [] } = await supabase
    .from('feedback_records')
    .select('*')
    .eq('profile_id', profile_id)
    .order('recorded_at', { ascending: false })
    .limit(10);
  // Map to expected response shape
  const mapped = (feedbacks || []).map(fb => ({
    ...fb,
    recordedAt: fb.recorded_at,
    delta_ipp: fb.delta_ipp,
    delta_but: fb.delta_but,
  }));
  res.status(200).json({ feedback: mapped });
}
