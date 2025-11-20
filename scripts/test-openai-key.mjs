#!/usr/bin/env node
/**
 * Test OpenAI API Key Permissions
 * 
 * This script tests if your OpenAI API key has the required permissions
 * to make model requests. Run this to verify your API key configuration.
 * 
 * Usage: node scripts/test-openai-key.mjs [API_KEY]
 */

import { readFileSync } from 'fs';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';
import { config } from 'dotenv';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Load .env file
config({ path: join(__dirname, '..', '.env') });

// Get API key from command line or .env
const apiKey = process.argv[2] || process.env.OPENAI_API_KEY;

if (!apiKey) {
  console.error('❌ No API key provided');
  console.error('Usage: node scripts/test-openai-key.mjs [API_KEY]');
  console.error('Or set OPENAI_API_KEY in .env file');
  process.exit(1);
}

console.log('🔍 Testing OpenAI API Key...');
console.log(`   Key prefix: ${apiKey.substring(0, 7)}...`);
console.log('');

async function testAPIKey() {
  try {
    // Test with a simple chat completion request
    const response = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${apiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: process.env.OPENAI_MODEL || 'gpt-4o-mini',
        messages: [
          { role: 'user', content: 'Say "test" and nothing else.' }
        ],
        max_tokens: 10,
      }),
    });

    const data = await response.json();

    if (response.ok) {
      console.log('✅ API Key is valid and has required permissions!');
      console.log(`   Response: ${data.choices[0]?.message?.content || 'N/A'}`);
      console.log('');
      console.log('✅ Your API key can make model requests.');
      return true;
    } else {
      console.error('❌ API Key test failed');
      console.error(`   Status: ${response.status}`);
      console.error(`   Error: ${JSON.stringify(data, null, 2)}`);
      console.error('');
      
      if (response.status === 401) {
        const errorMsg = data?.error?.message || '';
        if (errorMsg.includes('model.request')) {
          console.error('🔧 SOLUTION:');
          console.error('   1. Go to https://platform.openai.com/api-keys');
          console.error('   2. Find your API key (starts with: ' + apiKey.substring(0, 7) + '...)');
          console.error('   3. Click "Edit" on the key');
          console.error('   4. Under "Model capabilities", enable "Chat completions (/v1/chat/completions)"');
          console.error('      OR set permissions to "All" (full access)');
          console.error('   5. Save and wait 10-30 seconds');
          console.error('   6. Restart your server');
        } else if (errorMsg.includes('Invalid API key')) {
          console.error('🔧 SOLUTION:');
          console.error('   Your API key is invalid. Check that:');
          console.error('   1. The key in .env matches the one in OpenAI dashboard');
          console.error('   2. The key hasn\'t been revoked or deleted');
          console.error('   3. You\'re using the correct organization');
        } else {
          console.error('🔧 Check the error message above for specific guidance');
        }
      }
      return false;
    }
  } catch (error) {
    console.error('❌ Network error:', error.message);
    return false;
  }
}

testAPIKey().then(success => {
  process.exit(success ? 0 : 1);
});

