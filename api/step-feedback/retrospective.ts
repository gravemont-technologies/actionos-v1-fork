import { VercelRequest, VercelResponse } from '@vercel/node';
import { z } from 'zod';
import { getSupabaseClient } from '../lib/supabase';

const retroSchema = z.object({
  profile_id: z.string().min(1).max(100).trim(),
  signature: z.string().trim(), // Only require non-empty string
  step_description: z.string().min(1).max(1000).trim(),
  outcome: z.string().max(80).trim(),
  slider: z.number().min(0).max(10),
  original_situation: z.string().optional(),
});

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }
  const parsed = retroSchema.safeParse(req.body);
  if (!parsed.success) {
    return res.status(400).json({ error: parsed.error.message });
  }
  const { profile_id, signature, step_description, outcome, slider, original_situation } = parsed.data;
  const supabase = getSupabaseClient();
  // Try to get cache entry for signature
  let situation = original_situation;
  try {
    const { data: cache } = await supabase.from('signature_cache').select('*').eq('signature', signature).single();
    if (cache && cache.normalized_input && cache.normalized_input.situation) {
      situation = cache.normalized_input.situation;
    }
  } catch (e) { /* ignore missing cache */ }
  // Mock insights (replace with LLM in prod)
  const insights = {
    insights: 'Mocked retrospective insights',
    what_worked: 'Quick execution',
    what_didnt: 'Lack of planning',
    improvements: ['Plan next steps', 'Review outcomes'],
  };
  res.status(200).json({
    status: 'success',
    insights,
    promptVersion: 'mock-v1',
  });
}
