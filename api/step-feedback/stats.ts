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
  // Count completed feedback records
  const { count } = await supabase
    .from('feedback_records')
    .select('*', { count: 'exact', head: true })
    .eq('profile_id', profile_id);
  const completed = typeof count === 'number' ? count : 0;
  // Mock streak logic: streak = completed % 5
  const streak = completed % 5;
  // Mock totalDeltaIpp: sum of all slider values
  const { data: feedbacks } = await supabase
    .from('feedback_records')
    .select('slider')
    .eq('profile_id', profile_id);
  const safeFeedbacks = Array.isArray(feedbacks) ? feedbacks : [];
  const totalDeltaIpp = safeFeedbacks.reduce((sum, f) => sum + (f.slider || 0), 0);
  return res.status(200).json({
    completed,
    streak,
    totalDeltaIpp,
  });
}
