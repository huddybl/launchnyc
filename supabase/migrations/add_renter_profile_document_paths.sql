-- Document storage paths in renter_profiles (one path per document type).
-- Matches renter-documents bucket paths: {user_id}/{document_type}.pdf
-- Run in Supabase SQL Editor or apply via Supabase CLI.

alter table renter_profiles
  add column if not exists gov_id_path text,
  add column if not exists offer_letter_path text,
  add column if not exists pay_stubs_path text,
  add column if not exists bank_statements_path text,
  add column if not exists tax_return_path text,
  add column if not exists guarantor_docs_path text,
  add column if not exists credit_report_path text,
  add column if not exists reference_letter_path text;

comment on column renter_profiles.gov_id_path is 'Storage path: renter-documents/{user_id}/government_id.pdf';
comment on column renter_profiles.offer_letter_path is 'Storage path: renter-documents/{user_id}/offer_letter.pdf';
comment on column renter_profiles.pay_stubs_path is 'Storage path: renter-documents/{user_id}/pay_stubs.pdf';
comment on column renter_profiles.bank_statements_path is 'Storage path: renter-documents/{user_id}/bank_statements.pdf';
comment on column renter_profiles.tax_return_path is 'Storage path: renter-documents/{user_id}/tax_return.pdf';
comment on column renter_profiles.guarantor_docs_path is 'Storage path: renter-documents/{user_id}/guarantor_docs.pdf';
comment on column renter_profiles.credit_report_path is 'Storage path: renter-documents/{user_id}/credit_report.pdf';
comment on column renter_profiles.reference_letter_path is 'Storage path: renter-documents/{user_id}/reference_letter.pdf';
