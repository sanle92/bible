# Supabase schema

The full PostgreSQL schema lives in [`migrations/`](./migrations) as four
ordered, idempotent SQL files. Apply them in order (they are safe to re-run):

```bash
# via Supabase CLI
supabase db push

# or manually in the SQL editor, run each file in numeric order:
# 0001_foundation.sql       -- extensions, helpers, users, profiles, settings, sync_logs, storage
# 0002_bible.sql            -- bible_books, chapters, verses, translations, seed data, search RPCs
# 0003_content.sql          -- notebooks, collections, tags, notes, highlights, bookmarks, sermons
# 0004_features.sql         -- reading plans, prayer/journal, audio/attachments, daily verses, notifications, realtime
```

## Importing Bible text

The `0002_bible.sql` migration seeds the 66 book records (name, order, chapter
count). Chapter/verse text is imported separately via a script, since it's ~31k
rows per translation:

```bash
# Requires the service role key (bypasses RLS) — never the anon key.
SUPABASE_URL=https://your-project.supabase.co \
SUPABASE_SERVICE_ROLE_KEY=your-service-role-key \
npm run import:web-bible
```

This imports the **World English Bible (WEB)** — public domain, sourced from
[`midvash/bible-data`](https://github.com/midvash/bible-data) (itself a
republish of the eBible.org / Rainbow Missions public-domain WEB text). The
script (`scripts/import-web-bible.mjs`):

1. Resolves each of the 66 `bible_books` rows by `book_key`.
2. Fetches each book's per-chapter/verse JSON.
3. Upserts `bible_chapters` (creating rows with the correct `verses_count`).
4. Replaces that chapter's `web` rows in `bible_verses` (delete + bulk
   insert), so the script is safe to re-run.
5. Marks `bible_translations.import_status` as `complete` when finished.

It is idempotent and safe to re-run (e.g. after a source correction).

### Adding another translation later

The schema was designed so this requires **no migrations**, only:

1. Insert a row into `bible_translations` (code, name, license, etc.).
2. Write or reuse an importer that populates `bible_chapters` /
   `bible_verses` with `translation = '<code>'`, following the same shape as
   `scripts/import-web-bible.mjs`.
3. Add the translation's `code` to `SUPABASE_BACKED_TRANSLATIONS` in
   `src/services/bibleService.ts` so the client fetches it via the fast
   `get_chapter_text` RPC instead of the live bible-api.com fallback.

### Search & performance

- `get_chapter_text(book_key, chapter, translation)` — single indexed round
  trip to load a full chapter (used by the reader for fast loads).
- `search_verses(query, translation, limit)` — ranked full-text search over
  a translation using a **stored, indexed `tsvector` column** (`GIN`) plus a
  `pg_trgm` trigram index for fuzzy/partial matching.
- A composite index on `(chapter_id, translation, verse_number)` makes
  ordered chapter reads a single index scan.

## Design conventions

- **Primary keys**: every table uses `id uuid primary key default uuid_generate_v4()`.
- **Timestamps**: every table has `created_at` / `updated_at timestamptz not null default now()`,
  kept current via the shared `public.set_updated_at()` trigger.
- **Soft delete**: every table has a nullable `deleted_at timestamptz`. Application
  code issues `update ... set deleted_at = now()` instead of `delete`; unique
  indexes and RLS `select` policies are scoped with `where deleted_at is null`
  so soft-deleted rows are excluded and their unique keys become reusable.
- **Foreign keys**: user-owned tables reference `public.users(id) on delete cascade`.
  Optional/organizational references (`notebook_id`, `collection_id`, etc.) use
  `on delete set null` so deleting a notebook doesn't destroy its notes.
- **Indexes**: every foreign key and common filter column (`user_id`, date
  columns, `deleted_at`) has a btree index; full-text search columns use GIN
  `to_tsvector` indexes; partial unique indexes enforce per-user uniqueness
  (e.g. one tag name per user, one highlight per verse).
- **Row Level Security**: enabled on every table. User content tables use
  `auth.uid() = user_id` ownership policies. Reference data (`bible_books`,
  `bible_chapters`, `bible_verses`, `daily_verses`) is public read-only.
  `reading_plans` supports both private (owner-only) and public/system plans.

## Tables

| Table | Purpose |
|---|---|
| `users` | Mirror of `auth.users`, auto-populated via trigger on signup |
| `profiles` | Editable profile data (display name, avatar, bio, locale) |
| `bible_books` / `bible_chapters` / `bible_verses` | Public Scripture reference data (multi-translation) |
| `notebooks` | User-defined containers for notes/sermons |
| `collections` | General-purpose grouping for bookmarks/notes/prayers |
| `tags` / `taggables` | User tags + polymorphic tag assignment |
| `notes` | Verse or free-form study notes |
| `highlights` | Per-verse color highlights |
| `bookmarks` | Saved chapter/verse references |
| `sermons` | Sermon outlines and notes |
| `reading_plans` / `reading_plan_days` / `reading_progress` | Reading plans and per-user progress tracking |
| `prayer_requests` | Prayer journal entries |
| `journal_entries` | Free-form spiritual journal |
| `audio_notes` | Voice recordings attached to notes/sermons |
| `attachments` | Generic file attachments (polymorphic owner) |
| `daily_verses` | Verse of the day |
| `notifications` | In-app notification feed |
| `settings` | Per-user preferences (theme, language, font size, reading prefs) |
| `sync_logs` | Offline-first client sync audit trail |
