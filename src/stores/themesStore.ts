import { create } from 'zustand';
import type { Theme } from '@/types/themes';
import { getAllRecords, putRecord, deleteRecord, enqueueSync } from '@/services/db';
import { flushSyncQueue } from '@/services/syncService';

interface ThemesState {
  themes: Theme[];
  loaded: boolean;
  loadAll: () => Promise<void>;
  createTheme: (userId: string, name: string, parentId?: string | null, color?: string) => Promise<Theme>;
  renameTheme: (id: string, name: string) => Promise<void>;
  deleteTheme: (id: string) => Promise<void>;
}

function genId() {
  return crypto.randomUUID();
}

export const useThemesStore = create<ThemesState>((set, get) => ({
  themes: [],
  loaded: false,
  loadAll: async () => {
    const themes = await getAllRecords<Theme>('themes');
    set({ themes: themes.filter((t) => !t.deleted), loaded: true });
  },
  createTheme: async (userId, name, parentId = null, color) => {
    const now = new Date().toISOString();
    const record: Theme = {
      id: genId(),
      userId,
      name,
      parentId,
      color,
      createdAt: now,
      updatedAt: now,
    };
    await putRecord('themes', record);
    await enqueueSync({ id: genId(), table: 'themes', op: 'upsert', payload: record, createdAt: now });
    set({ themes: [...get().themes, record] });
    void flushSyncQueue();
    return record;
  },
  renameTheme: async (id, name) => {
    const existing = get().themes.find((t) => t.id === id);
    if (!existing) return;
    const now = new Date().toISOString();
    const record: Theme = { ...existing, name, updatedAt: now };
    await putRecord('themes', record);
    await enqueueSync({ id: genId(), table: 'themes', op: 'upsert', payload: record, createdAt: now });
    set({ themes: [...get().themes.filter((t) => t.id !== id), record] });
    void flushSyncQueue();
  },
  deleteTheme: async (id) => {
    await deleteRecord('themes', id);
    await enqueueSync({ id: genId(), table: 'themes', op: 'delete', payload: { id }, createdAt: new Date().toISOString() });
    set({ themes: get().themes.filter((t) => t.id !== id) });
    void flushSyncQueue();
  },
}));

export function getThemeColor(name: string) {
  const palette = [
    '#ef4444',
    '#f97316',
    '#f59e0b',
    '#84cc16',
    '#10b981',
    '#06b6d4',
    '#3b82f6',
    '#6366f1',
    '#8b5cf6',
    '#d946ef',
    '#f43f5e',
    '#14b8a6',
  ];
  let hash = 0;
  for (let i = 0; i < name.length; i++) hash = name.charCodeAt(i) + ((hash << 5) - hash);
  return palette[Math.abs(hash) % palette.length];
}
