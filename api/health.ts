import type { VercelRequest, VercelResponse } from '@vercel/node';

export default async function handler(_req: VercelRequest, res: VercelResponse) {
  // Optionally, add checks for DB, LLM, etc.
  res.status(200).json({ status: 'ok' });
}
