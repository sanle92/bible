-- 0010_notes_sync_fix.sql
-- Fix the notes schema and add permissions so user content (notes, highlights,
-- bookmarks, verse notes) actually syncs to Supabase.

-- The app stores tags, theme ids, and reference on general notes.
-- If the notes table is not present, skip these changes (run 0003_content.sql first).
do $$
begin
  if to_regclass('public.notes') is not null then
    alter table public.notes add column if not exists tags text[] default '{}';
    alter table public.notes add column if not exists theme_ids uuid[] default '{}';
    alter table public.notes add column if not exists reference text;
  end if;
end;
$$;

-- Verse notes are synced from the app as a separate table.
create table if not exists public.verse_notes (
  id uuid primary key default uuid_generate_v4(),
  user_id uuid not null references public.users (id) on delete cascade,
  book_id text not null,
  chapter smallint not null,
  verse smallint not null,
  title text not null default '',
  content text not null default '',
  attachments jsonb default '[]',
  versions jsonb default '[]',
  theme_ids uuid[] default '{}',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  deleted_at timestamptz
);

create unique index if not exists uq_verse_notes_user_book_chapter_verse
  on public.verse_notes (user_id, book_id, chapter, verse) where deleted_at is null;
create index if not exists idx_verse_notes_user_id on public.verse_notes (user_id) where deleted_at is null;
create index if not exists idx_verse_notes_book_id on public.verse_notes (book_id);
create index if not exists idx_verse_notes_verse_ref on public.verse_notes (book_id, chapter, verse);

create trigger set_updated_at before update on public.verse_notes
  for each row execute function public.set_updated_at();

alter table public.verse_notes enable row level security;
drop policy if exists "Users manage their own verse notes" on public.verse_notes;
create policy "Users manage their own verse notes" on public.verse_notes
  for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

-- Table-level permissions for all user content. RLS policies are also required.
-- Some tables may not exist yet, so we grant only on tables that are present.
do $$
declare
  tbl text;
  user_tables text[] := array[
    'notes', 'notebooks', 'collections', 'tags', 'taggables', 'themes',
    'highlights', 'bookmarks', 'sermons', 'prayer_requests', 'journal_entries',
    'reading_plans', 'reading_plan_days', 'reading_progress', 'verse_notes'
  ];
begin
  foreach tbl in array user_tables loop
    if to_regclass(quote_ident('public.' || tbl)) is not null then
      execute format('grant select, insert, update, delete on table public.%I to anon, authenticated', tbl);
      execute format('grant select, insert, update, delete on table public.%I to service_role', tbl);
    end if;
  end loop;
end;
$$;
