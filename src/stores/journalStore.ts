import { create } from 'zustand';
import type { JournalEntry, JournalMood } from '@/types/journal';
import { getAllRecords, putRecord, deleteRecord, enqueueSync } from '@/services/db';
import { flushSyncQueue } from '@/services/syncService';

interface JournalState {
  entries: JournalEntry[];
  loaded: boolean;
  loadAll: () => Promise<void>;
  upsertEntry: (entry: Partial<JournalEntry> & Pick<JournalEntry, 'userId' | 'title' | 'date' | 'reflection'>) => Promise<JournalEntry>;
  deleteEntry: (id: string) => Promise<void>;
  searchEntries: (query: string) => JournalEntry[];
}

function genId() {
  return crypto.randomUUID();
}

export const useJournalStore = create<JournalState>((set, get) => ({
  entries: [],
  loaded: false,
  loadAll: async () => {
    const entries = await getAllRecords<JournalEntry>('journal');
    set({ entries: entries.filter((e) => !e.deleted), loaded: true });
  },
  upsertEntry: async (input) => {
    const now = new Date().toISOString();
    const record: JournalEntry = {
      id: input.id ?? genId(),
      userId: input.userId,
      title: input.title,
      date: input.date,
      scripture: input.scripture,
      reflection: input.reflection,
      application: input.application,
      prayer: input.prayer,
      mood: input.mood,
      tags: input.tags ?? [],
      images: input.images ?? [],
      voiceNote: input.voiceNote,
      isPrivate: input.isPrivate ?? false,
      themeIds: input.themeIds ?? [],
      createdAt: input.createdAt ?? now,
      updatedAt: now,
    };
    await putRecord('journal', record);
    await enqueueSync({ id: genId(), table: 'journal_entries', op: 'upsert', payload: record, createdAt: now });
    set({ entries: [record, ...get().entries.filter((e) => e.id !== record.id)] });
    void flushSyncQueue();
    return record;
  },
  deleteEntry: async (id) => {
    await deleteRecord('journal', id);
    await enqueueSync({ id: genId(), table: 'journal_entries', op: 'delete', payload: { id }, createdAt: new Date().toISOString() });
    set({ entries: get().entries.filter((e) => e.id !== id) });
    void flushSyncQueue();
  },
  searchEntries: (query) => {
    const q = query.trim().toLowerCase();
    if (!q) return get().entries;
    return get().entries.filter((e) => {
      const haystack = [
        e.date,
        e.scripture,
        e.reflection,
        e.application,
        e.prayer,
        e.mood,
        ...e.tags,
      ]
        .filter(Boolean)
        .join(' ')
        .toLowerCase();
      return haystack.includes(q);
    });
  },
}));

export const JOURNAL_MOODS: { value: JournalMood; emoji: string; label: string }[] = [
  { value: 'joyful', emoji: '😄', label: 'Joyful' },
  { value: 'grateful', emoji: '🙏', label: 'Grateful' },
  { value: 'peaceful', emoji: '😌', label: 'Peaceful' },
  { value: 'hopeful', emoji: '🌅', label: 'Hopeful' },
  { value: 'neutral', emoji: '😐', label: 'Neutral' },
  { value: 'anxious', emoji: '😰', label: 'Anxious' },
  { value: 'sad', emoji: '😢', label: 'Sad' },
  { value: 'angry', emoji: '😠', label: 'Angry' },
];
