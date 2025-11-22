/**
 * Vercel Serverless Function Wrapper
 * 
 * This single function runs the entire Express server in Vercel's serverless runtime.
 * All API routes (/api/*) are handled by the Express app.
 */

import type { VercelRequest, VercelResponse } from '@vercel/node';
import app from '../src/server/index.js';

export default async function handler(req: VercelRequest, res: VercelResponse) {
  // Let Express handle the request
  return app(req, res);
}
