-- DAILY TOGETHER: full setup / upgrade script.
-- Run this in Supabase SQL Editor after the two Auth users exist.
-- Josh is admin; Lily is partner.

create table if not exists public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  username text not null unique check (username in ('Josh','Lily')),
  role text not null check (role in ('admin','partner'))
);

insert into public.profiles (id, username, role) values
('d2369f6d-3a21-43c6-8353-e4d38ca117ea', 'Josh', 'admin'),
('ee4c1494-3734-4253-a665-153f368761cd', 'Lily', 'partner')
on conflict (id) do update set username=excluded.username, role=excluded.role;

create table if not exists public.activity_completions (
  id bigint generated always as identity primary key,
  user_id uuid not null references auth.users(id) on delete cascade,
  activity_id text not null,
  completion_date date not null,
  photo_path text not null,
  completed_at timestamptz not null default now(),
  unique (user_id, activity_id, completion_date)
);
create index if not exists activity_completions_date_idx on public.activity_completions(completion_date);

-- Editable routine data. IDs for the original tasks are retained (s0-t0 etc.)
-- so previously saved completion records still match the same activities.
create table if not exists public.routine_sections (
  id text primary key,
  time text not null,
  title text not null,
  subtitle text not null default '',
  sort_order integer not null default 0,
  created_at timestamptz not null default now()
);
create table if not exists public.routine_tasks (
  id text primary key,
  section_id text not null references public.routine_sections(id) on delete cascade,
  title text not null,
  sort_order integer not null default 0,
  created_at timestamptz not null default now()
);

create table if not exists public.daily_routine_snapshots (
  completion_date date not null,
  activity_id text not null,
  section_id text not null,
  section_title text not null,
  section_time text not null,
  activity_title text not null,
  section_sort_order integer not null,
  task_sort_order integer not null,
  primary key (completion_date, activity_id)
);
create index if not exists daily_routine_snapshots_date_idx
  on public.daily_routine_snapshots(completion_date);


insert into public.routine_sections (id,time,title,subtitle,sort_order) values ('s0','7:00 am','Start the day','Wake up with Harper',0) on conflict (id) do nothing;

insert into public.routine_tasks (id,section_id,title,sort_order) values ('s0-t0','s0','Have a large glass of water.',0) on conflict (id) do nothing;

insert into public.routine_tasks (id,section_id,title,sort_order) values ('s0-t1','s0','Open the curtains and get some daylight.',1) on conflict (id) do nothing;

insert into public.routine_sections (id,time,title,subtitle,sort_order) values ('s1','7:30 am','Breakfast','Breakfast for you and Harper',1) on conflict (id) do nothing;

insert into public.routine_tasks (id,section_id,title,sort_order) values ('s1-t0','s1','Make breakfast for yourself and Harper.',0) on conflict (id) do nothing;

insert into public.routine_tasks (id,section_id,title,sort_order) values ('s1-t1','s1','Make and drink a cup of tea.',1) on conflict (id) do nothing;

insert into public.routine_sections (id,time,title,subtitle,sort_order) values ('s2','8:30 am','Get outside','Fresh air with Harper',2) on conflict (id) do nothing;

insert into public.routine_tasks (id,section_id,title,sort_order) values ('s2-t0','s2','Go for a 15–30-minute buggy walk if practical.',0) on conflict (id) do nothing;

insert into public.routine_tasks (id,section_id,title,sort_order) values ('s2-t1','s2','Get some natural daylight.',1) on conflict (id) do nothing;

insert into public.routine_tasks (id,section_id,title,sort_order) values ('s2-t2','s2','Don''t worry about hitting step targets.',2) on conflict (id) do nothing;

insert into public.routine_tasks (id,section_id,title,sort_order) values ('s2-t3','s2','Keep movement gentle and comfortable.',3) on conflict (id) do nothing;

insert into public.routine_sections (id,time,title,subtitle,sort_order) values ('s3','9:30 am','Harper''s morning activities','Playtime and normal activities',3) on conflict (id) do nothing;

insert into public.routine_tasks (id,section_id,title,sort_order) values ('s3-t0','s3','Play with Harper.',0) on conflict (id) do nothing;

insert into public.routine_tasks (id,section_id,title,sort_order) values ('s3-t1','s3','Read books together.',1) on conflict (id) do nothing;

insert into public.routine_tasks (id,section_id,title,sort_order) values ('s3-t2','s3','Let her explore age-appropriate toys.',2) on conflict (id) do nothing;

insert into public.routine_tasks (id,section_id,title,sort_order) values ('s3-t3','s3','Keep water nearby.',3) on conflict (id) do nothing;

insert into public.routine_tasks (id,section_id,title,sort_order) values ('s3-t4','s3','Take breaks when possible.',4) on conflict (id) do nothing;

insert into public.routine_sections (id,time,title,subtitle,sort_order) values ('s4','10:00 am','Morning snack','A little something to keep you going',4) on conflict (id) do nothing;

insert into public.routine_tasks (id,section_id,title,sort_order) values ('s4-t0','s4','Have Greek yoghurt.',0) on conflict (id) do nothing;

insert into public.routine_tasks (id,section_id,title,sort_order) values ('s4-t1','s4','Add banana or berries.',1) on conflict (id) do nothing;

insert into public.routine_tasks (id,section_id,title,sort_order) values ('s4-t2','s4','Add a few nuts if you enjoy them.',2) on conflict (id) do nothing;

insert into public.routine_sections (id,time,title,subtitle,sort_order) values ('s5','11:00 am','Playtime and activities','A flexible morning with Harper',5) on conflict (id) do nothing;

insert into public.routine_tasks (id,section_id,title,sort_order) values ('s5-t0','s5','Play with Harper or enjoy an activity together.',0) on conflict (id) do nothing;

insert into public.routine_tasks (id,section_id,title,sort_order) values ('s5-t1','s5','Read books or explore age-appropriate toys.',1) on conflict (id) do nothing;

insert into public.routine_tasks (id,section_id,title,sort_order) values ('s5-t2','s5','Go out for an errand or visit family if you fancy it.',2) on conflict (id) do nothing;

insert into public.routine_tasks (id,section_id,title,sort_order) values ('s5-t3','s5','Keep plans flexible depending on your energy.',3) on conflict (id) do nothing;

insert into public.routine_sections (id,time,title,subtitle,sort_order) values ('s6','12:00 pm','Lunch','Choose a meal from Josh''s acceptable meals list',6) on conflict (id) do nothing;

insert into public.routine_tasks (id,section_id,title,sort_order) values ('s6-t0','s6','Have a meal from the list of acceptable meals provided by Josh.',0) on conflict (id) do nothing;

insert into public.routine_tasks (id,section_id,title,sort_order) values ('s6-t1','s6','Have a glass of water.',1) on conflict (id) do nothing;

insert into public.routine_sections (id,time,title,subtitle,sort_order) values ('s7','1:00 pm','Harper''s nap','Protected rest time — this is not housework time',7) on conflict (id) do nothing;

insert into public.routine_tasks (id,section_id,title,sort_order) values ('s7-t0','s7','Have a proper sit-down.',0) on conflict (id) do nothing;

insert into public.routine_tasks (id,section_id,title,sort_order) values ('s7-t1','s7','Eat something if you''re hungry.',1) on conflict (id) do nothing;

insert into public.routine_tasks (id,section_id,title,sort_order) values ('s7-t2','s7','Read, watch television or relax.',2) on conflict (id) do nothing;

insert into public.routine_tasks (id,section_id,title,sort_order) values ('s7-t3','s7','If exhausted, have a short nap.',3) on conflict (id) do nothing;

insert into public.routine_tasks (id,section_id,title,sort_order) values ('s7-t4','s7','Leave the housework for later where possible.',4) on conflict (id) do nothing;

insert into public.routine_sections (id,time,title,subtitle,sort_order) values ('s8','2:30 pm','Afternoon snack','Keep yourself fuelled',8) on conflict (id) do nothing;

insert into public.routine_tasks (id,section_id,title,sort_order) values ('s8-t0','s8','Have wholemeal toast with peanut butter, or a banana, or Greek yoghurt.',0) on conflict (id) do nothing;

insert into public.routine_sections (id,time,title,subtitle,sort_order) values ('s9','3:30 pm','Afternoon play and quiet time','A gentle part of the afternoon with Harper',9) on conflict (id) do nothing;

insert into public.routine_tasks (id,section_id,title,sort_order) values ('s9-t0','s9','Spend some relaxed time playing with Harper.',0) on conflict (id) do nothing;

insert into public.routine_tasks (id,section_id,title,sort_order) values ('s9-t1','s9','Read a book or enjoy a quiet activity together.',1) on conflict (id) do nothing;

insert into public.routine_tasks (id,section_id,title,sort_order) values ('s9-t2','s9','Keep things easy and take a break whenever you need one.',2) on conflict (id) do nothing;

insert into public.routine_sections (id,time,title,subtitle,sort_order) values ('s10','4:30 pm','Time for yourself','Josh is home — enjoy some time to recharge',10) on conflict (id) do nothing;

insert into public.routine_tasks (id,section_id,title,sort_order) values ('s10-t0','s10','Have a shower, relax, or go for a walk alone.',0) on conflict (id) do nothing;

insert into public.routine_tasks (id,section_id,title,sort_order) values ('s10-t1','s10','Catch up with something you enjoy.',1) on conflict (id) do nothing;

insert into public.routine_tasks (id,section_id,title,sort_order) values ('s10-t2','s10','Or simply do nothing.',2) on conflict (id) do nothing;

insert into public.routine_tasks (id,section_id,title,sort_order) values ('s10-t3','s10','Josh takes over with Harper so you can have this time to yourself.',3) on conflict (id) do nothing;

insert into public.routine_sections (id,time,title,subtitle,sort_order) values ('s11','5:30 pm','Dinner','Enjoy a balanced evening meal',11) on conflict (id) do nothing;

insert into public.routine_tasks (id,section_id,title,sort_order) values ('s11-t0','s11','Have a balanced meal.',0) on conflict (id) do nothing;

insert into public.routine_tasks (id,section_id,title,sort_order) values ('s11-t1','s11','Have a glass of water.',1) on conflict (id) do nothing;

insert into public.routine_sections (id,time,title,subtitle,sort_order) values ('s12','6:30 pm','Family time','Enjoy time together as a family',12) on conflict (id) do nothing;

insert into public.routine_tasks (id,section_id,title,sort_order) values ('s12-t0','s12','Spend relaxed time together with Josh and Harper.',0) on conflict (id) do nothing;

insert into public.routine_tasks (id,section_id,title,sort_order) values ('s12-t1','s12','Play together, chat or enjoy a family activity.',1) on conflict (id) do nothing;

insert into public.routine_tasks (id,section_id,title,sort_order) values ('s12-t2','s12','Enjoy this time together — no household chores on the list.',2) on conflict (id) do nothing;

insert into public.routine_sections (id,time,title,subtitle,sort_order) values ('s13','7:30 pm','Lily''s rest time','Josh handles Harper''s bedtime',13) on conflict (id) do nothing;

insert into public.routine_tasks (id,section_id,title,sort_order) values ('s13-t0','s13','Put your feet up and relax while Josh handles Harper''s bedtime.',0) on conflict (id) do nothing;

insert into public.routine_tasks (id,section_id,title,sort_order) values ('s13-t1','s13','Watch something, read or enjoy some quiet time.',1) on conflict (id) do nothing;

insert into public.routine_tasks (id,section_id,title,sort_order) values ('s13-t2','s13','You don''t need to do any bedtime jobs.',2) on conflict (id) do nothing;

insert into public.routine_sections (id,time,title,subtitle,sort_order) values ('s14','8:00 pm','Lily & Josh time','An hour together',14) on conflict (id) do nothing;

insert into public.routine_tasks (id,section_id,title,sort_order) values ('s14-t0','s14','Spend some time talking together.',0) on conflict (id) do nothing;

insert into public.routine_tasks (id,section_id,title,sort_order) values ('s14-t1','s14','Watch a film or a favourite programme.',1) on conflict (id) do nothing;

insert into public.routine_tasks (id,section_id,title,sort_order) values ('s14-t2','s14','Enjoy some time together without worrying about jobs for tomorrow.',2) on conflict (id) do nothing;

insert into public.routine_sections (id,time,title,subtitle,sort_order) values ('s15','9:00 pm','Wind down','Start slowing things down for bed',15) on conflict (id) do nothing;

insert into public.routine_tasks (id,section_id,title,sort_order) values ('s15-t0','s15','Have a shower or bath if you like.',0) on conflict (id) do nothing;

insert into public.routine_tasks (id,section_id,title,sort_order) values ('s15-t1','s15','Put phones away if possible.',1) on conflict (id) do nothing;

insert into public.routine_tasks (id,section_id,title,sort_order) values ('s15-t2','s15','Avoid caffeine late in the evening.',2) on conflict (id) do nothing;

insert into public.routine_tasks (id,section_id,title,sort_order) values ('s15-t3','s15','Get everything ready to settle down for the night.',3) on conflict (id) do nothing;

insert into public.routine_sections (id,time,title,subtitle,sort_order) values ('s16','9:30 pm','Bed','Prioritise sleep and recovery',16) on conflict (id) do nothing;

insert into public.routine_tasks (id,section_id,title,sort_order) values ('s16-t0','s16','Be in bed and give yourself the chance to rest.',0) on conflict (id) do nothing;


alter table public.profiles enable row level security;
alter table public.activity_completions enable row level security;
alter table public.routine_sections enable row level security;
alter table public.routine_tasks enable row level security;
alter table public.daily_routine_snapshots enable row level security;

revoke all on public.profiles from anon, authenticated;
revoke all on public.activity_completions from anon, authenticated;
revoke all on public.routine_sections from anon, authenticated;
revoke all on public.routine_tasks from anon, authenticated;
revoke all on public.daily_routine_snapshots from anon, authenticated;

grant select on public.profiles to authenticated;
grant select, insert on public.activity_completions to authenticated;
grant usage, select on sequence public.activity_completions_id_seq to authenticated;
grant select, insert, update, delete on public.routine_sections to authenticated;
grant select, insert, update, delete on public.routine_tasks to authenticated;
grant select on public.daily_routine_snapshots to authenticated;

create or replace function public.is_daily_together_admin()
returns boolean language sql stable security definer set search_path = ''
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
using ((select public.is_daily_together_admin()) or user_id = (select auth.uid()));

drop policy if exists "Lily can insert own completions" on public.activity_completions;
create policy "Lily can insert own completions"
on public.activity_completions for insert to authenticated
with check (
  user_id = (select auth.uid())
  and exists (select 1 from public.profiles p where p.id=(select auth.uid()) and p.role='partner')
);

drop policy if exists "Authenticated users can read routine sections" on public.routine_sections;
create policy "Authenticated users can read routine sections"
on public.routine_sections for select to authenticated using (true);
drop policy if exists "Admins manage routine sections" on public.routine_sections;
create policy "Admins manage routine sections"
on public.routine_sections for all to authenticated
using ((select public.is_daily_together_admin()))
with check ((select public.is_daily_together_admin()));

drop policy if exists "Authenticated users can read routine tasks" on public.routine_tasks;
create policy "Authenticated users can read routine tasks"
on public.routine_tasks for select to authenticated using (true);
drop policy if exists "Admins manage routine tasks" on public.routine_tasks;
create policy "Admins manage routine tasks"
on public.routine_tasks for all to authenticated
using ((select public.is_daily_together_admin()))
with check ((select public.is_daily_together_admin()));

drop policy if exists "Authenticated users can read daily routine snapshots" on public.daily_routine_snapshots;
create policy "Authenticated users can read daily routine snapshots"
on public.daily_routine_snapshots for select to authenticated using (true);

-- Lily's app creates a once-per-day snapshot of the routine. This preserves the
-- exact activity names and time slots even if Josh edits/deletes them later.
create or replace function public.snapshot_daily_together_routine()
returns integer
language plpgsql
security definer
set search_path = ''
as $$
declare
  rows_added integer;
  today_local date := (now() at time zone 'Europe/London')::date;
begin
  if not exists (
    select 1 from public.profiles p
    where p.id = (select auth.uid()) and p.role = 'partner'
  ) then
    raise exception 'Only the partner account can create the daily routine snapshot';
  end if;

  insert into public.daily_routine_snapshots
    (completion_date, activity_id, section_id, section_title, section_time,
     activity_title, section_sort_order, task_sort_order)
  select today_local, t.id, s.id, s.title, s.time, t.title, s.sort_order, t.sort_order
  from public.routine_sections s
  join public.routine_tasks t on t.section_id=s.id
  order by s.sort_order, t.sort_order
  on conflict (completion_date, activity_id) do update
    set section_id=excluded.section_id,
        section_title=excluded.section_title,
        section_time=excluded.section_time,
        activity_title=excluded.activity_title,
        section_sort_order=excluded.section_sort_order,
        task_sort_order=excluded.task_sort_order
    where not exists (
      select 1 from public.activity_completions c
      where c.completion_date=excluded.completion_date
        and c.activity_id=excluded.activity_id
    );

  get diagnostics rows_added = row_count;
  return rows_added;
end;
$$;
revoke all on function public.snapshot_daily_together_routine() from public;
grant execute on function public.snapshot_daily_together_routine() to authenticated;

-- Backfill recent existing completions with today's routine names where possible.
insert into public.daily_routine_snapshots
  (completion_date, activity_id, section_id, section_title, section_time,
   activity_title, section_sort_order, task_sort_order)
select distinct c.completion_date, t.id, s.id, s.title, s.time, t.title, s.sort_order, t.sort_order
from public.activity_completions c
join public.routine_tasks t on t.id=c.activity_id
join public.routine_sections s on s.id=t.section_id
where c.completion_date >= ((now() at time zone 'Europe/London')::date - 6)
on conflict (completion_date, activity_id) do nothing;

-- Private photo bucket and policies.
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('daily-evidence','daily-evidence',false,12582912,array['image/jpeg','image/png','image/webp','image/heic'])
on conflict (id) do update set public=false, file_size_limit=12582912;

drop policy if exists "Lily can upload photos into her own folder" on storage.objects;
create policy "Lily can upload photos into her own folder"
on storage.objects for insert to authenticated
with check (
  bucket_id='daily-evidence'
  and (storage.foldername(name))[1]=(select auth.uid())::text
  and exists (select 1 from public.profiles p where p.id=(select auth.uid()) and p.role='partner')
);
drop policy if exists "Lily and Josh can view authorised evidence" on storage.objects;
create policy "Lily and Josh can view authorised evidence"
on storage.objects for select to authenticated
using (
  bucket_id='daily-evidence'
  and ((storage.foldername(name))[1]=(select auth.uid())::text or (select public.is_daily_together_admin()))
);

-- Realtime updates for new completions and routine edits.
do $$
begin
  if not exists (select 1 from pg_publication_tables where pubname='supabase_realtime' and schemaname='public' and tablename='activity_completions') then
    alter publication supabase_realtime add table public.activity_completions;
  end if;
  if not exists (select 1 from pg_publication_tables where pubname='supabase_realtime' and schemaname='public' and tablename='routine_sections') then
    alter publication supabase_realtime add table public.routine_sections;
  end if;
  if not exists (select 1 from pg_publication_tables where pubname='supabase_realtime' and schemaname='public' and tablename='routine_tasks') then
    alter publication supabase_realtime add table public.routine_tasks;
  end if;
end $$;
