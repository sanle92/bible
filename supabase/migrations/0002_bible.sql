-- 0002_bible.sql
-- Bible reference schema: books, chapters, verses, translations, seed data,
-- and search/performance optimization + RPCs for the reader.

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
-- Read-only reference data: books, chapters, verses (multi-translation).
--------------------------------------------------------------------------------

create table if not exists public.bible_books (
  id uuid primary key default uuid_generate_v4(),
  book_key text not null,          -- e.g. 'genesis', 'john'
  name text not null,              -- e.g. 'Genesis'
  testament text not null check (testament in ('OT', 'NT')),
  book_order smallint not null,    -- canonical ordering, 1-66
  chapters_count smallint not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  deleted_at timestamptz
);

create unique index if not exists uq_bible_books_key on public.bible_books (book_key) where deleted_at is null;
create unique index if not exists uq_bible_books_order on public.bible_books (book_order) where deleted_at is null;
create index if not exists idx_bible_books_testament on public.bible_books (testament) where deleted_at is null;
create index if not exists idx_bible_books_deleted_at on public.bible_books (deleted_at);

create trigger set_updated_at before update on public.bible_books
  for each row execute function public.set_updated_at();

alter table public.bible_books enable row level security;
drop policy if exists "Bible books are publicly readable" on public.bible_books;
create policy "Bible books are publicly readable" on public.bible_books
  for select using (deleted_at is null);

--------------------------------------------------------------------------------

create table if not exists public.bible_chapters (
  id uuid primary key default uuid_generate_v4(),
  book_id uuid not null references public.bible_books (id) on delete cascade,
  chapter_number smallint not null,
  verses_count smallint not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  deleted_at timestamptz
);

create unique index if not exists uq_bible_chapters_book_chapter
  on public.bible_chapters (book_id, chapter_number) where deleted_at is null;
create index if not exists idx_bible_chapters_book_id on public.bible_chapters (book_id);
create index if not exists idx_bible_chapters_deleted_at on public.bible_chapters (deleted_at);

create trigger set_updated_at before update on public.bible_chapters
  for each row execute function public.set_updated_at();

alter table public.bible_chapters enable row level security;
drop policy if exists "Bible chapters are publicly readable" on public.bible_chapters;
create policy "Bible chapters are publicly readable" on public.bible_chapters
  for select using (deleted_at is null);

--------------------------------------------------------------------------------

create table if not exists public.bible_verses (
  id uuid primary key default uuid_generate_v4(),
  chapter_id uuid not null references public.bible_chapters (id) on delete cascade,
  book_id uuid not null references public.bible_books (id) on delete cascade,
  verse_number smallint not null,
  translation text not null default 'kjv',
  text text not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  deleted_at timestamptz
);

create unique index if not exists uq_bible_verses_chapter_verse_translation
  on public.bible_verses (chapter_id, verse_number, translation) where deleted_at is null;
create index if not exists idx_bible_verses_book_id on public.bible_verses (book_id);
create index if not exists idx_bible_verses_chapter_id on public.bible_verses (chapter_id);
create index if not exists idx_bible_verses_translation on public.bible_verses (translation);
create index if not exists idx_bible_verses_deleted_at on public.bible_verses (deleted_at);

create trigger set_updated_at before update on public.bible_verses
  for each row execute function public.set_updated_at();

alter table public.bible_verses enable row level security;
drop policy if exists "Bible verses are publicly readable" on public.bible_verses;
create policy "Bible verses are publicly readable" on public.bible_verses
  for select using (deleted_at is null);

--------------------------------------------------------------------------------
-- Seed the 66 canonical books. Chapters/verses are imported separately.
--------------------------------------------------------------------------------

insert into public.bible_books (book_key, name, testament, book_order, chapters_count) values
  ('genesis', 'Genesis', 'OT', 1, 50),
  ('exodus', 'Exodus', 'OT', 2, 40),
  ('leviticus', 'Leviticus', 'OT', 3, 27),
  ('numbers', 'Numbers', 'OT', 4, 36),
  ('deuteronomy', 'Deuteronomy', 'OT', 5, 34),
  ('joshua', 'Joshua', 'OT', 6, 24),
  ('judges', 'Judges', 'OT', 7, 21),
  ('ruth', 'Ruth', 'OT', 8, 4),
  ('1samuel', '1 Samuel', 'OT', 9, 31),
  ('2samuel', '2 Samuel', 'OT', 10, 24),
  ('1kings', '1 Kings', 'OT', 11, 22),
  ('2kings', '2 Kings', 'OT', 12, 25),
  ('1chronicles', '1 Chronicles', 'OT', 13, 29),
  ('2chronicles', '2 Chronicles', 'OT', 14, 36),
  ('ezra', 'Ezra', 'OT', 15, 10),
  ('nehemiah', 'Nehemiah', 'OT', 16, 13),
  ('esther', 'Esther', 'OT', 17, 10),
  ('job', 'Job', 'OT', 18, 42),
  ('psalms', 'Psalms', 'OT', 19, 150),
  ('proverbs', 'Proverbs', 'OT', 20, 31),
  ('ecclesiastes', 'Ecclesiastes', 'OT', 21, 12),
  ('songofsolomon', 'Song of Solomon', 'OT', 22, 8),
  ('isaiah', 'Isaiah', 'OT', 23, 66),
  ('jeremiah', 'Jeremiah', 'OT', 24, 52),
  ('lamentations', 'Lamentations', 'OT', 25, 5),
  ('ezekiel', 'Ezekiel', 'OT', 26, 48),
  ('daniel', 'Daniel', 'OT', 27, 12),
  ('hosea', 'Hosea', 'OT', 28, 14),
  ('joel', 'Joel', 'OT', 29, 3),
  ('amos', 'Amos', 'OT', 30, 9),
  ('obadiah', 'Obadiah', 'OT', 31, 1),
  ('jonah', 'Jonah', 'OT', 32, 4),
  ('micah', 'Micah', 'OT', 33, 7),
  ('nahum', 'Nahum', 'OT', 34, 3),
  ('habakkuk', 'Habakkuk', 'OT', 35, 3),
  ('zephaniah', 'Zephaniah', 'OT', 36, 3),
  ('haggai', 'Haggai', 'OT', 37, 2),
  ('zechariah', 'Zechariah', 'OT', 38, 14),
  ('malachi', 'Malachi', 'OT', 39, 4),
  ('matthew', 'Matthew', 'NT', 40, 28),
  ('mark', 'Mark', 'NT', 41, 16),
  ('luke', 'Luke', 'NT', 42, 24),
  ('john', 'John', 'NT', 43, 21),
  ('acts', 'Acts', 'NT', 44, 28),
  ('romans', 'Romans', 'NT', 45, 16),
  ('1corinthians', '1 Corinthians', 'NT', 46, 16),
  ('2corinthians', '2 Corinthians', 'NT', 47, 13),
  ('galatians', 'Galatians', 'NT', 48, 6),
  ('ephesians', 'Ephesians', 'NT', 49, 6),
  ('philippians', 'Philippians', 'NT', 50, 4),
  ('colossians', 'Colossians', 'NT', 51, 4),
  ('1thessalonians', '1 Thessalonians', 'NT', 52, 5),
  ('2thessalonians', '2 Thessalonians', 'NT', 53, 3),
  ('1timothy', '1 Timothy', 'NT', 54, 6),
  ('2timothy', '2 Timothy', 'NT', 55, 4),
  ('titus', 'Titus', 'NT', 56, 3),
  ('philemon', 'Philemon', 'NT', 57, 1),
  ('hebrews', 'Hebrews', 'NT', 58, 13),
  ('james', 'James', 'NT', 59, 5),
  ('1peter', '1 Peter', 'NT', 60, 5),
  ('2peter', '2 Peter', 'NT', 61, 3),
  ('1john', '1 John', 'NT', 62, 5),
  ('2john', '2 John', 'NT', 63, 1),
  ('3john', '3 John', 'NT', 64, 1),
  ('jude', 'Jude', 'NT', 65, 1),
  ('revelation', 'Revelation', 'NT', 66, 22)
on conflict (book_key) where deleted_at is null do nothing;

--------------------------------------------------------------------------------
-- Formalize translations as first-class reference data.
--------------------------------------------------------------------------------

create table if not exists public.bible_translations (
  code text primary key,             -- e.g. 'web', 'kjv', 'asv' — matches bible_verses.translation
  name text not null,                -- e.g. 'World English Bible'
  short_name text not null,          -- e.g. 'WEB'
  language text not null default 'en',
  year smallint,
  is_public_domain boolean not null default true,
  license text,
  license_note text,
  source_url text,
  is_default boolean not null default false,
  import_status text not null default 'pending'
    check (import_status in ('pending', 'importing', 'complete', 'failed')),
  verses_count integer not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  deleted_at timestamptz
);

create unique index if not exists uq_bible_translations_default
  on public.bible_translations (is_default) where is_default and deleted_at is null;
create index if not exists idx_bible_translations_language on public.bible_translations (language);
create index if not exists idx_bible_translations_deleted_at on public.bible_translations (deleted_at);

create trigger set_updated_at before update on public.bible_translations
  for each row execute function public.set_updated_at();

alter table public.bible_translations enable row level security;
drop policy if exists "Bible translations are publicly readable" on public.bible_translations;
create policy "Bible translations are publicly readable" on public.bible_translations
  for select using (deleted_at is null);

-- Tie bible_verses.translation to a registered translation for data integrity.
-- (Existing rows, if any, must already use a registered code before this runs.)
alter table public.bible_verses
  add constraint fk_bible_verses_translation
  foreign key (translation) references public.bible_translations (code)
  on update cascade;

-- Seed the two translations this app ships with. WEB is imported in full by
-- scripts/import-web-bible.mjs; KJV is currently served live from
-- bible-api.com and cached client-side, but is registered here so it can be
-- bulk-imported the same way in the future (see supabase/README.md).
insert into public.bible_translations
  (code, name, short_name, language, year, is_public_domain, license, license_note, source_url, is_default, import_status)
values
  ('web', 'World English Bible', 'WEB', 'en', 2000, true, 'public-domain',
   'Released into the public domain by Rainbow Missions, Inc.', 'https://worldenglish.bible/', true, 'pending'),
  ('kjv', 'King James Version', 'KJV', 'en', 1769, true, 'public-domain',
   'Crown copyright in the UK has expired; public domain elsewhere.', 'https://www.kingjamesbibleonline.org/', false, 'pending')
on conflict (code) do nothing;

--------------------------------------------------------------------------------
-- Optimize bible_verses for full-text search and fast chapter reads at
-- Bible scale (31k+ verses per translation).
--------------------------------------------------------------------------------

create extension if not exists pg_trgm;

-- Replace the expression-based FTS index with a stored generated column:
-- computed once at write time instead of on every query/index scan.
drop index if exists public.idx_bible_verses_text_search;

alter table public.bible_verses
  add column if not exists search_vector tsvector
  generated always as (to_tsvector('english', text)) stored;

create index if not exists idx_bible_verses_search_vector
  on public.bible_verses using gin (search_vector);

-- Trigram index for fuzzy / partial / ILIKE search (e.g. autocomplete,
-- misspelling-tolerant search) alongside the full-text index above.
create index if not exists idx_bible_verses_text_trgm
  on public.bible_verses using gin (text gin_trgm_ops);

-- Composite index covering the hot path: "give me verse N..M of chapter X in
-- translation Y, in order" — a single index-only scan instead of a filter
-- over the chapter_id index.
create index if not exists idx_bible_verses_chapter_translation_verse
  on public.bible_verses (chapter_id, translation, verse_number);

analyze public.bible_verses;

--------------------------------------------------------------------------------
-- RPC: fetch a full chapter (book + verses) in one round trip, ordered and
-- translation-aware. Used by the client for fast chapter loads.
--------------------------------------------------------------------------------

create or replace function public.get_chapter_text(
  p_book_key text,
  p_chapter integer,
  p_translation text default 'web'
)
returns table (
  book_name text,
  chapter_number integer,
  verse_number integer,
  text text
)
language sql
stable
as $$
  select b.name, c.chapter_number, v.verse_number, v.text
  from public.bible_verses v
  join public.bible_chapters c on c.id = v.chapter_id
  join public.bible_books b on b.id = c.book_id
  where b.book_key = p_book_key
    and c.chapter_number = p_chapter
    and v.translation = p_translation
    and v.deleted_at is null
    and c.deleted_at is null
    and b.deleted_at is null
  order by v.verse_number;
$$;

--------------------------------------------------------------------------------
-- RPC: full-text search across a translation, ranked by relevance, returning
-- enough context (book/chapter/verse) for the client to render and link to
-- results. Powers the in-app Bible search feature.
--------------------------------------------------------------------------------

create or replace function public.search_verses(
  p_query text,
  p_translation text default 'web',
  p_limit integer default 50
)
returns table (
  book_key text,
  book_name text,
  chapter_number integer,
  verse_number integer,
  text text,
  rank real
)
language sql
stable
as $$
  select
    b.book_key,
    b.name,
    c.chapter_number,
    v.verse_number,
    v.text,
    ts_rank(v.search_vector, websearch_to_tsquery('english', p_query))::real as rank
  from public.bible_verses v
  join public.bible_chapters c on c.id = v.chapter_id
  join public.bible_books b on b.id = c.book_id
  where v.translation = p_translation
    and v.deleted_at is null
    and v.search_vector @@ websearch_to_tsquery('english', p_query)
  order by rank desc, b.book_order, c.chapter_number, v.verse_number
  limit p_limit;
$$;

grant execute on function public.get_chapter_text(text, integer, text) to anon, authenticated;
grant execute on function public.search_verses(text, text, integer) to anon, authenticated;
