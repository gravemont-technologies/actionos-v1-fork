# Manual Steps for ActionOS MVP Deployment

This file lists all manual steps required to finalize your production deployment, including database setup, Supabase functions, and any other non-automatable actions.

---

## 1. Database Schema Setup

- Apply the finalized schema in `supabase/schema.sql` to your Supabase/Postgres database:
  - You can use the Supabase SQL editor or `psql` CLI:
    ```sh
    psql <your_connection_string> -f supabase/schema.sql
    ```
  - This will create all required tables, indexes, and constraints for:
    - `profiles`
    - `signature_cache`
    - `active_steps`
    - `feedback_records`
    - `analytics_events`
    - `token_usage`

## 2. Supabase Functions (if needed)

- If you require custom Supabase Functions (Postgres functions, triggers, etc.), review the bottom of `schema.sql` for any `CREATE FUNCTION` or `CREATE TRIGGER` statements.
- The only function currently required is `cleanup_expired_cache` (for auto-cleanup of expired cache entries). This is already included in `schema.sql` and will be created automatically when you run the schema.

## 3. Environment Variables

- Ensure all required environment variables are set in your deployment environment. See `.env.example` for a full list.
- Critical variables include:
  - `SUPABASE_URL`
  - `SUPABASE_SERVICE_ROLE_KEY`
  - `CLERK_SECRET_KEY`
  - `OPENAI_API_KEY`
  - Any others referenced in your codebase or deployment scripts.

## 4. Manual Data Migration (if upgrading)

- If you are migrating from a previous schema, ensure all data is backed up before applying the new schema.
- Review all `ALTER TABLE` statements in `schema.sql` for backward compatibility.

## 5. Post-Deployment Checklist

- After applying the schema and deploying your code:
  - Run all integration and E2E tests.
  - Manually verify that all endpoints are functional.
  - Check Supabase logs for any errors or warnings.
  - Confirm that all indexes and constraints are present (see `schema.sql`).

## 6. GitHub/Vercel Instant Deploy

- This repo is now fully ready for instant deployment from GitHub to Vercel.
- **Steps:**
  1. Fork or clone this repo to your GitHub account.
  2. Connect your repo to Vercel (import project in Vercel dashboard).
  3. Set all required environment variables in Vercel (see `.env.example`).
  4. Apply the schema in `supabase/schema.sql` to your Supabase project (see above).
  5. (Optional) Use `scripts/apply-schema.sh` or `scripts/apply-schema.cmd` for automated schema setup.
  6. Deploy! All endpoints and frontend will be live instantly.
- For troubleshooting, see `README.md` and `docs/README.md`.

---

If you add any new manual steps (e.g., new triggers, custom RLS policies, or external integrations), append them to this file for future maintainers.
