import { AnimatePresence, motion } from 'framer-motion';
import {
  Bookmark,
  Copy,
  FolderPlus,
  Highlighter,
  Languages,
  Link,
  Pencil,
  Share2,
  StickyNote,
  Tag,
  X,
  Mic,
  Search,
} from 'lucide-react';
import type { BibleVerse, Highlight } from '@/types/bible';
import { cn } from '@/utils/cn';
import { IconButton } from '@/components/ui/IconButton';
import { ThemePicker } from '@/components/themes/ThemePicker';

const HIGHLIGHT_COLORS: Highlight['color'][] = ['yellow', 'green', 'blue', 'purple', 'orange', 'pink'];

const colorVarMap: Record<Highlight['color'], string> = {
  yellow: 'var(--highlight-yellow)',
  green: 'var(--highlight-green)',
  blue: 'var(--highlight-blue)',
  purple: 'var(--highlight-purple)',
  orange: 'var(--highlight-orange)',
  pink: 'var(--highlight-pink)',
};

interface VerseActionsSheetProps {
  open: boolean;
  onClose: () => void;
  verse: BibleVerse | null;
  highlight?: Highlight;
  hasNote: boolean;
  isBookmarked: boolean;
  onHighlight: (color: Highlight['color']) => void;
  onEditHighlight: () => void;
  onBookmark: () => void;
  onCopy: () => void;
  onShare: () => void;
  onAddNote: () => void;
  onCompare: () => void;
  onCrossReferences: () => void;
  onTag: () => void;
  onAddToCollection: () => void;
  onRelatedSermons: () => void;
  onAIWordStudy?: () => void;
  onThemeChange?: (themeIds: string[]) => void;
}

export function VerseActionsSheet({
  open,
  onClose,
  verse,
  highlight,
  hasNote,
  isBookmarked,
  onHighlight,
  onEditHighlight,
  onBookmark,
  onCopy,
  onShare,
  onAddNote,
  onCompare,
  onCrossReferences,
  onTag,
  onAddToCollection,
  onRelatedSermons,
  onAIWordStudy,
  onThemeChange,
}: VerseActionsSheetProps) {
  if (!verse) return null;

  const reference = `${verse.book} ${verse.chapter}:${verse.verse}`;
  const preview = verse.text.slice(0, 120).trim();

  return (
    <AnimatePresence>
      {open && (
        <>
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.2 }}
            onClick={onClose}
            className="fixed inset-0 z-50 bg-black/30 backdrop-blur-sm"
          />
          <motion.div
            initial={{ y: '100%' }}
            animate={{ y: 0 }}
            exit={{ y: '100%' }}
            transition={{ type: 'spring', damping: 26, stiffness: 280 }}
            className="fixed inset-x-0 bottom-0 z-50 rounded-t-3xl bg-[var(--bg-elevated)] border-t border-[var(--border-subtle)] shadow-[0_-8px_40px_rgba(0,0,0,0.12)] max-h-[85vh] overflow-y-auto"
          >
            <div className="sticky top-0 z-10 bg-[var(--bg-elevated)] rounded-t-3xl px-5 pt-4 pb-3">
              <div className="mx-auto mb-4 h-1.5 w-10 rounded-full bg-[var(--border-subtle)]" />
              <div className="flex items-start justify-between gap-4">
                <div className="min-w-0">
                  <h3 className="text-base font-semibold text-[var(--text-primary)]">{reference}</h3>
                  <p className="mt-1 text-sm text-[var(--text-secondary)] leading-snug line-clamp-2">
                    {preview}
                  </p>
                </div>
                <IconButton onClick={onClose} aria-label="Close" className="shrink-0 -mr-1">
                  <X size={18} />
                </IconButton>
              </div>

              <div className="mt-4 flex items-center gap-3">
                <div className="flex items-center gap-2">
                  {HIGHLIGHT_COLORS.map((color) => {
                    const active = highlight?.color === color;
                    return (
                      <button
                        key={color}
                        onClick={() => onHighlight(color)}
                        className={cn(
                          'h-8 w-8 rounded-full border border-black/10 transition-transform active:scale-90',
                          active && 'ring-2 ring-offset-2 ring-[var(--accent)]'
                        )}
                        style={{ backgroundColor: colorVarMap[color] }}
                        aria-label={`Highlight ${color}`}
                      />
                    );
                  })}
                </div>
                {highlight && onThemeChange && (
                  <div className="flex-1 min-w-0">
                    <ThemePicker
                      selectedIds={highlight.themeIds ?? []}
                      onChange={onThemeChange}
                      className="w-full"
                    />
                  </div>
                )}
                <button
                  onClick={onEditHighlight}
                  className="ml-auto flex h-8 items-center gap-1.5 rounded-lg border border-[var(--border-subtle)] bg-[var(--bg-hover)] px-3 text-sm font-medium text-[var(--text-secondary)] transition-colors hover:bg-[var(--border-subtle)]"
                >
                  <Pencil size={14} />
                  Edit
                </button>
              </div>
            </div>

            <div className="px-5 pb-8 pt-1">
              <div className="grid grid-cols-3 gap-3">
                <ActionButton
                  icon={Highlighter}
                  label="Highlight"
                  active={!!highlight}
                  onClick={() => onHighlight(highlight?.color ?? 'yellow')}
                />
                <ActionButton
                  icon={Bookmark}
                  label={isBookmarked ? 'Bookmarked' : 'Bookmark'}
                  active={isBookmarked}
                  onClick={onBookmark}
                />
                <ActionButton icon={Copy} label="Copy" onClick={onCopy} />
                <ActionButton icon={Share2} label="Share" onClick={onShare} />
                <ActionButton
                  icon={StickyNote}
                  label={hasNote ? 'Edit Note' : 'Add Note'}
                  active={hasNote}
                  onClick={onAddNote}
                />
                <ActionButton icon={Mic} label="Sermons" onClick={onRelatedSermons} />
                {onAIWordStudy && (
                  <ActionButton icon={Search} label="AI Study" onClick={onAIWordStudy} />
                )}
                <ActionButton icon={Languages} label="Compare" onClick={onCompare} />
                <ActionButton icon={Link} label="Cross Refs" onClick={onCrossReferences} />
                <ActionButton icon={Tag} label="Tag" onClick={onTag} />
                <ActionButton icon={FolderPlus} label="Collection" onClick={onAddToCollection} />
              </div>
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}

function ActionButton({
  icon: Icon,
  label,
  active,
  onClick,
}: {
  icon: typeof Bookmark;
  label: string;
  active?: boolean;
  onClick: () => void;
}) {
  return (
    <motion.button
      whileTap={{ scale: 0.96 }}
      onClick={onClick}
      className={cn(
        'flex flex-col items-center justify-center gap-2 rounded-2xl p-3 transition-colors',
        active
          ? 'bg-[var(--accent-soft)] text-[var(--accent)]'
          : 'bg-[var(--bg-hover)] text-[var(--text-secondary)] hover:bg-[var(--border-subtle)] hover:text-[var(--text-primary)]'
      )}
    >
      <div
        className={cn(
          'flex h-10 w-10 items-center justify-center rounded-full',
          active ? 'bg-[var(--accent)] text-white' : 'bg-[var(--bg-elevated)]'
        )}
      >
        <Icon size={20} />
      </div>
      <span className="text-xs font-medium">{label}</span>
    </motion.button>
  );
}
