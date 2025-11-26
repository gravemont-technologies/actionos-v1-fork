import { VercelRequest, VercelResponse } from '@vercel/node';
import { getSupabaseClient } from '../lib/supabase';
import { validateEnvVars } from '../lib/validateEnvVars';

// GET and POST: /api/step-feedback/insight-deltas
export default async function handler(req: VercelRequest, res: VercelResponse) {
  try {
    validateEnvVars(['SUPABASE_URL', 'SUPABASE_SERVICE_ROLE_KEY']);
  } catch (e) {
    return res.status(500).json({ error: 'Missing environment variables', details: (e as Error).message });
  }
  const supabase = getSupabaseClient();
  let profile_id: string | undefined;
  let signatures: string[] = [];

  if (req.method === 'GET') {
    profile_id = req.query.profile_id as string;
    const sigs = req.query.signatures as string;
    if (!profile_id || !sigs) {
      return res.status(400).json({ error: 'profile_id and signatures required' });
    }
    signatures = sigs.split(',').filter(Boolean);
  } else if (req.method === 'POST') {
    profile_id = req.body.profile_id;
    signatures = Array.isArray(req.body.signatures) ? req.body.signatures : [];
    if (!profile_id || signatures.length === 0) {
      return res.status(400).json({ error: 'profile_id and signatures required' });
    }
  } else {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  if (signatures.length > 50) {
    return res.status(400).json({ error: 'Too many signatures (max 50)' });
  }

  // Validate signature format
  const signatureRegex = /^[a-f0-9]{32,128}$/i;
  const invalid = signatures.find(s => !signatureRegex.test(s));
  if (invalid) {
    return res.status(400).json({ error: 'Invalid signature format: ' + invalid });
  }

  // Query feedback_records for deltas
  const { data, error } = await supabase
    .from('feedback_records')
    .select('signature, slider, delta_ipp')
    .eq('profile_id', profile_id)
    .in('signature', signatures);
  if (error) {
    return res.status(500).json({ error: error.message });
  }
  const deltas: Record<string, { slider: number; deltaIpp: number }> = {};
  (data || []).forEach(r => {
    deltas[r.signature] = {
      slider: Number(r.slider),
      deltaIpp: Number(r.delta_ipp || 0),
    };
  });
  return res.status(200).json({ deltas });
}
