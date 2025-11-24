import { jwtVerify, createRemoteJWKSet } from 'jose';

const jwksCache = new Map<string, ReturnType<typeof createRemoteJWKSet>>();

function getJWKS(issuer: string) {
  if (!jwksCache.has(issuer)) {
    const jwks = createRemoteJWKSet(
      new URL(`${issuer}/.well-known/jwks.json`),
      { timeoutDuration: 5000 }
    );
    jwksCache.set(issuer, jwks);
  }
  return jwksCache.get(issuer)!;
}

export async function verifyRequest(req: any): Promise<string> {
  const authHeader = req.headers.authorization;
  
  if (!authHeader?.toLowerCase().startsWith('bearer ')) {
    throw Object.assign(new Error('Missing authentication token'), { code: 'NO_TOKEN' });
  }

  const token = authHeader.slice(7).trim();
  
  // Decode to get issuer
  const parts = token.split('.');
  if (parts.length !== 3) {
    throw Object.assign(new Error('Malformed token'), { code: 'TOKEN_MALFORMED' });
  }
  
  const payload = JSON.parse(Buffer.from(parts[1], 'base64url').toString());
  const issuer = payload.iss?.replace(/\/$/, '');
  
  if (!issuer) {
    throw Object.assign(new Error('Token missing issuer'), { code: 'MISSING_ISSUER' });
  }

  const jwks = getJWKS(issuer);
  
  try {
    const { payload: verified } = await jwtVerify(token, jwks, { issuer });
    
    const userId = (verified.userId || verified.sub) as string;
    if (!userId) {
      throw Object.assign(new Error('Token missing user ID'), { code: 'MISSING_USER_ID' });
    }
    
    return userId;
  } catch (error: any) {
    console.error('[verify] JWT verification failed:', error.message);
    throw Object.assign(
      new Error('Token verification failed'), 
      { code: error.code || 'VERIFICATION_FAILED' }
    );
  }
}
