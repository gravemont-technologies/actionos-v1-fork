import type { VercelRequest, VercelResponse } from '@vercel/node';
import { verifyRequest } from '../_lib/verify';
import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  process.env.SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const userId = await verifyRequest(req);
    
    // Check if profile already exists
    const { data: existing } = await supabase
      .from('profiles')
      .select('profile_id')
      .eq('user_id', userId)
      .maybeSingle();

    if (existing) {
      return res.json({ 
        profileId: existing.profile_id,
        created: false,
        message: 'Profile already exists' 
      });
    }

    // Create new profile with generated profile_id
    const profileId = crypto.randomUUID().replace(/-/g, '').substring(0, 16);
    
    const { data: profile, error } = await supabase
      .from('profiles')
      .insert({ 
        profile_id: profileId,
        user_id: userId 
      })
      .select('profile_id')
      .single();

    if (error) {
      console.error('[auth/create-profile] Insert error:', error);
      return res.status(500).json({ 
        error: 'PROFILE_CREATE_FAILED',
        detail: error.message 
      });
    }

    return res.status(201).json({
      profileId: profile.profile_id,
      created: true,
      message: 'Profile created successfully'
    });
  } catch (err: any) {
    console.error('[auth/create-profile] Auth error:', err.message);
    return res.status(401).json({ 
      error: err.message || 'Unauthorized',
      code: err.code || 'AUTH_FAILED' 
    });
  }
}
