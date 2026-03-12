-- Previous address structured fields for renter_profiles.
-- Run in Supabase SQL Editor or apply via Supabase CLI.

alter table renter_profiles
  add column if not exists previous_city text,
  add column if not exists previous_state text,
  add column if not exists previous_zip text;

comment on column renter_profiles.previous_city is 'Previous address city';
comment on column renter_profiles.previous_state is 'Previous address state';
comment on column renter_profiles.previous_zip is 'Previous address zip';
