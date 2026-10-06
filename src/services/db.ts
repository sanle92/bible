import { openDB, type IDBPDatabase, type DBSchema } from 'idb';
import type { Note, Notebook } from '@/types/notes';
import type { Sermon } from '@/types/sermons';
import type { PrayerEntry } from '@/types/prayer';
import type { JournalEntry } from '@/types/journal';
import type { ReadingPlan, ReadingPlanDay, ReadingProgress } from '@/types/readingPlan';
import type { Theme } from '@/types/themes';
import type { Highlight, VerseNote, Bookmark, BibleChapter } from '@/types/bible';

interface BibleDBSchema extends DBSchema {
  notes: { key: string; value: Note; indexes: { updatedAt: string; notebookId: string } };
  notebooks: { key: string; value: Notebook; indexes: { updatedAt: string } };
  sermons: { key: string; value: Sermon; indexes: { updatedAt: string } };
  prayers: { key: string; value: PrayerEntry; indexes: { updatedAt: string } };
  journal: { key: string; value: JournalEntry; indexes: { updatedAt: string; date: string } };
  readingPlans: { key: string; value: ReadingPlan; indexes: { updatedAt: string } };
  readingPlanDays: { key: string; value: ReadingPlanDay; indexes: { updatedAt: string; planId: string } };
  readingProgress: { key: string; value: ReadingProgress; indexes: { updatedAt: string; planId: string } };
  themes: { key: string; value: Theme; indexes: { updatedAt: string } };
  highlights: {
    key: string;
    value: Highlight;
    indexes: {
      ref: string;
      color: Highlight['color'];
      category: string;
      date: string;
      notebookName: string;
      tags: string;
    };
  };
  verseNotes: { key: string; value: VerseNote; indexes: { ref: string } };
  bookmarks: { key: string; value: Bookmark };
  chapterCache: { key: string; value: { cacheKey: string; chapter: BibleChapter } };
  syncQueue: { key: string; value: SyncQueueItem };
}

export interface SyncQueueItem {
  id: string;
  table: 'notes' | 'notebooks' | 'sermons' | 'prayers' | 'prayer_requests' | 'journal_entries' | 'reading_plans' | 'reading_plan_days' | 'reading_progress' | 'themes' | 'highlights' | 'verseNotes' | 'bookmarks';
  op: 'upsert' | 'delete';
  payload: unknown;
  createdAt: string;
  attempts?: number;
  error?: string;
  scheduledAt?: string;
}

const DB_NAME = 'bible-study-workspace';
const DB_VERSION = 4;

let dbPromise: Promise<IDBPDatabase<BibleDBSchema>> | null = null;

export function getDB() {
  if (!dbPromise) {
    dbPromise = openDB<BibleDBSchema>(DB_NAME, DB_VERSION, {
      upgrade(db, oldVersion, _newVersion, transaction) {
        if (!db.objectStoreNames.contains('notes')) {
          const s = db.createObjectStore('notes', { keyPath: 'id' });
          s.createIndex('updatedAt', 'updatedAt');
          s.createIndex('notebookId', 'notebookId');
        } else if (oldVersion < 3) {
          const s = transaction.objectStore('notes');
          if (!s.indexNames.contains('notebookId')) s.createIndex('notebookId', 'notebookId');
        }
        if (!db.objectStoreNames.contains('notebooks')) {
          const s = db.createObjectStore('notebooks', { keyPath: 'id' });
          s.createIndex('updatedAt', 'updatedAt');
        }
        if (!db.objectStoreNames.contains('sermons')) {
          const s = db.createObjectStore('sermons', { keyPath: 'id' });
          s.createIndex('updatedAt', 'updatedAt');
        }
        if (!db.objectStoreNames.contains('prayers')) {
          const s = db.createObjectStore('prayers', { keyPath: 'id' });
          s.createIndex('updatedAt', 'updatedAt');
        }
        if (!db.objectStoreNames.contains('themes')) {
          const s = db.createObjectStore('themes', { keyPath: 'id' });
          s.createIndex('updatedAt', 'updatedAt');
        }
        if (!db.objectStoreNames.contains('journal')) {
          const s = db.createObjectStore('journal', { keyPath: 'id' });
          s.createIndex('updatedAt', 'updatedAt');
          s.createIndex('date', 'date');
        }
        if (!db.objectStoreNames.contains('readingPlans')) {
          const s = db.createObjectStore('readingPlans', { keyPath: 'id' });
          s.createIndex('updatedAt', 'updatedAt');
        }
        if (!db.objectStoreNames.contains('readingPlanDays')) {
          const s = db.createObjectStore('readingPlanDays', { keyPath: 'id' });
          s.createIndex('updatedAt', 'updatedAt');
          s.createIndex('planId', 'planId');
        }
        if (!db.objectStoreNames.contains('readingProgress')) {
          const s = db.createObjectStore('readingProgress', { keyPath: 'id' });
          s.createIndex('updatedAt', 'updatedAt');
          s.createIndex('planId', 'planId');
        }
        if (!db.objectStoreNames.contains('highlights')) {
          const s = db.createObjectStore('highlights', { keyPath: 'id' });
          s.createIndex('ref', 'ref');
          s.createIndex('color', 'color');
          s.createIndex('category', 'category');
          s.createIndex('date', 'date');
          s.createIndex('notebookName', 'notebookName');
          s.createIndex('tags', 'tags', { multiEntry: true });
        } else if (oldVersion < 2) {
          const s = transaction.objectStore('highlights');
          if (!s.indexNames.contains('color')) s.createIndex('color', 'color');
          if (!s.indexNames.contains('category')) s.createIndex('category', 'category');
          if (!s.indexNames.contains('date')) s.createIndex('date', 'date');
          if (!s.indexNames.contains('notebookName')) s.createIndex('notebookName', 'notebookName');
          if (!s.indexNames.contains('tags')) s.createIndex('tags', 'tags', { multiEntry: true });
        }
        if (!db.objectStoreNames.contains('verseNotes')) {
          const s = db.createObjectStore('verseNotes', { keyPath: 'id' });
          s.createIndex('ref', 'ref');
        }
        if (!db.objectStoreNames.contains('bookmarks')) {
          db.createObjectStore('bookmarks', { keyPath: 'id' });
        }
        if (!db.objectStoreNames.contains('chapterCache')) {
          db.createObjectStore('chapterCache', { keyPath: 'cacheKey' });
        }
        if (!db.objectStoreNames.contains('syncQueue')) {
          db.createObjectStore('syncQueue', { keyPath: 'id' });
        }
      },
    });
  }
  return dbPromise;
}

type RecordStore = 'notes' | 'notebooks' | 'sermons' | 'prayers' | 'journal' | 'readingPlans' | 'readingPlanDays' | 'readingProgress' | 'themes' | 'highlights' | 'verseNotes' | 'bookmarks' | 'chapterCache';

export async function putRecord<T extends { id: string }>(store: RecordStore, value: T) {
  const db = await getDB();
  await (db as unknown as { put: (s: string, v: T) => Promise<string> }).put(store, value);
}

export async function deleteRecord(store: RecordStore, id: string) {
  const db = await getDB();
  await (db as unknown as { delete: (s: string, k: string) => Promise<void> }).delete(store, id);
}

export async function getAllRecords<T>(store: RecordStore): Promise<T[]> {
  const db = await getDB();
  return (db as unknown as { getAll: (s: string) => Promise<T[]> }).getAll(store);
}

function isValidUuid(value: string): boolean {
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(value);
}

export async function enqueueSync(item: SyncQueueItem) {
  const payload = item.payload as Record<string, unknown> | undefined;
  const userId = payload?.userId ?? payload?.user_id;
  if (userId !== undefined && typeof userId === 'string' && !isValidUuid(userId)) {
    // Local-only user (e.g. 'local-user'): don't try to sync to Supabase.
    return;
  }
  const db = await getDB();
  await db.put('syncQueue', item);
}

export async function getSyncQueue(): Promise<SyncQueueItem[]> {
  const db = await getDB();
  return db.getAll('syncQueue');
}

export async function clearSyncItem(id: string) {
  const db = await getDB();
  await db.delete('syncQueue', id);
}

export async function updateSyncItem(item: SyncQueueItem) {
  const db = await getDB();
  await db.put('syncQueue', item);
}

export async function cacheChapter(key: string, chapter: BibleChapter) {
  const db = await getDB();
  await db.put('chapterCache', { cacheKey: key, chapter });
}

export async function getCachedChapter(key: string): Promise<BibleChapter | undefined> {
  const db = await getDB();
  const record = await db.get('chapterCache', key);
  return record?.chapter;
}
