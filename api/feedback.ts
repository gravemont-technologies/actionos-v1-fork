import { VercelRequest, VercelResponse } from '@vercel/node';
import { z } from 'zod';
// Import shared logic from /lib (to be modularized in next steps)
// import { feedbackHandler } from '../lib/feedbackHandler';

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

  // TODO: Move and import the core feedback logic from Express here
  // For now, return a placeholder
  return res.status(200).json({
    status: 'success',
    message: 'Feedback endpoint migrated to serverless. Implement logic next.',
    input: parsed.data,
  });
}
