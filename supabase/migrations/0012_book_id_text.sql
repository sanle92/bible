-- 0012_book_id_text.sql
-- The client identifies books by their string key (e.g. 'genesis', 'john'),
-- not by the bible_books UUID. The highlights and bookmarks tables declared
-- book_id as uuid with a foreign key to bible_books, so every sync attempt
-- failed with a type/foreign-key error. Convert book_id to text and drop the
-- foreign key so client records sync as-is.

do $$
begin
  if to_regclass('public.highlights') is not null then
    -- Drop dependent unique index/foreign key before altering the column type.
    alter table public.highlights drop constraint if exists highlights_book_id_fkey;
    drop index if exists public.uq_highlights_user_verse;
    alter table public.highlights alter column book_id type text using book_id::text;
    create unique index if not exists uq_highlights_user_verse
      on public.highlights (user_id, book_id, chapter, verse) where deleted_at is null;
  end if;

  if to_regclass('public.bookmarks') is not null then
    alter table public.bookmarks drop constraint if exists bookmarks_book_id_fkey;
    alter table public.bookmarks alter column book_id type text using book_id::text;
  end if;
end;
$$;
