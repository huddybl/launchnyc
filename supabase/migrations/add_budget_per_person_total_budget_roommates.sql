-- Add budget_per_person, total_budget, and roommates to user_profiles.
-- Run in Supabase SQL Editor or apply via Supabase CLI.

ALTER TABLE user_profiles
  ADD COLUMN IF NOT EXISTS budget_per_person int,
  ADD COLUMN IF NOT EXISTS total_budget int,
  ADD COLUMN IF NOT EXISTS roommates text[];

COMMENT ON COLUMN user_profiles.budget_per_person IS 'Budget per person per month (USD).';
COMMENT ON COLUMN user_profiles.total_budget IS 'Total apartment budget (budget_per_person * num_people).';
COMMENT ON COLUMN user_profiles.roommates IS 'Optional list of roommate first names.';
