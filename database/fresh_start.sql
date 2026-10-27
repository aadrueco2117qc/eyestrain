-- ─────────────────────────────────────────────────────────────────────────────
-- NONDESTRUCTIVE "FRESH START" for response data
-- ─────────────────────────────────────────────────────────────────────────────
-- Purpose: make the system fresh — zero respondents — so that the only data
-- in the system is what you import (the 399 survey responses, which go into
-- the separate `survey_responses` table created by schema_survey_responses.sql).
--
-- What this does (in order):
--   1. Creates backup tables: daily_logs_archive + predictions_archive
--      (same columns as the live tables, empty to start).
--   2. Copies ALL existing rows from daily_logs and predictions INTO those
--      archives. Your old data is preserved — nothing is lost.
--   3. Empties (TRUNCATE) the live daily_logs and predictions tables.
--      Only these two tables are affected.
--
-- What this does NOT touch (kept exactly as-is):
--   - auth.users, user_profiles, user_settings, user_progress   (accounts + profiles)
--   - admin_users, audit_logs, wellness_tips                    (admin config)
--   - survey_responses                                          (the 399 import target)
--
-- FULLY REVERSIBLE: the old data lives on in *_archive. To undo, run:
--   INSERT INTO public.daily_logs  SELECT * FROM public.daily_logs_archive;
--   INSERT INTO public.predictions SELECT * FROM public.predictions_archive;
--
-- Safe to re-run: after the first run the live tables are empty, so subsequent
-- runs copy zero rows into the archives and the truncate is a no-op.
-- ─────────────────────────────────────────────────────────────────────────────

-- 1. Create archive tables (structure only). IF NOT EXISTS so re-runs are safe.
CREATE TABLE IF NOT EXISTS public.daily_logs_archive  (LIKE public.daily_logs);
CREATE TABLE IF NOT EXISTS public.predictions_archive (LIKE public.predictions);

-- 2. Snapshot current data into the archives (preserves every old row).
INSERT INTO public.daily_logs_archive  SELECT * FROM public.daily_logs;
INSERT INTO public.predictions_archive SELECT * FROM public.predictions;

-- 3. Clear the live tables. Both are listed together so the foreign key
--    between them (predictions.daily_log_id -> daily_logs.id) is handled in
--    one statement — no CASCADE needed, so no other tables are affected.
TRUNCATE TABLE public.daily_logs, public.predictions RESTART IDENTITY;

-- 4. Show the result so you can confirm the live tables are empty and the
--    archives hold the old row counts.
SELECT 'daily_logs'           AS table_name, count(*) AS rows FROM public.daily_logs
UNION ALL SELECT 'predictions',          count(*)        FROM public.predictions
UNION ALL SELECT 'daily_logs_archive',  count(*)        FROM public.daily_logs_archive
UNION ALL SELECT 'predictions_archive',  count(*)        FROM public.predictions_archive;
