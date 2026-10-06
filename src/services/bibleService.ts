import type { BibleChapter, BibleVerse } from '@/types/bible';
import { getBookById } from '@/utils/bibleData';
import { cacheChapter, getCachedChapter } from '@/services/db';
import { supabase, isSupabaseConfigured } from '@/services/supabaseClient';

interface BibleApiVerse {
  book_name: string;
  chapter: number;
  verse: number;
  text: string;
}

interface BibleApiResponse {
  reference: string;
  verses: BibleApiVerse[];
}

// Translations that have been bulk-imported into Supabase (see
// scripts/import-web-bible.mjs and supabase/migrations/0002_bible.sql). Anything
// else falls back to the live bible-api.com lookup below. Extend this list
// as more translations are imported — no other code changes required.
const SUPABASE_BACKED_TRANSLATIONS = new Set(['web']);

export function chapterCacheKey(bookId: string, chapter: number, translation: string) {
  return `${bookId}:${chapter}:${translation}`;
}

interface ChapterTextRow {
  book_name: string;
  chapter_number: number;
  verse_number: number;
  text: string;
}

async function fetchChapterFromSupabase(
  bookId: string,
  chapter: number,
  translation: string
): Promise<BibleChapter | null> {
  try {
    const { data, error } = await supabase.rpc('get_chapter_text', {
      p_book_key: bookId,
      p_chapter: chapter,
      p_translation: translation,
    });
    if (error) {
      console.warn('[BibleService] Supabase RPC error:', error.message);
      return null;
    }
    if (!data || data.length === 0) return null;

    const rows = data as ChapterTextRow[];
    const verses: BibleVerse[] = rows.map((v) => ({
      book: v.book_name,
      bookId,
      chapter: v.chapter_number,
      verse: v.verse_number,
      text: v.text,
    }));
    return { bookId, book: rows[0].book_name, chapter, verses };
  } catch (err) {
    console.warn('[BibleService] Supabase fetch failed:', (err as Error).message);
    return null;
  }
}

async function fetchChapterFromBibleApi(
  bookId: string,
  chapter: number,
  translation: string
): Promise<BibleChapter> {
  const book = getBookById(bookId);
  if (!book) throw new Error(`Unknown book: ${bookId}`);
  const query = encodeURIComponent(`${book.name} ${chapter}`);
  const res = await fetch(`https://bible-api.com/${query}?translation=${translation}`);
  if (!res.ok) throw new Error(`Bible API error: ${res.status}`);
  const data: BibleApiResponse = await res.json();
  const verses: BibleVerse[] = data.verses.map((v) => ({
    book: book.name,
    bookId,
    chapter: v.chapter,
    verse: v.verse,
    text: v.text.trim(),
  }));
  return { bookId, book: book.name, chapter, verses };
}

export interface VerseSearchResult {
  bookId: string;
  bookName: string;
  chapter: number;
  verse: number;
  text: string;
  rank: number;
}

interface SearchVersesRow {
  book_key: string;
  book_name: string;
  chapter_number: number;
  verse_number: number;
  text: string;
  rank: number;
}

/**
 * Full-text search over a Supabase-imported translation via the
 * `search_verses` RPC (see supabase/migrations/0002_bible.sql). Only available for
 * translations in `SUPABASE_BACKED_TRANSLATIONS`; returns an empty array
 * otherwise (offline or translation not yet imported).
 */
export async function searchVerses(
  query: string,
  translation: string = 'web',
  limit = 50
): Promise<VerseSearchResult[]> {
  if (!isSupabaseConfigured || !SUPABASE_BACKED_TRANSLATIONS.has(translation) || !query.trim()) {
    return [];
  }
  const { data, error } = await supabase.rpc('search_verses', {
    p_query: query,
    p_translation: translation,
    p_limit: limit,
  });
  if (error || !data) return [];
  return (data as SearchVersesRow[]).map((row) => ({
    bookId: row.book_key,
    bookName: row.book_name,
    chapter: row.chapter_number,
    verse: row.verse_number,
    text: row.text,
    rank: row.rank,
  }));
}

/**
 * Fetches a chapter, preferring the Supabase-hosted translation (indexed,
 * single round trip via the `get_chapter_text` RPC) when it has been
 * imported, falling back to the live bible-api.com translation otherwise.
 * Every successful fetch is cached in IndexedDB so the chapter remains
 * available offline afterwards.
 */
export async function fetchChapter(
  bookId: string,
  chapter: number,
  translation: string = 'kjv'
): Promise<BibleChapter> {
  const cacheKey = chapterCacheKey(bookId, chapter, translation);

  try {
    let result: BibleChapter | null = null;

    if (isSupabaseConfigured && SUPABASE_BACKED_TRANSLATIONS.has(translation)) {
      result = await fetchChapterFromSupabase(bookId, chapter, translation);
    }
    if (!result) {
      result = await fetchChapterFromBibleApi(bookId, chapter, translation);
    }

    await cacheChapter(cacheKey, result);
    return result;
  } catch (err) {
    const cached = await getCachedChapter(cacheKey);
    if (cached) return cached;
    throw err;
  }
}
