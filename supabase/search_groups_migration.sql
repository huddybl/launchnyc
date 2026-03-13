-- Run this in Supabase SQL Editor before using the shared search group feature.

create table if not exists search_groups (
  id uuid primary key default gen_random_uuid(),
  name text,
  invite_code text unique default substr(md5(random()::text), 1, 8),
  created_by uuid references auth.users(id),
  created_at timestamptz default now()
);

create table if not exists group_members (
  id uuid primary key default gen_random_uuid(),
  group_id uuid references search_groups(id) on delete cascade,
  user_id uuid references auth.users(id),
  joined_at timestamptz default now(),
  unique(group_id, user_id)
);

alter table apartments add column if not exists group_id uuid references search_groups(id);

-- Optional: RLS policies (enable if you use RLS)
-- alter table search_groups enable row level security;
-- alter table group_members enable row level security;
-- alter table apartments enable row level security;
-- (Add policies so members can read/write their group's data, etc.)
