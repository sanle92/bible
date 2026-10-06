-- 0003_content.sql
-- User study content: organizational containers (notebooks, collections, tags)
-- plus core content (notes, highlights, bookmarks, sermons).

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

-- 0003 depends on the Bible reference tables created in 0002_bible.sql.
do $$
begin
  if to_regclass('public.bible_books') is null or to_regclass('public.bible_verses') is null then
    raise exception '0002_bible.sql must be applied before 0003_content.sql';
  end if;
end;
$$;

--------------------------------------------------------------------------------
-- User-owned organizational containers: notebooks, collections, tags.
--------------------------------------------------------------------------------

create table if not exists public.notebooks (
  id uuid primary key default uuid_generate_v4(),
  user_id uuid not null references public.users (id) on delete cascade,
  name text not null default 'Untitled Notebook',
  description text,
  color text,
  is_favorite boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  deleted_at timestamptz
);

create index if not exists idx_notebooks_user_id on public.notebooks (user_id) where deleted_at is null;
create index if not exists idx_notebooks_deleted_at on public.notebooks (deleted_at);

create trigger set_updated_at before update on public.notebooks
  for each row execute function public.set_updated_at();

alter table public.notebooks enable row level security;
drop policy if exists "Users manage their own notebooks" on public.notebooks;
create policy "Users manage their own notebooks" on public.notebooks
  for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

create table if not exists public.themes (
  id uuid primary key default uuid_generate_v4(),
  user_id uuid not null references public.users (id) on delete cascade,
  name text not null default 'Theme',
  parent_id uuid references public.themes (id) on delete set null,
  color text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  deleted_at timestamptz
);

create index if not exists idx_themes_user_id on public.themes (user_id) where deleted_at is null;
create index if not exists idx_themes_parent_id on public.themes (parent_id);
create index if not exists idx_themes_deleted_at on public.themes (deleted_at);

create trigger set_updated_at before update on public.themes
  for each row execute function public.set_updated_at();

alter table public.themes enable row level security;
drop policy if exists "Users manage their own themes" on public.themes;
create policy "Users manage their own themes" on public.themes
  for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

--------------------------------------------------------------------------------

create table if not exists public.collections (
  id uuid primary key default uuid_generate_v4(),
  user_id uuid not null references public.users (id) on delete cascade,
  name text not null default 'Untitled Collection',
  description text,
  icon text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  deleted_at timestamptz
);

create index if not exists idx_collections_user_id on public.collections (user_id) where deleted_at is null;
create index if not exists idx_collections_deleted_at on public.collections (deleted_at);

create trigger set_updated_at before update on public.collections
  for each row execute function public.set_updated_at();

alter table public.collections enable row level security;
drop policy if exists "Users manage their own collections" on public.collections;
create policy "Users manage their own collections" on public.collections
  for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

--------------------------------------------------------------------------------

create table if not exists public.tags (
  id uuid primary key default uuid_generate_v4(),
  user_id uuid not null references public.users (id) on delete cascade,
  name text not null,
  color text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  deleted_at timestamptz
);

create unique index if not exists uq_tags_user_name on public.tags (user_id, name) where deleted_at is null;
create index if not exists idx_tags_user_id on public.tags (user_id) where deleted_at is null;
create index if not exists idx_tags_deleted_at on public.tags (deleted_at);

create trigger set_updated_at before update on public.tags
  for each row execute function public.set_updated_at();

alter table public.tags enable row level security;
drop policy if exists "Users manage their own tags" on public.tags;
create policy "Users manage their own tags" on public.tags
  for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

--------------------------------------------------------------------------------
-- Polymorphic join table linking tags to any taggable resource.
-- resource_type is constrained to the tables that support tagging.

--------------------------------------------------------------------------------

create table if not exists public.taggables (
  id uuid primary key default uuid_generate_v4(),
  tag_id uuid not null references public.tags (id) on delete cascade,
  resource_type text not null check (resource_type in ('note', 'sermon', 'journal_entry', 'prayer_request', 'bookmark')),
  resource_id uuid not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  deleted_at timestamptz
);

create unique index if not exists uq_taggables_tag_resource
  on public.taggables (tag_id, resource_type, resource_id) where deleted_at is null;
create index if not exists idx_taggables_resource on public.taggables (resource_type, resource_id);
create index if not exists idx_taggables_deleted_at on public.taggables (deleted_at);

create trigger set_updated_at before update on public.taggables
  for each row execute function public.set_updated_at();

alter table public.taggables enable row level security;
drop policy if exists "Users manage taggables for their own tags" on public.taggables;
create policy "Users manage taggables for their own tags" on public.taggables
  for all using (
    exists (select 1 from public.tags t where t.id = taggables.tag_id and t.user_id = auth.uid())
  ) with check (
    exists (select 1 from public.tags t where t.id = taggables.tag_id and t.user_id = auth.uid())
  );

--------------------------------------------------------------------------------
-- Core study content: notes, highlights, bookmarks, sermons.
--------------------------------------------------------------------------------

create table if not exists public.notes (
  id uuid primary key default uuid_generate_v4(),
  user_id uuid not null references public.users (id) on delete cascade,
  notebook_id uuid references public.notebooks (id) on delete set null,
  collection_id uuid references public.collections (id) on delete set null,
  verse_id uuid references public.bible_verses (id) on delete set null,
  book_id uuid references public.bible_books (id) on delete set null,
  chapter smallint,
  verse smallint,
  title text not null default 'Untitled Note',
  content text not null default '',
  attachments jsonb default '[]',
  versions jsonb default '[]',
  is_favorite boolean not null default false,
  is_archived boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  deleted_at timestamptz
);

create index if not exists idx_notes_user_id on public.notes (user_id) where deleted_at is null;
create index if not exists idx_notes_notebook_id on public.notes (notebook_id);
create index if not exists idx_notes_collection_id on public.notes (collection_id);
create index if not exists idx_notes_verse_ref on public.notes (book_id, chapter, verse);
create index if not exists idx_notes_deleted_at on public.notes (deleted_at);
create index if not exists idx_notes_content_search on public.notes using gin (to_tsvector('english', title || ' ' || content));

create trigger set_updated_at before update on public.notes
  for each row execute function public.set_updated_at();

alter table public.notes enable row level security;
drop policy if exists "Users manage their own notes" on public.notes;
create policy "Users manage their own notes" on public.notes
  for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

--------------------------------------------------------------------------------

create table if not exists public.highlights (
  id uuid primary key default uuid_generate_v4(),
  user_id uuid not null references public.users (id) on delete cascade,
  verse_id uuid references public.bible_verses (id) on delete cascade,
  book_id uuid not null references public.bible_books (id) on delete cascade,
  chapter smallint not null,
  verse smallint not null,
  color text not null default 'yellow' check (color in ('yellow', 'green', 'blue', 'purple', 'orange', 'pink')),
  category text,
  date date,
  notebook_name text,
  tags text[] default '{}',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  deleted_at timestamptz
);

create unique index if not exists uq_highlights_user_verse
  on public.highlights (user_id, book_id, chapter, verse) where deleted_at is null;
create index if not exists idx_highlights_user_id on public.highlights (user_id) where deleted_at is null;
create index if not exists idx_highlights_verse_id on public.highlights (verse_id);
create index if not exists idx_highlights_category on public.highlights (category);
create index if not exists idx_highlights_date on public.highlights (date);
create index if not exists idx_highlights_notebook_name on public.highlights (notebook_name);
create index if not exists idx_highlights_tags on public.highlights using gin (tags);
create index if not exists idx_highlights_deleted_at on public.highlights (deleted_at);

create trigger set_updated_at before update on public.highlights
  for each row execute function public.set_updated_at();

alter table public.highlights enable row level security;
drop policy if exists "Users manage their own highlights" on public.highlights;
create policy "Users manage their own highlights" on public.highlights
  for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

--------------------------------------------------------------------------------

create table if not exists public.bookmarks (
  id uuid primary key default uuid_generate_v4(),
  user_id uuid not null references public.users (id) on delete cascade,
  collection_id uuid references public.collections (id) on delete set null,
  verse_id uuid references public.bible_verses (id) on delete cascade,
  book_id uuid not null references public.bible_books (id) on delete cascade,
  chapter smallint not null,
  verse smallint,
  label text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  deleted_at timestamptz
);

create index if not exists idx_bookmarks_user_id on public.bookmarks (user_id) where deleted_at is null;
create index if not exists idx_bookmarks_collection_id on public.bookmarks (collection_id);
create index if not exists idx_bookmarks_verse_ref on public.bookmarks (book_id, chapter, verse);
create index if not exists idx_bookmarks_deleted_at on public.bookmarks (deleted_at);

create trigger set_updated_at before update on public.bookmarks
  for each row execute function public.set_updated_at();

alter table public.bookmarks enable row level security;
drop policy if exists "Users manage their own bookmarks" on public.bookmarks;
create policy "Users manage their own bookmarks" on public.bookmarks
  for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

--------------------------------------------------------------------------------

create table if not exists public.sermons (
  id uuid primary key default uuid_generate_v4(),
  user_id uuid not null references public.users (id) on delete cascade,
  notebook_id uuid references public.notebooks (id) on delete set null,
  title text not null default 'New Sermon',
  speaker text,
  church text,
  location text,
  theme text,
  main_verse text,
  supporting_verses text[] default '{}',
  outline text,
  notes text,
  application text,
  prayer text,
  passage text,
  content text not null default '',
  tags text[] default '{}',
  attachments jsonb default '[]',
  is_favorite boolean not null default false,
  sermon_date date not null default current_date,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  deleted_at timestamptz
);

create index if not exists idx_sermons_user_id on public.sermons (user_id) where deleted_at is null;
create index if not exists idx_sermons_notebook_id on public.sermons (notebook_id);
create index if not exists idx_sermons_date on public.sermons (sermon_date);
create index if not exists idx_sermons_deleted_at on public.sermons (deleted_at);
create index if not exists idx_sermons_content_search on public.sermons using gin (to_tsvector('english', title || ' ' || content));

create trigger set_updated_at before update on public.sermons
  for each row execute function public.set_updated_at();

alter table public.sermons enable row level security;
drop policy if exists "Users manage their own sermons" on public.sermons;
create policy "Users manage their own sermons" on public.sermons
  for all using (auth.uid() = user_id) with check (auth.uid() = user_id);
