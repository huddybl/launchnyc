-- Structured current address fields for renter_profiles.
-- Run in Supabase SQL Editor or apply via Supabase CLI.

alter table renter_profiles
  add column if not exists street_address text,
  add column if not exists apt_suite text,
  add column if not exists city text,
  add column if not exists state text,
  add column if not exists zip_code text;

comment on column renter_profiles.street_address is 'Street address (current)';
comment on column renter_profiles.apt_suite is 'Apt/Suite (current)';
comment on column renter_profiles.city is 'City (current)';
comment on column renter_profiles.state is 'State (current)';
comment on column renter_profiles.zip_code is 'Zip code (current)';
