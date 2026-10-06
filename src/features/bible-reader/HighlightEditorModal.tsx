import { useEffect, useMemo, useState } from 'react';
import { Trash2 } from 'lucide-react';
import { Modal } from '@/components/ui/Modal';
import { Button } from '@/components/ui/Button';
import type { Highlight, HighlightColor } from '@/types/bible';
import { cn } from '@/utils/cn';

const COLORS: HighlightColor[] = ['yellow', 'green', 'blue', 'purple', 'orange', 'pink'];

const colorVarMap: Record<HighlightColor, string> = {
  yellow: 'var(--highlight-yellow)',
  green: 'var(--highlight-green)',
  blue: 'var(--highlight-blue)',
  purple: 'var(--highlight-purple)',
  orange: 'var(--highlight-orange)',
  pink: 'var(--highlight-pink)',
};

interface HighlightEditorModalProps {
  open: boolean;
  onClose: () => void;
  highlight: Highlight | undefined;
  onSave: (updates: Partial<Highlight>) => void;
  onDelete: () => void;
}

export function HighlightEditorModal({ open, onClose, highlight, onSave, onDelete }: HighlightEditorModalProps) {
  const [color, setColor] = useState<HighlightColor>('yellow');
  const [category, setCategory] = useState('');
  const [date, setDate] = useState('');
  const [notebook, setNotebook] = useState('');
  const [tags, setTags] = useState('');

  useEffect(() => {
    if (highlight && open) {
      setColor(highlight.color);
      setCategory(highlight.category ?? '');
      setDate(highlight.date ?? '');
      setNotebook(highlight.notebookName ?? '');
      setTags(highlight.tags?.join(', ') ?? '');
    } else if (!open) {
      setColor('yellow');
      setCategory('');
      setDate('');
      setNotebook('');
      setTags('');
    }
  }, [highlight, open]);

  const tagsList = useMemo(
    () =>
      tags
        .split(',')
        .map((t) => t.trim())
        .filter(Boolean),
    [tags]
  );

  const handleSave = () => {
    onSave({
      color,
      category: category.trim() || undefined,
      date: date || undefined,
      notebookName: notebook.trim() || undefined,
      tags: tagsList.length ? tagsList : undefined,
    });
    onClose();
  };

  return (
    <Modal open={open} onClose={onClose} title="Edit Highlight">
      <div className="space-y-4">
        <div>
          <label className="block text-sm font-medium text-[var(--text-secondary)] mb-2">Color</label>
          <div className="flex flex-wrap gap-2">
            {COLORS.map((c) => (
              <button
                key={c}
                onClick={() => setColor(c)}
                className={cn(
                  'h-8 w-8 rounded-full border border-black/10 transition-transform active:scale-90',
                  color === c && 'ring-2 ring-offset-2 ring-[var(--accent)]'
                )}
                style={{ backgroundColor: colorVarMap[c] }}
                aria-label={`Select ${c}`}
              />
            ))}
          </div>
        </div>

        <div>
          <label className="block text-sm font-medium text-[var(--text-secondary)] mb-1">Category</label>
          <input
            type="text"
            value={category}
            onChange={(e) => setCategory(e.target.value)}
            placeholder="e.g. Salvation, Prayer"
            className="w-full rounded-lg border border-[var(--border-subtle)] bg-[var(--bg-surface)] px-3 py-2 text-sm text-[var(--text-primary)] outline-none focus:ring-2 focus:ring-[var(--accent)]"
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-[var(--text-secondary)] mb-1">Date</label>
          <input
            type="date"
            value={date}
            onChange={(e) => setDate(e.target.value)}
            className="w-full rounded-lg border border-[var(--border-subtle)] bg-[var(--bg-surface)] px-3 py-2 text-sm text-[var(--text-primary)] outline-none focus:ring-2 focus:ring-[var(--accent)]"
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-[var(--text-secondary)] mb-1">Notebook</label>
          <input
            type="text"
            value={notebook}
            onChange={(e) => setNotebook(e.target.value)}
            placeholder="e.g. Sermon notes"
            className="w-full rounded-lg border border-[var(--border-subtle)] bg-[var(--bg-surface)] px-3 py-2 text-sm text-[var(--text-primary)] outline-none focus:ring-2 focus:ring-[var(--accent)]"
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-[var(--text-secondary)] mb-1">Tags</label>
          <input
            type="text"
            value={tags}
            onChange={(e) => setTags(e.target.value)}
            placeholder="faith, hope, love"
            className="w-full rounded-lg border border-[var(--border-subtle)] bg-[var(--bg-surface)] px-3 py-2 text-sm text-[var(--text-primary)] outline-none focus:ring-2 focus:ring-[var(--accent)]"
          />
          <p className="mt-1 text-xs text-[var(--text-tertiary)]">Separate tags with commas</p>
        </div>

        <div className="flex items-center justify-between gap-3 pt-2">
          <Button variant="danger" onClick={() => { onDelete(); onClose(); }} className="gap-2">
            <Trash2 size={16} />
            Delete
          </Button>
          <div className="flex items-center gap-2">
            <Button variant="ghost" onClick={onClose}>
              Cancel
            </Button>
            <Button onClick={handleSave}>Save</Button>
          </div>
        </div>
      </div>
    </Modal>
  );
}
