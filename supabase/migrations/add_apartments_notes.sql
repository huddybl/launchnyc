-- Add optional notes column to apartments table if not present.
ALTER TABLE apartments
  ADD COLUMN IF NOT EXISTS notes text;

COMMENT ON COLUMN apartments.notes IS 'Optional notes for the listing.';
