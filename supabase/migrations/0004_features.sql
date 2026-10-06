-- 0004_features.sql
-- Additional feature modules: reading plans, prayer journal, audio notes,
-- attachments, daily verse, notifications, and realtime subscriptions.

-- Guard: this helper is normally created in 0001_foundation.sql, but we keep
-- the migration files independently runnable for easier troubleshooting.
create or replace function public.set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

--------------------------------------------------------------------------------
-- Reading plans (public templates or user-created) + per-user progress.
--------------------------------------------------------------------------------

create table if not exists public.reading_plans (
  id uuid primary key default uuid_generate_v4(),
  user_id uuid references public.users (id) on delete cascade, -- null = public/system plan
  name text not null,
  description text,
  duration_days smallint not null default 30,
  is_public boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  deleted_at timestamptz
);

create index if not exists idx_reading_plans_user_id on public.reading_plans (user_id) where deleted_at is null;
create index if not exists idx_reading_plans_public on public.reading_plans (is_public) where deleted_at is null;
create index if not exists idx_reading_plans_deleted_at on public.reading_plans (deleted_at);

create trigger set_updated_at before update on public.reading_plans
  for each row execute function public.set_updated_at();

alter table public.reading_plans enable row level security;
drop policy if exists "Users can view public plans or their own" on public.reading_plans;
create policy "Users can view public plans or their own" on public.reading_plans
  for select using (deleted_at is null and (is_public or auth.uid() = user_id));
drop policy if exists "Users manage their own plans" on public.reading_plans;
create policy "Users manage their own plans" on public.reading_plans
  for insert with check (auth.uid() = user_id);
drop policy if exists "Users update their own plans" on public.reading_plans;
create policy "Users update their own plans" on public.reading_plans
  for update using (auth.uid() = user_id) with check (auth.uid() = user_id);
drop policy if exists "Users delete their own plans" on public.reading_plans;
create policy "Users delete their own plans" on public.reading_plans
  for delete using (auth.uid() = user_id);

--------------------------------------------------------------------------------

create table if not exists public.reading_plan_days (
  id uuid primary key default uuid_generate_v4(),
  plan_id uuid not null references public.reading_plans (id) on delete cascade,
  day_number smallint not null,
  passages text[] not null default '{}',
  title text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  deleted_at timestamptz
);

create unique index if not exists uq_reading_plan_days_plan_day
  on public.reading_plan_days (plan_id, day_number) where deleted_at is null;
create index if not exists idx_reading_plan_days_plan_id on public.reading_plan_days (plan_id);
create index if not exists idx_reading_plan_days_deleted_at on public.reading_plan_days (deleted_at);

create trigger set_updated_at before update on public.reading_plan_days
  for each row execute function public.set_updated_at();

alter table public.reading_plan_days enable row level security;
drop policy if exists "Plan days follow parent plan visibility" on public.reading_plan_days;
create policy "Plan days follow parent plan visibility" on public.reading_plan_days
  for select using (
    deleted_at is null and exists (
      select 1 from public.reading_plans p
      where p.id = reading_plan_days.plan_id
        and (p.is_public or p.user_id = auth.uid())
        and p.deleted_at is null
    )
  );
drop policy if exists "Users manage days of their own plans" on public.reading_plan_days;
create policy "Users manage days of their own plans" on public.reading_plan_days
  for insert with check (
    exists (select 1 from public.reading_plans p where p.id = plan_id and p.user_id = auth.uid())
  );
drop policy if exists "Users update days of their own plans" on public.reading_plan_days;
create policy "Users update days of their own plans" on public.reading_plan_days
  for update using (
    exists (select 1 from public.reading_plans p where p.id = plan_id and p.user_id = auth.uid())
  );
drop policy if exists "Users delete days of their own plans" on public.reading_plan_days;
create policy "Users delete days of their own plans" on public.reading_plan_days
  for delete using (
    exists (select 1 from public.reading_plans p where p.id = plan_id and p.user_id = auth.uid())
  );

--------------------------------------------------------------------------------

create table if not exists public.reading_progress (
  id uuid primary key default uuid_generate_v4(),
  user_id uuid not null references public.users (id) on delete cascade,
  plan_id uuid not null references public.reading_plans (id) on delete cascade,
  day_number smallint not null,
  completed_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  deleted_at timestamptz
);

create unique index if not exists uq_reading_progress_user_plan_day
  on public.reading_progress (user_id, plan_id, day_number) where deleted_at is null;
create index if not exists idx_reading_progress_user_id on public.reading_progress (user_id) where deleted_at is null;
create index if not exists idx_reading_progress_plan_id on public.reading_progress (plan_id);
create index if not exists idx_reading_progress_deleted_at on public.reading_progress (deleted_at);

create trigger set_updated_at before update on public.reading_progress
  for each row execute function public.set_updated_at();

alter table public.reading_progress enable row level security;
drop policy if exists "Users manage their own reading progress" on public.reading_progress;
create policy "Users manage their own reading progress" on public.reading_progress
  for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

--------------------------------------------------------------------------------
-- Prayer journal + free-form journal entries.
--------------------------------------------------------------------------------

create table if not exists public.prayer_requests (
  id uuid primary key default uuid_generate_v4(),
  user_id uuid not null references public.users (id) on delete cascade,
  collection_id uuid references public.collections (id) on delete set null,
  title text not null default 'New Prayer',
  content text not null default '',
  scripture text,
  category text not null default 'request'
    check (category in ('praise', 'request', 'intercession', 'gratitude', 'other')),
  status text not null default 'pending' check (status in ('pending', 'answered', 'archived')),
  priority text not null default 'medium' check (priority in ('low', 'medium', 'high')),
  reminder timestamptz,
  images text[] default '{}',
  voice_note text,
  history jsonb default '[]',
  theme_ids uuid[] default '{}',
  answered boolean not null default false,
  answered_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  deleted_at timestamptz
);

create index if not exists idx_prayer_requests_user_id on public.prayer_requests (user_id) where deleted_at is null;
create index if not exists idx_prayer_requests_category on public.prayer_requests (category);
create index if not exists idx_prayer_requests_answered on public.prayer_requests (answered);
create index if not exists idx_prayer_requests_deleted_at on public.prayer_requests (deleted_at);

create trigger set_updated_at before update on public.prayer_requests
  for each row execute function public.set_updated_at();

alter table public.prayer_requests enable row level security;
drop policy if exists "Users manage their own prayer requests" on public.prayer_requests;
create policy "Users manage their own prayer requests" on public.prayer_requests
  for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

--------------------------------------------------------------------------------

create table if not exists public.journal_entries (
  id uuid primary key default uuid_generate_v4(),
  user_id uuid not null references public.users (id) on delete cascade,
  collection_id uuid references public.collections (id) on delete set null,
  title text not null default 'Journal Entry',
  content text not null default '',
  scripture text,
  reflection text,
  application text,
  prayer text,
  mood text,
  tags text[] default '{}',
  images text[] default '{}',
  voice_note text,
  is_private boolean not null default false,
  theme_ids uuid[] default '{}',
  entry_date date not null default current_date,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  deleted_at timestamptz
);

create index if not exists idx_journal_entries_user_id on public.journal_entries (user_id) where deleted_at is null;
create index if not exists idx_journal_entries_entry_date on public.journal_entries (entry_date);
create index if not exists idx_journal_entries_deleted_at on public.journal_entries (deleted_at);

create trigger set_updated_at before update on public.journal_entries
  for each row execute function public.set_updated_at();

alter table public.journal_entries enable row level security;
drop policy if exists "Users manage their own journal entries" on public.journal_entries;
create policy "Users manage their own journal entries" on public.journal_entries
  for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

--------------------------------------------------------------------------------
-- Audio notes and generic file attachments, polymorphically owned by other
-- content tables (notes, sermons, journal_entries, prayer_requests).
--------------------------------------------------------------------------------

create table if not exists public.audio_notes (
  id uuid primary key default uuid_generate_v4(),
  user_id uuid not null references public.users (id) on delete cascade,
  note_id uuid references public.notes (id) on delete cascade,
  sermon_id uuid references public.sermons (id) on delete cascade,
  storage_path text not null,
  duration_seconds integer,
  transcript text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  deleted_at timestamptz,
  constraint audio_notes_single_owner check (
    (note_id is not null)::int + (sermon_id is not null)::int <= 1
  )
);

create index if not exists idx_audio_notes_user_id on public.audio_notes (user_id) where deleted_at is null;
create index if not exists idx_audio_notes_note_id on public.audio_notes (note_id);
create index if not exists idx_audio_notes_sermon_id on public.audio_notes (sermon_id);
create index if not exists idx_audio_notes_deleted_at on public.audio_notes (deleted_at);

create trigger set_updated_at before update on public.audio_notes
  for each row execute function public.set_updated_at();

alter table public.audio_notes enable row level security;
drop policy if exists "Users manage their own audio notes" on public.audio_notes;
create policy "Users manage their own audio notes" on public.audio_notes
  for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

--------------------------------------------------------------------------------

create table if not exists public.attachments (
  id uuid primary key default uuid_generate_v4(),
  user_id uuid not null references public.users (id) on delete cascade,
  owner_type text not null
    check (owner_type in ('note', 'sermon', 'journal_entry', 'prayer_request')),
  owner_id uuid not null,
  file_name text not null,
  storage_path text not null,
  mime_type text,
  size_bytes bigint,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  deleted_at timestamptz
);

create index if not exists idx_attachments_user_id on public.attachments (user_id) where deleted_at is null;
create index if not exists idx_attachments_owner on public.attachments (owner_type, owner_id);
create index if not exists idx_attachments_deleted_at on public.attachments (deleted_at);

create trigger set_updated_at before update on public.attachments
  for each row execute function public.set_updated_at();

alter table public.attachments enable row level security;
drop policy if exists "Users manage their own attachments" on public.attachments;
create policy "Users manage their own attachments" on public.attachments
  for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

--------------------------------------------------------------------------------
-- Daily verse and in-app notifications.
--------------------------------------------------------------------------------

create table if not exists public.daily_verses (
  id uuid primary key default uuid_generate_v4(),
  verse_id uuid not null references public.bible_verses (id) on delete cascade,
  verse_date date not null default current_date,
  theme text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  deleted_at timestamptz
);

create unique index if not exists uq_daily_verses_date on public.daily_verses (verse_date) where deleted_at is null;
create index if not exists idx_daily_verses_verse_id on public.daily_verses (verse_id);
create index if not exists idx_daily_verses_deleted_at on public.daily_verses (deleted_at);

create trigger set_updated_at before update on public.daily_verses
  for each row execute function public.set_updated_at();

alter table public.daily_verses enable row level security;
drop policy if exists "Daily verses are publicly readable" on public.daily_verses;
create policy "Daily verses are publicly readable" on public.daily_verses
  for select using (deleted_at is null);

--------------------------------------------------------------------------------

create table if not exists public.notifications (
  id uuid primary key default uuid_generate_v4(),
  user_id uuid not null references public.users (id) on delete cascade,
  type text not null
    check (type in ('reminder', 'sync', 'prayer', 'reading_plan', 'system')),
  title text not null,
  body text,
  data jsonb not null default '{}'::jsonb,
  read_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  deleted_at timestamptz
);

create index if not exists idx_notifications_user_id on public.notifications (user_id) where deleted_at is null;
create index if not exists idx_notifications_unread on public.notifications (user_id, read_at) where deleted_at is null;
create index if not exists idx_notifications_deleted_at on public.notifications (deleted_at);

create trigger set_updated_at before update on public.notifications
  for each row execute function public.set_updated_at();

alter table public.notifications enable row level security;
drop policy if exists "Users manage their own notifications" on public.notifications;
create policy "Users manage their own notifications" on public.notifications
  for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

--------------------------------------------------------------------------------
-- Enable Supabase Realtime change feeds for user content tables so the
-- client can subscribe to cross-device updates.
--------------------------------------------------------------------------------

alter publication supabase_realtime add table
  public.notes,
  public.highlights,
  public.bookmarks,
  public.sermons,
  public.prayer_requests,
  public.journal_entries,
  public.reading_progress,
  public.notifications,
  public.settings,
  public.notebooks,
  public.collections,
  public.tags;
