-- DAILY TOGETHER: run this entire script in Supabase SQL Editor.
-- Create Josh and Lily as Auth users FIRST (see README), then copy their UUIDs
-- from Authentication > Users into the two profile rows below.

create table if not exists public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  username text not null unique check (username in ('Josh','Lily')),
  role text not null check (role in ('admin','partner'))
);

create table if not exists public.activity_completions (
  id bigint generated always as identity primary key,
  user_id uuid not null references auth.users(id) on delete cascade,
  activity_id text not null,
  completion_date date not null,
  photo_path text not null,
  completed_at timestamptz not null default now(),
  unique (user_id, activity_id, completion_date)
);

create index if not exists activity_completions_date_idx
  on public.activity_completions(completion_date);

alter table public.profiles enable row level security;
alter table public.activity_completions enable row level security;

revoke all on public.profiles from anon, authenticated;
revoke all on public.activity_completions from anon, authenticated;
grant select on public.profiles to authenticated;
grant select, insert on public.activity_completions to authenticated;
grant usage, select on sequence public.activity_completions_id_seq to authenticated;

-- Security-definer helper avoids recursive profile-table RLS checks.
create or replace function public.is_daily_together_admin()
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1 from public.profiles p
    where p.id = (select auth.uid()) and p.role = 'admin'
  );
$$;

revoke all on function public.is_daily_together_admin() from public;
grant execute on function public.is_daily_together_admin() to authenticated;

drop policy if exists "Users can read own profile or admin can read all" on public.profiles;
create policy "Users can read own profile or admin can read all"
on public.profiles for select to authenticated
using (id = (select auth.uid()) or (select public.is_daily_together_admin()));

drop policy if exists "Josh can read all completions; Lily can read own" on public.activity_completions;
create policy "Josh can read all completions; Lily can read own"
on public.activity_completions for select to authenticated
using (
  (select public.is_daily_together_admin())
  or user_id = (select auth.uid())
);

drop policy if exists "Lily can insert own completions" on public.activity_completions;
create policy "Lily can insert own completions"
on public.activity_completions for insert to authenticated
with check (
  user_id = (select auth.uid())
  and exists (
    select 1 from public.profiles p
    where p.id = (select auth.uid()) and p.role = 'partner'
  )
);

-- Private photo bucket. A private bucket requires signed URLs to view photos.
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('daily-evidence', 'daily-evidence', false, 12582912, array['image/jpeg','image/png','image/webp','image/heic'])
on conflict (id) do update set public = false, file_size_limit = 12582912;

drop policy if exists "Lily can upload photos into her own folder" on storage.objects;
create policy "Lily can upload photos into her own folder"
on storage.objects for insert to authenticated
with check (
  bucket_id = 'daily-evidence'
  and (storage.foldername(name))[1] = (select auth.uid())::text
  and exists (
    select 1 from public.profiles p
    where p.id = (select auth.uid()) and p.role = 'partner'
  )
);

drop policy if exists "Lily and Josh can view authorised evidence" on storage.objects;
create policy "Lily and Josh can view authorised evidence"
on storage.objects for select to authenticated
using (
  bucket_id = 'daily-evidence'
  and (
    (storage.foldername(name))[1] = (select auth.uid())::text
    or (select public.is_daily_together_admin())
  )
);

-- Enable live Postgres change events for completion rows.
do $$
begin
  if not exists (
    select 1 from pg_publication_tables
    where pubname = 'supabase_realtime'
      and schemaname = 'public'
      and tablename = 'activity_completions'
  ) then
    alter publication supabase_realtime add table public.activity_completions;
  end if;
end $$;

-- Auth users supplied by the app owner:
-- Josh is the admin; Lily is the partner account.
insert into public.profiles (id, username, role) values
('d2369f6d-3a21-43c6-8353-e4d38ca117ea', 'Josh', 'admin'),
('ee4c1494-3734-4253-a665-153f368761cd', 'Lily', 'partner')
on conflict (id) do update
set username = excluded.username,
    role = excluded.role;
