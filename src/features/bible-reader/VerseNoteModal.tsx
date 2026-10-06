import { useState, useEffect, useMemo, useCallback, useRef } from 'react';
import { Plus, Trash2, FileDown, History, Mic, FileText, X } from 'lucide-react';
import { Modal } from '@/components/ui/Modal';
import { Button } from '@/components/ui/Button';
import { RichTextEditor } from '@/components/editor/RichTextEditor';
import { ThemePicker } from '@/components/themes/ThemePicker';
import { useBibleStore } from '@/stores/bibleStore';
import { useNotesStore } from '@/stores/notesStore';
import { useAuthStore } from '@/stores/authStore';
import { useToast } from '@/hooks/useToast';
import { getBookById } from '@/utils/bibleData';
import type { VerseNote, NoteAttachment } from '@/types/bible';
import { format } from 'date-fns';
import { cn } from '@/utils/cn';

interface VerseNoteModalProps {
  open: boolean;
  onClose: () => void;
  bookId: string;
  chapter: number;
  verse: number;
}

export function VerseNoteModal({ open, onClose, bookId, chapter, verse }: VerseNoteModalProps) {
  const { verseNotes, loadAll, loaded, verseNotesFor, saveVerseNote, createVerseNote, deleteVerseNote } = useBibleStore();
  const { upsertNote, deleteNote } = useNotesStore();
  const { user } = useAuthStore();
  const { showToast } = useToast();
  const userId = user?.id ?? 'local-user';

  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [title, setTitle] = useState('');
  const [content, setContent] = useState('');
  const [themeIds, setThemeIds] = useState<string[]>([]);
  const [attachments, setAttachments] = useState<NoteAttachment[]>([]);
  const [showVersions, setShowVersions] = useState(false);
  const autosaveTimer = useRef<number | null>(null);

  useEffect(() => {
    if (open && !loaded) void loadAll();
  }, [open, loaded, loadAll]);

  const notes = useMemo(() => verseNotesFor({ bookId, chapter, verse }), [verseNotes, bookId, chapter, verse, verseNotesFor]);

  useEffect(() => {
    if (open) {
      const first = notes[0];
      if (first && (!selectedId || !notes.some((n) => n.id === selectedId))) {
        setSelectedId(first.id);
      } else if (!first) {
        setSelectedId(null);
      }
    }
  }, [open, notes, selectedId]);

  const selected = useMemo(() => notes.find((n) => n.id === selectedId), [notes, selectedId]);

  useEffect(() => {
    if (selected) {
      setTitle(selected.title ?? '');
      setContent(selected.content ?? '');
      setThemeIds(selected.themeIds ?? []);
      setAttachments(selected.attachments ?? []);
    } else {
      setTitle('');
      setContent('');
      setThemeIds([]);
      setAttachments([]);
    }
    setShowVersions(false);
  }, [selected?.id]);

  useEffect(() => {
    if (!selected) return;
    const book = getBookById(selected.bookId);
    const ref = `${book?.name ?? selected.bookId} ${selected.chapter}:${selected.verse}`;
    const noteTitle = selected.title?.trim() ? selected.title : ref;
    void upsertNote({
      id: `verse-note-${selected.id}`,
      userId: selected.userId,
      title: noteTitle,
      content: selected.content,
      tags: selected.themeIds ?? [],
      reference: ref,
      themeIds: selected.themeIds ?? [],
    });
  }, [selected?.id, selected?.title, selected?.content, selected?.themeIds]);

  const persistNote = useCallback(
    async (updates: Partial<VerseNote>) => {
      if (!selected) return;
      const updated = { ...selected, ...updates, updatedAt: new Date().toISOString() } as VerseNote;
      await saveVerseNote(updated);
    },
    [selected, saveVerseNote]
  );

  const handleContentChange = useCallback(
    (html: string) => {
      setContent(html);
      if (autosaveTimer.current) window.clearTimeout(autosaveTimer.current);
      autosaveTimer.current = window.setTimeout(() => {
        void persistNote({ content: html });
      }, 1500);
    },
    [persistNote]
  );

  const handleTitleChange = useCallback(
    (value: string) => {
      setTitle(value);
      if (autosaveTimer.current) window.clearTimeout(autosaveTimer.current);
      autosaveTimer.current = window.setTimeout(() => {
        void persistNote({ title: value });
      }, 1500);
    },
    [persistNote]
  );

  const handleCreate = async () => {
    const note = await createVerseNote(userId, { bookId, chapter, verse }, 'New note', '');
    setSelectedId(note.id);
    showToast('New note created', 'success');
  };

  const handleDelete = async () => {
    if (!selected) return;
    await deleteVerseNote(selected.id);
    await deleteNote(`verse-note-${selected.id}`);
    showToast('Note deleted', 'success');
  };

  const handleMarkdownExport = useCallback(
    (markdown: string) => {
      const blob = new Blob([markdown], { type: 'text/markdown' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `${bookId}-${chapter}-${verse}-${selected?.title ?? 'note'}.md`;
      a.click();
      URL.revokeObjectURL(url);
      showToast('Markdown exported', 'success');
    },
    [bookId, chapter, verse, selected?.title, showToast]
  );

  const handleAudioReady = useCallback(
    (blob: Blob) => {
      if (!selected) return;
      const reader = new FileReader();
      reader.onload = () => {
        const attachment: NoteAttachment = {
          id: crypto.randomUUID(),
          type: 'audio',
          name: `Recording ${format(new Date(), 'yyyy-MM-dd HH:mm')}.webm`,
          dataUrl: reader.result as string,
          createdAt: new Date().toISOString(),
        };
        const next = [...attachments, attachment];
        setAttachments(next);
        void persistNote({ attachments: next });
      };
      reader.readAsDataURL(blob);
    },
    [selected, attachments, persistNote]
  );

  const handlePdfExport = useCallback(() => {
    const printWindow = window.open('', '_blank');
    if (!printWindow) return;
    printWindow.document.write(`
      <html>
        <head>
          <title>${title || 'Note'}</title>
          <style>
            body { font-family: system-ui, sans-serif; line-height: 1.6; padding: 2rem; color: #1c1c1e; }
            h1 { font-size: 1.5rem; margin-bottom: 0.5rem; }
            table { border-collapse: collapse; width: 100%; margin: 1rem 0; }
            th, td { border: 1px solid #e7e5e0; padding: 0.5rem; text-align: left; }
            img { max-width: 100%; height: auto; }
            blockquote { border-left: 3px solid #9333ea; padding-left: 1rem; color: #6b6b6b; margin: 1rem 0; }
          </style>
        </head>
        <body>
          <h1>${title || 'Untitled Note'}</h1>
          <p><em>${bookId} ${chapter}:${verse}</em></p>
          ${content}
        </body>
      </html>
    `);
    printWindow.document.close();
    printWindow.focus();
    setTimeout(() => printWindow.print(), 250);
    showToast('Print / PDF dialog opened', 'success');
  }, [showToast, title, content, bookId, chapter, verse]);

  const removeAttachment = (id: string) => {
    const next = attachments.filter((a) => a.id !== id);
    setAttachments(next);
    void persistNote({ attachments: next });
  };

  return (
    <Modal open={open} onClose={onClose} title={`Notes on ${bookId} ${chapter}:${verse}`}>
      <div className="flex flex-col md:flex-row gap-4 h-[70vh]">
        {/* Note list */}
        <div className="md:w-56 shrink-0 flex flex-col border-b md:border-b-0 md:border-r border-[var(--border-subtle)] pb-4 md:pb-0 md:pr-4">
          <div className="flex items-center justify-between mb-2">
            <span className="text-sm font-medium text-[var(--text-secondary)]">Notes</span>
            <button
              onClick={handleCreate}
              className="rounded-md p-1.5 text-[var(--text-secondary)] hover:bg-[var(--bg-hover)]"
              aria-label="New note"
            >
              <Plus size={16} />
            </button>
          </div>
          <div className="flex-1 overflow-y-auto space-y-1 min-h-[80px]">
            {notes.length === 0 && (
              <p className="text-xs text-[var(--text-tertiary)]">No notes yet.</p>
            )}
            {notes.map((note) => (
              <button
                key={note.id}
                onClick={() => setSelectedId(note.id)}
                className={cn(
                  'w-full text-left rounded-lg px-3 py-2 text-sm transition-colors',
                  selectedId === note.id
                    ? 'bg-[var(--accent-soft)] text-[var(--accent)]'
                    : 'text-[var(--text-secondary)] hover:bg-[var(--bg-hover)]'
                )}
              >
                <p className="font-medium truncate">{note.title || 'Untitled'}</p>
                <p className="text-[10px] opacity-70">{format(new Date(note.updatedAt), 'MMM d, h:mm a')}</p>
              </button>
            ))}
          </div>
        </div>

        {/* Editor */}
        <div className="flex-1 flex flex-col min-w-0">
          {selected ? (
            <>
              <div className="flex items-center gap-2 mb-3">
                <input
                  type="text"
                  value={title}
                  onChange={(e) => handleTitleChange(e.target.value)}
                  placeholder="Note title"
                  className="flex-1 rounded-lg border border-[var(--border-subtle)] bg-[var(--bg-surface)] px-3 py-2 text-sm font-medium text-[var(--text-primary)] outline-none focus:ring-2 focus:ring-[var(--accent)]"
                />
                <ThemePicker
                  selectedIds={themeIds}
                  onChange={(ids) => {
                    setThemeIds(ids);
                    void persistNote({ themeIds: ids });
                  }}
                  className="w-40"
                />
                <button
                  onClick={() => setShowVersions((s) => !s)}
                  className={cn(
                    'rounded-lg p-2 text-[var(--text-secondary)] hover:bg-[var(--bg-hover)]',
                    showVersions && 'bg-[var(--accent-soft)] text-[var(--accent)]'
                  )}
                  aria-label="Version history"
                >
                  <History size={18} />
                </button>
                <button
                  onClick={handleDelete}
                  className="rounded-lg p-2 text-red-500 hover:bg-red-500/10"
                  aria-label="Delete note"
                >
                  <Trash2 size={18} />
                </button>
              </div>

              {showVersions && selected.versions && selected.versions.length > 0 && (
                <div className="mb-3 rounded-lg border border-[var(--border-subtle)] bg-[var(--bg-hover)] p-2 max-h-32 overflow-y-auto">
                  <p className="text-xs font-medium text-[var(--text-secondary)] mb-1">Version history</p>
                  {selected.versions.slice().reverse().map((v, idx) => (
                    <button
                      key={idx}
                      onClick={() => {
                        setContent(v.content);
                        void persistNote({ content: v.content });
                      }}
                      className="block w-full text-left px-2 py-1 text-xs text-[var(--text-secondary)] hover:bg-[var(--bg-surface)] rounded"
                    >
                      {format(new Date(v.createdAt), 'MMM d, yyyy h:mm a')}
                    </button>
                  ))}
                </div>
              )}

              <RichTextEditor
                content={content}
                onChange={handleContentChange}
                placeholder="Write your thoughts on this verse..."
                className="flex-1 min-h-[200px]"
                onExportMarkdown={handleMarkdownExport}
                onAudioReady={handleAudioReady}
              />

              {attachments.length > 0 && (
                <div className="mt-3 flex flex-wrap gap-2">
                  {attachments.map((a) => (
                    <div
                      key={a.id}
                      className="flex items-center gap-2 rounded-lg border border-[var(--border-subtle)] bg-[var(--bg-hover)] px-2 py-1 text-xs text-[var(--text-secondary)]"
                    >
                      {a.type === 'audio' ? <Mic size={12} /> : <FileText size={12} />}
                      <span className="truncate max-w-[120px]">{a.name}</span>
                      <button onClick={() => removeAttachment(a.id)} className="hover:text-red-500">
                        <X size={12} />
                      </button>
                    </div>
                  ))}
                </div>
              )}

              <div className="flex justify-end gap-2 mt-3">
                <Button variant="ghost" onClick={handlePdfExport} className="gap-1">
                  <FileDown size={14} />
                  PDF
                </Button>
                <Button onClick={() => { showToast('Saved', 'success'); onClose(); }}>Done</Button>
              </div>
            </>
          ) : (
            <div className="flex-1 flex flex-col items-center justify-center text-[var(--text-tertiary)]">
              <p className="text-sm mb-3">No note selected.</p>
              <Button onClick={handleCreate}>
                <Plus size={16} className="mr-1" />
                Create first note
              </Button>
            </div>
          )}
        </div>
      </div>
    </Modal>
  );
}
