import { VercelRequest, VercelResponse } from '@vercel/node';
import { z } from 'zod';
// Import shared logic from /lib (to be modularized in next steps)
// import { analyzeHandler } from '../lib/analyzeHandler';

const analyzeSchema = z.object({
  profile_id: z.string().min(1).max(100).trim(),
  situation: z.string().min(10).max(2000).trim(),
  goal: z.string().min(5).max(500).trim(),
  constraints: z.string().min(1).max(1000).trim(),
  current_steps: z.string().min(1).max(1000).trim(),
  deadline: z.string().max(200).trim().optional(),
  stakeholders: z.string().max(500).trim().optional(),
  resources: z.string().max(500).trim().optional(),
});

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const parsed = analyzeSchema.safeParse(req.body);
  if (!parsed.success) {
    return res.status(400).json({ error: parsed.error.message });
  }

  // TODO: Move and import the core analyze logic from Express here
  // For now, return a placeholder
  return res.status(200).json({
    status: 'success',
    message: 'Analyze endpoint migrated to serverless. Implement logic next.',
    input: parsed.data,
  });
}
