import { useMemo, useState } from 'react';
import { Edit2, RotateCcw, Search, Trash2 } from 'lucide-react';
import { useBibleStore } from '@/stores/bibleStore';
import { Button } from '@/components/ui/Button';
import { HighlightEditorModal } from '@/features/bible-reader/HighlightEditorModal';
import { getBookById } from '@/utils/bibleData';
import type { Highlight } from '@/types/bible';
import { useToast } from '@/hooks/useToast';

const colorVarMap: Record<Highlight['color'], string> = {
  yellow: 'var(--highlight-yellow)',
  green: 'var(--highlight-green)',
  blue: 'var(--highlight-blue)',
  purple: 'var(--highlight-purple)',
  orange: 'var(--highlight-orange)',
  pink: 'var(--highlight-pink)',
};

export function HighlightsPage() {
  const { highlights, updateHighlight, removeHighlight, undoDeleteHighlight, lastDeletedHighlight, searchHighlights } =
    useBibleStore();
  const { showToast } = useToast();
  const [query, setQuery] = useState('');
  const [editing, setEditing] = useState<Highlight | undefined>(undefined);

  const results = useMemo(() => searchHighlights(query), [query, searchHighlights, highlights]);

  const handleSave = async (updates: Partial<Highlight>) => {
    if (editing) {
      await updateHighlight(editing.id, updates);
      showToast('Highlight updated', 'success');
    }
    setEditing(undefined);
  };

  const handleDelete = async (h: Highlight) => {
    await removeHighlight(h.id);
    showToast('Highlight deleted — undo available', 'info');
  };

  const handleUndo = async () => {
    await undoDeleteHighlight();
    showToast('Highlight restored', 'success');
  };

  return (
    <div className="max-w-3xl mx-auto px-4 md:px-8 py-6">
      <div className="flex items-center justify-between mb-4">
        <h1 className="text-2xl font-bold text-[var(--text-primary)]">Highlights</h1>
        {lastDeletedHighlight && (
          <Button variant="secondary" onClick={handleUndo} className="gap-2">
            <RotateCcw size={16} />
            Undo
          </Button>
        )}
      </div>

      <div className="relative mb-6">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-[var(--text-tertiary)]" size={18} />
        <input
          type="text"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Search by reference, color, category, notebook, or tag..."
          className="w-full rounded-xl border border-[var(--border-subtle)] bg-[var(--bg-surface)] pl-10 pr-4 py-2.5 text-sm text-[var(--text-primary)] outline-none focus:ring-2 focus:ring-[var(--accent)]"
        />
      </div>

      {results.length === 0 ? (
        <p className="text-center text-[var(--text-tertiary)] py-12">
          {query ? 'No highlights match your search.' : 'No highlights yet. Tap a verse to start highlighting.'}
        </p>
      ) : (
        <div className="space-y-3">
          {results.map((h) => {
            const book = getBookById(h.bookId);
            const ref = `${book?.name ?? h.bookId} ${h.chapter}:${h.verse}`;
            return (
              <div
                key={h.id}
                className="flex items-start gap-3 rounded-2xl border border-[var(--border-subtle)] bg-[var(--bg-surface)] p-4 shadow-sm"
              >
                <div
                  className="mt-1 h-5 w-5 shrink-0 rounded-full border border-black/10"
                  style={{ backgroundColor: colorVarMap[h.color] }}
                />
                <div className="flex-1 min-w-0">
                  <p className="font-semibold text-[var(--text-primary)]">{ref}</p>
                  <div className="mt-1 flex flex-wrap gap-1.5 text-xs">
                    {h.category && (
                      <span className="rounded-md bg-[var(--bg-hover)] px-2 py-0.5 text-[var(--text-secondary)]">
                        {h.category}
                      </span>
                    )}
                    {h.date && (
                      <span className="rounded-md bg-[var(--bg-hover)] px-2 py-0.5 text-[var(--text-secondary)]">
                        {h.date}
                      </span>
                    )}
                    {h.notebookName && (
                      <span className="rounded-md bg-[var(--bg-hover)] px-2 py-0.5 text-[var(--text-secondary)]">
                        {h.notebookName}
                      </span>
                    )}
                    {h.tags?.map((tag) => (
                      <span
                        key={tag}
                        className="rounded-md bg-[var(--accent-soft)] px-2 py-0.5 text-[var(--accent)]"
                      >
                        #{tag}
                      </span>
                    ))}
                  </div>
                </div>
                <div className="flex items-center gap-1">
                  <button
                    onClick={() => setEditing(h)}
                    className="rounded-lg p-2 text-[var(--text-secondary)] hover:bg-[var(--bg-hover)]"
                    aria-label="Edit"
                  >
                    <Edit2 size={16} />
                  </button>
                  <button
                    onClick={() => handleDelete(h)}
                    className="rounded-lg p-2 text-red-500 hover:bg-red-500/10"
                    aria-label="Delete"
                  >
                    <Trash2 size={16} />
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}

      <HighlightEditorModal
        open={editing !== undefined}
        onClose={() => setEditing(undefined)}
        highlight={editing}
        onSave={handleSave}
        onDelete={() => {
          if (editing) handleDelete(editing);
          setEditing(undefined);
        }}
      />
    </div>
  );
}
