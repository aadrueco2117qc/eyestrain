-- ─────────────────────────────────────────────────────────────────────────────
-- EyeGuard — Full Reset  (keep admin account only, zero all counters)
-- Run in: Supabase Dashboard → SQL Editor → New query → Run
-- ─────────────────────────────────────────────────────────────────────────────
-- Removes ALL respondent data from every table.
-- Preserves ONLY the row(s) in admin_users (and their auth.users account).
-- ─────────────────────────────────────────────────────────────────────────────

-- Step 1 — Disable FK checks so we can delete in any order
SET session_replication_role = replica;

-- Step 2 — Wipe response/log tables completely
DELETE FROM public.predictions;
DELETE FROM public.daily_logs;
DELETE FROM public.audit_logs;

-- Step 3 — Wipe non-admin user profiles and settings
DELETE FROM public.user_profiles
  WHERE user_id NOT IN (SELECT user_id FROM public.admin_users);

DELETE FROM public.user_settings
  WHERE user_id NOT IN (SELECT user_id FROM public.admin_users);

-- Step 4 — Delete non-admin auth accounts
-- (auth.users rows whose id is NOT in admin_users)
DELETE FROM auth.users
  WHERE id NOT IN (SELECT user_id FROM public.admin_users);

-- Step 5 — Re-enable FK checks
SET session_replication_role = DEFAULT;

-- Step 6 — Verify (all should be 0 except admin_users = 1)
SELECT 'daily_logs'       AS tbl, count(*) AS rows FROM public.daily_logs
UNION ALL SELECT 'predictions',        count(*)       FROM public.predictions
UNION ALL SELECT 'user_profiles',      count(*)       FROM public.user_profiles
UNION ALL SELECT 'user_settings',      count(*)       FROM public.user_settings
UNION ALL SELECT 'audit_logs',         count(*)       FROM public.audit_logs
UNION ALL SELECT 'admin_users',        count(*)       FROM public.admin_users
UNION ALL SELECT 'auth.users (total)', count(*)       FROM auth.users;
