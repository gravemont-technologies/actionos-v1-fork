#!/usr/bin/env ts-node
/*
 Simple test script to POST anonymous feedback to the running server.
 Usage:
   HTTP_TEST_URL=http://localhost:3001 node scripts/test-feedback-route.ts
 or with tsx if available:
   HTTP_TEST_URL=http://localhost:3001 tsx scripts/test-feedback-route.ts

 This script uses undici's fetch (node 18+ built-in fetch also works).
 Exits with code 0 on success (HTTP 200/201/204), non-zero otherwise.
*/

import fetch from 'node-fetch';

const TEST_URL = process.env.HTTP_TEST_URL || 'http://localhost:3001/api/feedback-comments';

async function main() {
  const payload = {
    category: 'Improvements',
    message: 'Automated test: anonymous feedback from test-feedback-route.ts',
  };

  console.log('Posting to', TEST_URL);

  try {
    const res = await fetch(TEST_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
      // short timeout in case server is not responsive
      // node-fetch doesn't support timeout option in v3; rely on environment
    });

    console.log('Status:', res.status);
    const text = await res.text();
    console.log('Body:', text);

    if (res.status >= 200 && res.status < 300) {
      console.log('Feedback POST succeeded');
      process.exit(0);
    } else {
      console.error('Feedback POST failed');
      process.exit(2);
    }
  } catch (err) {
    console.error('Request error:', err instanceof Error ? err.message : String(err));
    process.exit(3);
  }
}

main();
