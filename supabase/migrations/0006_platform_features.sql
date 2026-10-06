-- 0006_platform_features.sql
-- Merged: community, notifications, media, analytics.

-- =================================================================================
-- Community
-- =================================================================================

alter table public.notes add column if not exists is_public boolean not null default false;
alter table public.notes add column if not exists moderation_status text not null default 'pending' check (moderation_status in ('pending', 'approved', 'rejected'));
alter table public.notes add column if not exists approved_at timestamptz;
alter table public.notes add column if not exists approved_by uuid references public.users (id) on delete set null;

comment on column public.notes.is_public is 'Whether the note is shared publicly.';
comment on column public.notes.moderation_status is 'Moderation status of a public note.';

create table if not exists public.shared_collections (
  id uuid primary key default uuid_generate_v4(),
  user_id uuid not null references public.users (id) on delete cascade,
  name text not null,
  description text,
  is_public boolean not null default false,
  moderation_status text not null default 'pending' check (moderation_status in ('pending', 'approved', 'rejected')),
  approved_at timestamptz,
  approved_by uuid references public.users (id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

comment on table public.shared_collections is 'User-created public collections of notes/highlights.';

create table if not exists public.comments (
  id uuid primary key default uuid_generate_v4(),
  user_id uuid not null references public.users (id) on delete cascade,
  target_type text not null check (target_type in ('note', 'collection')),
  target_id uuid not null,
  content text not null,
  moderation_status text not null default 'pending' check (moderation_status in ('pending', 'approved', 'rejected')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  deleted_at timestamptz
);

comment on table public.comments is 'Comments on public notes and shared collections.';

create table if not exists public.reports (
  id uuid primary key default uuid_generate_v4(),
  reporter_id uuid references public.users (id) on delete set null,
  target_type text not null check (target_type in ('note', 'comment', 'collection', 'user')),
  target_id uuid not null,
  reason text not null,
  details text,
  status text not null default 'open' check (status in ('open', 'resolved', 'dismissed')),
  resolved_by uuid references public.users (id) on delete set null,
  resolved_at timestamptz,
  created_at timestamptz not null default now()
);

comment on table public.reports is 'User-generated reports for moderation.';

create index if not exists idx_notes_public on public.notes (is_public, moderation_status);
create index if not exists idx_shared_collections_status on public.shared_collections (moderation_status);
create index if not exists idx_comments_target on public.comments (target_type, target_id);
create index if not exists idx_reports_status on public.reports (status);

alter table public.shared_collections enable row level security;
alter table public.comments enable row level security;
alter table public.reports enable row level security;

drop policy if exists "Public collections are viewable when approved" on public.shared_collections;
create policy "Public collections are viewable when approved" on public.shared_collections for select to authenticated, anon using (is_public = true and moderation_status = 'approved');

drop policy if exists "Admins can manage shared collections" on public.shared_collections;
create policy "Admins can manage shared collections" on public.shared_collections for all to authenticated using (auth.uid() in (select user_id from public.user_roles where role in ('super', 'admin', 'moderator')));

drop policy if exists "Approved comments are viewable" on public.comments;
create policy "Approved comments are viewable" on public.comments for select to authenticated, anon using (moderation_status = 'approved');

drop policy if exists "Admins can manage comments" on public.comments;
create policy "Admins can manage comments" on public.comments for all to authenticated using (auth.uid() in (select user_id from public.user_roles where role in ('super', 'admin', 'moderator')));

drop policy if exists "Admins can manage reports" on public.reports;
create policy "Admins can manage reports" on public.reports for all to authenticated using (auth.uid() in (select user_id from public.user_roles where role in ('super', 'admin', 'moderator')));

drop trigger if exists trg_shared_collections_updated_at on public.shared_collections;
create trigger trg_shared_collections_updated_at
  before update on public.shared_collections
  for each row execute function public.update_updated_at_column();

drop trigger if exists trg_comments_updated_at on public.comments;
create trigger trg_comments_updated_at
  before update on public.comments
  for each row execute function public.update_updated_at_column();

-- =================================================================================
-- Notifications
-- =================================================================================

create table if not exists public.notification_templates (
  id uuid primary key default uuid_generate_v4(),
  name text not null unique,
  type text not null check (type in ('push', 'email', 'in_app')),
  subject text,
  body text not null,
  data jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

comment on table public.notification_templates is 'Reusable notification templates.';

create table if not exists public.announcements (
  id uuid primary key default uuid_generate_v4(),
  title text not null,
  content text not null,
  audience text not null default 'all' check (audience in ('all', 'users', 'admins')),
  published boolean not null default false,
  published_at timestamptz,
  created_by uuid references public.users (id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

comment on table public.announcements is 'In-app announcements sent to users.';

create table if not exists public.notification_schedules (
  id uuid primary key default uuid_generate_v4(),
  template_id uuid references public.notification_templates (id) on delete set null,
  type text not null check (type in ('push', 'email', 'in_app')),
  audience text not null default 'all' check (audience in ('all', 'users', 'admins')),
  scheduled_at timestamptz not null,
  sent boolean not null default false,
  sent_at timestamptz,
  created_by uuid references public.users (id) on delete set null,
  created_at timestamptz not null default now()
);

comment on table public.notification_schedules is 'Scheduled notifications to be delivered in the future.';

create table if not exists public.notification_history (
  id uuid primary key default uuid_generate_v4(),
  user_id uuid references public.users (id) on delete set null,
  type text not null check (type in ('push', 'email', 'in_app')),
  title text not null,
  body text not null,
  status text not null default 'pending' check (status in ('pending', 'sent', 'delivered', 'failed')),
  data jsonb,
  sent_at timestamptz,
  created_at timestamptz not null default now()
);

comment on table public.notification_history is 'Log of all notifications sent to users.';

create index if not exists idx_notification_schedules_pending on public.notification_schedules (sent, scheduled_at);
create index if not exists idx_notification_history_user on public.notification_history (user_id, created_at);
create index if not exists idx_announcements_published on public.announcements (published);

alter table public.notification_templates enable row level security;
alter table public.announcements enable row level security;
alter table public.notification_schedules enable row level security;
alter table public.notification_history enable row level security;

drop policy if exists "Admins can manage notification templates" on public.notification_templates;
create policy "Admins can manage notification templates" on public.notification_templates for all to authenticated using (auth.uid() in (select user_id from public.user_roles where role in ('super', 'admin')));

drop policy if exists "Announcements are viewable when published" on public.announcements;
create policy "Announcements are viewable when published" on public.announcements for select to authenticated, anon using (published = true);

drop policy if exists "Admins can manage announcements" on public.announcements;
create policy "Admins can manage announcements" on public.announcements for all to authenticated using (auth.uid() in (select user_id from public.user_roles where role in ('super', 'admin')));

drop policy if exists "Admins can manage notification schedules" on public.notification_schedules;
create policy "Admins can manage notification schedules" on public.notification_schedules for all to authenticated using (auth.uid() in (select user_id from public.user_roles where role in ('super', 'admin')));

drop policy if exists "Admins can view notification history" on public.notification_history;
create policy "Admins can view notification history" on public.notification_history for select to authenticated using (auth.uid() in (select user_id from public.user_roles where role in ('super', 'admin')));

drop trigger if exists trg_notification_templates_updated_at on public.notification_templates;
create trigger trg_notification_templates_updated_at
  before update on public.notification_templates
  for each row execute function public.update_updated_at_column();

drop trigger if exists trg_announcements_updated_at on public.announcements;
create trigger trg_announcements_updated_at
  before update on public.announcements
  for each row execute function public.update_updated_at_column();

-- =================================================================================
-- Media
-- =================================================================================

create table if not exists public.media_folders (
  id uuid primary key default uuid_generate_v4(),
  name text not null,
  parent_id uuid references public.media_folders (id) on delete cascade,
  created_by uuid references public.users (id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

comment on table public.media_folders is 'Folders for organizing media files.';

create table if not exists public.media_files (
  id uuid primary key default uuid_generate_v4(),
  name text not null,
  type text not null check (type in ('image', 'pdf', 'audio', 'document', 'video', 'other')),
  size_bytes bigint not null default 0,
  url text not null,
  storage_path text not null,
  folder_id uuid references public.media_folders (id) on delete set null,
  created_by uuid references public.users (id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

comment on table public.media_files is 'Metadata for uploaded media files backed by Supabase Storage.';

create or replace view public.media_storage_summary as
select
  count(*) as file_count,
  coalesce(sum(size_bytes), 0) as total_bytes,
  count(*) filter (where type = 'image') as image_count,
  count(*) filter (where type = 'pdf') as pdf_count,
  count(*) filter (where type = 'audio') as audio_count,
  count(*) filter (where type = 'document') as document_count,
  count(*) filter (where type = 'video') as video_count
from public.media_files;

create index if not exists idx_media_files_folder on public.media_files (folder_id);
create index if not exists idx_media_files_type on public.media_files (type);
create index if not exists idx_media_files_name on public.media_files using gin (name gin_trgm_ops);

alter table public.media_folders enable row level security;
alter table public.media_files enable row level security;

drop policy if exists "Media folders are viewable by admins" on public.media_folders;
create policy "Media folders are viewable by admins" on public.media_folders for select to authenticated using (auth.uid() in (select user_id from public.user_roles where role in ('super', 'admin', 'moderator')));

drop policy if exists "Admins can manage media folders" on public.media_folders;
create policy "Admins can manage media folders" on public.media_folders for all to authenticated using (auth.uid() in (select user_id from public.user_roles where role in ('super', 'admin')));

drop policy if exists "Media files are viewable by admins" on public.media_files;
create policy "Media files are viewable by admins" on public.media_files for select to authenticated using (auth.uid() in (select user_id from public.user_roles where role in ('super', 'admin', 'moderator')));

drop policy if exists "Admins can manage media files" on public.media_files;
create policy "Admins can manage media files" on public.media_files for all to authenticated using (auth.uid() in (select user_id from public.user_roles where role in ('super', 'admin')));

drop trigger if exists trg_media_folders_updated_at on public.media_folders;
create trigger trg_media_folders_updated_at
  before update on public.media_folders
  for each row execute function public.update_updated_at_column();

drop trigger if exists trg_media_files_updated_at on public.media_files;
create trigger trg_media_files_updated_at
  before update on public.media_files
  for each row execute function public.update_updated_at_column();

-- =================================================================================
-- Analytics
-- =================================================================================

create table if not exists public.analytics_events (
  id uuid primary key default uuid_generate_v4(),
  user_id uuid references public.users (id) on delete set null,
  event_type text not null,
  properties jsonb,
  country text,
  device_type text,
  created_at timestamptz not null default now()
);

comment on table public.analytics_events is 'Tracked user activity events for analytics.';

create or replace view public.dau_mau as
select
  date_trunc('day', created_at)::date as day,
  count(distinct user_id) as dau,
  count(distinct user_id) filter (where created_at >= date_trunc('month', created_at)) as mau
from public.analytics_events
where event_type = 'session_start'
group by 1
order by 1 desc;

create or replace view public.retention_cohorts as
with cohorts as (
  select
    user_id,
    min(date_trunc('day', created_at))::date as cohort_day
  from public.analytics_events
  where event_type = 'session_start'
  group by user_id
)
select
  c.cohort_day,
  count(distinct c.user_id) as cohort_size,
  count(distinct e.user_id) filter (where e.created_at >= c.cohort_day + interval '1 day' and e.created_at < c.cohort_day + interval '2 day') as d1_return,
  count(distinct e.user_id) filter (where e.created_at >= c.cohort_day + interval '7 day' and e.created_at < c.cohort_day + interval '8 day') as d7_return,
  count(distinct e.user_id) filter (where e.created_at >= c.cohort_day + interval '30 day' and e.created_at < c.cohort_day + interval '31 day') as d30_return
from cohorts c
left join public.analytics_events e on e.user_id = c.user_id
  and e.created_at >= c.cohort_day + interval '1 day'
  and e.created_at < c.cohort_day + interval '31 day'
  and e.event_type = 'session_start'
group by c.cohort_day
order by c.cohort_day desc;

create or replace view public.device_breakdown as
select
  device_type,
  count(*) as events,
  count(distinct user_id) as users
from public.analytics_events
where event_type = 'session_start'
group by device_type;

create or replace view public.country_breakdown as
select
  country,
  count(distinct user_id) as users,
  count(*) as events
from public.analytics_events
where event_type = 'session_start' and country is not null
group by country
order by users desc;

create or replace view public.popular_books as
select
  properties->>'book_id' as book_id,
  count(*) as reads,
  count(distinct user_id) as readers
from public.analytics_events
where event_type = 'chapter_read' and properties->>'book_id' is not null
group by properties->>'book_id'
order by reads desc;

create or replace view public.popular_chapters as
select
  properties->>'book_id' as book_id,
  coalesce((properties->>'chapter')::int, 0) as chapter_number,
  count(*) as reads,
  count(distinct user_id) as readers
from public.analytics_events
where event_type = 'chapter_read'
group by properties->>'book_id', coalesce((properties->>'chapter')::int, 0)
order by reads desc;

create or replace view public.popular_verses as
select
  properties->>'reference' as reference,
  count(*) as views,
  count(distinct user_id) as viewers
from public.analytics_events
where event_type = 'verse_view'
group by properties->>'reference'
order by views desc;

create or replace view public.search_analytics as
select
  properties->>'query' as query,
  count(*) as searches,
  count(distinct user_id) as searchers
from public.analytics_events
where event_type = 'search'
  and properties->>'query' is not null
group by properties->>'query'
order by searches desc;

create or replace view public.reading_time as
select
  user_id,
  date_trunc('day', created_at)::date as day,
  coalesce(sum((properties->>'seconds')::int), 0) as seconds
from public.analytics_events
where event_type = 'reading_time'
group by user_id, date_trunc('day', created_at)::date
order by day desc;

create or replace view public.reading_time_daily as
select
  date_trunc('day', day)::date as day,
  sum(seconds) as seconds
from public.reading_time
group by date_trunc('day', day)::date
order by day desc;

create index if not exists idx_analytics_events_user on public.analytics_events (user_id, created_at);
create index if not exists idx_analytics_events_type on public.analytics_events (event_type, created_at);

alter table public.analytics_events enable row level security;

drop policy if exists "Admins can view analytics events" on public.analytics_events;
create policy "Admins can view analytics events" on public.analytics_events for select to authenticated using (auth.uid() in (select user_id from public.user_roles where role in ('super', 'admin')));
