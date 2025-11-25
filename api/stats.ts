import { VercelRequest, VercelResponse } from '@vercel/node';
import { z } from 'zod';
// Import shared logic from /lib (to be modularized in next steps)
// import { getProfileMetrics } from '../lib/metrics';

const statsSchema = z.object({
  profile_id: z.string().min(1).max(100).trim(),
});

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const parsed = statsSchema.safeParse(req.body);
  if (!parsed.success) {
    return res.status(400).json({ error: parsed.error.message });
  }

  // TODO: Move and import the core stats/metrics logic from Express here
  // For now, return a placeholder
  return res.status(200).json({
    status: 'success',
    message: 'Stats endpoint migrated to serverless. Implement logic next.',
    input: parsed.data,
  });
}
