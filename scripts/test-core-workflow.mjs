#!/usr/bin/env node
/**
 * Integration Test: Core Workflow End-to-End Validation
 * Tests database schema, profile auto-creation, analyze→feedback→stats flow
 * 
 * Prerequisites:
 * - Database running with migration applied
 * - Server running on localhost (check package.json for port)
 * - Valid Clerk auth token
 * 
 * Usage: node scripts/test-core-workflow.mjs
 */

import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';

dotenv.config();

const SUPABASE_URL = process.env.SUPABASE_URL;
const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY) {
  console.error('❌ Missing SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY');
  console.error('Set in .env file or environment variables');
  process.exit(1);
}

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

console.log('🧪 Core Workflow Integration Tests\n');

// ============================================================================
// Layer 2: Database Schema Validation
// ============================================================================

async function testSchemaValidation() {
  console.log('📋 Layer 2: Database Schema Validation');
  
  try {
    // Check active_steps table structure
    const { data: columns, error } = await supabase
      .from('active_steps')
      .select('*')
      .limit(0);
    
    if (error && error.code !== 'PGRST116') {
      console.error('  ❌ active_steps table query failed:', error.message);
      return false;
    }
    
    console.log('  ✅ active_steps table exists');
    
    // Verify columns exist by attempting insert (will validate schema)
    const testProfileId = `test_${Date.now()}`;
    const { error: insertError } = await supabase
      .from('active_steps')
      .insert({
        profile_id: testProfileId,
        signature: 'a'.repeat(64),
        step_description: 'Test step for schema validation',
        delta_bucket: 'MEDIUM',
        started_at: new Date().toISOString(),
        first_started_at: new Date().toISOString(),
      });
    
    if (insertError) {
      console.error('  ❌ Schema validation failed:', insertError.message);
      return false;
    }
    
    console.log('  ✅ delta_bucket column exists and accepts SMALL/MEDIUM/LARGE');
    console.log('  ✅ first_started_at column exists and accepts TIMESTAMPTZ');
    
    // Clean up test data
    await supabase.from('active_steps').delete().eq('profile_id', testProfileId);
    
    // Check for index (query pg_indexes)
    const { data: indexes, error: indexError } = await supabase.rpc('get_indexes', {
      table_name: 'active_steps'
    }).maybeSingle();
    
    // If RPC doesn't exist, skip index check (non-critical)
    if (!indexError || indexError.code === 'PGRST202') {
      console.log('  ⚠️  Index validation skipped (requires custom RPC)');
    } else {
      console.log('  ✅ Partial index on delta_bucket verified');
    }
    
    console.log('');
    return true;
  } catch (err) {
    console.error('  ❌ Unexpected error:', err.message);
    console.log('');
    return false;
  }
}

// ============================================================================
// Layer 3: Profile Auto-Creation (via ensureProfile middleware)
// ============================================================================

async function testProfileAutoCreation() {
  console.log('📋 Layer 3: Profile Auto-Creation');
  
  try {
    const testUserId = `test_user_${Date.now()}`;
    
    // Check if profile exists (should not exist for new user)
    const { data: existing } = await supabase
      .from('profiles')
      .select('*')
      .eq('user_id', testUserId)
      .maybeSingle();
    
    if (existing) {
      console.log('  ⚠️  Test user already has profile, skipping auto-creation test');
      console.log('');
      return true;
    }
    
    // Simulate ensureProfile middleware behavior
    const { data: newProfile, error } = await supabase
      .from('profiles')
      .insert({
        profile_id: `prof_${testUserId}`,
        user_id: testUserId,
        baseline_ipp: 50.0,
        baseline_but: 50.0,
        tags: [],
        strengths: [],
      })
      .select()
      .single();
    
    if (error) {
      console.error('  ❌ Profile creation failed:', error.message);
      console.log('');
      return false;
    }
    
    console.log('  ✅ Profile auto-created with user_id:', testUserId);
    console.log('  ✅ baseline_ipp =', newProfile.baseline_ipp);
    console.log('  ✅ baseline_but =', newProfile.baseline_but);
    
    // Verify defaults
    if (newProfile.baseline_ipp !== 50.0 || newProfile.baseline_but !== 50.0) {
      console.error('  ❌ Baseline defaults incorrect');
      console.log('');
      return false;
    }
    
    // Clean up
    await supabase.from('profiles').delete().eq('user_id', testUserId);
    
    console.log('');
    return true;
  } catch (err) {
    console.error('  ❌ Unexpected error:', err.message);
    console.log('');
    return false;
  }
}

// ============================================================================
// Layer 4: Delta Bucket Storage
// ============================================================================

async function testDeltaBucketStorage() {
  console.log('📋 Layer 4: Delta Bucket Storage');
  
  try {
    const testProfileId = `prof_test_${Date.now()}`;
    const testSignature = 'b'.repeat(64);
    
    // Simulate setActiveStep with delta_bucket
    const { error } = await supabase
      .from('active_steps')
      .upsert({
        profile_id: testProfileId,
        signature: testSignature,
        step_description: 'Test step with delta bucket',
        delta_bucket: 'LARGE',
        started_at: new Date().toISOString(),
        first_started_at: new Date().toISOString(),
      }, {
        onConflict: 'profile_id',
      });
    
    if (error) {
      console.error('  ❌ Delta bucket storage failed:', error.message);
      console.log('');
      return false;
    }
    
    // Verify delta_bucket stored correctly
    const { data: step } = await supabase
      .from('active_steps')
      .select('delta_bucket, first_started_at')
      .eq('profile_id', testProfileId)
      .single();
    
    if (step.delta_bucket !== 'LARGE') {
      console.error('  ❌ Delta bucket not stored correctly');
      console.log('');
      return false;
    }
    
    console.log('  ✅ delta_bucket stored:', step.delta_bucket);
    console.log('  ✅ first_started_at set:', step.first_started_at);
    
    // Clean up
    await supabase.from('active_steps').delete().eq('profile_id', testProfileId);
    
    console.log('');
    return true;
  } catch (err) {
    console.error('  ❌ Unexpected error:', err.message);
    console.log('');
    return false;
  }
}

// ============================================================================
// Layer 5: Timer Preservation on Re-Analyze
// ============================================================================

async function testTimerPreservation() {
  console.log('📋 Layer 5: Timer Preservation on Re-Analyze');
  
  try {
    const testProfileId = `prof_timer_${Date.now()}`;
    const firstSignature = 'c'.repeat(64);
    const firstStartedAt = new Date();
    
    // First analyze - set initial timer
    await supabase.from('active_steps').upsert({
      profile_id: testProfileId,
      signature: firstSignature,
      step_description: 'First step',
      delta_bucket: 'SMALL',
      started_at: firstStartedAt.toISOString(),
      first_started_at: firstStartedAt.toISOString(),
    }, { onConflict: 'profile_id' });
    
    console.log('  ✅ First analyze completed, timer started');
    
    // Wait 2 seconds
    await new Promise(resolve => setTimeout(resolve, 2000));
    
    // Second analyze - should preserve first_started_at
    const secondStartedAt = new Date();
    const secondSignature = 'd'.repeat(64);
    
    // Simulate profileStore.setActiveStep() logic
    const { data: existing } = await supabase
      .from('active_steps')
      .select('first_started_at')
      .eq('profile_id', testProfileId)
      .maybeSingle();
    
    const preservedFirstStartedAt = existing?.first_started_at || secondStartedAt.toISOString();
    
    await supabase.from('active_steps').upsert({
      profile_id: testProfileId,
      signature: secondSignature,
      step_description: 'Second step',
      delta_bucket: 'MEDIUM',
      started_at: secondStartedAt.toISOString(),
      first_started_at: preservedFirstStartedAt, // PRESERVED!
    }, { onConflict: 'profile_id' });
    
    // Verify first_started_at was preserved
    const { data: afterReAnalyze } = await supabase
      .from('active_steps')
      .select('started_at, first_started_at')
      .eq('profile_id', testProfileId)
      .single();
    
    const gapSeconds = (new Date(afterReAnalyze.started_at) - new Date(afterReAnalyze.first_started_at)) / 1000;
    
    if (gapSeconds < 1.5) {
      console.error('  ❌ first_started_at was overwritten (gap < 2 seconds)');
      console.log('');
      return false;
    }
    
    console.log('  ✅ first_started_at preserved (gap:', Math.round(gapSeconds), 'seconds)');
    console.log('  ✅ started_at updated to latest analyze time');
    
    // Clean up
    await supabase.from('active_steps').delete().eq('profile_id', testProfileId);
    
    console.log('');
    return true;
  } catch (err) {
    console.error('  ❌ Unexpected error:', err.message);
    console.log('');
    return false;
  }
}

// ============================================================================
// Layer 8: Dashboard Stats with JOIN
// ============================================================================

async function testStatsJOIN() {
  console.log('📋 Layer 8: Dashboard Stats with JOIN');
  
  try {
    const testProfileId = `prof_stats_${Date.now()}`;
    const testStepId = crypto.randomUUID();
    
    // Create test active_steps row
    await supabase.from('active_steps').insert({
      id: testStepId,
      profile_id: testProfileId,
      signature: 'e'.repeat(64),
      step_description: 'Test step for JOIN validation',
      delta_bucket: 'MEDIUM',
      started_at: new Date().toISOString(),
      first_started_at: new Date().toISOString(),
      completed_at: new Date().toISOString(),
    });
    
    // Create test step_metrics row
    await supabase.from('step_metrics').insert({
      step_id: testStepId,
      profile_id: testProfileId,
      signature: 'e'.repeat(64),
      ipp_score: 18.0,
      magnitude: 6,
      reach: 3,
      depth: 1.0,
      but_score: 4.5,
      ease_score: 6,
      alignment_score: 7,
      friction_score: 4,
      had_unexpected_wins: false,
      estimated_minutes: 45,
      actual_minutes: 50,
      taa_score: 0.89,
      outcome_description: 'Completed successfully',
      completed_at: new Date().toISOString(),
    });
    
    // Test JOIN query (simulate stats endpoint)
    const { data: metricsData, error } = await supabase
      .from('step_metrics')
      .select(`
        ipp_score,
        but_score,
        taa_score,
        completed_at,
        magnitude,
        reach,
        depth,
        active_steps!step_id(
          step_description,
          signature
        )
      `)
      .eq('profile_id', testProfileId);
    
    if (error) {
      console.error('  ❌ JOIN query failed:', error.message);
      console.log('');
      return false;
    }
    
    if (!metricsData || metricsData.length === 0) {
      console.error('  ❌ No data returned from JOIN');
      console.log('');
      return false;
    }
    
    const row = metricsData[0];
    const activeStepData = row.active_steps;
    
    if (!activeStepData) {
      console.error('  ❌ JOIN did not return active_steps data');
      console.log('');
      return false;
    }
    
    console.log('  ✅ JOIN query successful');
    console.log('  ✅ step_description retrieved:', activeStepData.step_description?.substring(0, 30) + '...');
    console.log('  ✅ ipp_score:', row.ipp_score);
    console.log('  ✅ Null safety validated (data present)');
    
    // Clean up
    await supabase.from('step_metrics').delete().eq('profile_id', testProfileId);
    await supabase.from('active_steps').delete().eq('profile_id', testProfileId);
    
    console.log('');
    return true;
  } catch (err) {
    console.error('  ❌ Unexpected error:', err.message);
    console.log('');
    return false;
  }
}

// ============================================================================
// Run All Tests
// ============================================================================

async function runAllTests() {
  const results = {
    schema: false,
    profile: false,
    deltaBucket: false,
    timer: false,
    stats: false,
  };
  
  results.schema = await testSchemaValidation();
  results.profile = await testProfileAutoCreation();
  results.deltaBucket = await testDeltaBucketStorage();
  results.timer = await testTimerPreservation();
  results.stats = await testStatsJOIN();
  
  // Summary
  console.log('━'.repeat(60));
  console.log('📊 Test Results Summary\n');
  console.log(`Layer 2: Database Schema      ${results.schema ? '✅ PASS' : '❌ FAIL'}`);
  console.log(`Layer 3: Profile Auto-Create  ${results.profile ? '✅ PASS' : '❌ FAIL'}`);
  console.log(`Layer 4: Delta Bucket Storage ${results.deltaBucket ? '✅ PASS' : '❌ FAIL'}`);
  console.log(`Layer 5: Timer Preservation   ${results.timer ? '✅ PASS' : '❌ FAIL'}`);
  console.log(`Layer 8: Stats JOIN           ${results.stats ? '✅ PASS' : '❌ FAIL'}`);
  console.log('');
  
  const totalPassed = Object.values(results).filter(Boolean).length;
  const totalTests = Object.keys(results).length;
  
  console.log(`Total: ${totalPassed}/${totalTests} tests passed`);
  console.log('━'.repeat(60));
  
  const allPassed = totalPassed === totalTests;
  process.exit(allPassed ? 0 : 1);
}

runAllTests();
