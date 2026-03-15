-- Cache for daily RentCast listings (one API call per day).
CREATE TABLE IF NOT EXISTS daily_listings (
  id uuid primary key default gen_random_uuid(),
  listing_id text unique,
  address text,
  street text,
  zip_code text,
  neighborhood text,
  price int,
  bedrooms int,
  bathrooms int,
  listed_date text,
  fetched_at timestamptz default now()
);

CREATE INDEX IF NOT EXISTS idx_daily_listings_fetched_at ON daily_listings (fetched_at);
