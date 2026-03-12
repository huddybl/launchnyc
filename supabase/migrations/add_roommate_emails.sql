-- Add roommate_emails to user_profiles (emails instead of names).
-- Run in Supabase SQL Editor or apply via Supabase CLI.

ALTER TABLE user_profiles
  ADD COLUMN IF NOT EXISTS roommate_emails text[];

COMMENT ON COLUMN user_profiles.roommate_emails IS 'Optional list of roommate email addresses.';
