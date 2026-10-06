-- 0005_content_catalog_and_users.sql
-- Merged: admin user management, dictionary, topics.
-- Admin user tables must be created first because content policies reference public.user_roles.

-- =================================================================================
-- Shared helper function
-- =================================================================================

create or replace function public.update_updated_at_column()
returns trigger as $$
begin
  new.updated_at = now();
  return new;
end;
$$ language plpgsql;

-- =================================================================================
-- Admin user management
-- =================================================================================

create table if not exists public.user_roles (
  id uuid primary key default uuid_generate_v4(),
  user_id uuid not null references public.users (id) on delete cascade,
  role text not null check (role in ('super', 'admin', 'moderator', 'viewer')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (user_id, role)
);

comment on table public.user_roles is 'Admin roles assigned to platform users.';

create table if not exists public.user_status (
  user_id uuid primary key references public.users (id) on delete cascade,
  disabled boolean not null default false,
  disabled_at timestamptz,
  disabled_by uuid references public.users (id) on delete set null,
  last_login_at timestamptz,
  updated_at timestamptz not null default now()
);

comment on table public.user_status is 'Additional status and activity metadata for users.';

create table if not exists public.user_devices (
  id uuid primary key default uuid_generate_v4(),
  user_id uuid not null references public.users (id) on delete cascade,
  device_name text,
  device_type text,
  last_ip text,
  last_active_at timestamptz not null default now(),
  created_at timestamptz not null default now()
);

comment on table public.user_devices is 'Devices used by a user to access the app.';

create or replace view public.user_content_stats as
select
  u.id as user_id,
  count(distinct n.id) filter (where n.deleted_at is null) as notes_count,
  count(distinct h.id) filter (where h.deleted_at is null) as highlights_count,
  count(distinct j.id) filter (where j.deleted_at is null) as journal_count,
  count(distinct p.id) filter (where p.deleted_at is null) as prayers_count
from public.users u
left join public.notes n on n.user_id = u.id
left join public.highlights h on h.user_id = u.id
left join public.journal_entries j on j.user_id = u.id
left join public.prayer_requests p on p.user_id = u.id
group by u.id;

create or replace view public.user_reading_stats as
select
  user_id,
  count(*) as completed_days,
  count(distinct plan_id) as active_plans
from public.reading_progress
group by user_id;

create index if not exists idx_user_roles_user on public.user_roles (user_id);
create index if not exists idx_user_devices_user on public.user_devices (user_id);

alter table public.user_roles enable row level security;
alter table public.user_status enable row level security;
alter table public.user_devices enable row level security;

drop policy if exists "Admins can manage user roles" on public.user_roles;
create policy "Admins can manage user roles" on public.user_roles for all to authenticated using (auth.uid() in (select user_id from public.user_roles where role in ('super', 'admin')));

drop policy if exists "Admins can manage user status" on public.user_status;
create policy "Admins can manage user status" on public.user_status for all to authenticated using (auth.uid() in (select user_id from public.user_roles where role in ('super', 'admin')));

drop policy if exists "Admins can manage user devices" on public.user_devices;
create policy "Admins can manage user devices" on public.user_devices for all to authenticated using (auth.uid() in (select user_id from public.user_roles where role in ('super', 'admin')));

drop trigger if exists trg_user_roles_updated_at on public.user_roles;
create trigger trg_user_roles_updated_at
  before update on public.user_roles
  for each row execute function public.update_updated_at_column();

drop trigger if exists trg_user_status_updated_at on public.user_status;
create trigger trg_user_status_updated_at
  before update on public.user_status
  for each row execute function public.update_updated_at_column();

-- =================================================================================
-- Dictionary
-- =================================================================================

create table if not exists public.dictionary_categories (
  id uuid primary key default uuid_generate_v4(),
  name text not null unique,
  slug text not null unique,
  description text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

comment on table public.dictionary_categories is 'Categories for dictionary entries (e.g. People, Places, Themes).';

create table if not exists public.dictionary_entries (
  id uuid primary key default uuid_generate_v4(),
  title text not null,
  slug text not null unique,
  content text not null default '',
  summary text,
  category_id uuid references public.dictionary_categories (id) on delete set null,
  pronunciation text,
  published boolean not null default false,
  published_at timestamptz,
  created_by uuid references public.users (id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  deleted_at timestamptz
);

comment on table public.dictionary_entries is 'Bible dictionary / encyclopedia entries.';

create table if not exists public.dictionary_entry_verses (
  id uuid primary key default uuid_generate_v4(),
  entry_id uuid not null references public.dictionary_entries (id) on delete cascade,
  book_id text not null,
  chapter smallint not null,
  verse smallint not null,
  created_at timestamptz not null default now()
);

comment on table public.dictionary_entry_verses is 'Bible verses referenced by a dictionary entry.';

create table if not exists public.dictionary_entry_images (
  id uuid primary key default uuid_generate_v4(),
  entry_id uuid not null references public.dictionary_entries (id) on delete cascade,
  url text not null,
  caption text,
  sort_order int not null default 0,
  created_at timestamptz not null default now()
);

comment on table public.dictionary_entry_images is 'Images attached to dictionary entries.';

alter table public.dictionary_entries drop column if exists search_vector;
alter table public.dictionary_entries add column search_vector tsvector
  generated always as (to_tsvector('english', coalesce(title, '') || ' ' || coalesce(content, '') || ' ' || coalesce(summary, ''))) stored;

create index if not exists idx_dictionary_entries_search on public.dictionary_entries using gin (search_vector);
create index if not exists idx_dictionary_entries_category on public.dictionary_entries (category_id);
create index if not exists idx_dictionary_entries_published on public.dictionary_entries (published);
create index if not exists idx_dictionary_entry_verses_entry on public.dictionary_entry_verses (entry_id);

alter table public.dictionary_categories enable row level security;
alter table public.dictionary_entries enable row level security;
alter table public.dictionary_entry_verses enable row level security;
alter table public.dictionary_entry_images enable row level security;

drop policy if exists "Dictionary categories are viewable by everyone" on public.dictionary_categories;
create policy "Dictionary categories are viewable by everyone" on public.dictionary_categories for select to authenticated, anon using (true);

drop policy if exists "Dictionary entries are viewable when published" on public.dictionary_entries;
create policy "Dictionary entries are viewable when published" on public.dictionary_entries for select to authenticated, anon using (published = true);

drop policy if exists "Admins can manage dictionary entries" on public.dictionary_entries;
create policy "Admins can manage dictionary entries" on public.dictionary_entries for all to authenticated using (auth.uid() in (select user_id from public.user_roles where role in ('admin', 'super')));

drop policy if exists "Dictionary entry verses are viewable by everyone" on public.dictionary_entry_verses;
create policy "Dictionary entry verses are viewable by everyone" on public.dictionary_entry_verses for select to authenticated, anon using (true);

drop policy if exists "Admins can manage dictionary entry verses" on public.dictionary_entry_verses;
create policy "Admins can manage dictionary entry verses" on public.dictionary_entry_verses for all to authenticated using (auth.uid() in (select user_id from public.user_roles where role in ('admin', 'super')));

drop policy if exists "Dictionary entry images are viewable by everyone" on public.dictionary_entry_images;
create policy "Dictionary entry images are viewable by everyone" on public.dictionary_entry_images for select to authenticated, anon using (true);

drop policy if exists "Admins can manage dictionary entry images" on public.dictionary_entry_images;
create policy "Admins can manage dictionary entry images" on public.dictionary_entry_images for all to authenticated using (auth.uid() in (select user_id from public.user_roles where role in ('admin', 'super')));

drop trigger if exists trg_dictionary_categories_updated_at on public.dictionary_categories;
create trigger trg_dictionary_categories_updated_at
  before update on public.dictionary_categories
  for each row execute function public.update_updated_at_column();

drop trigger if exists trg_dictionary_entries_updated_at on public.dictionary_entries;
create trigger trg_dictionary_entries_updated_at
  before update on public.dictionary_entries
  for each row execute function public.update_updated_at_column();

-- =================================================================================
-- Topics
-- =================================================================================

create table if not exists public.topic_categories (
  id uuid primary key default uuid_generate_v4(),
  name text not null unique,
  slug text not null unique,
  description text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

comment on table public.topic_categories is 'Categories for Bible study topics.';

create table if not exists public.topics (
  id uuid primary key default uuid_generate_v4(),
  title text not null,
  slug text not null unique,
  content text not null default '',
  summary text,
  category_id uuid references public.topic_categories (id) on delete set null,
  published boolean not null default false,
  published_at timestamptz,
  created_by uuid references public.users (id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  deleted_at timestamptz
);

comment on table public.topics is 'Bible study topics / articles.';

create table if not exists public.topic_verses (
  id uuid primary key default uuid_generate_v4(),
  topic_id uuid not null references public.topics (id) on delete cascade,
  book_id text not null,
  chapter smallint not null,
  verse smallint not null,
  created_at timestamptz not null default now()
);

comment on table public.topic_verses is 'Bible verses referenced by a topic.';

alter table public.topics drop column if exists search_vector;
alter table public.topics add column search_vector tsvector
  generated always as (to_tsvector('english', coalesce(title, '') || ' ' || coalesce(content, '') || ' ' || coalesce(summary, ''))) stored;

create index if not exists idx_topics_search on public.topics using gin (search_vector);
create index if not exists idx_topics_category on public.topics (category_id);
create index if not exists idx_topics_published on public.topics (published);
create index if not exists idx_topic_verses_topic on public.topic_verses (topic_id);

alter table public.topic_categories enable row level security;
alter table public.topics enable row level security;
alter table public.topic_verses enable row level security;

drop policy if exists "Topic categories are viewable by everyone" on public.topic_categories;
create policy "Topic categories are viewable by everyone" on public.topic_categories for select to authenticated, anon using (true);

drop policy if exists "Topics are viewable when published" on public.topics;
create policy "Topics are viewable when published" on public.topics for select to authenticated, anon using (published = true);

drop policy if exists "Admins can manage topics" on public.topics;
create policy "Admins can manage topics" on public.topics for all to authenticated using (auth.uid() in (select user_id from public.user_roles where role in ('admin', 'super')));

drop policy if exists "Topic verses are viewable by everyone" on public.topic_verses;
create policy "Topic verses are viewable by everyone" on public.topic_verses for select to authenticated, anon using (true);

drop policy if exists "Admins can manage topic verses" on public.topic_verses;
create policy "Admins can manage topic verses" on public.topic_verses for all to authenticated using (auth.uid() in (select user_id from public.user_roles where role in ('admin', 'super')));

drop trigger if exists trg_topic_categories_updated_at on public.topic_categories;
create trigger trg_topic_categories_updated_at
  before update on public.topic_categories
  for each row execute function public.update_updated_at_column();

drop trigger if exists trg_topics_updated_at on public.topics;
create trigger trg_topics_updated_at
  before update on public.topics
  for each row execute function public.update_updated_at_column();
