import { AnimatePresence, motion } from 'framer-motion';
import { Play, Pause, SkipBack, SkipForward, RotateCcw, Moon, X, ChevronDown, BookOpen, Volume2, Settings } from 'lucide-react';
import { cn } from '@/utils/cn';
import { usePreferencesStore } from '@/stores/preferencesStore';

interface AudioPlayerProps {
  open: boolean;
  onClose: () => void;
  bookName: string;
  chapter: number;
  currentVerse: number;
  totalVerses: number;
  isPlaying: boolean;
  onPlayPause: () => void;
  onSkipBack: () => void;
  onSkipForward: () => void;
  onSpeedChange: (speed: number) => void;
  onSleepTimer: (minutes: number | null) => void;
  onRepeatMode: (mode: 'none' | 'verse' | 'chapter' | 'book') => void;
  onReadingMode: (mode: 'verse' | 'chapter' | 'book') => void;
  onVoiceSettings?: () => void;
}

const SPEED_OPTIONS = [0.5, 0.75, 1.0, 1.25, 1.5, 1.75, 2.0];
const REPEAT_MODES = ['none', 'verse', 'chapter', 'book'] as const;
const REPEAT_LABELS = { none: 'Off', verse: 'Verse', chapter: 'Chapter', book: 'Book' };
const READING_MODES = ['verse', 'chapter', 'book'] as const;
const READING_LABELS = { verse: 'Verse', chapter: 'Chapter', book: 'Book' };

export function AudioPlayer({
  open,
  onClose,
  bookName,
  chapter,
  currentVerse,
  totalVerses,
  isPlaying,
  onPlayPause,
  onSkipBack,
  onSkipForward,
  onSpeedChange,
  onSleepTimer,
  onRepeatMode,
  onReadingMode,
  onVoiceSettings,
}: AudioPlayerProps) {
  const { audioPlaybackSpeed, audioSleepTimer, audioRepeatMode, audioReadingMode, audioVoice } = usePreferencesStore();

  return (
    <AnimatePresence>
      {open && (
        <>
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 bg-[var(--bg-app)]"
          />
          <motion.div
            initial={{ y: '100%' }}
            animate={{ y: 0 }}
            exit={{ y: '100%' }}
            transition={{ type: 'spring', damping: 25, stiffness: 300 }}
            className="fixed inset-0 z-50 bg-[var(--bg-app)] flex flex-col"
          >
            {/* Header */}
            <div className="flex items-center justify-between p-4 border-b border-[var(--border-subtle)]">
              <button
                onClick={onClose}
                className="p-2 rounded-lg text-[var(--text-secondary)] hover:bg-[var(--bg-hover)] transition-colors"
              >
                <ChevronDown size={24} />
              </button>
              <span className="text-sm font-medium text-[var(--text-tertiary)]">Now Playing</span>
              <button
                onClick={onClose}
                className="p-2 rounded-lg text-[var(--text-secondary)] hover:bg-[var(--bg-hover)] transition-colors"
              >
                <X size={20} />
              </button>
            </div>

            {/* Content */}
            <div className="flex-1 flex flex-col items-center justify-center p-8">
              {/* Book Cover Art */}
              <motion.div
                initial={{ scale: 0.8, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                transition={{ delay: 0.1 }}
                className="w-48 h-48 rounded-3xl bg-gradient-to-br from-[var(--accent)] to-[var(--accent-dark)] shadow-2xl flex items-center justify-center mb-8"
              >
                <BookOpen size={64} className="text-white" />
              </motion.div>

              {/* Title */}
              <motion.div
                initial={{ y: 20, opacity: 0 }}
                animate={{ y: 0, opacity: 1 }}
                transition={{ delay: 0.2 }}
                className="text-center mb-8"
              >
                <h2 className="text-2xl font-bold text-[var(--text-primary)] mb-1">{bookName}</h2>
                <p className="text-lg text-[var(--text-secondary)]">Chapter {chapter}</p>
                <p className="text-sm text-[var(--text-tertiary)] mt-1">Verse {currentVerse} of {totalVerses}</p>
                {audioVoice !== 'default' && (
                  <div className="flex items-center justify-center gap-1 mt-2 text-xs text-[var(--text-tertiary)]">
                    <Volume2 size={12} />
                    <span className="truncate max-w-[200px]">{audioVoice}</span>
                  </div>
                )}
              </motion.div>

              {/* Progress Bar */}
              <motion.div
                initial={{ y: 20, opacity: 0 }}
                animate={{ y: 0, opacity: 1 }}
                transition={{ delay: 0.3 }}
                className="w-full max-w-md mb-8"
              >
                <div className="h-1.5 bg-[var(--bg-hover)] rounded-full overflow-hidden">
                  <motion.div
                    className="h-full bg-[var(--accent)]"
                    initial={{ width: 0 }}
                    animate={{ width: `${(currentVerse / totalVerses) * 100}%` }}
                    transition={{ duration: 0.3 }}
                  />
                </div>
                <div className="flex justify-between mt-2 text-xs text-[var(--text-tertiary)]">
                  <span>Verse {currentVerse}</span>
                  <span>Verse {totalVerses}</span>
                </div>
              </motion.div>

              {/* Playback Controls */}
              <motion.div
                initial={{ y: 20, opacity: 0 }}
                animate={{ y: 0, opacity: 1 }}
                transition={{ delay: 0.4 }}
                className="flex items-center gap-6 mb-8"
              >
                <button
                  onClick={onSkipBack}
                  className="p-4 rounded-full bg-[var(--bg-hover)] text-[var(--text-secondary)] hover:bg-[var(--border-subtle)] hover:text-[var(--text-primary)] transition-all"
                  aria-label="Skip back"
                >
                  <SkipBack size={28} />
                </button>
                <button
                  onClick={onPlayPause}
                  className="p-6 rounded-full bg-[var(--accent)] text-white shadow-lg hover:scale-105 transition-all"
                  aria-label={isPlaying ? 'Pause' : 'Play'}
                >
                  {isPlaying ? <Pause size={32} /> : <Play size={32} className="ml-1" />}
                </button>
                <button
                  onClick={onSkipForward}
                  className="p-4 rounded-full bg-[var(--bg-hover)] text-[var(--text-secondary)] hover:bg-[var(--border-subtle)] hover:text-[var(--text-primary)] transition-all"
                  aria-label="Skip forward"
                >
                  <SkipForward size={28} />
                </button>
              </motion.div>

              {/* Controls Row */}
              <motion.div
                initial={{ y: 20, opacity: 0 }}
                animate={{ y: 0, opacity: 1 }}
                transition={{ delay: 0.5 }}
                className="flex items-center gap-4"
              >
                {/* Speed Control */}
                <div className="flex items-center gap-2">
                  <span className="text-xs text-[var(--text-tertiary)]">Speed</span>
                  <select
                    value={audioPlaybackSpeed}
                    onChange={(e) => onSpeedChange(parseFloat(e.target.value))}
                    className="bg-[var(--bg-hover)] border border-[var(--border-subtle)] rounded-lg px-3 py-2 text-sm text-[var(--text-primary)] outline-none focus:border-[var(--accent)]"
                  >
                    {SPEED_OPTIONS.map((speed) => (
                      <option key={speed} value={speed}>{speed}x</option>
                    ))}
                  </select>
                </div>

                {/* Sleep Timer */}
                <button
                  onClick={() => onSleepTimer(audioSleepTimer === 30 ? null : 30)}
                  className={cn(
                    'flex items-center gap-2 px-3 py-2 rounded-lg transition-colors',
                    audioSleepTimer ? 'bg-[var(--accent-soft)] text-[var(--accent)]' : 'bg-[var(--bg-hover)] text-[var(--text-secondary)]'
                  )}
                >
                  <Moon size={16} />
                  <span className="text-xs">{audioSleepTimer ? `${audioSleepTimer}m` : 'Sleep'}</span>
                </button>

                {/* Repeat Mode */}
                <button
                  onClick={() => {
                    const currentIndex = REPEAT_MODES.indexOf(audioRepeatMode);
                    const nextIndex = (currentIndex + 1) % REPEAT_MODES.length;
                    onRepeatMode(REPEAT_MODES[nextIndex]);
                  }}
                  className={cn(
                    'flex items-center gap-2 px-3 py-2 rounded-lg transition-colors',
                    audioRepeatMode !== 'none' ? 'bg-[var(--accent-soft)] text-[var(--accent)]' : 'bg-[var(--bg-hover)] text-[var(--text-secondary)]'
                  )}
                >
                  <RotateCcw size={16} />
                  <span className="text-xs">{REPEAT_LABELS[audioRepeatMode]}</span>
                </button>

                {/* Reading Mode */}
                <div className="flex items-center gap-2">
                  <span className="text-xs text-[var(--text-tertiary)]">Mode</span>
                  <select
                    value={audioReadingMode}
                    onChange={(e) => onReadingMode(e.target.value as 'verse' | 'chapter' | 'book')}
                    className="bg-[var(--bg-hover)] border border-[var(--border-subtle)] rounded-lg px-3 py-2 text-sm text-[var(--text-primary)] outline-none focus:border-[var(--accent)]"
                  >
                    {READING_MODES.map((mode) => (
                      <option key={mode} value={mode}>{READING_LABELS[mode]}</option>
                    ))}
                  </select>
                </div>

                {/* Voice Settings */}
                {onVoiceSettings && (
                  <button
                    onClick={onVoiceSettings}
                    className={cn(
                      'flex items-center gap-2 px-3 py-2 rounded-lg transition-colors',
                      audioVoice !== 'default' ? 'bg-[var(--accent-soft)] text-[var(--accent)]' : 'bg-[var(--bg-hover)] text-[var(--text-secondary)]'
                    )}
                  >
                    <Settings size={16} />
                    <span className="text-xs">Voice</span>
                  </button>
                )}
              </motion.div>
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}
