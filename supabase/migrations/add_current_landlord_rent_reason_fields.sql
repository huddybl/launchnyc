-- Current landlord, monthly rent, and reason for leaving for renter_profiles.
-- Run in Supabase SQL Editor or apply via Supabase CLI.

alter table renter_profiles
  add column if not exists current_landlord_name text,
  add column if not exists current_monthly_rent text,
  add column if not exists reason_for_leaving text;

comment on column renter_profiles.current_landlord_name is 'Current landlord name';
comment on column renter_profiles.current_monthly_rent is 'Monthly rent at current address';
comment on column renter_profiles.reason_for_leaving is 'Reason for leaving current address';
