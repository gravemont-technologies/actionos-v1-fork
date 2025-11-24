# Database Migrations

## ⚠️ DEPRECATED - Migrations Consolidated

**IMPORTANT**: As of the FINAL VERSION of `schema.sql`, all migrations have been consolidated into the main schema file. These migration files are now **deprecated** and should not be used.

The main `schema.sql` now includes:
- All metrics system tables (`step_metrics`, `user_daily_metrics`)
- All feedback system enhancements
- All timer and delta bucket fixes
- All insights and signature cache enhancements

**For new installations**: Use only `../schema.sql`
**For existing databases**: The schema is backward compatible - no migration needed

---

## Legacy Migration Files (DEPRECATED)

### `001_add_metrics_system.sql` - ✅ CONSOLIDATED
**Status**: Tables now included in main `schema.sql`
**Purpose**: Added comprehensive metrics tracking system (IPP, BUT, RSI, etc.)

### `001_rollback_metrics_system.sql` - ✅ OBSOLETE
**Status**: Use `../inverse-schema.sql` for complete teardown

### `002_add_feedback_comments.sql` - ✅ CONSOLIDATED
**Status**: Tables now included in main `schema.sql`

### `003_fix_timer_and_delta_bucket.sql` - ✅ CONSOLIDATED
**Status**: Fixes now included in main `schema.sql`

**Run After**: Main `schema.sql` has been applied

**Rollback**: Use `001_rollback_metrics_system.sql`

---

## How to Apply Migrations

### Option 1: Supabase Dashboard (Recommended)
1. Open your Supabase project
2. Go to **SQL Editor**
3. Create a new query
4. Paste the migration file contents
5. Click **Run**
6. Verify success message

### Option 2: Command Line (psql)
```bash
# Set your database connection string
export DATABASE_URL="postgresql://postgres:password@host:5432/postgres"

# Apply migration
psql $DATABASE_URL < supabase/migrations/001_add_metrics_system.sql
```

### Option 3: Programmatic (Node.js)
```javascript
import { getSupabaseClient } from './src/server/db/supabase.js';
import fs from 'fs';

const client = getSupabaseClient();
const sql = fs.readFileSync('./supabase/migrations/001_add_metrics_system.sql', 'utf-8');

const { error } = await client.rpc('exec_sql', { sql });
if (error) console.error('Migration failed:', error);
else console.log('Migration successful');
```

---

## How to Rollback Migrations

### Rollback Metrics System
```bash
psql $DATABASE_URL < supabase/migrations/001_rollback_metrics_system.sql
```

**⚠️ WARNING**: Rollback will **DELETE ALL DATA** in the affected tables. Back up first!

---

## Migration Order

Migrations must be applied in numerical order:

1. ✅ `schema.sql` (base schema - run first)
2. ✅ `001_add_metrics_system.sql` (metrics tables)
3. 🔄 Future migrations go here...

---

## Verification

After applying a migration, verify the tables exist:

```sql
-- Check if metrics tables exist
SELECT table_name 
FROM information_schema.tables 
WHERE table_schema = 'public' 
AND table_name IN ('step_metrics', 'user_daily_metrics');

-- Should return 2 rows
```

Check if indexes were created:

```sql
-- Check metrics indexes
SELECT indexname 
FROM pg_indexes 
WHERE tablename IN ('step_metrics', 'user_daily_metrics');

-- Should return 5 indexes
```

---

## Best Practices

### Before Applying Migration
1. **Backup database** (Supabase auto-backups daily, but be safe)
2. **Test in development** environment first
3. **Review migration SQL** carefully
4. **Check for conflicts** with existing schema

### During Migration
1. **Use transactions** when possible (most migrations are wrapped)
2. **Monitor execution** time for large datasets
3. **Check for errors** in output logs

### After Migration
1. **Verify tables** were created
2. **Verify indexes** exist
3. **Test API endpoints** that use new tables
4. **Monitor performance** of new queries

---

## Common Issues

### Issue: "relation already exists"
**Cause**: Migration was already applied or partial failure

**Solution**:
```sql
-- Check if table exists
SELECT EXISTS (
  SELECT FROM information_schema.tables 
  WHERE table_schema = 'public' 
  AND table_name = 'step_metrics'
);

-- If true, migration is already applied or use rollback first
```

### Issue: "permission denied"
**Cause**: Insufficient database privileges

**Solution**: Ensure you're using the service role key or superuser credentials

### Issue: Foreign key constraint fails
**Cause**: Referenced tables don't exist

**Solution**: Ensure `schema.sql` was applied first (specifically `active_steps` and `profiles` tables)

---

## Migration Checklist

Before deploying to production:

- [ ] Migration tested in local development
- [ ] Migration tested in staging environment
- [ ] Database backup created
- [ ] Team notified of scheduled migration
- [ ] Rollback script tested
- [ ] Monitoring/alerts configured
- [ ] API endpoints tested post-migration
- [ ] Performance verified (no slow queries)

---

## Contact

For migration issues or questions:
- Check documentation: `docs/METRICS_IMPLEMENTATION.md`
- Review schema: `supabase/schema.sql`
- Database errors: Check Supabase logs
