-- Renter profile and document checklist, one row per user.
-- Run in Supabase SQL Editor or apply via Supabase CLI.

create table renter_profiles (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references auth.users(id) unique,
  full_name text,
  date_of_birth date,
  email text,
  phone text,
  current_address text,
  time_at_address text,
  employer_name text,
  employer_address text,
  employer_phone text,
  job_title text,
  annual_salary text,
  start_date date,
  supervisor_name text,
  previous_address text,
  previous_landlord_name text,
  previous_landlord_phone text,
  guarantor_name text,
  guarantor_relationship text,
  guarantor_email text,
  guarantor_phone text,
  guarantor_income text,
  guarantor_address text,
  reference_name text,
  reference_phone text,
  emergency_name text,
  emergency_phone text,
  created_at timestamptz default now()
);

create table document_checklist (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references auth.users(id) unique,
  government_id boolean default false,
  offer_letter boolean default false,
  pay_stubs boolean default false,
  bank_statements boolean default false,
  tax_return boolean default false,
  guarantor_docs boolean default false,
  credit_report boolean default false,
  reference_letter boolean default false,
  created_at timestamptz default now()
);
