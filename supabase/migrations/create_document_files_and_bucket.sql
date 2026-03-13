-- document_files: one row per uploaded file (user_id + document_type = checklist key).
-- Storage: Create a bucket named "documents" in Supabase Dashboard > Storage.
-- Path for each file: {user_id}/{document_type}/{filename}
-- Add Storage RLS policies so authenticated users can:
--   - INSERT/UPDATE: (storage.foldername(name))[1] = auth.uid()::text
--   - SELECT: same condition (to read their files)
--   - DELETE: same condition

create table if not exists document_files (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  document_type text not null,
  file_url text not null,
  filename text not null,
  created_at timestamptz default now(),
  unique(user_id, document_type)
);

comment on table document_files is 'Uploaded document files per checklist item; file stored in storage bucket "documents" at {user_id}/{document_type}/{filename}';
create index if not exists document_files_user_id_idx on document_files(user_id);

-- RLS
alter table document_files enable row level security;

create policy "Users can manage own document_files"
  on document_files for all
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);
