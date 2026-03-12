-- Store uploaded PDF filenames per document type (display only; actual file storage can be added later).
-- Run in Supabase SQL Editor or apply via Supabase CLI.

alter table document_checklist
add column if not exists file_names jsonb default '{}';

comment on column document_checklist.file_names is 'Maps checklist key to uploaded filename, e.g. {"government_id": "passport.pdf"}';
