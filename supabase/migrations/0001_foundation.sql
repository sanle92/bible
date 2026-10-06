-- 0001_foundation.sql
-- Foundation schema: extensions, shared helpers, auth mirror, profiles,
-- per-user settings, sync audit log, and storage buckets/policies.

--------------------------------------------------------------------------------
-- Extensions and shared helper functions used by every migration.
--------------------------------------------------------------------------------

create extension if not exists "uuid-ossp";
create extension if not exists "pgcrypto";

-- Generic trigger function: keeps `updated_at` current on every UPDATE.
create or replace function public.set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

-- Soft delete convention used across this schema:
--   Every table has a nullable `deleted_at timestamptz` column.
--   Application code (and RLS policies below) NEVER issue a hard DELETE for
--   user content; instead they run `update <table> set deleted_at = now()`.
--   Active-row queries and unique indexes are scoped with
--   `where deleted_at is null` so soft-deleted rows are excluded and their
--   unique keys (e.g. a tag name) become available for reuse.

-- Convenience helper to soft-delete a row by id (bypasses RLS if run with
-- elevated privileges, e.g. from a scheduled cleanup job).
create or replace function public.soft_delete_row(target_table text, target_id uuid)
returns void
language plpgsql
security invoker
as $$
begin
  execute format('update public.%I set deleted_at = now() where id = $1', target_table)
    using target_id;
end;
$$;

--------------------------------------------------------------------------------
-- `users` mirrors auth.users so the rest of the schema can foreign-key into
-- `public` without depending on the `auth` schema directly.
-- `profiles` holds user-editable profile/display data.
--------------------------------------------------------------------------------

create table if not exists public.users (
  id uuid primary key references auth.users (id) on delete cascade,
  email text,
  phone text,
  provider text not null default 'email',
  last_sign_in_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  deleted_at timestamptz
);

create index if not exists idx_users_email on public.users (email) where deleted_at is null;
create index if not exists idx_users_deleted_at on public.users (deleted_at);

create trigger set_updated_at before update on public.users
  for each row execute function public.set_updated_at();

-- Keep public.users in sync with auth.users automatically.
-- The all-policies below allow this trigger to INSERT (with check = true)
-- while SELECT/UPDATE/DELETE are still restricted to the owning user.
create or replace function public.handle_new_auth_user()
returns trigger
language plpgsql
security definer
set search_path to public
as $$
declare
  v_email text;
  v_provider text;
  v_display_name text;
begin
  v_email := new.email;
  v_provider := coalesce(nullif(new.raw_app_meta_data->>'provider', ''), 'email');
  v_display_name := coalesce(
    nullif(new.raw_user_meta_data->>'full_name', ''),
    nullif(new.raw_user_meta_data->>'name', ''),
    nullif(split_part(v_email, '@', 1), ''),
    'User'
  );

  insert into public.users (id, email, provider, created_at, updated_at)
  values (new.id, v_email, v_provider, now(), now())
  on conflict (id) do nothing;

  if not exists (select 1 from public.profiles where user_id = new.id and deleted_at is null) then
    insert into public.profiles (user_id, display_name)
    values (new.id, v_display_name);
  end if;

  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_auth_user();

alter table public.users enable row level security;

-- Single policy: owner can read/update/delete; inserts (e.g. from the trigger) are allowed.
drop policy if exists "Users manage their own row" on public.users;
create policy "Users manage their own row" on public.users
  for all using (auth.uid() = id and deleted_at is null) with check (true);

--------------------------------------------------------------------------------

create table if not exists public.profiles (
  id uuid primary key default uuid_generate_v4(),
  user_id uuid not null references public.users (id) on delete cascade,
  display_name text,
  avatar_url text,
  bio text,
  timezone text not null default 'UTC',
  locale text not null default 'en',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  deleted_at timestamptz
);

create unique index if not exists uq_profiles_user_id on public.profiles (user_id) where deleted_at is null;
create index if not exists idx_profiles_deleted_at on public.profiles (deleted_at);

create trigger set_updated_at before update on public.profiles
  for each row execute function public.set_updated_at();

alter table public.profiles enable row level security;

-- Single policy: owner can read/update/delete; inserts (e.g. from the trigger) are allowed.
drop policy if exists "Users manage their own profile" on public.profiles;
create policy "Users manage their own profile" on public.profiles
  for all using (auth.uid() = user_id) with check (true);

--------------------------------------------------------------------------------
-- Per-user app preferences (theme, language, reading settings, notifications).
--------------------------------------------------------------------------------

create table if not exists public.settings (
  id uuid primary key default uuid_generate_v4(),
  user_id uuid not null references public.users (id) on delete cascade,
  theme text not null default 'system' check (theme in ('light', 'dark', 'system')),
  language text not null default 'en',
  font_size text not null default 'md' check (font_size in ('sm', 'md', 'lg', 'xl')),
  reading_font text not null default 'serif' check (reading_font in ('serif', 'sans')),
  translation text not null default 'kjv',
  line_spacing text not null default 'normal' check (line_spacing in ('compact', 'normal', 'relaxed')),
  show_verse_numbers boolean not null default true,
  notifications_enabled boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  deleted_at timestamptz
);

create unique index if not exists uq_settings_user_id on public.settings (user_id) where deleted_at is null;
create index if not exists idx_settings_deleted_at on public.settings (deleted_at);

create trigger set_updated_at before update on public.settings
  for each row execute function public.set_updated_at();

alter table public.settings enable row level security;
drop policy if exists "Users manage their own settings" on public.settings;
create policy "Users manage their own settings" on public.settings
  for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

--------------------------------------------------------------------------------
-- Audit trail of offline-first client sync operations.
--------------------------------------------------------------------------------

create table if not exists public.sync_logs (
  id uuid primary key default uuid_generate_v4(),
  user_id uuid not null references public.users (id) on delete cascade,
  table_name text not null,
  record_id uuid not null,
  operation text not null check (operation in ('upsert', 'delete')),
  status text not null default 'pending' check (status in ('pending', 'success', 'failed')),
  error text,
  device_id text,
  synced_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  deleted_at timestamptz
);

create index if not exists idx_sync_logs_user_id on public.sync_logs (user_id) where deleted_at is null;
create index if not exists idx_sync_logs_status on public.sync_logs (status);
create index if not exists idx_sync_logs_table_record on public.sync_logs (table_name, record_id);
create index if not exists idx_sync_logs_deleted_at on public.sync_logs (deleted_at);

create trigger set_updated_at before update on public.sync_logs
  for each row execute function public.set_updated_at();

alter table public.sync_logs enable row level security;
drop policy if exists "Users manage their own sync logs" on public.sync_logs;
create policy "Users manage their own sync logs" on public.sync_logs
  for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

--------------------------------------------------------------------------------
-- Storage buckets for user-uploaded media: avatars, audio notes, attachments.
--------------------------------------------------------------------------------

insert into storage.buckets (id, name, public)
values ('avatars', 'avatars', true)
on conflict (id) do nothing;

insert into storage.buckets (id, name, public)
values ('audio-notes', 'audio-notes', false)
on conflict (id) do nothing;

insert into storage.buckets (id, name, public)
values ('attachments', 'attachments', false)
on conflict (id) do nothing;

-- Avatars: publicly readable, owner-write (path convention: <user_id>/...)
drop policy if exists "Avatar images are publicly accessible" on storage.objects;
drop policy if exists "Users can upload their own avatar" on storage.objects;
drop policy if exists "Users can update their own avatar" on storage.objects;
create policy "Avatar images are publicly accessible" on storage.objects
  for select using (bucket_id = 'avatars');
create policy "Users can upload their own avatar" on storage.objects
  for insert with check (bucket_id = 'avatars' and (storage.foldername(name))[1] = auth.uid()::text);
create policy "Users can update their own avatar" on storage.objects
  for update using (bucket_id = 'avatars' and (storage.foldername(name))[1] = auth.uid()::text);

-- Audio notes: private, owner-only (path convention: <user_id>/...)
drop policy if exists "Users can access their own audio notes" on storage.objects;
drop policy if exists "Users can upload their own audio notes" on storage.objects;
drop policy if exists "Users can delete their own audio notes" on storage.objects;
create policy "Users can access their own audio notes" on storage.objects
  for select using (bucket_id = 'audio-notes' and (storage.foldername(name))[1] = auth.uid()::text);
create policy "Users can upload their own audio notes" on storage.objects
  for insert with check (bucket_id = 'audio-notes' and (storage.foldername(name))[1] = auth.uid()::text);
create policy "Users can delete their own audio notes" on storage.objects
  for delete using (bucket_id = 'audio-notes' and (storage.foldername(name))[1] = auth.uid()::text);

-- Attachments: private, owner-only (path convention: <user_id>/...)
drop policy if exists "Users can access their own attachments" on storage.objects;
drop policy if exists "Users can upload their own attachments" on storage.objects;
drop policy if exists "Users can delete their own attachments" on storage.objects;
create policy "Users can access their own attachments" on storage.objects
  for select using (bucket_id = 'attachments' and (storage.foldername(name))[1] = auth.uid()::text);
create policy "Users can upload their own attachments" on storage.objects
  for insert with check (bucket_id = 'attachments' and (storage.foldername(name))[1] = auth.uid()::text);
create policy "Users can delete their own attachments" on storage.objects
  for delete using (bucket_id = 'attachments' and (storage.foldername(name))[1] = auth.uid()::text);

-- Google OAuth: enable the Google provider under Authentication > Providers
-- in the Supabase dashboard, and add http(s)://<your-domain>/auth/callback
-- as an authorized redirect URL in both Supabase and the Google Cloud Console.
