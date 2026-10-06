import { create } from 'zustand';
import type { PrayerEntry, PrayerHistoryItem, PrayerStatus } from '@/types/prayer';
import { getAllRecords, putRecord, deleteRecord, enqueueSync } from '@/services/db';
import { flushSyncQueue } from '@/services/syncService';

interface PrayerState {
  entries: PrayerEntry[];
  loaded: boolean;
  loadAll: () => Promise<void>;
  upsertEntry: (entry: Partial<PrayerEntry> & Pick<PrayerEntry, 'userId' | 'title' | 'content' | 'category'>) => Promise<PrayerEntry>;
  setStatus: (id: string, status: PrayerStatus, note?: string) => Promise<void>;
  deleteEntry: (id: string) => Promise<void>;
}

function genId() {
  return crypto.randomUUID();
}

export const usePrayerStore = create<PrayerState>((set, get) => ({
  entries: [],
  loaded: false,
  loadAll: async () => {
    const entries = await getAllRecords<PrayerEntry>('prayers');
    set({ entries: entries.filter((e) => !e.deleted), loaded: true });
  },
  upsertEntry: async (input) => {
    const now = new Date().toISOString();
    const record: PrayerEntry = {
      id: input.id ?? genId(),
      userId: input.userId,
      title: input.title,
      content: input.content,
      scripture: input.scripture,
      category: input.category,
      status: input.status ?? 'pending',
      priority: input.priority ?? 'medium',
      reminder: input.reminder ?? null,
      images: input.images ?? [],
      voiceNote: input.voiceNote,
      history: input.history ?? [{ id: genId(), status: input.status ?? 'pending', createdAt: now }],
      themeIds: input.themeIds ?? [],
      createdAt: input.createdAt ?? now,
      updatedAt: now,
    };
    await putRecord('prayers', record);
    await enqueueSync({ id: genId(), table: 'prayer_requests', op: 'upsert', payload: record, createdAt: now });
    set({ entries: [record, ...get().entries.filter((e) => e.id !== record.id)] });
    void flushSyncQueue();
    return record;
  },
  setStatus: async (id, status, note) => {
    const entry = get().entries.find((e) => e.id === id);
    if (!entry) return;
    const now = new Date().toISOString();
    const historyItem: PrayerHistoryItem = { id: genId(), status, note, createdAt: now };
    const updated: PrayerEntry = {
      ...entry,
      status,
      history: [...(entry.history ?? []), historyItem],
      updatedAt: now,
    };
    await putRecord('prayers', updated);
    await enqueueSync({ id: genId(), table: 'prayer_requests', op: 'upsert', payload: updated, createdAt: now });
    set({ entries: get().entries.map((e) => (e.id === id ? updated : e)) });
    void flushSyncQueue();
  },
  deleteEntry: async (id) => {
    await deleteRecord('prayers', id);
    await enqueueSync({ id: genId(), table: 'prayer_requests', op: 'delete', payload: { id }, createdAt: new Date().toISOString() });
    set({ entries: get().entries.filter((e) => e.id !== id) });
    void flushSyncQueue();
  },
}));
