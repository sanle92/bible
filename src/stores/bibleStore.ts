import { create } from 'zustand';
import type { Highlight, VerseNote, Bookmark, NoteVersion } from '@/types/bible';
import { getAllRecords, putRecord, deleteRecord, enqueueSync } from '@/services/db';
import { flushSyncQueue } from '@/services/syncService';
import { getBookById } from '@/utils/bibleData';

interface BibleState {
  highlights: Highlight[];
  verseNotes: VerseNote[];
  bookmarks: Bookmark[];
  loaded: boolean;
  lastDeletedHighlight: Highlight | null;
  loadAll: () => Promise<void>;
  toggleHighlight: (
    userId: string,
    ref: { bookId: string; chapter: number; verse: number },
    color: Highlight['color']
  ) => Promise<void>;
  updateHighlight: (id: string, updates: Partial<Highlight>) => Promise<void>;
  removeHighlight: (id: string) => Promise<void>;
  undoDeleteHighlight: () => Promise<void>;
  searchHighlights: (query: string) => Highlight[];
  verseNotesFor: (ref: { bookId: string; chapter: number; verse: number }) => VerseNote[];
  saveVerseNote: (note: VerseNote) => Promise<void>;
  createVerseNote: (
    userId: string,
    ref: { bookId: string; chapter: number; verse: number },
    title?: string,
    content?: string
  ) => Promise<VerseNote>;
  deleteVerseNote: (id: string) => Promise<void>;
  addBookmark: (userId: string, bookId: string, chapter: number, verse?: number, label?: string) => Promise<void>;
  removeBookmark: (id: string) => Promise<void>;
}

function genId() {
  return crypto.randomUUID();
}

function formatVerseRef(h: Highlight) {
  const book = getBookById(h.bookId);
  return `${book?.name ?? h.bookId} ${h.chapter}:${h.verse}`;
}

export const useBibleStore = create<BibleState>((set, get) => ({
  highlights: [],
  verseNotes: [],
  bookmarks: [],
  loaded: false,
  lastDeletedHighlight: null,
  loadAll: async () => {
    const [highlights, verseNotes, bookmarks] = await Promise.all([
      getAllRecords<Highlight>('highlights'),
      getAllRecords<VerseNote>('verseNotes'),
      getAllRecords<Bookmark>('bookmarks'),
    ]);
    set({ highlights, verseNotes, bookmarks, loaded: true });
  },
  toggleHighlight: async (userId, ref, color) => {
    const existing = get().highlights.find(
      (h) => h.bookId === ref.bookId && h.chapter === ref.chapter && h.verse === ref.verse
    );
    const now = new Date().toISOString();
    if (existing && existing.color === color) {
      await deleteRecord('highlights', existing.id);
      await enqueueSync({ id: genId(), table: 'highlights', op: 'delete', payload: { id: existing.id }, createdAt: now });
      set({ highlights: get().highlights.filter((h) => h.id !== existing.id), lastDeletedHighlight: existing });
    } else {
      const record: Highlight = {
        id: existing?.id ?? genId(),
        userId,
        bookId: ref.bookId,
        chapter: ref.chapter,
        verse: ref.verse,
        color,
        category: existing?.category,
        date: existing?.date,
        notebookName: existing?.notebookName,
        tags: existing?.tags,
        themeIds: existing?.themeIds,
        createdAt: existing?.createdAt ?? now,
        updatedAt: now,
      };
      await putRecord('highlights', record);
      await enqueueSync({ id: genId(), table: 'highlights', op: 'upsert', payload: record, createdAt: now });
      set({
        highlights: [...get().highlights.filter((h) => h.id !== record.id), record],
        lastDeletedHighlight: null,
      });
    }
    void flushSyncQueue();
  },
  updateHighlight: async (id, updates) => {
    const existing = get().highlights.find((h) => h.id === id);
    if (!existing) return;
    const now = new Date().toISOString();
    const record: Highlight = { ...existing, ...updates, updatedAt: now };
    await putRecord('highlights', record);
    await enqueueSync({ id: genId(), table: 'highlights', op: 'upsert', payload: record, createdAt: now });
    set({ highlights: [...get().highlights.filter((h) => h.id !== id), record] });
    void flushSyncQueue();
  },
  removeHighlight: async (id) => {
    const existing = get().highlights.find((h) => h.id === id);
    if (!existing) return;
    await deleteRecord('highlights', id);
    await enqueueSync({ id: genId(), table: 'highlights', op: 'delete', payload: { id }, createdAt: new Date().toISOString() });
    set({ highlights: get().highlights.filter((h) => h.id !== id), lastDeletedHighlight: existing });
    void flushSyncQueue();
  },
  undoDeleteHighlight: async () => {
    const deleted = get().lastDeletedHighlight;
    if (!deleted) return;
    await putRecord('highlights', deleted);
    await enqueueSync({ id: genId(), table: 'highlights', op: 'upsert', payload: deleted, createdAt: new Date().toISOString() });
    set({ highlights: [...get().highlights, deleted], lastDeletedHighlight: null });
    void flushSyncQueue();
  },
  searchHighlights: (query) => {
    const q = query.trim().toLowerCase();
    if (!q) return get().highlights;
    return get().highlights.filter((h) => {
      const ref = formatVerseRef(h).toLowerCase();
      return (
        ref.includes(q) ||
        h.color.toLowerCase().includes(q) ||
        (h.category?.toLowerCase() ?? '').includes(q) ||
        (h.date?.toLowerCase() ?? '').includes(q) ||
        (h.notebookName?.toLowerCase() ?? '').includes(q) ||
        h.tags?.some((t) => t.toLowerCase().includes(q))
      );
    });
  },
  verseNotesFor: (ref) => {
    return get().verseNotes
      .filter((n) => n.bookId === ref.bookId && n.chapter === ref.chapter && n.verse === ref.verse)
      .sort((a, b) => b.updatedAt.localeCompare(a.updatedAt));
  },
  saveVerseNote: async (note) => {
    const now = new Date().toISOString();
    const previousContent = note.content;
    const version: NoteVersion = { content: previousContent, createdAt: note.updatedAt };
    const record: VerseNote = {
      ...note,
      updatedAt: now,
      versions: [...(note.versions ?? []).slice(0, 19), version],
    };
    await putRecord('verseNotes', record);
    await enqueueSync({ id: genId(), table: 'verseNotes', op: 'upsert', payload: record, createdAt: now });
    set({ verseNotes: [...get().verseNotes.filter((n) => n.id !== record.id), record] });
    void flushSyncQueue();
  },
  createVerseNote: async (userId, ref, title = '', content = '') => {
    const now = new Date().toISOString();
    const record: VerseNote = {
      id: genId(),
      userId,
      bookId: ref.bookId,
      chapter: ref.chapter,
      verse: ref.verse,
      title,
      content,
      attachments: [],
      versions: [],
      themeIds: [],
      createdAt: now,
      updatedAt: now,
    };
    await putRecord('verseNotes', record);
    await enqueueSync({ id: genId(), table: 'verseNotes', op: 'upsert', payload: record, createdAt: now });
    set({ verseNotes: [...get().verseNotes, record] });
    void flushSyncQueue();
    return record;
  },
  deleteVerseNote: async (id) => {
    await deleteRecord('verseNotes', id);
    await enqueueSync({ id: genId(), table: 'verseNotes', op: 'delete', payload: { id }, createdAt: new Date().toISOString() });
    set({ verseNotes: get().verseNotes.filter((n) => n.id !== id) });
    void flushSyncQueue();
  },
  addBookmark: async (userId, bookId, chapter, verse, label) => {
    const now = new Date().toISOString();
    const record: Bookmark = { id: genId(), userId, bookId, chapter, verse, label, createdAt: now };
    await putRecord('bookmarks', record);
    await enqueueSync({ id: genId(), table: 'bookmarks', op: 'upsert', payload: record, createdAt: now });
    set({ bookmarks: [...get().bookmarks, record] });
    void flushSyncQueue();
  },
  removeBookmark: async (id) => {
    await deleteRecord('bookmarks', id);
    await enqueueSync({ id: genId(), table: 'bookmarks', op: 'delete', payload: { id }, createdAt: new Date().toISOString() });
    set({ bookmarks: get().bookmarks.filter((b) => b.id !== id) });
    void flushSyncQueue();
  },
}));
