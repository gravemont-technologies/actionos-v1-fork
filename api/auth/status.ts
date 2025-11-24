import type { VercelRequest, VercelResponse } from '@vercel/node';
import { verifyRequest } from '../_lib/verify';
import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  process.env.SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const userId = await verifyRequest(req);
    
    const { data, error } = await supabase
      .from('profiles')
      .select('id, user_id, created_at')
      .eq('user_id', userId)
      .maybeSingle();

    if (error) {
      console.error('[auth/status] Profile query error:', error);
      return res.status(500).json({ error: 'PROFILE_QUERY_FAILED' });
    }

    return res.json({
      authenticated: true,
      hasProfile: !!data,
      profileId: data?.id || null,
      userId,
    });
  } catch (err: any) {
    console.error('[auth/status] Auth error:', err.message);
    return res.status(401).json({ 
      authenticated: false,
      error: err.message || 'Unauthorized', 
      code: err.code || 'AUTH_FAILED' 
    });
  }
}
