-- Onboarding preferences per user.
-- Run in Supabase SQL Editor or apply via Supabase CLI.

CREATE TABLE IF NOT EXISTS user_profiles (
  user_id uuid PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  budget_min int,
  budget_max int,
  move_in_date date,
  bedrooms int,
  num_people int,
  neighborhoods text[]
);

COMMENT ON TABLE user_profiles IS 'User onboarding and search preferences; one row per user.';
