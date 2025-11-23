# Core Workflow Validation Checklist

## Critical Path: New User → Analyze → Feedback → Dashboard

### Prerequisites
- [ ] Database migration applied: `003_fix_timer_and_delta_bucket.sql`
- [ ] Server running: `npm run dev`
- [ ] Supabase connection active
- [ ] Test user authenticated via Clerk

---

## Test 1: Profile Auto-Creation (Gap Fix - Phase 2)

### Scenario: First-time user calls /analyze

**Steps:**
1. Get Clerk JWT for new user (never called /analyze before)
2. Call `POST /api/analyze` with:
   ```json
   {
     "situation": "I want to improve my productivity",
     "goal": "Get better at time management",
     "constraints": []
   }
   ```

**Expected Behavior:**
- ✅ ensureProfile middleware checks `profiles.user_id`
- ✅ Profile auto-created with `baseline_ipp=50.0`, `baseline_but=50.0`
- ✅ Log entry: "Profile auto-created for user_id=..."
- ✅ Analyze proceeds without 404 error
- ✅ Returns immediate_steps with delta_bucket

**Validation SQL:**
```sql
SELECT user_id, baseline_ipp, baseline_but, created_at 
FROM profiles 
WHERE user_id = '<test_user_id>';
-- Should show: baseline_ipp=50.0, baseline_but=50.0
```

**Pass Criteria:**
- [ ] No 404/500 errors
- [ ] Profile exists in database
- [ ] Baseline values are 50.0
- [ ] Log shows auto-creation

---

## Test 2: Delta Bucket Storage (Gap Fix #2)

### Scenario: Analyze stores delta_bucket in active_steps

**Steps:**
1. Call `POST /api/analyze` (continuing from Test 1)
2. Inspect response for immediate_steps[0].delta_bucket
3. Check active_steps table

**Expected Behavior:**
- ✅ LLM returns delta_bucket: "SMALL", "MEDIUM", or "LARGE"
- ✅ analyze route extracts delta_bucket from response
- ✅ setActiveStep() stores in active_steps.delta_bucket
- ✅ active_steps.first_started_at set to NOW
- ✅ Log entry: "Active step set successfully" with deltaBucket

**Validation SQL:**
```sql
SELECT 
  profile_id, 
  signature, 
  step_description, 
  delta_bucket,
  started_at,
  first_started_at,
  completed_at
FROM active_steps 
WHERE profile_id = '<test_profile_id>';
-- Should show: delta_bucket populated, first_started_at = started_at
```

**Pass Criteria:**
- [ ] delta_bucket is SMALL/MEDIUM/LARGE (not null)
- [ ] first_started_at equals started_at (first time)
- [ ] step_description contains LLM-generated text
- [ ] completed_at is null (step active)

---

## Test 3: Timer Preservation on Re-Analyze (Gap Fix #1)

### Scenario: User analyzes again before completing step

**Steps:**
1. Wait 5+ minutes after Test 2
2. Call `POST /api/analyze` again (different situation)
3. Check active_steps timestamps

**Expected Behavior:**
- ✅ setActiveStep() queries existing row for first_started_at
- ✅ UPSERT preserves first_started_at (doesn't reset to NOW)
- ✅ started_at updates to NOW (latest analyze time)
- ✅ New signature and step_description replace old values

**Validation SQL:**
```sql
SELECT 
  started_at,
  first_started_at,
  EXTRACT(EPOCH FROM (started_at - first_started_at)) as gap_seconds
FROM active_steps 
WHERE profile_id = '<test_profile_id>';
-- Should show: gap_seconds > 300 (5+ minutes)
-- first_started_at should be 5+ minutes older than started_at
```

**Pass Criteria:**
- [ ] first_started_at is older than started_at
- [ ] Gap is ~5 minutes (300+ seconds)
- [ ] step_description updated to new LLM response
- [ ] delta_bucket updated to new value

---

## Test 4: Feedback Submission with Metrics Recording (Gap Fixes #2, #4)

### Scenario: User completes step with slider feedback

**Steps:**
1. Wait 2+ minutes after last analyze (to get meaningful actualMinutes)
2. Call `POST /api/feedback` with:
   ```json
   {
     "profile_id": "<test_profile_id>",
     "signature": "<current_signature>",
     "slider": 8,
     "outcome": "Successfully set up new time-blocking system"
   }
   ```

**Expected Behavior:**
- ✅ Feedback route queries active_steps for: id, first_started_at, delta_bucket
- ✅ Uses delta_bucket from active_steps (NOT signature_cache)
- ✅ Calculates actualMinutes from first_started_at (NOT started_at)
- ✅ sliderToBUTComponents(8) returns { ease: 8, alignment: 9, friction: 2 }
- ✅ recordStepMetrics() inserts row to step_metrics
- ✅ markStepComplete() updates baselines
- ✅ active_steps.completed_at set to NOW

**Validation SQL:**
```sql
-- Check step_metrics row created
SELECT 
  sm.ipp_score,
  sm.magnitude,
  sm.reach,
  sm.depth,
  sm.ease_score,
  sm.alignment_score,
  sm.friction_score,
  sm.estimated_minutes,
  sm.actual_minutes,
  sm.taa_score,
  sm.outcome_description,
  EXTRACT(EPOCH FROM (sm.completed_at - as2.first_started_at)) / 60 as actual_minutes_check
FROM step_metrics sm
JOIN active_steps as2 ON sm.step_id = as2.id
WHERE sm.profile_id = '<test_profile_id>'
ORDER BY sm.completed_at DESC
LIMIT 1;

-- Should show:
-- ease_score = 8 (from slider 8)
-- alignment_score = 9
-- friction_score = 2
-- actual_minutes ~= actual_minutes_check (timer accuracy)
-- ipp_score = magnitude * reach * depth
```

**Validation - Baselines Updated:**
```sql
SELECT baseline_ipp, baseline_but 
FROM profiles 
WHERE profile_id = '<test_profile_id>';
-- Should show: baseline_ipp > 50 (slider 8 = +6 delta)
```

**Pass Criteria:**
- [ ] step_metrics row exists
- [ ] ease/alignment/friction match slider mapping (8 → 8/9/2)
- [ ] actual_minutes is reasonable (2-5 minutes)
- [ ] taa_score calculated (not null)
- [ ] ipp_score matches formula (magnitude × reach × depth)
- [ ] Baseline IPP increased (was 50, now ~56)
- [ ] active_steps.completed_at is NOT NULL

---

## Test 5: Dashboard Stats Endpoint (Gap Fix #3)

### Scenario: Dashboard queries step_metrics with JOIN

**Steps:**
1. Call `GET /api/feedback/stats?profile_id=<test_profile_id>`

**Expected Behavior:**
- ✅ Queries step_metrics with JOIN to active_steps
- ✅ Returns recentSteps with step_description
- ✅ totalIpp calculated from sum(ipp_score)
- ✅ avgTAA calculated from avg(taa_score)
- ✅ streak = 1 (completed today)
- ✅ completed = 1

**Validation - Response Structure:**
```json
{
  "completed": 1,
  "totalIpp": "18.0",  // Example: 6 * 3 * 1.0 for MEDIUM
  "avgTAA": "0.95",    // Example: good time estimate
  "streak": 1,
  "recentSteps": [
    {
      "stepDescription": "Set up new time-blocking system", // GAP FIX: present!
      "signature": "<signature>",
      "ipp": "18.0",
      "but": "4.50",
      "magnitude": 6,
      "reach": 3,
      "depth": 1.0,
      "completedAt": "2025-11-23T..."
    }
  ]
}
```

**Pass Criteria:**
- [ ] completed = 1 (not 0)
- [ ] totalIpp is numeric string (not "0.0")
- [ ] avgTAA is numeric string (not "0.0" or "N/A")
- [ ] recentSteps array has 1 item
- [ ] recentSteps[0].stepDescription is present and meaningful
- [ ] recentSteps[0].ipp matches ipp_score from step_metrics

---

## Test 6: Cache Expiration Resilience (Gap Fix #2 Validation)

### Scenario: Complete step >24h after analyze (cache expired)

**Steps:**
1. Call `POST /api/analyze` and save signature
2. **Do NOT complete step for 24+ hours**
3. After 24h, call `POST /api/feedback` with saved signature

**Expected Behavior:**
- ✅ signature_cache.expires_at passed (cache miss)
- ✅ Feedback route queries active_steps.delta_bucket (NOT cache)
- ✅ delta_bucket still available (no TTL on active_steps)
- ✅ step_metrics row created successfully

**Validation SQL:**
```sql
-- Verify delta_bucket persisted
SELECT delta_bucket, created_at 
FROM active_steps 
WHERE signature = '<test_signature>';
-- Should show: delta_bucket populated even if created_at > 24h ago
```

**Pass Criteria:**
- [ ] Feedback submission succeeds (no errors)
- [ ] step_metrics row created with correct delta_bucket
- [ ] Log does NOT show "No cached response found"
- [ ] Log DOES show "delta_bucket found in active_steps"

---

## Test 7: BUT Component Realism (Gap Fix #4 Validation)

### Scenario: Different slider values produce different BUT components

**Steps:**
1. Complete 5 steps with varying slider values: 2, 4, 6, 8, 10
2. Query step_metrics for ease/alignment/friction patterns

**Expected Behavior:**
- ✅ Slider 2 → ease=3, alignment=4, friction=7 (difficult)
- ✅ Slider 6 → ease=6, alignment=7, friction=4 (moderate)
- ✅ Slider 10 → ease=8, alignment=9, friction=2 (easy)

**Validation SQL:**
```sql
SELECT 
  signature,
  ease_score,
  alignment_score,
  friction_score,
  but_score
FROM step_metrics
ORDER BY completed_at DESC
LIMIT 5;

-- Should show variation (not all 5/7/5)
-- Higher ease/alignment should correlate with lower friction
```

**Pass Criteria:**
- [ ] ease_score varies across steps (not all the same)
- [ ] alignment_score varies
- [ ] friction_score varies
- [ ] Pattern is logical (high slider → high ease, low friction)

---

## Critical Failure Scenarios

### Scenario A: User without profile calls /analyze
**Expected:** ensureProfile auto-creates, analyze succeeds
**Failure Mode:** 404 error "Profile not found"

### Scenario B: Delta bucket not stored
**Expected:** active_steps.delta_bucket populated
**Failure Mode:** NULL value, feedback route falls back to cache (fragile)

### Scenario C: Timer reset on re-analyze
**Expected:** first_started_at preserved
**Failure Mode:** actualMinutes wrong, TAA score inaccurate

### Scenario D: Dashboard shows no step descriptions
**Expected:** recentSteps includes stepDescription field
**Failure Mode:** Only shows numbers (ipp, but) without context

### Scenario E: All steps have same BUT components
**Expected:** Variation based on slider value
**Failure Mode:** All show ease=5, alignment=7, friction=5 (hardcoded defaults)

---

## Performance Validation

### Query Performance:
```sql
-- Stats endpoint should complete in <500ms
EXPLAIN ANALYZE
SELECT 
  sm.*,
  as2.step_description,
  as2.signature
FROM step_metrics sm
JOIN active_steps as2 ON sm.step_id = as2.id
WHERE sm.profile_id = '<test_profile_id>'
ORDER BY sm.completed_at DESC
LIMIT 5;

-- Check for index usage on:
-- - step_metrics.profile_id
-- - step_metrics.completed_at
-- - step_metrics.step_id (FK to active_steps)
```

**Pass Criteria:**
- [ ] Query uses indexes (no Seq Scan)
- [ ] Execution time < 100ms
- [ ] JOIN is efficient (nested loop or hash join)

---

## Error Handling Validation

### Test: Missing delta_bucket (legacy data)
```sql
-- Simulate legacy row
UPDATE active_steps 
SET delta_bucket = NULL 
WHERE profile_id = '<test_profile_id>';
```

**Expected:**
- [ ] Feedback route logs warning
- [ ] Falls back to default SMALL bucket
- [ ] step_metrics row still created
- [ ] Request succeeds (graceful degradation)

### Test: Invalid slider value
```json
POST /api/feedback
{ "slider": 15 }  // Invalid: > 10
```

**Expected:**
- [ ] Validation error before processing
- [ ] No step_metrics row created
- [ ] Error message: "Slider must be 0-10"

---

## Summary Metrics

### Target Performance (9/10 MVP):
- ✅ Profile auto-creation: 100% success rate
- ✅ Delta bucket persistence: No cache dependency
- ✅ Timer accuracy: TAA scores meaningful (not all 0.0)
- ✅ Dashboard context: Step descriptions present
- ✅ BUT component realism: Variation based on slider
- ✅ End-to-end latency: /analyze + /feedback < 5 seconds
- ✅ Stats query: < 500ms
- ✅ Error rate: < 1% on critical path

### Upgrade Confidence:
- **6/10 (Before):** Happy path works, fragile edge cases
- **9/10 (After):** Robust core workflow, graceful degradation, meaningful analytics

---

## Next Steps After Validation

1. **If all tests pass:**
   - Deploy migration to production
   - Monitor logs for auto-creation events
   - Track TAA score distribution
   - Validate dashboard user engagement

2. **If tests fail:**
   - Check migration applied correctly
   - Verify setActiveStep() signature matches calls
   - Validate JOIN syntax for Supabase PostgREST
   - Review logs for error stack traces

3. **Future Enhancements (Post-MVP):**
   - Collect ease/alignment/friction from extended feedback form
   - Add sparkline visualization (IPP over time)
   - Implement retrospective LLM insights
   - Add step history pagination (currently top 5)
