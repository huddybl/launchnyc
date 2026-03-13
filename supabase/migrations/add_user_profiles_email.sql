-- Add email to user_profiles for displaying in group members (synced from auth).
ALTER TABLE user_profiles
  ADD COLUMN IF NOT EXISTS email text;
