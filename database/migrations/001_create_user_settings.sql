-- ─────────────────────────────────────────────────────────────────────────────
-- MIGRATION 001 — Create user_settings table (if not exists)
-- Run in Supabase → SQL Editor
-- ─────────────────────────────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS public.user_settings (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL UNIQUE REFERENCES auth.users(id) ON DELETE CASCADE,

  -- Notification Preferences
  enable_email_notifications BOOLEAN DEFAULT TRUE,
  enable_daily_reminders     BOOLEAN DEFAULT TRUE,
  reminder_time              TIME    DEFAULT '09:00:00',

  -- Display Preferences
  theme    VARCHAR(20)  DEFAULT 'system',   -- light | dark | system
  language VARCHAR(10)  DEFAULT 'en',

  -- Privacy
  share_data_for_research BOOLEAN DEFAULT FALSE,
  allow_data_export       BOOLEAN DEFAULT TRUE,

  -- Feature Flags
  beta_features_enabled BOOLEAN DEFAULT FALSE,

  -- Metadata
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- RLS
ALTER TABLE public.user_settings ENABLE ROW LEVEL SECURITY;

-- Drop old policies if they exist, then recreate
DROP POLICY IF EXISTS "Users can view their own settings"   ON public.user_settings;
DROP POLICY IF EXISTS "Users can update their own settings" ON public.user_settings;
DROP POLICY IF EXISTS "Users can insert their own settings" ON public.user_settings;

CREATE POLICY "Users can view their own settings"
  ON public.user_settings FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own settings"
  ON public.user_settings FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own settings"
  ON public.user_settings FOR UPDATE
  USING (auth.uid() = user_id);

-- ─────────────────────────────────────────────────────────────────────────────
-- MIGRATION 002 — Add hidden_by_admin column to daily_logs
-- Allows admins to soft-hide log entries without destroying data
-- ─────────────────────────────────────────────────────────────────────────────

ALTER TABLE public.daily_logs
  ADD COLUMN IF NOT EXISTS hidden_by_admin BOOLEAN DEFAULT FALSE;

ALTER TABLE public.daily_logs
  ADD COLUMN IF NOT EXISTS hidden_at TIMESTAMP WITH TIME ZONE;

ALTER TABLE public.daily_logs
  ADD COLUMN IF NOT EXISTS hidden_by UUID REFERENCES auth.users(id) ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS idx_daily_logs_hidden ON public.daily_logs(hidden_by_admin);
