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
  const { data: feedbacks = [] } = await supabase
    .from('feedback_records')
    .select('*')
    .eq('profile_id', profile_id)
    .order('created_at', { ascending: false })
    .limit(10);
  res.status(200).json({ feedback: feedbacks });
}

