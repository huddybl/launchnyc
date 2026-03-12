-- Add optional listing_url column to apartments table.
-- Run this in the Supabase SQL Editor (Dashboard → SQL Editor → New query).

ALTER TABLE apartments
ADD COLUMN IF NOT EXISTS listing_url text;

COMMENT ON COLUMN apartments.listing_url IS 'Optional URL to the original listing (StreetEasy, Zillow, etc.)';
