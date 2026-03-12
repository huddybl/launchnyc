-- Employer and Guarantor structured address fields for renter_profiles.
-- Run in Supabase SQL Editor or apply via Supabase CLI.

alter table renter_profiles
  add column if not exists employer_city text,
  add column if not exists employer_state text,
  add column if not exists employer_zip text,
  add column if not exists guarantor_city text,
  add column if not exists guarantor_state text,
  add column if not exists guarantor_zip text;

comment on column renter_profiles.employer_city is 'Employer address city';
comment on column renter_profiles.employer_state is 'Employer address state';
comment on column renter_profiles.employer_zip is 'Employer address zip';
comment on column renter_profiles.guarantor_city is 'Guarantor address city';
comment on column renter_profiles.guarantor_state is 'Guarantor address state';
comment on column renter_profiles.guarantor_zip is 'Guarantor address zip';
