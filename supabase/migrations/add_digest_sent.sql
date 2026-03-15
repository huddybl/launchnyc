-- Run in Supabase SQL editor (or via migration) to enable daily digest deduplication.
CREATE TABLE IF NOT EXISTS digest_sent (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references auth.users(id),
  listing_id text,
  sent_at timestamptz default now()
);

CREATE INDEX IF NOT EXISTS idx_digest_sent_user_listing ON digest_sent (user_id, listing_id);
