import { useEffect, useMemo, useState } from 'react';
import { useNotesStore } from '@/stores/notesStore';
import { useNotebooksStore } from '@/stores/notebooksStore';
import { useSermonsStore } from '@/stores/sermonsStore';
import { usePrayerStore } from '@/stores/prayerStore';
import { useJournalStore } from '@/stores/journalStore';
import { useThemesStore } from '@/stores/themesStore';
import { useBibleStore } from '@/stores/bibleStore';
import { BIBLE_BOOKS } from '@/utils/bibleData';
import { getBookById } from '@/utils/bibleData';
import type { BibleVerse } from '@/types/bible';
import { getAllRecords } from '@/services/db';

export type SearchResultType =
  | 'verse'
  | 'book'
  | 'chapter'
  | 'note'
  | 'notebook'
  | 'sermon'
  | 'prayer'
  | 'journal'
  | 'highlight'
  | 'theme';

export interface GlobalSearchResult {
  id: string;
  type: SearchResultType;
  title: string;
  subtitle?: string;
  href?: string;
  data?: unknown;
}

function parseRef(query: string): { bookId?: string; chapter?: number; verse?: number } | null {
  const normalized = query.trim();
  // Match "John 3:16" or "1 John 2:3"
  const match = normalized.match(/^(\d?\s*[a-zA-Z]+)\s+(\d+)(?::(\d+))?$/);
  if (!match) return null;
  const name = match[1].replace(/\s+/g, '').toLowerCase();
  const chapter = parseInt(match[2], 10);
  const verse = match[3] ? parseInt(match[3], 10) : undefined;

  const book = BIBLE_BOOKS.find((b) => b.id.toLowerCase() === name || b.name.toLowerCase() === name.toLowerCase());
  if (!book) return null;
  return { bookId: book.id, chapter, verse };
}

export function useGlobalSearch(query: string) {
  const { notes, loaded: notesLoaded, loadAll: loadNotes } = useNotesStore();
  const { notebooks, loaded: notebooksLoaded, loadAll: loadNotebooks } = useNotebooksStore();
  const { sermons, loaded: sermonsLoaded, loadAll: loadSermons } = useSermonsStore();
  const { entries: prayers, loaded: prayersLoaded, loadAll: loadPrayers } = usePrayerStore();
  const { entries: journals, loaded: journalsLoaded, loadAll: loadJournals } = useJournalStore();
  const { themes, loaded: themesLoaded, loadAll: loadThemes } = useThemesStore();
  const { highlights, verseNotes, bookmarks, loaded: bibleLoaded, loadAll: loadBible } = useBibleStore();
  const [cachedVerses, setCachedVerses] = useState<BibleVerse[]>([]);

  useEffect(() => {
    if (!notesLoaded) void loadNotes();
    if (!notebooksLoaded) void loadNotebooks();
    if (!sermonsLoaded) void loadSermons();
    if (!prayersLoaded) void loadPrayers();
    if (!journalsLoaded) void loadJournals();
    if (!themesLoaded) void loadThemes();
    if (!bibleLoaded) void loadBible();
  }, [
    notesLoaded,
    loadNotes,
    notebooksLoaded,
    loadNotebooks,
    sermonsLoaded,
    loadSermons,
    prayersLoaded,
    loadPrayers,
    journalsLoaded,
    loadJournals,
    themesLoaded,
    loadThemes,
    bibleLoaded,
    loadBible,
  ]);

  useEffect(() => {
    let mounted = true;
    getAllRecords<{ chapter: { verses: BibleVerse[] } }>('chapterCache').then((records) => {
      if (!mounted) return;
      const verses: BibleVerse[] = [];
      for (const r of records) {
        if (r.chapter?.verses) verses.push(...r.chapter.verses);
      }
      setCachedVerses(verses);
    });
    return () => {
      mounted = false;
    };
  }, []);

  const results = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return [];

    const out: GlobalSearchResult[] = [];
    const ref = parseRef(q);

    // Books and chapters
    for (const book of BIBLE_BOOKS) {
      if (book.name.toLowerCase().includes(q) || book.id.toLowerCase().includes(q)) {
        out.push({
          id: `book-${book.id}`,
          type: 'book',
          title: book.name,
          subtitle: `${book.testament === 'OT' ? 'Old' : 'New'} Testament · ${book.chapters} chapters`,
          href: `/read/${book.id}/1`,
        });
      }
      if (ref?.bookId === book.id && ref.chapter) {
        out.push({
          id: `chapter-${book.id}-${ref.chapter}`,
          type: 'chapter',
          title: `${book.name} ${ref.chapter}`,
          href: `/read/${book.id}/${ref.chapter}`,
        });
      }
    }

    // Cached verses
    const verseMatches = new Set<string>();
    for (const verse of cachedVerses) {
      const refStr = `${verse.book} ${verse.chapter}:${verse.verse}`;
      const key = `${verse.bookId}-${verse.chapter}-${verse.verse}`;
      if (verseMatches.has(key)) continue;
      const textMatch = verse.text.toLowerCase().includes(q);
      const refMatch = ref && verse.bookId === ref.bookId && verse.chapter === ref.chapter && (!ref.verse || verse.verse === ref.verse);
      if (textMatch || refMatch) {
        verseMatches.add(key);
        out.push({
          id: `verse-${key}`,
          type: 'verse',
          title: refStr,
          subtitle: verse.text.slice(0, 120),
          href: `/read/${verse.bookId}/${verse.verse ? verse.chapter : verse.chapter}?verse=${verse.verse ?? 1}`,
          data: verse,
        });
      }
    }

    // Notes
    for (const note of notes) {
      const haystack = [note.title, note.content, note.tags.join(' '), note.reference ?? ''].join(' ').toLowerCase();
      if (haystack.includes(q)) {
        out.push({
          id: `note-${note.id}`,
          type: 'note',
          title: note.title || 'Untitled Note',
          subtitle: note.reference ? `${note.reference} · ${stripHtml(note.content).slice(0, 80)}` : stripHtml(note.content).slice(0, 100),
          href: `/notes?id=${note.id}`,
          data: note,
        });
      }
    }

    // Notebooks
    for (const nb of notebooks) {
      if (nb.name.toLowerCase().includes(q) || (nb.description && nb.description.toLowerCase().includes(q))) {
        out.push({ id: `notebook-${nb.id}`, type: 'notebook', title: nb.name, href: `/notes?notebook=${nb.id}` });
      }
    }

    // Sermons
    for (const s of sermons) {
      const haystack = [s.title, s.speaker, s.church, s.location, s.theme, s.mainVerse, s.outline, s.notes, s.application, s.prayer, s.tags.join(' ')].join(' ').toLowerCase();
      if (haystack.includes(q)) {
        out.push({ id: `sermon-${s.id}`, type: 'sermon', title: s.title, subtitle: [s.speaker, s.theme, s.mainVerse].filter(Boolean).join(' · '), href: `/sermons?id=${s.id}`, data: s });
      }
    }

    // Prayers
    for (const p of prayers) {
      const haystack = [p.title, p.content, p.scripture, p.category, p.status, p.priority, p.history?.map((h) => h.note).join(' ')].join(' ').toLowerCase();
      if (haystack.includes(q)) {
        out.push({ id: `prayer-${p.id}`, type: 'prayer', title: p.title, subtitle: `${p.category} · ${p.status}`, href: `/prayer?id=${p.id}`, data: p });
      }
    }

    // Journal
    for (const j of journals) {
      const haystack = [j.title, j.reflection, j.application, j.prayer, j.scripture, j.mood, j.tags.join(' ')].join(' ').toLowerCase();
      if (haystack.includes(q)) {
        out.push({ id: `journal-${j.id}`, type: 'journal', title: j.title, subtitle: `${j.date} · ${j.mood ?? ''}`, href: `/journal?id=${j.id}`, data: j });
      }
    }

    // Themes
    for (const t of themes) {
      if (t.name.toLowerCase().includes(q)) {
        out.push({ id: `theme-${t.id}`, type: 'theme', title: t.name, href: `/notes?theme=${t.id}` });
      }
    }

    // Verse notes
    for (const vn of verseNotes) {
      const book = getBookById(vn.bookId);
      const refStr = `${book?.name ?? vn.bookId} ${vn.chapter}:${vn.verse}`;
      const haystack = [vn.title ?? '', vn.content, refStr].join(' ').toLowerCase();
      if (haystack.includes(q)) {
        out.push({
          id: `verse-note-${vn.id}`,
          type: 'verse',
          title: `${refStr} — Verse Note`,
          subtitle: stripHtml(vn.content).slice(0, 100),
          href: `/read/${vn.bookId}/${vn.chapter}?verse=${vn.verse}`,
          data: vn,
        });
      }
    }

    // Bookmarks
    for (const b of bookmarks) {
      const book = getBookById(b.bookId);
      const refStr = b.verse ? `${book?.name ?? b.bookId} ${b.chapter}:${b.verse}` : `${book?.name ?? b.bookId} ${b.chapter}`;
      const haystack = [refStr, b.label ?? ''].join(' ').toLowerCase();
      if (haystack.includes(q)) {
        out.push({ id: `bookmark-${b.id}`, type: 'highlight', title: b.label || refStr, subtitle: refStr, href: `/read/${b.bookId}/${b.chapter}?verse=${b.verse ?? 1}`, data: b });
      }
    }

    // Highlights
    for (const h of highlights) {
      const book = getBookById(h.bookId);
      const refStr = `${book?.name ?? h.bookId} ${h.chapter}:${h.verse}`;
      const haystack = [refStr, h.category ?? '', h.notebookName ?? '', h.tags?.join(' ') ?? ''].join(' ').toLowerCase();
      if (haystack.includes(q)) {
        out.push({ id: `highlight-${h.id}`, type: 'highlight', title: refStr, subtitle: `Highlight · ${h.color}`, href: `/read/${h.bookId}/${h.chapter}?verse=${h.verse}`, data: h });
      }
    }

    return out;
  }, [query, notes, notebooks, sermons, prayers, journals, themes, highlights, cachedVerses]);

  const grouped = useMemo(() => {
    const groups: Record<SearchResultType, GlobalSearchResult[]> = {
      verse: [],
      book: [],
      chapter: [],
      note: [],
      notebook: [],
      sermon: [],
      prayer: [],
      journal: [],
      highlight: [],
      theme: [],
    };
    for (const r of results) {
      groups[r.type].push(r);
    }
    return groups;
  }, [results]);

  return { results, grouped, isLoading: !notesLoaded || !notebooksLoaded || !sermonsLoaded || !prayersLoaded || !journalsLoaded || !themesLoaded || !bibleLoaded };
}

function stripHtml(html: string) {
  if (!html) return '';
  return html.replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ').trim();
}
