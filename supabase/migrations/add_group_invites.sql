-- Email invites for existing users (group_invites). Link invite for non-users remains invite_code on search_groups.
create table if not exists group_invites (
  id uuid primary key default gen_random_uuid(),
  group_id uuid not null references search_groups(id) on delete cascade,
  invited_email text not null,
  invited_by uuid not null references auth.users(id) on delete cascade,
  inviter_email text,
  status text not null default 'pending' check (status in ('pending', 'accepted', 'declined')),
  created_at timestamptz default now()
);

create index if not exists group_invites_invited_email_status on group_invites(invited_email, status);
create index if not exists group_invites_group_id on group_invites(group_id);
alter table group_invites add column if not exists inviter_email text;
