-- ─────────────────────────────────────────────────────────────────────────────
-- MIGRATION 003 — New Questionnaire Columns
-- Adds all columns required by the dual-instrument questionnaire:
--   Part 1: CVS-Smart (CVSQ) fields
--   Part 2: EyeGuard behavioral survey fields (new + renamed)
--
-- HOW TO RUN:
--   1. Go to your Supabase project dashboard
--   2. Click "SQL Editor" in the left sidebar
--   3. Paste this entire file and click "Run"
--   4. All statements use ADD COLUMN IF NOT EXISTS — safe to run multiple times
-- ─────────────────────────────────────────────────────────────────────────────

-- ══════════════════════════════════════════════════════════════════════════════
-- TABLE: daily_logs — NEW COLUMNS
-- ══════════════════════════════════════════════════════════════════════════════

-- ── Section 2: Screen Time & Device (new fields) ─────────────────────────────
ALTER TABLE public.daily_logs
  ADD COLUMN IF NOT EXISTS continuous_screen_use   VARCHAR(50),   -- Q8: duration of unbroken screen use
  ADD COLUMN IF NOT EXISTS online_classes_per_day  VARCHAR(20);   -- Q9: number of online classes

-- ── Section 3: Screen Habits & Environment (new fields) ──────────────────────
ALTER TABLE public.daily_logs
  ADD COLUMN IF NOT EXISTS follows_20_20_20   VARCHAR(20),   -- Q10: Always/Sometimes/Rarely/Never
  ADD COLUMN IF NOT EXISTS blue_light_filter  VARCHAR(20),   -- Q11: Always/Sometimes/Rarely/Never
  ADD COLUMN IF NOT EXISTS screen_brightness  VARCHAR(30),   -- Q12: categorical e.g. 'Low (0–25%)'
  ADD COLUMN IF NOT EXISTS dark_room_use      VARCHAR(20),   -- Q13: Always/Sometimes/Rarely/Never
  ADD COLUMN IF NOT EXISTS screen_distance    VARCHAR(30),   -- Q14: e.g. '20–40 cm'
  ADD COLUMN IF NOT EXISTS wears_glasses      VARCHAR(10),   -- Q15: Yes/No
  ADD COLUMN IF NOT EXISTS blue_light_glasses VARCHAR(20),   -- Q16: Always/Sometimes/Rarely/Never
  ADD COLUMN IF NOT EXISTS break_frequency    VARCHAR(30);   -- Q17: e.g. 'Every 20 minutes'
-- Note: sleep_hours already exists in the schema

-- ── Section 4: Symptom Grid (10 symptoms × 5-point scale) ────────────────────
ALTER TABLE public.daily_logs
  ADD COLUMN IF NOT EXISTS sym_dry_eyes                  VARCHAR(15),  -- Never/Rarely/Sometimes/Often/Always
  ADD COLUMN IF NOT EXISTS sym_eye_itchiness             VARCHAR(15),
  ADD COLUMN IF NOT EXISTS sym_blurred_vision            VARCHAR(15),
  ADD COLUMN IF NOT EXISTS sym_headaches                 VARCHAR(15),
  ADD COLUMN IF NOT EXISTS sym_eye_irritation            VARCHAR(15),
  ADD COLUMN IF NOT EXISTS sym_light_sensitivity         VARCHAR(15),
  ADD COLUMN IF NOT EXISTS sym_difficulty_focusing       VARCHAR(15),
  ADD COLUMN IF NOT EXISTS sym_neck_shoulder_pain        VARCHAR(15),
  ADD COLUMN IF NOT EXISTS sym_mental_fatigue            VARCHAR(15),
  ADD COLUMN IF NOT EXISTS sym_difficulty_concentrating  VARCHAR(15);

-- ── Section 5: Self-Assessment (new fields) ───────────────────────────────────
ALTER TABLE public.daily_logs
  ADD COLUMN IF NOT EXISTS overall_eye_strain        VARCHAR(20),   -- Q20: None/Mild/Moderate/Severe
  ADD COLUMN IF NOT EXISTS digital_fatigue_frequency VARCHAR(20),   -- Q21: Never/Rarely/Sometimes/Often/Always
  ADD COLUMN IF NOT EXISTS primary_symptom_history   VARCHAR(60);   -- Q22: e.g. 'Yes — Both Dry Eyes and Blurry Vision'

-- ── CVSQ raw inputs (Part 1) ──────────────────────────────────────────────────
ALTER TABLE public.daily_logs
  ADD COLUMN IF NOT EXISTS cvsq_visual_complaints       TEXT,   -- JSON array of selected visual complaints
  ADD COLUMN IF NOT EXISTS cvsq_ocular_complaints       TEXT,   -- JSON array of selected ocular surface complaints
  ADD COLUMN IF NOT EXISTS cvsq_extraocular_complaints  TEXT,   -- JSON array of selected extraocular complaints
  ADD COLUMN IF NOT EXISTS cvsq_frequency               VARCHAR(20),  -- Q4: Rare/Infrequent/Frequent
  ADD COLUMN IF NOT EXISTS cvsq_screen_associated       VARCHAR(20);  -- Q5: Never/Sometimes/Always


-- ══════════════════════════════════════════════════════════════════════════════
-- TABLE: predictions — CVSQ scores + concordance columns
-- ══════════════════════════════════════════════════════════════════════════════

ALTER TABLE public.predictions
  ADD COLUMN IF NOT EXISTS cvsq_score          SMALLINT,      -- 0–10 total CVSQ score
  ADD COLUMN IF NOT EXISTS cvsq_status         VARCHAR(30),   -- 'Normal'|'Not a CVS Case'|'Low Probability'|'High Probability'|'Positive CVS Case'
  ADD COLUMN IF NOT EXISTS cvsq_q1             SMALLINT,      -- 0–2
  ADD COLUMN IF NOT EXISTS cvsq_q2             SMALLINT,      -- 0–2
  ADD COLUMN IF NOT EXISTS cvsq_q3             SMALLINT,      -- 0–2
  ADD COLUMN IF NOT EXISTS cvsq_q4             SMALLINT,      -- 0–2
  ADD COLUMN IF NOT EXISTS cvsq_q5             SMALLINT,      -- 0–2
  ADD COLUMN IF NOT EXISTS concordant          BOOLEAN,       -- true if ML risk tier matches CVSQ diagnostic tier
  ADD COLUMN IF NOT EXISTS concordance_scenario VARCHAR(40);  -- 'agree'|'cvsq_high_eyeguard_low'|'cvsq_low_eyeguard_high'|'discordant'


-- ══════════════════════════════════════════════════════════════════════════════
-- INDEXES — for analytics queries
-- ══════════════════════════════════════════════════════════════════════════════

-- CVSQ score distribution queries (admin analytics)
CREATE INDEX IF NOT EXISTS idx_predictions_cvsq_score
  ON public.predictions(cvsq_score);

-- Concordance rate queries
CREATE INDEX IF NOT EXISTS idx_predictions_concordant
  ON public.predictions(concordant);

-- Symptom grid queries (symptom prevalence analytics)
CREATE INDEX IF NOT EXISTS idx_daily_logs_sym_blurred
  ON public.daily_logs(sym_blurred_vision);

CREATE INDEX IF NOT EXISTS idx_daily_logs_sym_dry_eyes
  ON public.daily_logs(sym_dry_eyes);

CREATE INDEX IF NOT EXISTS idx_daily_logs_sym_mental_fatigue
  ON public.daily_logs(sym_mental_fatigue);

CREATE INDEX IF NOT EXISTS idx_daily_logs_overall_strain
  ON public.daily_logs(overall_eye_strain);


-- ══════════════════════════════════════════════════════════════════════════════
-- VERIFICATION QUERY
-- Run this after the migration to confirm all columns were added successfully.
-- ══════════════════════════════════════════════════════════════════════════════

/*
SELECT column_name, data_type, character_maximum_length
FROM   information_schema.columns
WHERE  table_schema = 'public'
  AND  table_name   = 'daily_logs'
  AND  column_name  IN (
    'continuous_screen_use', 'online_classes_per_day',
    'follows_20_20_20', 'blue_light_filter', 'screen_brightness',
    'dark_room_use', 'screen_distance', 'wears_glasses',
    'blue_light_glasses', 'break_frequency',
    'sym_dry_eyes', 'sym_eye_itchiness', 'sym_blurred_vision',
    'sym_headaches', 'sym_eye_irritation', 'sym_light_sensitivity',
    'sym_difficulty_focusing', 'sym_neck_shoulder_pain',
    'sym_mental_fatigue', 'sym_difficulty_concentrating',
    'overall_eye_strain', 'digital_fatigue_frequency', 'primary_symptom_history',
    'cvsq_visual_complaints', 'cvsq_ocular_complaints',
    'cvsq_extraocular_complaints', 'cvsq_frequency', 'cvsq_screen_associated'
  )
ORDER  BY column_name;

SELECT column_name, data_type
FROM   information_schema.columns
WHERE  table_schema = 'public'
  AND  table_name   = 'predictions'
  AND  column_name  IN (
    'cvsq_score', 'cvsq_status', 'cvsq_q1', 'cvsq_q2', 'cvsq_q3',
    'cvsq_q4', 'cvsq_q5', 'concordant', 'concordance_scenario'
  )
ORDER  BY column_name;
*/

-- ══════════════════════════════════════════════════════════════════════════════
-- MIGRATION 003b — Overall combined score columns (added after accuracy analysis)
-- ══════════════════════════════════════════════════════════════════════════════

ALTER TABLE public.predictions
  ADD COLUMN IF NOT EXISTS overall_score   NUMERIC(5,2),    -- 0–100 combined (60% EyeGuard + 40% CVSQ)
  ADD COLUMN IF NOT EXISTS overall_level   SMALLINT,        -- 0=Low 1=Moderate 2=High 3=Critical
  ADD COLUMN IF NOT EXISTS overall_status  VARCHAR(20);     -- 'Low Risk'|'Moderate Risk'|'High Risk'|'Critical Risk'

CREATE INDEX IF NOT EXISTS idx_predictions_overall_level
  ON public.predictions(overall_level);
