import { useEffect, useMemo, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Plus,
  Trash2,
  Search,
  Star,
  Archive,
  MoreVertical,
  Check,
  X,
  Heart,
  Folder,
  Inbox,
  ArrowLeft,
} from 'lucide-react';
import { useNotesStore } from '@/stores/notesStore';
import { useNotebooksStore, DEFAULT_NOTEBOOKS } from '@/stores/notebooksStore';
import { useAuthStore } from '@/stores/authStore';
import { usePreferencesStore } from '@/stores/preferencesStore';
import { RichTextEditor } from '@/components/editor/RichTextEditor';
import { ThemePicker } from '@/components/themes/ThemePicker';
import { IconButton } from '@/components/ui/IconButton';
import { cn } from '@/utils/cn';
import { format } from 'date-fns';
import type { Notebook } from '@/types/notes';

type FilterMode = { type: 'all' } | { type: 'notebook'; id: string } | { type: 'favorites' } | { type: 'archive' };

const FILTER_ALL: FilterMode = { type: 'all' };
const FILTER_FAVORITES: FilterMode = { type: 'favorites' };
const FILTER_ARCHIVE: FilterMode = { type: 'archive' };

export function NotesPage() {
  const { notes, loaded, loadAll, upsertNote, deleteNote, moveNote, toggleFavorite, toggleArchive } = useNotesStore();
  const {
    notebooks,
    loaded: notebooksLoaded,
    loadAll: loadNotebooks,
    createNotebook,
    renameNotebook,
    deleteNotebook,
    toggleFavorite: toggleNotebookFavorite,
  } = useNotebooksStore();
  const { user } = useAuthStore();
  const { lastViewedNote, setLastViewedNote } = usePreferencesStore();
  const userId = user?.id ?? 'local-user';

  const [activeId, setActiveId] = useState<string | null>(null);
  const [query, setQuery] = useState('');
  const [filter, setFilter] = useState<FilterMode>(FILTER_ALL);
  const [creatingNotebook, setCreatingNotebook] = useState(false);
  const [newNotebookName, setNewNotebookName] = useState('');
  const [editingNotebookId, setEditingNotebookId] = useState<string | null>(null);
  const [editingNotebookName, setEditingNotebookName] = useState('');
  const [menuNotebook, setMenuNotebook] = useState<string | null>(null);
  const [mobileEditorOpen, setMobileEditorOpen] = useState(false);

  useEffect(() => {
    if (!loaded) void loadAll();
    if (!notebooksLoaded) void loadNotebooks();
  }, [loaded, loadAll, notebooksLoaded, loadNotebooks]);

  // Restore last viewed note on load
  useEffect(() => {
    if (loaded && lastViewedNote && notes.find((n) => n.id === lastViewedNote)) {
      setActiveId(lastViewedNote);
    }
  }, [loaded, lastViewedNote, notes]);

  // Seed default notebooks once on first load.
  useEffect(() => {
    if (!notebooksLoaded || notebooks.length > 0) return;
    for (const name of DEFAULT_NOTEBOOKS) {
      void createNotebook(userId, name);
    }
  }, [notebooksLoaded, notebooks.length, createNotebook, userId]);

  const filteredNotes = useMemo(() => {
    let list = notes;
    if (filter.type === 'notebook') {
      list = notes.filter((n) => n.notebookId === filter.id);
    } else if (filter.type === 'favorites') {
      list = notes.filter((n) => n.isFavorite);
    } else if (filter.type === 'archive') {
      list = notes.filter((n) => n.isArchived);
    }
    const q = query.trim().toLowerCase();
    if (q) {
      list = list.filter(
        (n) =>
          n.title.toLowerCase().includes(q) ||
          n.content.toLowerCase().includes(q) ||
          n.tags.some((t) => t.toLowerCase().includes(q))
      );
    }
    return list.slice().sort((a, b) => b.updatedAt.localeCompare(a.updatedAt));
  }, [notes, filter, query]);

  const active = notes.find((n) => n.id === activeId);

  const handleNew = async () => {
    const notebookId = filter.type === 'notebook' ? filter.id : null;
    const note = await upsertNote({
      userId,
      title: 'Untitled Note',
      content: '',
      tags: [],
      notebookId,
    });
    setActiveId(note.id);
    setLastViewedNote(note.id);
    setMobileEditorOpen(true);
  };

  const handleNoteSelect = (noteId: string) => {
    setActiveId(noteId);
    setLastViewedNote(noteId);
    setMobileEditorOpen(true);
  };

  const activeNotebook = useMemo(() => {
    if (filter.type !== 'notebook') return null;
    return notebooks.find((nb) => nb.id === filter.id) ?? null;
  }, [filter, notebooks]);

  const startRenameNotebook = (nb: Notebook) => {
    setEditingNotebookId(nb.id);
    setEditingNotebookName(nb.name);
    setMenuNotebook(null);
  };

  const confirmRenameNotebook = async () => {
    if (editingNotebookId && editingNotebookName.trim()) {
      await renameNotebook(editingNotebookId, editingNotebookName.trim());
    }
    setEditingNotebookId(null);
    setEditingNotebookName('');
  };

  const handleCreateNotebook = async () => {
    if (!newNotebookName.trim()) return;
    await createNotebook(userId, newNotebookName.trim());
    setNewNotebookName('');
    setCreatingNotebook(false);
  };

  const moveActiveTo = async (notebookId: string | null) => {
    if (!active) return;
    await moveNote(active.id, notebookId);
  };

  return (
    <div className="flex h-full min-h-[calc(100vh-4rem)]">
      {/* Notebooks sidebar */}
      <div className="hidden md:flex w-56 flex-col border-r border-[var(--border-subtle)] bg-[var(--bg-surface)] sticky top-0 self-start h-[calc(100vh-4rem)]">
        <div className="p-3 border-b border-[var(--border-subtle)] flex items-center justify-between">
          <h2 className="font-semibold text-sm text-[var(--text-primary)]">Notebooks</h2>
          <IconButton onClick={() => setCreatingNotebook(true)} aria-label="New notebook">
            <Plus size={16} />
          </IconButton>
        </div>

        <div className="flex-1 overflow-y-auto p-2 space-y-0.5">
          <SidebarItem
            icon={Inbox}
            label="All Notes"
            active={filter.type === 'all'}
            onClick={() => setFilter(FILTER_ALL)}
            count={notes.filter((n) => !n.isArchived).length}
          />
          <SidebarItem
            icon={Heart}
            label="Favorites"
            active={filter.type === 'favorites'}
            onClick={() => setFilter(FILTER_FAVORITES)}
            count={notes.filter((n) => n.isFavorite && !n.isArchived).length}
          />
          <SidebarItem
            icon={Archive}
            label="Archive"
            active={filter.type === 'archive'}
            onClick={() => setFilter(FILTER_ARCHIVE)}
            count={notes.filter((n) => n.isArchived).length}
          />

          <div className="mt-3 mb-1 px-2 text-[10px] font-semibold uppercase tracking-wider text-[var(--text-tertiary)]">
            My notebooks
          </div>

          {notebooks
            .slice()
            .sort((a, b) => (b.isFavorite ? 1 : 0) - (a.isFavorite ? 1 : 0) || a.name.localeCompare(b.name))
            .map((nb) => (
              <div key={nb.id} className="relative group">
                {editingNotebookId === nb.id ? (
                  <div className="flex items-center gap-1 px-2 py-1.5">
                    <input
                      autoFocus
                      value={editingNotebookName}
                      onChange={(e) => setEditingNotebookName(e.target.value)}
                      onKeyDown={(e) => {
                        if (e.key === 'Enter') void confirmRenameNotebook();
                        if (e.key === 'Escape') setEditingNotebookId(null);
                      }}
                      className="flex-1 rounded-md border border-[var(--border-subtle)] bg-[var(--bg-app)] px-2 py-1 text-xs outline-none"
                    />
                    <button onClick={() => void confirmRenameNotebook()} className="text-[var(--accent)]">
                      <Check size={14} />
                    </button>
                    <button onClick={() => setEditingNotebookId(null)} className="text-[var(--text-tertiary)]">
                      <X size={14} />
                    </button>
                  </div>
                ) : (
                  <div
                    className={cn(
                      'flex items-center gap-2 rounded-lg px-2 py-1.5 cursor-pointer transition-colors',
                      filter.type === 'notebook' && filter.id === nb.id
                        ? 'bg-[var(--accent-soft)] text-[var(--accent)]'
                        : 'text-[var(--text-secondary)] hover:bg-[var(--bg-hover)]'
                    )}
                    onClick={() => setFilter({ type: 'notebook', id: nb.id })}
                  >
                    <Folder size={15} />
                    <span className="flex-1 text-sm truncate">{nb.name}</span>
                    <span className="text-xs text-[var(--text-tertiary)]">
                      {notes.filter((n) => n.notebookId === nb.id && !n.isArchived).length}
                    </span>
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        void toggleNotebookFavorite(nb.id);
                      }}
                      className={cn(
                        'opacity-0 group-hover:opacity-100 transition-opacity',
                        nb.isFavorite && 'opacity-100 text-yellow-500'
                      )}
                    >
                      <Star size={13} fill={nb.isFavorite ? 'currentColor' : 'none'} />
                    </button>
                    <div className="relative">
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          setMenuNotebook(menuNotebook === nb.id ? null : nb.id);
                        }}
                        className="opacity-0 group-hover:opacity-100 transition-opacity text-[var(--text-tertiary)]"
                      >
                        <MoreVertical size={13} />
                      </button>
                      {menuNotebook === nb.id && (
                        <>
                          <div
                            className="fixed inset-0 z-40"
                            onClick={() => setMenuNotebook(null)}
                          />
                          <div className="absolute right-0 top-full z-50 mt-1 w-36 rounded-lg border border-[var(--border-subtle)] bg-[var(--bg-elevated)] shadow-md py-1">
                            <button
                              onClick={() => startRenameNotebook(nb)}
                              className="w-full text-left px-3 py-1.5 text-sm text-[var(--text-secondary)] hover:bg-[var(--bg-hover)]"
                            >
                              Rename
                            </button>
                            <button
                              onClick={() => {
                                void deleteNotebook(nb.id);
                                setMenuNotebook(null);
                                if (filter.type === 'notebook' && filter.id === nb.id) setFilter(FILTER_ALL);
                              }}
                              className="w-full text-left px-3 py-1.5 text-sm text-red-500 hover:bg-red-500/10"
                            >
                              Delete
                            </button>
                          </div>
                        </>
                      )}
                    </div>
                  </div>
                )}
              </div>
            ))}

          {creatingNotebook && (
            <div className="flex items-center gap-1 px-2 py-1.5">
              <input
                autoFocus
                value={newNotebookName}
                onChange={(e) => setNewNotebookName(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') void handleCreateNotebook();
                  if (e.key === 'Escape') setCreatingNotebook(false);
                }}
                placeholder="Notebook name"
                className="flex-1 rounded-md border border-[var(--border-subtle)] bg-[var(--bg-app)] px-2 py-1 text-xs outline-none"
              />
              <button onClick={() => void handleCreateNotebook()} className="text-[var(--accent)]">
                <Check size={14} />
              </button>
              <button onClick={() => setCreatingNotebook(false)} className="text-[var(--text-tertiary)]">
                <X size={14} />
              </button>
            </div>
          )}
        </div>
      </div>

      {/* Notes list */}
      <div className="w-full md:w-72 border-r border-[var(--border-subtle)] flex flex-col bg-[var(--bg-surface)]">
        <div className="p-3 flex items-center gap-2 border-b border-[var(--border-subtle)]">
          <div className="flex-1 flex items-center gap-2 rounded-lg bg-[var(--bg-hover)] px-3 py-1.5">
            <Search size={15} className="text-[var(--text-tertiary)]" />
            <input
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Search notes..."
              className="bg-transparent outline-none text-sm w-full placeholder:text-[var(--text-tertiary)]"
            />
          </div>
          <IconButton onClick={() => void handleNew()} aria-label="New note">
            <Plus size={18} />
          </IconButton>
        </div>
        <div className="flex-1 overflow-y-auto">
          {filteredNotes.length === 0 && (
            <p className="text-center text-sm text-[var(--text-tertiary)] mt-10">
              {query ? 'No notes match.' : 'No notes yet.'}
            </p>
          )}
          {filteredNotes.map((note) => (
            <button
              key={note.id}
              onClick={() => handleNoteSelect(note.id)}
              className={cn(
                'w-full text-left px-4 py-3 border-b border-[var(--border-subtle)] hover:bg-[var(--bg-hover)] transition-colors',
                activeId === note.id && 'bg-[var(--accent-soft)]'
              )}
            >
              <div className="flex items-start justify-between gap-2">
                <p className="font-medium text-sm truncate text-[var(--text-primary)] flex-1">{note.title || 'Untitled'}</p>
                {note.isFavorite && <Star size={12} className="text-yellow-500 shrink-0" fill="currentColor" />}
              </div>
              {note.reference && (
                <p className="text-[10px] text-[var(--accent)] mt-0.5 truncate">{note.reference}</p>
              )}
              <p className="text-xs text-[var(--text-tertiary)] mt-0.5">
                {format(new Date(note.updatedAt), 'MMM d, yyyy')}
              </p>
            </button>
          ))}
        </div>
      </div>

      {/* Editor */}
      <div className="hidden md:flex flex-1 flex-col p-6 overflow-hidden">
        {active ? (
          <motion.div key={active.id} initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="flex flex-col gap-4 h-full max-w-3xl">
            <div className="flex items-center gap-2">
              <input
                value={active.title}
                onChange={(e) => void upsertNote({ ...active, title: e.target.value })}
                className="flex-1 text-2xl font-bold bg-transparent outline-none text-[var(--text-primary)]"
              />
              <ThemePicker
                selectedIds={active.themeIds ?? []}
                onChange={(ids) => void upsertNote({ ...active, themeIds: ids })}
                className="w-48"
              />
              <select
                value={active.notebookId ?? ''}
                onChange={(e) => void moveActiveTo(e.target.value || null)}
                className="rounded-lg border border-[var(--border-subtle)] bg-[var(--bg-surface)] px-2 py-1.5 text-xs text-[var(--text-secondary)] outline-none"
              >
                <option value="">Move to...</option>
                {notebooks.map((nb) => (
                  <option key={nb.id} value={nb.id}>
                    {nb.name}
                  </option>
                ))}
              </select>
              <IconButton
                onClick={() => void toggleFavorite(active.id)}
                className={active.isFavorite ? 'text-yellow-500' : 'text-[var(--text-tertiary)]'}
                aria-label="Favorite"
              >
                <Star size={18} fill={active.isFavorite ? 'currentColor' : 'none'} />
              </IconButton>
              <IconButton
                onClick={() => void toggleArchive(active.id)}
                className={active.isArchived ? 'text-[var(--accent)]' : 'text-[var(--text-tertiary)]'}
                aria-label="Archive"
              >
                <Archive size={18} />
              </IconButton>
              <IconButton onClick={() => void deleteNote(active.id).then(() => setActiveId(null))} aria-label="Delete note">
                <Trash2 size={18} />
              </IconButton>
            </div>
            <RichTextEditor
              content={active.content}
              onChange={(html) => void upsertNote({ ...active, content: html })}
              placeholder="Write your study notes..."
              className="flex-1 min-h-0"
            />
          </motion.div>
        ) : (
          <div className="flex-1 flex items-center justify-center text-[var(--text-tertiary)] text-sm">
            {filter.type === 'all'
              ? 'Select or create a note to begin writing.'
              : activeNotebook
                ? `Select or create a note in "${activeNotebook.name}".`
                : 'Select or create a note to begin writing.'}
          </div>
        )}
      </div>

      {/* Mobile Editor Overlay */}
      <AnimatePresence>
        {mobileEditorOpen && active && (
          <>
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setMobileEditorOpen(false)}
              className="md:hidden fixed inset-0 z-50 bg-black/50"
            />
            <motion.div
              initial={{ y: '100%' }}
              animate={{ y: 0 }}
              exit={{ y: '100%' }}
              transition={{ type: 'spring', damping: 25, stiffness: 300 }}
              className="md:hidden fixed inset-x-0 bottom-0 z-50 h-[85vh] bg-[var(--bg-surface)] rounded-t-3xl border-t border-[var(--border-subtle)] flex flex-col"
            >
              <div className="flex items-center justify-between p-4 border-b border-[var(--border-subtle)]">
                <button
                  onClick={() => setMobileEditorOpen(false)}
                  className="p-2 rounded-lg text-[var(--text-secondary)] hover:bg-[var(--bg-hover)]"
                >
                  <ArrowLeft size={20} />
                </button>
                <div className="flex items-center gap-2">
                  <IconButton
                    onClick={() => void toggleFavorite(active.id)}
                    className={active.isFavorite ? 'text-yellow-500' : 'text-[var(--text-tertiary)]'}
                    aria-label="Favorite"
                  >
                    <Star size={18} fill={active.isFavorite ? 'currentColor' : 'none'} />
                  </IconButton>
                  <IconButton onClick={() => void deleteNote(active.id).then(() => { setActiveId(null); setMobileEditorOpen(false); })} aria-label="Delete note">
                    <Trash2 size={18} />
                  </IconButton>
                </div>
              </div>
              <div className="flex-1 flex flex-col p-4 overflow-hidden">
                <input
                  value={active.title}
                  onChange={(e) => void upsertNote({ ...active, title: e.target.value })}
                  className="text-xl font-bold bg-transparent outline-none text-[var(--text-primary)] mb-4"
                  placeholder="Note title"
                />
                <RichTextEditor
                  content={active.content}
                  onChange={(html) => void upsertNote({ ...active, content: html })}
                  placeholder="Write your study notes..."
                  className="flex-1 min-h-0"
                />
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </div>
  );
}

function SidebarItem({
  icon: Icon,
  label,
  active,
  onClick,
  count,
}: {
  icon: React.ElementType;
  label: string;
  active: boolean;
  onClick: () => void;
  count: number;
}) {
  return (
    <button
      onClick={onClick}
      className={cn(
        'w-full flex items-center gap-2 rounded-lg px-2 py-1.5 text-sm transition-colors',
        active ? 'bg-[var(--accent-soft)] text-[var(--accent)]' : 'text-[var(--text-secondary)] hover:bg-[var(--bg-hover)]'
      )}
    >
      <Icon size={15} />
      <span className="flex-1 text-left">{label}</span>
      <span className="text-xs text-[var(--text-tertiary)]">{count}</span>
    </button>
  );
}
