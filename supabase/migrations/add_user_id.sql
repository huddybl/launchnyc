-- Scope apartments to the logged-in user.
-- Run this in the Supabase SQL Editor (Dashboard → SQL Editor → New query)
-- or apply via Supabase CLI.

ALTER TABLE apartments
ADD COLUMN user_id uuid REFERENCES auth.users(id);

COMMENT ON COLUMN apartments.user_id IS 'Owner of this apartment row; from auth.users(id).';
