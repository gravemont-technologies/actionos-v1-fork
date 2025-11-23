-- Migration: Fix Timer Data + Store Delta Bucket
-- Addresses critical gaps in step_metrics pipeline:
-- 1. Timer accuracy: first_started_at never overwritten on UPSERT
-- 2. Cache dependency: delta_bucket stored in active_steps (eliminates 24h TTL race)

-- Add delta_bucket column to store LLM prediction
ALTER TABLE active_steps 
  ADD COLUMN IF NOT EXISTS delta_bucket TEXT 
  CHECK (delta_bucket IN ('SMALL', 'MEDIUM', 'LARGE'));

-- Add first_started_at for accurate timer tracking (never overwritten)
ALTER TABLE active_steps 
  ADD COLUMN IF NOT EXISTS first_started_at TIMESTAMPTZ DEFAULT NOW();

-- Backfill first_started_at from started_at for existing rows
UPDATE active_steps 
SET first_started_at = started_at 
WHERE first_started_at IS NULL;

-- Add index on delta_bucket for analytics queries (partial index for non-null values)
CREATE INDEX IF NOT EXISTS idx_active_steps_delta_bucket 
  ON active_steps(delta_bucket) 
  WHERE delta_bucket IS NOT NULL;

-- Add comments for documentation
COMMENT ON COLUMN active_steps.delta_bucket IS 'LLM prediction (SMALL/MEDIUM/LARGE) - stored to avoid cache TTL dependency';
COMMENT ON COLUMN active_steps.first_started_at IS 'Initial timer start - preserved across UPSERT for accurate TAA calculation';
