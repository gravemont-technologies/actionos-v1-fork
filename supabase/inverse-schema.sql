-- ============================================================================
-- INVERSE SCHEMA - Complete Teardown Script
-- ============================================================================
-- This script DESTROYS everything created by schema.sql
-- Use with extreme caution - this will delete all data and schema objects
-- Run this to completely reset the database before applying schema.sql
-- ============================================================================

-- Drop triggers first (depend on functions)
DROP TRIGGER IF EXISTS trigger_cleanup_cache ON signature_cache;
DROP TRIGGER IF EXISTS trigger_profiles_updated_at ON profiles;
DROP TRIGGER IF EXISTS trigger_token_usage_updated_at ON token_usage;

-- Drop functions
DROP FUNCTION IF EXISTS cleanup_expired_cache() CASCADE;
DROP FUNCTION IF EXISTS update_updated_at_column() CASCADE;
DROP FUNCTION IF EXISTS increment_token_usage(TEXT, INTEGER, DATE) CASCADE;
DROP FUNCTION IF EXISTS redact_pii(TEXT) CASCADE;
DROP FUNCTION IF EXISTS normalize_for_signature(TEXT) CASCADE;

-- Drop tables (CASCADE handles foreign keys and dependent objects)
DROP TABLE IF EXISTS token_usage CASCADE;
DROP TABLE IF EXISTS analytics_events CASCADE;
DROP TABLE IF EXISTS feedback_records CASCADE;
DROP TABLE IF EXISTS active_steps CASCADE;
DROP TABLE IF EXISTS signature_cache CASCADE;
DROP TABLE IF EXISTS profiles CASCADE;

-- Drop extensions (only if not used by other schemas)
-- DROP EXTENSION IF EXISTS "pg_trgm" CASCADE;
-- DROP EXTENSION IF EXISTS "uuid-ossp" CASCADE;

-- ============================================================================
-- VERIFICATION QUERIES (Optional - uncomment to verify teardown)
-- ============================================================================
-- SELECT table_name FROM information_schema.tables 
--   WHERE table_schema = 'public' 
--   AND table_name IN ('profiles', 'signature_cache', 'active_steps', 'feedback_records', 'analytics_events', 'token_usage');
-- Should return 0 rows if teardown successful
--
-- SELECT routine_name FROM information_schema.routines 
--   WHERE routine_schema = 'public' 
--   AND routine_name IN ('cleanup_expired_cache', 'update_updated_at_column', 'increment_token_usage', 'redact_pii', 'normalize_for_signature');
-- Should return 0 rows if teardown successful
--
-- SELECT trigger_name FROM information_schema.triggers 
--   WHERE trigger_schema = 'public' 
--   AND trigger_name IN ('trigger_cleanup_cache', 'trigger_profiles_updated_at', 'trigger_token_usage_updated_at');
-- Should return 0 rows if teardown successful
-- ============================================================================
