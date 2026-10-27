-- ─────────────────────────────────────────────────────────────────────────────
-- EyeGuard Survey Responses — Import Table
-- ─────────────────────────────────────────────────────────────────────────────
-- This table holds the Google Form / Excel survey responses (CVSQ Part 1 +
-- EyeGuard Part 2). It is the "ready table" that the admin Excel-upload route
-- (app/api/admin/import-survey/route.ts) writes into.
--
-- Run this in the Supabase SQL Editor (Dashboard → SQL → New query).
-- It is idempotent — safe to run multiple times.
--
-- Column mapping is by position in the Excel sheet "Form Responses 1":
--   00  Timestamp                  -> response_timestamp
--   01  Email Address              -> email
--   02  Question 1  (CVSQ Q1 visual, comma-separated)      -> cvsq_q1_visual_raw
--   03  Question 2  (CVSQ Q2 ocular, comma-separated)      -> cvsq_q2_ocular_raw
--   04  Question 3  (CVSQ Q3 extraocular, comma-separated) -> cvsq_q3_extraocular_raw
--   05  Question 4  (CVSQ Q4 frequency)                    -> cvsq_q4_frequency
--   06  Question 5  (CVSQ Q5 screen-associated)            -> cvsq_q5_screen_associated
--   07  Question 1  (EyeGuard age)                        -> eg_age
--   08  Question 2  (EyeGuard gender)                     -> eg_gender
--   09  Question 3  (EyeGuard year level)                  -> eg_year_level
--   10  Question 4  (EyeGuard field of study)              -> eg_field_of_study
--   11  Question 5  (EyeGuard academic screen time)        -> eg_academic_screen_time
--   12  Question 6  (EyeGuard non-academic screen time)   -> eg_non_academic_screen_time
--   13  Question 7  (EyeGuard primary device)              -> eg_primary_device
--   14  Question 8  (EyeGuard continuous screen use)       -> eg_continuous_screen_use
--   15  Question 9  (EyeGuard online classes per day)     -> eg_online_classes_per_day
--   16  Question 10 (EyeGuard 20-20-20 rule)              -> eg_follows_20_20_20
--   17  Question 11 (EyeGuard blue light filter)           -> eg_blue_light_filter
--   18  Question 12 (EyeGuard screen brightness)          -> eg_screen_brightness
--   19  Question 13 (EyeGuard dark room use)              -> eg_dark_room_use
--   20  Question 14 (EyeGuard screen distance)             -> eg_screen_distance
--   21  Question 15 (EyeGuard wears glasses)               -> eg_wears_glasses
--   22  Question 16 (EyeGuard blue-light blocking glasses) -> eg_blue_light_glasses
--   23  Question 17 (EyeGuard break frequency)             -> eg_break_frequency
--   24  Question 18 (EyeGuard sleep hours)                 -> eg_sleep_hours
--   25  Q19 symptom: Dry eyes                              -> sym_dry_eyes
--   26  Q19 symptom: Eye itchiness                         -> sym_eye_itchiness
--   27  Q19 symptom: Blurred vision                        -> sym_blurred_vision
--   28  Q19 symptom: Headaches                             -> sym_headaches
--   29  Q19 symptom: Eye irritation or burning              -> sym_eye_irritation
--   30  Q19 symptom: Sensitivity to light                  -> sym_light_sensitivity
--   31  Q19 symptom: Difficulty focusing                   -> sym_difficulty_focusing
--   32  Q19 symptom: Neck or shoulder pain                 -> sym_neck_shoulder_pain
--   33  Q19 symptom: Feeling mentally tired                -> sym_mental_fatigue
--   34  Q19 symptom: Difficulty concentrating              -> sym_difficulty_concentrating
--   35  Question 20 (EyeGuard overall eye strain)          -> eg_overall_eye_strain
--   36  Question 21 (EyeGuard digital fatigue frequency)   -> eg_digital_fatigue_frequency
--   37  Question 22 (EyeGuard primary symptom history)     -> eg_primary_symptom_history
-- ─────────────────────────────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS public.survey_responses (
  id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),

  -- Import metadata
  row_index       INTEGER,            -- 1-based position in the uploaded Excel (excluding header)
  source_file     TEXT,               -- filename of the uploaded .xlsx
  imported_at     TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,

  -- Raw response identifiers (Excel cols 00–01)
  response_timestamp TIMESTAMPTZ,     -- Google Form submission timestamp
  email              TEXT,            -- respondent email

  -- ── Part 1 — CVS-Smart (raw verbatim from Excel cols 02–06) ──
  cvsq_q1_visual_raw       TEXT,      -- comma-separated visual complaints
  cvsq_q2_ocular_raw       TEXT,      -- comma-separated ocular surface complaints
  cvsq_q3_extraocular_raw  TEXT,      -- comma-separated extraocular complaints
  cvsq_q4_frequency        TEXT,      -- Rare | Infrequent | Frequent
  cvsq_q5_screen_associated TEXT,     -- Never | Sometimes | Always

  -- CVSQ computed scores (filled in by the import route)
  cvsq_q1_score   INTEGER,            -- 0–2  (0 complaints=0, 1=1, >=2=2)
  cvsq_q2_score   INTEGER,            -- 0–2
  cvsq_q3_score   INTEGER,            -- 0–2
  cvsq_q4_score   INTEGER,            -- 0–2  (Rare=0, Infrequent=1, Frequent=2)
  cvsq_q5_score   INTEGER,            -- 0–2  (Never=0, Sometimes=1, Always=2)
  cvsq_total      INTEGER,            -- 0–10 sum
  cvsq_status     TEXT,               -- Normal | Not a CVS Case | Low Probability | High Probability | Positive CVS Case

  -- ── Part 2 — EyeGuard Survey (raw verbatim from Excel cols 07–37) ──
  -- Section 1 — Student Profile
  eg_age                 TEXT,
  eg_gender              TEXT,
  eg_year_level          TEXT,
  eg_field_of_study      TEXT,
  -- Section 2 — Screen Time & Device Use
  eg_academic_screen_time      TEXT,
  eg_non_academic_screen_time  TEXT,
  eg_primary_device            TEXT,
  eg_continuous_screen_use     TEXT,
  eg_online_classes_per_day    TEXT,
  -- Section 3 — Screen Habits & Environment
  eg_follows_20_20_20    TEXT,
  eg_blue_light_filter   TEXT,
  eg_screen_brightness   TEXT,
  eg_dark_room_use       TEXT,
  eg_screen_distance     TEXT,
  eg_wears_glasses       TEXT,
  eg_blue_light_glasses  TEXT,
  eg_break_frequency     TEXT,
  eg_sleep_hours         TEXT,
  -- Section 4 — Symptom Frequency Grid (Never/Rarely/Sometimes/Often/Always)
  sym_dry_eyes                TEXT,
  sym_eye_itchiness           TEXT,
  sym_blurred_vision          TEXT,
  sym_headaches               TEXT,
  sym_eye_irritation          TEXT,
  sym_light_sensitivity       TEXT,
  sym_difficulty_focusing     TEXT,
  sym_neck_shoulder_pain      TEXT,
  sym_mental_fatigue          TEXT,
  sym_difficulty_concentrating TEXT,
  -- Section 5 — Overall Self-Assessment
  eg_overall_eye_strain         TEXT,
  eg_digital_fatigue_frequency TEXT,
  eg_primary_symptom_history   TEXT
);

-- Unique constraint prevents duplicate re-imports of the same response.
-- The import route uses ON CONFLICT (email, response_timestamp) DO NOTHING.
CREATE UNIQUE INDEX IF NOT EXISTS survey_responses_email_ts_uidx
  ON public.survey_responses (email, response_timestamp);

-- Indexes for analytics queries
CREATE INDEX IF NOT EXISTS idx_survey_responses_imported_at
  ON public.survey_responses(imported_at);
CREATE INDEX IF NOT EXISTS idx_survey_responses_cvsq_total
  ON public.survey_responses(cvsq_total);
CREATE INDEX IF NOT EXISTS idx_survey_responses_response_timestamp
  ON public.survey_responses(response_timestamp);

-- ── Row Level Security ──────────────────────────────────────────────────────
-- The import route uses the service-role client, which BYYPASSES RLS, so
-- inserts always work. These policies only gate direct client access.
ALTER TABLE public.survey_responses ENABLE ROW LEVEL SECURITY;

-- Authenticated users can read research survey rows (for analytics),
-- matching the existing daily_logs policy that exposes survey rows
-- (user_id IS NULL) to authenticated users.
DROP POLICY IF EXISTS "Authenticated users can view survey responses" ON public.survey_responses;
CREATE POLICY "Authenticated users can view survey responses"
  ON public.survey_responses
  FOR SELECT
  TO authenticated
  USING (true);

-- Only the service role (which bypasses RLS) can insert/update/delete.
-- No anon/authenticated INSERT policy is granted intentionally.
DROP POLICY IF EXISTS "Service role can modify survey responses" ON public.survey_responses;
CREATE POLICY "Service role can modify survey responses"
  ON public.survey_responses
  FOR ALL
  TO service_role
  USING (true)
  WITH CHECK (true);

-- ── Helpful comment ─────────────────────────────────────────────────────────
COMMENT ON TABLE public.survey_responses IS
  'Research survey responses imported from the EyeGuard Google Form Excel export. Contains CVSQ (Part 1) and EyeGuard (Part 2) raw answers plus computed CVSQ scores. Populated by the admin upload route at /api/admin/import-survey.';
