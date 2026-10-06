import { Bookmark, StickyNote, Play } from 'lucide-react';
import { motion } from 'framer-motion';
import type { BibleVerse, Highlight } from '@/types/bible';
import { cn } from '@/utils/cn';
import { getHighlightColor } from '@/utils/highlightColors';

interface VerseRowProps {
  verse: BibleVerse;
  highlight?: Highlight;
  hasNote: boolean;
  isBookmarked: boolean;
  isSelected?: boolean;
  showVerseNumber?: boolean;
  isPlaying?: boolean;
  onTap: () => void;
  onPlayFrom?: () => void;
}

export function VerseRow({
  verse,
  highlight,
  hasNote,
  isBookmarked,
  isSelected = false,
  showVerseNumber = true,
  isPlaying = false,
  onTap,
  onPlayFrom,
}: VerseRowProps) {
  const isDarkMode = window.matchMedia('(prefers-color-scheme: dark)').matches;

  return (
    <motion.span
      className={cn(
        'relative group reader-verse inline',
        isSelected && 'bg-[var(--accent-soft)] rounded-lg'
      )}
      initial={false}
      animate={{
        backgroundColor: isSelected ? 'var(--accent-soft)' : 'transparent',
        scale: isSelected ? 1.02 : 1,
      }}
      transition={{ type: 'spring', stiffness: 400, damping: 30 }}
    >
      <span
        onClick={onTap}
        className={cn(
          'cursor-pointer rounded-lg transition-colors',
          'hover:bg-[var(--accent-soft)]',
          highlight && 'px-1 py-0.5 -mx-1 -my-0.5',
          isPlaying && 'bg-[var(--accent-soft)] ring-1 ring-[var(--accent)]',
          !highlight && 'px-1 py-0.5 -mx-1 -my-0.5'
        )}
        style={highlight ? { backgroundColor: getHighlightColor(highlight.color, isDarkMode), transition: 'background-color 0.2s ease-in-out' } : undefined}
      >
        {showVerseNumber && (
          <sup className="mr-1 text-[10px] text-[var(--text-tertiary)] select-none font-medium">{verse.verse}</sup>
        )}
        {verse.text}{' '}
      </span>
      {hasNote && (
        <StickyNote
          size={11}
          className="inline text-[var(--accent)] align-super mr-1 cursor-pointer"
          onClick={(e) => {
            e.stopPropagation();
            onTap();
          }}
        />
      )}
      {isBookmarked && !hasNote && (
        <Bookmark
          size={11}
          className="inline text-[var(--accent)] align-super mr-1 cursor-pointer"
          onClick={(e) => {
            e.stopPropagation();
            onTap();
          }}
        />
      )}
      {onPlayFrom && (
        <Play
          size={11}
          className="inline text-[var(--accent)] align-super mr-1 cursor-pointer opacity-0 group-hover:opacity-100 transition-opacity"
          onClick={(e) => {
            e.stopPropagation();
            onPlayFrom();
          }}
        />
      )}
    </motion.span>
  );
}
