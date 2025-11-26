import { VercelRequest, VercelResponse } from '@vercel/node';
import { getSupabaseClient } from '../lib/supabase';

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' });
  }
  const profile_id = req.query.profile_id as string;
  if (!profile_id) {
    return res.status(400).json({ error: 'Missing profile_id' });
  }
  const supabase = getSupabaseClient();
  const { data: step } = await supabase
    .from('active_steps')
    .select('*')
    .eq('profile_id', profile_id)
    .eq('completed_at', null)
    .single();
  res.status(200).json({ activeStep: step || null });
}

