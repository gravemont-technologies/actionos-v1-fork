import { VercelRequest, VercelResponse } from '@vercel/node';
import { z } from 'zod';

import { getSupabaseClient } from './lib/supabase';
import { validateEnvVars } from './lib/validateEnvVars';

const feedbackSchema = z.object({
  profile_id: z.string().min(1).max(100).trim(),
  signature: z.string().trim(), // Only require non-empty string
  slider: z.number().min(0).max(10),
  outcome: z.string().max(80).trim().optional(),
});

export default async function handler(req: VercelRequest, res: VercelResponse) {
  try {
    validateEnvVars(['SUPABASE_URL', 'SUPABASE_SERVICE_ROLE_KEY']);
  } catch (e) {
    return res.status(500).json({ error: 'Missing environment variables', details: (e as Error).message });
  }
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const parsed = feedbackSchema.safeParse(req.body);
  if (!parsed.success) {
    return res.status(400).json({ error: parsed.error.message });
  }

  // Signature format validation (for test compliance)
  const { signature } = req.body;
  if (!signature || typeof signature !== 'string' || signature.trim() === '') {
    return res.status(400).json({ error: 'Missing or invalid signature format' });
  }

  const supabase = getSupabaseClient();
  const { profile_id, slider, outcome } = parsed.data;
  try {
    // Record feedback
    await supabase.from('feedback_records').insert({
      profile_id,
      signature,
      slider,
      outcome: outcome || null,
      recorded_at: new Date().toISOString(),
      delta_ipp: slider,
      delta_but: slider * 0.8,
    });
    // Update baseline (mock logic: increment baseline_ipp by slider value)
    const { data: profile } = await supabase.from('profiles').select('baseline_ipp, baseline_but').eq('profile_id', profile_id).single();
    const newIpp = (profile?.baseline_ipp || 65) + slider;
    const newBut = (profile?.baseline_but || 72) + 1;
    await supabase.from('profiles').update({ baseline_ipp: newIpp, baseline_but: newBut }).eq('profile_id', profile_id);
    // Mark step as completed
    await supabase.from('active_steps').update({ completed_at: new Date().toISOString(), outcome: outcome || null }).eq('profile_id', profile_id).eq('signature', signature);
    // Return response
    return res.status(200).json({
      status: 'recorded',
      baseline: { ipp: newIpp, but: newBut },
      delta: slider,
    });
  } catch (e) {
    const err = e instanceof Error ? e : new Error(String(e));
    return res.status(500).json({ error: 'Internal error', details: err.message });
  }
}
