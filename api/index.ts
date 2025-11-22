/**
 * Vercel Serverless Function Wrapper
 * 
 * Runs the entire Express server in Vercel's serverless runtime.
 * Imports from compiled output (dist/server) for production.
 */

import type { VercelRequest, VercelResponse } from '@vercel/node';

// Lazy-load Express app (only once per cold start)
let appInstance: any = null;

export default async function handler(req: VercelRequest, res: VercelResponse) {
  try {
    if (!appInstance) {
      // Import from compiled dist in production, src in dev
      const modulePath = process.env.NODE_ENV === 'production' 
        ? '../dist/server/index.js'
        : '../src/server/index.js';
      
      const { default: app } = await import(modulePath);
      appInstance = app;
    }
    
    // Express app handles the request
    return appInstance(req, res);
  } catch (error) {
    console.error('❌ Serverless function error:', error);
    
    // Detailed error for debugging
    const errorDetails = {
      error: 'Internal server error',
      message: error instanceof Error ? error.message : String(error),
      stack: error instanceof Error ? error.stack : undefined,
      nodeEnv: process.env.NODE_ENV,
      timestamp: new Date().toISOString()
    };
    
    console.error('Error details:', JSON.stringify(errorDetails, null, 2));
    
    return res.status(500).json(errorDetails);
  }
}
