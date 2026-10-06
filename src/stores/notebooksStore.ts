import { create } from 'zustand';
import type { Notebook } from '@/types/notes';
import { getAllRecords, putRecord, deleteRecord, enqueueSync } from '@/services/db';
import { flushSyncQueue } from '@/services/syncService';

interface NotebooksState {
  notebooks: Notebook[];
  loaded: boolean;
  loadAll: () => Promise<void>;
  createNotebook: (userId: string, name: string, color?: string) => Promise<Notebook>;
  renameNotebook: (id: string, name: string) => Promise<void>;
  deleteNotebook: (id: string) => Promise<void>;
  toggleFavorite: (id: string) => Promise<void>;
}

function genId() {
  return crypto.randomUUID();
}

export const useNotebooksStore = create<NotebooksState>((set, get) => ({
  notebooks: [],
  loaded: false,
  loadAll: async () => {
    const notebooks = await getAllRecords<Notebook>('notebooks');
    set({ notebooks: notebooks.filter((n) => !n.deleted), loaded: true });
  },
  createNotebook: async (userId, name, color) => {
    const now = new Date().toISOString();
    const record: Notebook = {
      id: genId(),
      userId,
      name,
      color,
      createdAt: now,
      updatedAt: now,
    };
    await putRecord('notebooks', record);
    await enqueueSync({ id: genId(), table: 'notebooks', op: 'upsert', payload: record, createdAt: now });
    set({ notebooks: [...get().notebooks, record] });
    void flushSyncQueue();
    return record;
  },
  renameNotebook: async (id, name) => {
    const existing = get().notebooks.find((n) => n.id === id);
    if (!existing) return;
    const now = new Date().toISOString();
    const record: Notebook = { ...existing, name, updatedAt: now };
    await putRecord('notebooks', record);
    await enqueueSync({ id: genId(), table: 'notebooks', op: 'upsert', payload: record, createdAt: now });
    set({ notebooks: [...get().notebooks.filter((n) => n.id !== id), record] });
    void flushSyncQueue();
  },
  deleteNotebook: async (id) => {
    await deleteRecord('notebooks', id);
    await enqueueSync({ id: genId(), table: 'notebooks', op: 'delete', payload: { id }, createdAt: new Date().toISOString() });
    set({ notebooks: get().notebooks.filter((n) => n.id !== id) });
    void flushSyncQueue();
  },
  toggleFavorite: async (id) => {
    const existing = get().notebooks.find((n) => n.id === id);
    if (!existing) return;
    const now = new Date().toISOString();
    const record: Notebook = { ...existing, isFavorite: !existing.isFavorite, updatedAt: now };
    await putRecord('notebooks', record);
    await enqueueSync({ id: genId(), table: 'notebooks', op: 'upsert', payload: record, createdAt: now });
    set({ notebooks: [...get().notebooks.filter((n) => n.id !== id), record] });
    void flushSyncQueue();
  },
}));

export const DEFAULT_NOTEBOOKS = [
  'Faith',
  'Prayer',
  'Healing',
  'Marriage',
  'Leadership',
  'Bible School',
  'Conference',
  'Sunday Service',
];
