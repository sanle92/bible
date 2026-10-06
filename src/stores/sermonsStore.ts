import { create } from 'zustand';
import type { Sermon } from '@/types/sermons';
import { getAllRecords, putRecord, deleteRecord, enqueueSync } from '@/services/db';
import { flushSyncQueue } from '@/services/syncService';

interface SermonsState {
  sermons: Sermon[];
  loaded: boolean;
  loadAll: () => Promise<void>;
  upsertSermon: (sermon: Partial<Sermon> & Pick<Sermon, 'userId' | 'title' | 'date'>) => Promise<Sermon>;
  deleteSermon: (id: string) => Promise<void>;
  toggleFavorite: (id: string) => Promise<void>;
  duplicateSermon: (id: string) => Promise<Sermon>;
  searchSermons: (query: string) => Sermon[];
  searchByVerse: (verseReference: string) => Sermon[];
}

function genId() {
  return crypto.randomUUID();
}

export const useSermonsStore = create<SermonsState>((set, get) => ({
  sermons: [],
  loaded: false,
  loadAll: async () => {
    const sermons = await getAllRecords<Sermon>('sermons');
    set({ sermons: sermons.filter((s) => !s.deleted), loaded: true });
  },
  upsertSermon: async (input) => {
    const now = new Date().toISOString();
    const record: Sermon = {
      id: input.id ?? genId(),
      userId: input.userId,
      title: input.title,
      speaker: input.speaker,
      church: input.church,
      location: input.location,
      date: input.date,
      theme: input.theme,
      mainVerse: input.mainVerse,
      supportingVerses: input.supportingVerses ?? [],
      outline: input.outline,
      notes: input.notes,
      application: input.application,
      prayer: input.prayer,
      content: input.content,
      tags: input.tags ?? [],
      themeIds: input.themeIds ?? [],
      attachments: input.attachments ?? [],
      isFavorite: input.isFavorite ?? false,
      createdAt: input.createdAt ?? now,
      updatedAt: now,
    };
    await putRecord('sermons', record);
    await enqueueSync({ id: genId(), table: 'sermons', op: 'upsert', payload: record, createdAt: now });
    set({ sermons: [record, ...get().sermons.filter((s) => s.id !== record.id)] });
    void flushSyncQueue();
    return record;
  },
  deleteSermon: async (id) => {
    await deleteRecord('sermons', id);
    await enqueueSync({ id: genId(), table: 'sermons', op: 'delete', payload: { id }, createdAt: new Date().toISOString() });
    set({ sermons: get().sermons.filter((s) => s.id !== id) });
    void flushSyncQueue();
  },
  toggleFavorite: async (id) => {
    const existing = get().sermons.find((s) => s.id === id);
    if (!existing) throw new Error('Sermon not found');
    const now = new Date().toISOString();
    const record: Sermon = { ...existing, isFavorite: !existing.isFavorite, updatedAt: now };
    await putRecord('sermons', record);
    await enqueueSync({ id: genId(), table: 'sermons', op: 'upsert', payload: record, createdAt: now });
    set({ sermons: [record, ...get().sermons.filter((s) => s.id !== id)] });
    void flushSyncQueue();
  },
  duplicateSermon: async (id) => {
    const existing = get().sermons.find((s) => s.id === id);
    if (!existing) throw new Error('Sermon not found');
    const now = new Date().toISOString();
    const record: Sermon = {
      ...existing,
      id: genId(),
      title: `${existing.title} (Copy)`,
      isFavorite: false,
      createdAt: now,
      updatedAt: now,
    };
    await putRecord('sermons', record);
    await enqueueSync({ id: genId(), table: 'sermons', op: 'upsert', payload: record, createdAt: now });
    set({ sermons: [record, ...get().sermons] });
    void flushSyncQueue();
    return record;
  },
  searchSermons: (query) => {
    const q = query.trim().toLowerCase();
    if (!q) return get().sermons;
    return get().sermons.filter((s) => {
      const haystack = [
        s.title,
        s.speaker,
        s.church,
        s.location,
        s.theme,
        s.mainVerse,
        s.outline,
        s.notes,
        s.application,
        s.prayer,
        s.content,
        ...s.tags,
      ]
        .filter(Boolean)
        .join(' ')
        .toLowerCase();
      return haystack.includes(q);
    });
  },
  searchByVerse: (verseReference) => {
    const ref = verseReference.toLowerCase();
    return get().sermons.filter((s) => {
      const haystack = [
        s.mainVerse,
        ...(s.supportingVerses ?? []),
        s.outline,
        s.notes,
        s.application,
        s.content,
      ]
        .filter(Boolean)
        .join(' ')
        .toLowerCase();
      return haystack.includes(ref);
    });
  },
}));
