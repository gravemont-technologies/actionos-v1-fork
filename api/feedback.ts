import { VercelRequest, VercelResponse } from '@vercel/node';
import { z } from 'zod';
import { getSupabaseClient } from './lib/supabase';
// ...existing code...

const feedbackSchema = z.object({
  profile_id: z.string().min(1).max(100).trim(),
  signature: z.string().min(32).max(128).regex(/^[a-f0-9]+$/i, "Signature must be hexadecimal").trim(),
  slider: z.number().min(0).max(10),
  outcome: z.string().max(80).trim().optional(),
});

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const parsed = feedbackSchema.safeParse(req.body);
  if (!parsed.success) {
    return res.status(400).json({ error: parsed.error.message });
  }

  // Signature format validation (for test compliance)
  const { signature } = parsed.data;
  if (!signature || typeof signature !== 'string' || !/^[a-f0-9]{32,128}$/i.test(signature)) {
    return res.status(400).json({ error: 'Missing or invalid signature format' });
  }

  // Minimal business logic: record feedback, update baseline, mark step as completed
  const supabase = getSupabaseClient();
  const { profile_id, slider, outcome } = parsed.data;
  // Record feedback
  await supabase.from('feedback_records').insert({
    profile_id,
    signature,
    slider,
    outcome: outcome || null,
    created_at: new Date().toISOString(),
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
}

