-- ============================================================
-- User settings table for weight goals
-- Run this in the Supabase SQL Editor
-- ============================================================

CREATE TABLE user_settings (
  user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE PRIMARY KEY,
  weight_goal_kg numeric(5,2),
  created_at timestamp with time zone DEFAULT now(),
  updated_at timestamp with time zone DEFAULT now()
);

ALTER TABLE user_settings ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can manage their own settings"
  ON user_settings FOR ALL
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);
