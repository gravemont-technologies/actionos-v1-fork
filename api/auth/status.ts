import type { VercelRequest, VercelResponse } from '@vercel/node';
import { verifyRequest } from '../_lib/verify';
import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  process.env.SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

export default async function handler(req: VercelRequest, res: VercelResponse) {
  console.log('[auth/status] Request received - serverless function');
  console.log('[auth/status] Env check:', {
    hasSupabaseUrl: !!process.env.SUPABASE_URL,
    hasSupabaseKey: !!process.env.SUPABASE_SERVICE_ROLE_KEY
  });
  
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const userId = await verifyRequest(req);
    console.log('[auth/status] User verified:', userId);
    
    const { data, error } = await supabase
      .from('profiles')
      .select('profile_id, user_id, created_at')
      .eq('user_id', userId)
      .maybeSingle();

    if (error) {
      console.error('[auth/status] Supabase error:', {
        code: error.code,
        message: error.message,
        details: error.details,
        hint: error.hint
      });
      return res.status(500).json({ 
        error: 'PROFILE_QUERY_FAILED',
        detail: error.message 
      });
    }

    console.log('[auth/status] Query success, hasProfile:', !!data);
    return res.json({
      authenticated: true,
      hasProfile: !!data,
      profileId: data?.profile_id || null,
      userId,
    });
  } catch (err: any) {
    console.error('[auth/status] Auth error:', err.message, err.stack);
    return res.status(401).json({ 
      authenticated: false,
      error: err.message || 'Unauthorized', 
      code: err.code || 'AUTH_FAILED' 
    });
  }
}
