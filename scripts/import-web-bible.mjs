#!/usr/bin/env node
/**
 * Imports the World English Bible (WEB) — public domain — into Supabase.
 *
 * Source: midvash/bible-data (https://github.com/midvash/bible-data), which
 * republishes the WEB text (public domain, eBible.org / Rainbow Missions)
 * as clean per-book JSON files.
 *
 * Usage:
 *   SUPABASE_URL=... SUPABASE_SERVICE_ROLE_KEY=... node scripts/import-web-bible.mjs
 *
 * Requires the service role key (not the anon key) because it bypasses RLS
 * to write into public reference tables (bible_books/chapters/verses).
 * Run supabase/migrations/0001-0014 first.
 *
 * This script is idempotent: re-running it replaces WEB verses chapter by
 * chapter rather than accumulating duplicates.
 */

import { createClient } from '@supabase/supabase-js';
import { config } from 'dotenv';

config();

const SUPABASE_URL = process.env.SUPABASE_URL ?? process.env.VITE_SUPABASE_URL;
const SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;
const TRANSLATION = 'web';
const RAW_BASE = 'https://raw.githubusercontent.com/midvash/bible-data/main/versions/en/web/books';
const BATCH_SIZE = 500;

if (!SUPABASE_URL || !SERVICE_ROLE_KEY) {
  console.error(
    'Missing SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY. Set them as environment variables (do not use the anon key).'
  );
  process.exit(1);
}

const supabase = createClient(SUPABASE_URL, SERVICE_ROLE_KEY, {
  auth: { persistSession: false },
});

// Canonical book order, mapping our internal `book_key` (see src/utils/bibleData.ts)
// to the midvash/bible-data file code for the WEB translation.
const BOOKS = [
  ['genesis', 'Gen'], ['exodus', 'Exod'], ['leviticus', 'Lev'], ['numbers', 'Num'],
  ['deuteronomy', 'Deut'], ['joshua', 'Josh'], ['judges', 'Judg'], ['ruth', 'Ruth'],
  ['1samuel', '1Sam'], ['2samuel', '2Sam'], ['1kings', '1Kgs'], ['2kings', '2Kgs'],
  ['1chronicles', '1Chr'], ['2chronicles', '2Chr'], ['ezra', 'Ezra'], ['nehemiah', 'Neh'],
  ['esther', 'Esth'], ['job', 'Job'], ['psalms', 'Ps'], ['proverbs', 'Prov'],
  ['ecclesiastes', 'Eccl'], ['songofsolomon', 'Song'], ['isaiah', 'Isa'], ['jeremiah', 'Jer'],
  ['lamentations', 'Lam'], ['ezekiel', 'Ezek'], ['daniel', 'Dan'], ['hosea', 'Hos'],
  ['joel', 'Joel'], ['amos', 'Amos'], ['obadiah', 'Obad'], ['jonah', 'Jonah'],
  ['micah', 'Mic'], ['nahum', 'Nah'], ['habakkuk', 'Hab'], ['zephaniah', 'Zeph'],
  ['haggai', 'Hag'], ['zechariah', 'Zech'], ['malachi', 'Mal'], ['matthew', 'Matt'],
  ['mark', 'Mark'], ['luke', 'Luke'], ['john', 'John'], ['acts', 'Acts'],
  ['romans', 'Rom'], ['1corinthians', '1Cor'], ['2corinthians', '2Cor'], ['galatians', 'Gal'],
  ['ephesians', 'Eph'], ['philippians', 'Phil'], ['colossians', 'Col'], ['1thessalonians', '1Thess'],
  ['2thessalonians', '2Thess'], ['1timothy', '1Tim'], ['2timothy', '2Tim'], ['titus', 'Titus'],
  ['philemon', 'Phlm'], ['hebrews', 'Heb'], ['james', 'Jas'], ['1peter', '1Pet'],
  ['2peter', '2Pet'], ['1john', '1John'], ['2john', '2John'], ['3john', '3John'],
  ['jude', 'Jude'], ['revelation', 'Rev'],
];

async function fetchBookJson(fileCode) {
  const res = await fetch(`${RAW_BASE}/${fileCode}.json`);
  if (!res.ok) throw new Error(`Failed to fetch ${fileCode}.json: ${res.status}`);
  return res.json();
}

async function getBookId(bookKey) {
  const { data, error } = await supabase
    .from('bible_books')
    .select('id')
    .eq('book_key', bookKey)
    .is('deleted_at', null)
    .single();
  if (error || !data) throw new Error(`Book not found in bible_books: ${bookKey} (${error?.message ?? 'no row'})`);
  return data.id;
}

async function upsertChapter(bookId, chapterNumber, versesCount) {
  const { data: existing, error: selectError } = await supabase
    .from('bible_chapters')
    .select('id, verses_count')
    .eq('book_id', bookId)
    .eq('chapter_number', chapterNumber)
    .is('deleted_at', null)
    .maybeSingle();
  if (selectError) throw selectError;

  if (existing) {
    if (existing.verses_count !== versesCount) {
      const { error } = await supabase
        .from('bible_chapters')
        .update({ verses_count: versesCount })
        .eq('id', existing.id);
      if (error) throw error;
    }
    return existing.id;
  }

  const { data: inserted, error: insertError } = await supabase
    .from('bible_chapters')
    .insert({ book_id: bookId, chapter_number: chapterNumber, verses_count: versesCount })
    .select('id')
    .single();
  if (insertError) throw insertError;
  return inserted.id;
}

async function replaceChapterVerses(chapterId, bookId, verses) {
  const { error: deleteError } = await supabase
    .from('bible_verses')
    .delete()
    .eq('chapter_id', chapterId)
    .eq('translation', TRANSLATION);
  if (deleteError) throw deleteError;

  const rows = verses.map((v) => ({
    chapter_id: chapterId,
    book_id: bookId,
    verse_number: v.number,
    translation: TRANSLATION,
    text: v.text.trim(),
  }));

  for (let i = 0; i < rows.length; i += BATCH_SIZE) {
    const batch = rows.slice(i, i + BATCH_SIZE);
    const { error } = await supabase.from('bible_verses').insert(batch);
    if (error) throw error;
  }
}

async function main() {
  console.log(`Importing World English Bible (WEB) into ${SUPABASE_URL} ...`);

  await supabase
    .from('bible_translations')
    .update({ import_status: 'importing' })
    .eq('code', TRANSLATION);

  let totalVerses = 0;

  for (const [bookKey, fileCode] of BOOKS) {
    const bookId = await getBookId(bookKey);
    const book = await fetchBookJson(fileCode);

    for (const chapter of book.chapters) {
      const chapterId = await upsertChapter(bookId, chapter.chapter, chapter.verses.length);
      await replaceChapterVerses(chapterId, bookId, chapter.verses);
      totalVerses += chapter.verses.length;
    }

    console.log(`  ✓ ${book.englishName ?? bookKey} — ${book.chapters.length} chapters imported`);
  }

  await supabase
    .from('bible_translations')
    .update({ import_status: 'complete', verses_count: totalVerses })
    .eq('code', TRANSLATION);

  console.log(`\nDone. Imported ${totalVerses} verses across ${BOOKS.length} books.`);
}

main().catch(async (err) => {
  console.error('\nImport failed:', err);
  await supabase.from('bible_translations').update({ import_status: 'failed' }).eq('code', TRANSLATION);
  process.exit(1);
});
