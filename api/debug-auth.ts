import type { VercelRequest, VercelResponse } from '@vercel/node';
import { verifyToken } from '@clerk/backend';

// Simple in-memory rate limiter for the debug endpoint to prevent abuse.
const rateLimitMap = new Map<string, { count: number; resetAt: number }>();
const RATE_LIMIT = 10; // Max requests
const WINDOW_MS = 60000; // Per minute

function checkRateLimit(ip: string): boolean {
  const now = Date.now();
  
  // Clean up expired entries to prevent memory leak
  for (const [key, value] of rateLimitMap.entries()) {
    if (now > value.resetAt) {
      rateLimitMap.delete(key);
    }
  }
  
  const record = rateLimitMap.get(ip);

  if (!record) {
    rateLimitMap.set(ip, { count: 1, resetAt: now + WINDOW_MS });
    return true;
  }

  if (record.count >= RATE_LIMIT) {
    return false;
  }

  record.count++;
  return true;
}

export default async function handler(req: VercelRequest, res: VercelResponse) {
  // This endpoint is for debugging only and should not be available in production.
  if (process.env.VERCEL_ENV === 'production') {
    return res.status(404).json({ error: 'Not found' });
  }

  // Apply rate limiting.
  const ip = (req.headers['x-forwarded-for'] as string) || req.socket.remoteAddress || 'unknown';
  if (!checkRateLimit(ip)) {
    return res.status(429).json({ 
      error: 'Too many requests', 
      code: 'RATE_LIMIT_EXCEEDED' 
    });
  }

  const authHeader = req.headers.authorization;
  const token = authHeader?.replace('Bearer ', '').trim();
  
  let verificationResult: any = null;
  if (token) {
    try {
      const secretKey = process.env.CLERK_SECRET_KEY;
      if (!secretKey) {
        throw new Error('CLERK_SECRET_KEY is not configured on the server.');
      }
      
      const payload = await verifyToken(token, { secretKey });
      const userId = payload.userId;
      
      if (!userId) {
        throw new Error('Token is valid but missing userId claim.');
      }
      
      verificationResult = {
        valid: true,
        userId,
        sessionId: payload.sid,
        expiresAt: new Date(payload.exp * 1000).toISOString(),
      };
    } catch (error: any) {
      verificationResult = { 
        valid: false,
        code: error.code || 'UNKNOWN',
        // Sanitize error message in non-development environments
        detail: process.env.VERCEL_ENV === 'development' ? error.message : 'Verification failed.',
      };
    }
  }

  return res.json({
    hasAuthHeader: !!authHeader,
    tokenFormat: authHeader?.startsWith('Bearer ') ? 'valid' : 'invalid',
    tokenLength: token?.length || 0,
    envVarsSet: {
      clerkSecret: !!process.env.CLERK_SECRET_KEY,
      clerkPublishable: !!process.env.VITE_CLERK_PUBLISHABLE_KEY,
    },
    verificationResult,
  });
}
