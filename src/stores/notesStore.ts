import { create } from 'zustand';
import type { Note } from '@/types/notes';
import { getAllRecords, putRecord, deleteRecord, enqueueSync } from '@/services/db';
import { flushSyncQueue } from '@/services/syncService';

interface NotesState {
  notes: Note[];
  loaded: boolean;
  loadAll: () => Promise<void>;
  upsertNote: (note: Partial<Note> & Pick<Note, 'userId' | 'title' | 'content' | 'tags'>) => Promise<Note>;
  deleteNote: (id: string) => Promise<void>;
  moveNote: (id: string, notebookId: string | null) => Promise<void>;
  toggleFavorite: (id: string) => Promise<void>;
  toggleArchive: (id: string) => Promise<void>;
}

function genId() {
  return crypto.randomUUID();
}

export const useNotesStore = create<NotesState>((set, get) => ({
  notes: [],
  loaded: false,
  loadAll: async () => {
    const notes = await getAllRecords<Note>('notes');
    set({ notes: notes.filter((n) => !n.deleted), loaded: true });
  },
  upsertNote: async (input) => {
    const now = new Date().toISOString();
    const record: Note = {
      id: input.id ?? genId(),
      userId: input.userId,
      title: input.title,
      content: input.content,
      tags: input.tags,
      notebookId: input.notebookId ?? null,
      reference: input.reference ?? null,
      themeIds: input.themeIds ?? [],
      isFavorite: input.isFavorite ?? false,
      isArchived: input.isArchived ?? false,
      createdAt: input.createdAt ?? now,
      updatedAt: now,
    };
    await putRecord('notes', record);
    await enqueueSync({ id: genId(), table: 'notes', op: 'upsert', payload: record, createdAt: now });
    set({ notes: [record, ...get().notes.filter((n) => n.id !== record.id)] });
    void flushSyncQueue();
    return record;
  },
  deleteNote: async (id) => {
    await deleteRecord('notes', id);
    await enqueueSync({ id: genId(), table: 'notes', op: 'delete', payload: { id }, createdAt: new Date().toISOString() });
    set({ notes: get().notes.filter((n) => n.id !== id) });
    void flushSyncQueue();
  },
  moveNote: async (id, notebookId) => {
    const existing = get().notes.find((n) => n.id === id);
    if (!existing) return;
    const now = new Date().toISOString();
    const record: Note = { ...existing, notebookId, updatedAt: now };
    await putRecord('notes', record);
    await enqueueSync({ id: genId(), table: 'notes', op: 'upsert', payload: record, createdAt: now });
    set({ notes: [record, ...get().notes.filter((n) => n.id !== id)] });
    void flushSyncQueue();
  },
  toggleFavorite: async (id) => {
    const existing = get().notes.find((n) => n.id === id);
    if (!existing) return;
    const now = new Date().toISOString();
    const record: Note = { ...existing, isFavorite: !existing.isFavorite, updatedAt: now };
    await putRecord('notes', record);
    await enqueueSync({ id: genId(), table: 'notes', op: 'upsert', payload: record, createdAt: now });
    set({ notes: [record, ...get().notes.filter((n) => n.id !== id)] });
    void flushSyncQueue();
  },
  toggleArchive: async (id) => {
    const existing = get().notes.find((n) => n.id === id);
    if (!existing) return;
    const now = new Date().toISOString();
    const record: Note = { ...existing, isArchived: !existing.isArchived, updatedAt: now };
    await putRecord('notes', record);
    await enqueueSync({ id: genId(), table: 'notes', op: 'upsert', payload: record, createdAt: now });
    set({ notes: [record, ...get().notes.filter((n) => n.id !== id)] });
    void flushSyncQueue();
  },
}));
