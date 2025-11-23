/**
 * JWT Verification Script
 * 
 * Run this in the browser console on the analyze page to verify JWT claims.
 * 
 * Instructions:
 * 1. Sign out and sign back in (to get fresh JWT with updated template)
 * 2. Navigate to /app/analyze page
 * 3. Open browser console (F12)
 * 4. Copy and paste this entire script
 * 5. Press Enter
 * 
 * Expected output:
 * - ✅ Token exists
 * - ✅ userId present (from custom template)
 * - ✅ sid present (automatically added by Clerk)
 * - ✅ email, firstName, lastName present
 */

(async function verifyJWT() {
  console.log('🔍 JWT Verification Script Started...\n');
  
  try {
    // Check if Clerk is loaded
    if (!window.Clerk) {
      console.error('❌ Clerk not loaded. Make sure you are on the app page.');
      return;
    }

    // Check if session exists
    if (!window.Clerk.session) {
      console.error('❌ No active Clerk session. Please sign in first.');
      return;
    }

    console.log('✅ Clerk session exists\n');

    // Get token with jwt-actionos template
    console.log('Fetching JWT token with template: jwt-actionos...');
    const token = await window.Clerk.session.getToken({ template: 'jwt-actionos' });
    
    if (!token) {
      console.error('❌ Failed to get token. Check if jwt-actionos template exists in Clerk dashboard.');
      return;
    }

    console.log('✅ Token received\n');
    console.log('Raw token (first 50 chars):', token.substring(0, 50) + '...\n');

    // Decode JWT payload
    const parts = token.split('.');
    if (parts.length !== 3) {
      console.error('❌ Invalid JWT format. Expected 3 parts (header.payload.signature)');
      return;
    }

    const payload = JSON.parse(atob(parts[1]));
    
    console.log('📋 Full JWT Payload:');
    console.log(JSON.stringify(payload, null, 2));
    console.log('\n');

    // Verify required claims
    console.log('🔍 Claim Verification:');
    console.log('─────────────────────────────────────');
    
    const checks = [
      { name: 'userId', required: true, value: payload.userId },
      { name: 'sid', required: true, value: payload.sid },
      { name: 'email', required: false, value: payload.email },
      { name: 'firstName', required: false, value: payload.firstName },
      { name: 'lastName', required: false, value: payload.lastName },
      { name: 'iss (issuer)', required: true, value: payload.iss },
      { name: 'sub (subject)', required: true, value: payload.sub },
      { name: 'exp (expiration)', required: true, value: payload.exp },
    ];

    let allPassed = true;
    checks.forEach(check => {
      const exists = !!check.value;
      const status = exists ? '✅' : (check.required ? '❌' : '⚠️');
      const message = exists ? check.value : 'MISSING';
      
      console.log(`${status} ${check.name.padEnd(20)} ${message}`);
      
      if (check.required && !exists) {
        allPassed = false;
      }
    });

    console.log('─────────────────────────────────────\n');

    if (allPassed) {
      console.log('✅ ALL REQUIRED CLAIMS PRESENT!');
      console.log('✅ JWT is correctly configured.');
      console.log('\nYou can now use the app. If you still see 401 errors:');
      console.log('1. Clear browser cache/cookies');
      console.log('2. Sign out and sign back in');
      console.log('3. Check Vercel environment variables match your .env file');
    } else {
      console.error('❌ MISSING REQUIRED CLAIMS!');
      console.error('\nAction needed:');
      if (!payload.userId) {
        console.error('- Add "userId": "{{user.id}}" to JWT template Claims');
      }
      if (!payload.sid) {
        console.error('- DO NOT add sid manually - Clerk adds it automatically');
        console.error('- If sid is missing, contact Clerk support (this should never happen)');
      }
    }

    // Token expiration check
    const now = Math.floor(Date.now() / 1000);
    const expiresIn = payload.exp - now;
    console.log(`\n⏱️  Token expires in: ${expiresIn} seconds (${Math.floor(expiresIn / 60)} minutes)`);

  } catch (error) {
    console.error('❌ Error during verification:', error.message);
    console.error('Full error:', error);
  }
})();
