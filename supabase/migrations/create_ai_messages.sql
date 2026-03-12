-- AI chat history per user.
-- Run in Supabase SQL Editor or apply via Supabase CLI.

create table ai_messages (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references auth.users(id) on delete cascade,
  role text not null check (role in ('user', 'assistant')),
  content text not null,
  created_at timestamptz default now()
);

create index ai_messages_user_id_created_at_idx on ai_messages (user_id, created_at desc);

comment on table ai_messages is 'AI advisor chat messages; fetch last 50 per user for history.';
