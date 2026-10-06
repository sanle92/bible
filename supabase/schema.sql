-- DEPRECATED: superseded by the numbered migrations in supabase/migrations/.
-- See supabase/README.md for the current schema and apply order.
-- This file is kept only for historical reference and is not applied.

-- Bible Study Workspace — Supabase schema (legacy, v1)
-- Run this in the Supabase SQL editor.

create extension if not exists "uuid-ossp";

create table if not exists notes (
  id uuid primary key default uuid_generate_v4(),
  user_id uuid references auth.users(id) on delete cascade not null,
  title text not null default 'Untitled Note',
  content text not null default '',
  tags text[] not null default '{}',
  folder_id uuid,
  reference text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  deleted boolean not null default false
);

create table if not exists sermons (
  id uuid primary key default uuid_generate_v4(),
  user_id uuid references auth.users(id) on delete cascade not null,
  title text not null default 'New Sermon',
  speaker text,
  passage text,
  content text not null default '',
  tags text[] not null default '{}',
  date date not null default current_date,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  deleted boolean not null default false
);

create table if not exists prayers (
  id uuid primary key default uuid_generate_v4(),
  user_id uuid references auth.users(id) on delete cascade not null,
  title text not null default 'New Prayer',
  content text not null default '',
  category text not null default 'request',
  answered boolean not null default false,
  answered_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  deleted boolean not null default false
);

create table if not exists highlights (
  id uuid primary key default uuid_generate_v4(),
  user_id uuid references auth.users(id) on delete cascade not null,
  book_id text not null,
  chapter int not null,
  verse int not null,
  color text not null default 'yellow',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists verse_notes (
  id uuid primary key default uuid_generate_v4(),
  user_id uuid references auth.users(id) on delete cascade not null,
  book_id text not null,
  chapter int not null,
  verse int not null,
  content text not null default '',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists bookmarks (
  id uuid primary key default uuid_generate_v4(),
  user_id uuid references auth.users(id) on delete cascade not null,
  book_id text not null,
  chapter int not null,
  verse int,
  label text,
  created_at timestamptz not null default now()
);

alter table notes enable row level security;
alter table sermons enable row level security;
alter table prayers enable row level security;
alter table highlights enable row level security;
alter table verse_notes enable row level security;
alter table bookmarks enable row level security;

create policy "Users manage their own notes" on notes
  for all using (auth.uid() = user_id) with check (auth.uid() = user_id);
create policy "Users manage their own sermons" on sermons
  for all using (auth.uid() = user_id) with check (auth.uid() = user_id);
create policy "Users manage their own prayers" on prayers
  for all using (auth.uid() = user_id) with check (auth.uid() = user_id);
create policy "Users manage their own highlights" on highlights
  for all using (auth.uid() = user_id) with check (auth.uid() = user_id);
create policy "Users manage their own verse_notes" on verse_notes
  for all using (auth.uid() = user_id) with check (auth.uid() = user_id);
create policy "Users manage their own bookmarks" on bookmarks
  for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

-- Enable Realtime on user content tables
alter publication supabase_realtime add table notes, sermons, prayers, highlights, verse_notes, bookmarks;

-- Avatar storage bucket for profile pictures.
-- Create the bucket via the Storage UI (name: "avatars", public: true), then apply these policies:
insert into storage.buckets (id, name, public)
values ('avatars', 'avatars', true)
on conflict (id) do nothing;

create policy "Avatar images are publicly accessible" on storage.objects
  for select using (bucket_id = 'avatars');

create policy "Users can upload their own avatar" on storage.objects
  for insert with check (bucket_id = 'avatars' and (storage.foldername(name))[1] = auth.uid()::text);

create policy "Users can update their own avatar" on storage.objects
  for update using (bucket_id = 'avatars' and (storage.foldername(name))[1] = auth.uid()::text);

-- Google OAuth: enable the Google provider under Authentication > Providers
-- in the Supabase dashboard, and add http(s)://<your-domain>/auth/callback
-- as an authorized redirect URL in both Supabase and the Google Cloud Console.
