import { useState, useRef, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Copy,
  Highlighter,
  StickyNote,
  Bookmark,
  Share2,
  Search,
  Volume2,
  MoreHorizontal,
  Languages,
  Link,
  Mic,
  Globe,
  Tag,
  Heart,
  BookOpen,
  Download,
  Sparkles,
  Settings,
} from 'lucide-react';
import type { BibleVerse, Highlight } from '@/types/bible';
import { cn } from '@/utils/cn';
import { HighlightColorPicker } from './HighlightColorPicker';
import { HIGHLIGHT_COLORS, HIGHLIGHT_COLOR_CONFIGS, type HighlightColor } from '@/utils/highlightColors';
import { usePreferencesStore } from '@/stores/preferencesStore';

interface PremiumVerseToolbarProps {
  open: boolean;
  onClose: () => void;
  verses: BibleVerse[];
  highlight?: Highlight;
  hasNote: boolean;
  isBookmarked: boolean;
  onHighlight: (color: Highlight['color']) => void;
  onBookmark: () => void;
  onCopy: () => void;
  onShare: () => void;
  onAddNote: () => void;
  onAIWordStudy: () => void;
  onListenFromVerse: () => void;
  onCompare: () => void;
  onCrossReferences: () => void;
  onRelatedSermons: () => void;
  onOriginalLanguage: () => void;
  onTag: () => void;
  onAddToFavorites: () => void;
  onReadingPlan: () => void;
  onPrint: () => void;
  onOpenFullAIStudy: () => void;
}

export function PremiumVerseToolbar({
  open,
  onClose,
  verses,
  highlight,
  hasNote,
  isBookmarked,
  onHighlight,
  onBookmark,
  onCopy,
  onShare,
  onAddNote,
  onAIWordStudy,
  onListenFromVerse,
  onCompare,
  onCrossReferences,
  onRelatedSermons,
  onOriginalLanguage,
  onTag,
  onAddToFavorites,
  onReadingPlan,
  onPrint,
  onOpenFullAIStudy,
}: PremiumVerseToolbarProps) {
  const [moreMenuOpen, setMoreMenuOpen] = useState(false);
  const [colorPickerOpen, setColorPickerOpen] = useState(false);
  const [colorSelectorOpen, setColorSelectorOpen] = useState(false);
  const toolbarRef = useRef<HTMLDivElement>(null);
  const { setLastHighlightColor } = usePreferencesStore();

  // Close menus when toolbar closes
  useEffect(() => {
    if (!open) {
      setMoreMenuOpen(false);
      setColorPickerOpen(false);
      setColorSelectorOpen(false);
    }
  }, [open]);

  const handleHighlightClick = () => {
    // Toggle inline color selector
    setColorSelectorOpen(!colorSelectorOpen);
  };

  const handleColorSelect = (color: HighlightColor) => {
    setLastHighlightColor(color);
    onHighlight(color as Highlight['color']);
    // Keep context menu open after color selection
  };

  const handleAction = (callback: () => void) => {
    callback();
    onClose();
  };

  const primaryActions = [
    { icon: Copy, label: 'Copy', action: onCopy },
    { icon: Highlighter, label: 'Highlight', action: handleHighlightClick, active: !!highlight },
    { icon: StickyNote, label: 'Note', action: onAddNote, active: hasNote },
    { icon: Bookmark, label: 'Bookmark', action: onBookmark, active: isBookmarked },
    { icon: Share2, label: 'Share', action: onShare },
    { icon: Search, label: 'Study', action: onAIWordStudy },
    { icon: Volume2, label: 'Listen', action: onListenFromVerse },
  ];

  const secondaryActions = [
    { icon: Languages, label: 'Compare Translations', action: onCompare },
    { icon: Link, label: 'Cross References', action: onCrossReferences },
    { icon: Mic, label: 'Related Sermons', action: onRelatedSermons },
    { icon: BookOpen, label: 'Related Devotions', action: () => {}, placeholder: true },
    { icon: Globe, label: 'Original Hebrew/Greek', action: onOriginalLanguage },
    { icon: Tag, label: 'Add Tag', action: onTag },
    { icon: Heart, label: 'Add to Favorites', action: onAddToFavorites },
    { icon: BookOpen, label: 'Reading Plan', action: onReadingPlan },
    { icon: Download, label: 'Export', action: onPrint },
    { icon: Sparkles, label: 'Full AI Study', action: onOpenFullAIStudy },
    { icon: Settings, label: 'More Options', action: () => {}, placeholder: true },
  ];

  const verseRangeText = verses.length > 1
    ? `${verses[0].book} ${verses[0].chapter}:${verses[0].verse}–${verses[verses.length - 1].verse}`
    : verses.length === 1
    ? `${verses[0].book} ${verses[0].chapter}:${verses[0].verse}`
    : '';

  return (
    <AnimatePresence>
      {open && (
        <>
          {/* Backdrop */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.2 }}
            onClick={onClose}
            className="fixed inset-0 z-50"
          />

          {/* Main Toolbar */}
          <motion.div
            ref={toolbarRef}
            initial={{ opacity: 0, y: 100 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 100 }}
            transition={{ type: 'spring', damping: 25, stiffness: 300, duration: 0.2 }}
            className="fixed bottom-20 left-4 right-4 z-50 max-w-2xl mx-auto"
          >
            {/* Verse Range Indicator */}
            {verseRangeText && (
              <motion.div
                initial={{ opacity: 0, y: -5 }}
                animate={{ opacity: 1, y: 0 }}
                className="absolute -top-8 left-1/2 -translate-x-1/2 px-3 py-1 rounded-full bg-[var(--bg-elevated)] border border-[var(--border-subtle)] shadow-lg"
              >
                <span className="text-xs font-medium text-[var(--text-primary)]">{verseRangeText}</span>
              </motion.div>
            )}

            {/* Toolbar */}
            <div
              className={cn(
                'flex flex-col gap-2 px-2 py-2 rounded-2xl',
                'bg-[var(--bg-elevated)]/95 backdrop-blur-xl',
                'border border-[var(--border-subtle)]',
                'shadow-2xl shadow-black/10'
              )}
            >
              {/* Primary Actions Row */}
              <div
                className={cn(
                  'flex items-center gap-1 overflow-x-auto',
                  'scrollbar-hide',
                  'snap-x snap-mandatory'
                )}
                style={{ scrollbarWidth: 'none', msOverflowStyle: 'none' }}
              >
                {primaryActions.map((action, index) => (
                  <div key={index} className="snap-start shrink-0">
                    <ActionButton
                      icon={action.icon}
                      label={action.label}
                      active={action.active}
                      onClick={() => handleAction(action.action)}
                    />
                  </div>
                ))}

                <div className="w-px h-6 bg-[var(--border-subtle)] mx-1 shrink-0" />

                <div className="snap-start shrink-0">
                  <MoreButton
                    open={moreMenuOpen}
                    onToggle={() => setMoreMenuOpen(!moreMenuOpen)}
                  />
                </div>
              </div>

              {/* Inline Color Selector */}
              <AnimatePresence>
                {colorSelectorOpen && (
                  <motion.div
                    initial={{ opacity: 0, height: 0 }}
                    animate={{ opacity: 1, height: 'auto' }}
                    exit={{ opacity: 0, height: 0 }}
                    transition={{ duration: 0.2 }}
                    className="flex items-center gap-2 px-1 pt-1"
                  >
                    {HIGHLIGHT_COLORS.slice(0, 6).map((color) => (
                      <InlineColorButton
                        key={color}
                        color={color}
                        active={highlight?.color === color}
                        onClick={() => handleColorSelect(color)}
                      />
                    ))}
                    <button
                      onClick={() => setColorPickerOpen(true)}
                      className="flex items-center justify-center w-8 h-8 rounded-full bg-[var(--bg-hover)] text-[var(--text-tertiary)] hover:bg-[var(--border-subtle)] hover:text-[var(--text-secondary)] transition-colors text-xs font-medium"
                    >
                      +
                    </button>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>

            {/* Highlight Color Picker */}
            <HighlightColorPicker
              open={colorPickerOpen}
              onClose={() => setColorPickerOpen(false)}
              onColorSelect={(color) => onHighlight(color as Highlight['color'])}
              currentColor={highlight?.color as HighlightColor}
            />

            {/* More Menu */}
            <AnimatePresence>
              {moreMenuOpen && (
                <motion.div
                  initial={{ opacity: 0, scale: 0.95, y: -10 }}
                  animate={{ opacity: 1, scale: 1, y: 0 }}
                  exit={{ opacity: 0, scale: 0.95, y: -10 }}
                  transition={{ type: 'spring', damping: 25, stiffness: 300, duration: 0.2 }}
                  className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 w-64 z-50"
                >
                  <div
                    className={cn(
                      'rounded-2xl p-2 max-h-80 overflow-y-auto',
                      'bg-[var(--bg-elevated)]/95 backdrop-blur-xl',
                      'border border-[var(--border-subtle)]',
                      'shadow-2xl shadow-black/10'
                    )}
                    style={{ scrollbarWidth: 'thin' }}
                  >
                    {secondaryActions.map((action, index) => (
                      <MoreMenuItem
                        key={index}
                        icon={action.icon}
                        label={action.label}
                        onClick={() => {
                          handleAction(action.action);
                          setMoreMenuOpen(false);
                        }}
                      />
                    ))}
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}

interface ActionButtonProps {
  icon: any;
  label: string;
  active?: boolean;
  onClick: () => void;
}

function ActionButton({ icon: Icon, label, active, onClick }: ActionButtonProps) {
  return (
    <motion.button
      whileTap={{ scale: 0.9 }}
      whileHover={{ scale: 1.05 }}
      onClick={onClick}
      className={cn(
        'relative flex flex-col items-center justify-center',
        'w-12 h-12 rounded-xl',
        'transition-colors',
        active
          ? 'bg-[var(--accent-soft)] text-[var(--accent)]'
          : 'bg-[var(--bg-hover)] text-[var(--text-secondary)] hover:bg-[var(--border-subtle)] hover:text-[var(--text-primary)]'
      )}
      title={label}
    >
      <Icon size={18} />
      {active && (
        <motion.div
          layoutId="activeIndicator"
          className="absolute inset-0 rounded-xl ring-2 ring-[var(--accent)] ring-offset-2 ring-offset-[var(--bg-elevated)]"
          transition={{ type: 'spring', stiffness: 300, damping: 30 }}
        />
      )}
    </motion.button>
  );
}

interface InlineColorButtonProps {
  color: HighlightColor;
  active: boolean;
  onClick: () => void;
}

function InlineColorButton({ color, active, onClick }: InlineColorButtonProps) {
  const isDarkMode = window.matchMedia('(prefers-color-scheme: dark)').matches;
  const config = HIGHLIGHT_COLOR_CONFIGS[color];
  const backgroundColor = isDarkMode ? config.darkMode : config.lightMode;

  return (
    <motion.button
      whileTap={{ scale: 0.9 }}
      whileHover={{ scale: 1.1 }}
      onClick={onClick}
      className={cn(
        'relative w-8 h-8 rounded-full transition-all',
        'border-2',
        active ? 'border-[var(--accent)]' : 'border-transparent hover:border-[var(--border-subtle)]'
      )}
      style={{ backgroundColor }}
      title={config.name}
    >
      {active && (
        <motion.div
          initial={{ scale: 0 }}
          animate={{ scale: 1 }}
          className="absolute inset-0 flex items-center justify-center"
        >
          <div className="bg-[var(--accent)] rounded-full p-0.5">
            <div className="bg-white rounded-full w-2 h-2" />
          </div>
        </motion.div>
      )}
    </motion.button>
  );
}

interface MoreButtonProps {
  open: boolean;
  onToggle: () => void;
}

function MoreButton({ open, onToggle }: MoreButtonProps) {
  return (
    <motion.button
      whileTap={{ scale: 0.9 }}
      whileHover={{ scale: 1.05 }}
      onClick={onToggle}
      className={cn(
        'flex items-center justify-center',
        'w-12 h-12 rounded-xl',
        'transition-colors',
        open
          ? 'bg-[var(--accent-soft)] text-[var(--accent)]'
          : 'bg-[var(--bg-hover)] text-[var(--text-secondary)] hover:bg-[var(--border-subtle)] hover:text-[var(--text-primary)]'
      )}
      title="More"
    >
      <motion.div
        animate={{ rotate: open ? 90 : 0 }}
        transition={{ type: 'spring', stiffness: 200, damping: 20 }}
      >
        <MoreHorizontal size={18} />
      </motion.div>
    </motion.button>
  );
}

interface MoreMenuItemProps {
  icon: any;
  label: string;
  onClick: () => void;
}

function MoreMenuItem({ icon: Icon, label, onClick }: MoreMenuItemProps) {
  return (
    <motion.button
      whileTap={{ scale: 0.98 }}
      whileHover={{ scale: 1.02, backgroundColor: 'var(--bg-hover)' }}
      onClick={onClick}
      className="flex items-center gap-3 w-full px-3 py-2.5 rounded-xl text-left"
    >
      <Icon size={18} className="text-[var(--text-secondary)]" />
      <span className="text-sm font-medium text-[var(--text-primary)]">{label}</span>
    </motion.button>
  );
}
