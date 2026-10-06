import { useEffect, useMemo, useRef, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { motion } from 'framer-motion';
import { ChevronLeft, ChevronRight, Volume2, VolumeX, SkipBack, SkipForward, Moon, Globe } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { fetchChapter } from '@/services/bibleService';
import { useBibleStore } from '@/stores/bibleStore';
import { useAuthStore } from '@/stores/authStore';
import { useSermonsStore } from '@/stores/sermonsStore';
import { useToast } from '@/hooks/useToast';
import { usePreferencesStore } from '@/stores/preferencesStore';
import { useWakeLock } from '@/hooks/useWakeLock';
import { getBookById, getAdjacentChapter } from '@/utils/bibleData';
import { categorizeVoice, suggestVoiceForTranslation } from '@/utils/voiceCategories';
import { cn } from '@/utils/cn';
import { VerseRow } from './VerseRow';
import { VerseNoteModal } from './VerseNoteModal';
import { HighlightEditorModal } from './HighlightEditorModal';
import { CompareTranslationModal } from './CompareTranslationModal';
import { BookSelector } from './BookSelector';
import { RelatedSermonsSheet } from './RelatedSermonsSheet';
import { AudioPlayer } from './AudioPlayer';
import { VoiceSettings } from './VoiceSettings';
import { TranslationManager } from './TranslationManager';
import { AIWordStudyModal } from './AIWordStudyModal';
import { PremiumVerseToolbar } from './PremiumVerseToolbar';
import { IconButton } from '@/components/ui/IconButton';
import type { BibleVerse, Highlight } from '@/types/bible';
import type { BibleTranslation } from '@/types/user';

const TRANSLATION_LABELS: Record<BibleTranslation, string> = {
  kjv: 'KJV',
  web: 'WEB',
  bbe: 'BBE',
  asv: 'ASV',
  lsg: 'LSG',
  ubs: 'UBS',
  bhn: 'BHN',
  bst: 'BST',
};

interface ChapterReaderProps {
  bookId: string;
  chapter: number;
  verse?: number;
  onNavigate: (bookId: string, chapter: number, verse?: number) => void;
}

export function ChapterReader({ bookId, chapter, verse, onNavigate }: ChapterReaderProps) {
  const { preferences, setPreference, audioPlaybackSpeed, setAudioPlaybackSpeed, audioSleepTimer, setAudioSleepTimer, setAudioRepeatMode, audioReadingMode, setAudioReadingMode, audioVoice, setAudioVoice, audioPitch, setAudioPitch, audioPosition, setAudioPosition, keepScreenAwake } = usePreferencesStore();
  const navigate = useNavigate();
  const [selectedVerse, setSelectedVerse] = useState<BibleVerse | null>(null);
  const [noteModalOpen, setNoteModalOpen] = useState(false);
  const [highlightModalOpen, setHighlightModalOpen] = useState(false);
  const [compareModalOpen, setCompareModalOpen] = useState(false);
  const [relatedSermonsOpen, setRelatedSermonsOpen] = useState(false);
  const [relatedSermonsVerse, setRelatedSermonsVerse] = useState<BibleVerse | null>(null);
  const [audioPlayerOpen, setAudioPlayerOpen] = useState(false);
  const [voiceSettingsOpen, setVoiceSettingsOpen] = useState(false);
  const [translationManagerOpen, setTranslationManagerOpen] = useState(false);
  const [aiWordStudyOpen, setAiWordStudyOpen] = useState(false);
  const [selectedText, setSelectedText] = useState<string>('');
  const [premiumToolbarOpen, setPremiumToolbarOpen] = useState(false);
  const [selectedVerses, setSelectedVerses] = useState<BibleVerse[]>([]);
  const [isSelecting, setIsSelecting] = useState(false);
  const [controlsVisible, setControlsVisible] = useState(true);
  const [speaking, setSpeaking] = useState(false);
  const [currentVerseIndex, setCurrentVerseIndex] = useState(0);
  const [progress, setProgress] = useState(0);
  const contentRef = useRef<HTMLDivElement>(null);
  const touchStartX = useRef<number | null>(null);
  const speechSynthesisRef = useRef<SpeechSynthesisUtterance | null>(null);
  const sleepTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const controlsTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const { showToast } = useToast();
  const { user } = useAuthStore();
  const { searchByVerse } = useSermonsStore();
  const userId = user?.id ?? 'local-user';

  // Enable wake lock when in reading mode or during audio playback
  useWakeLock(keepScreenAwake || speaking);

  // Intelligent voice matching based on translation
  useEffect(() => {
    if (audioVoice === 'default' || audioVoice === '') {
      const suggestedAccent = suggestVoiceForTranslation(preferences.translation);
      const voices = window.speechSynthesis.getVoices();
      const matchingVoice = voices.find(v => {
        const category = categorizeVoice(v.name, v.lang);
        return category.accent === suggestedAccent;
      });
      if (matchingVoice) {
        setAudioVoice(matchingVoice.name);
      }
    }
  }, [preferences.translation, audioVoice, setAudioVoice]);

  const {
    highlights,
    verseNotes,
    bookmarks,
    loaded,
    loadAll,
    toggleHighlight,
    updateHighlight,
    removeHighlight,
    undoDeleteHighlight,
    addBookmark,
    removeBookmark,
  } = useBibleStore();

  useEffect(() => {
    if (!loaded) void loadAll();
  }, [loaded, loadAll]);

  const { data, isLoading, error } = useQuery({
    queryKey: ['chapter', bookId, chapter, preferences.translation],
    queryFn: () => fetchChapter(bookId, chapter, preferences.translation),
    staleTime: 1000 * 60 * 5,
  });

  const bookInfo = useMemo(() => getBookById(bookId), [bookId]);
  const prevChapter = useMemo(() => getAdjacentChapter(bookId, chapter, -1), [bookId, chapter]);
  const nextChapter = useMemo(() => getAdjacentChapter(bookId, chapter, 1), [bookId, chapter]);

  useEffect(() => {
    if (data && verse && verse > 0) {
      const el = document.querySelector(`[data-verse="${verse}"]`);
      if (el) {
        el.scrollIntoView({ behavior: 'smooth', block: 'center' });
      }
    }
    // Resume from saved audio position if in same chapter
    if (data && audioPosition && audioPosition.bookId === bookId && audioPosition.chapter === chapter) {
      setCurrentVerseIndex(audioPosition.verseIndex);
      const el = document.querySelector(`[data-verse="${audioPosition.verseIndex}"]`);
      if (el) {
        el.scrollIntoView({ behavior: 'smooth', block: 'center' });
      }
    }
  }, [data, verse, audioPosition, bookId, chapter]);

  useEffect(() => {
    const onScroll = () => {
      const el = contentRef.current;
      if (!el) return;
      const scrollTop = window.scrollY;
      const docHeight = document.documentElement.scrollHeight - window.innerHeight;
      const pct = docHeight > 0 ? Math.min(100, Math.max(0, (scrollTop / docHeight) * 100)) : 0;
      setProgress(pct);
    };
    window.addEventListener('scroll', onScroll, { passive: true });
    return () => window.removeEventListener('scroll', onScroll);
  }, []);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'ArrowLeft') handlePrev();
      if (e.key === 'ArrowRight') handleNext();
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [bookId, chapter]);

  useEffect(() => {
    return () => {
      if (window.speechSynthesis.speaking) window.speechSynthesis.cancel();
    };
  }, [bookId, chapter]);

  const onTouchStart = (e: React.TouchEvent) => {
    touchStartX.current = e.changedTouches[0].screenX;
  };

  const onTouchEnd = (e: React.TouchEvent) => {
    const start = touchStartX.current;
    const end = e.changedTouches[0].screenX;
    if (start == null) return;
    touchStartX.current = null;
    const diff = start - end;
    if (Math.abs(diff) < 50) return;
    if (diff > 0) handleNext();
    else handlePrev();
  };

  const handleScroll = () => {
    // Close premium toolbar when scrolling
    if (premiumToolbarOpen) {
      handlePremiumToolbarClose();
    }
  };

  const handlePrev = () => {
    const prev = getAdjacentChapter(bookId, chapter, -1);
    if (prev) onNavigate(prev.bookId, prev.chapter);
  };

  const handleNext = () => {
    const next = getAdjacentChapter(bookId, chapter, 1);
    if (next) onNavigate(next.bookId, next.chapter);
  };

  const toggleSpeak = () => {
    if (window.speechSynthesis.speaking) {
      window.speechSynthesis.cancel();
      setSpeaking(false);
      if (sleepTimerRef.current) {
        clearTimeout(sleepTimerRef.current);
        sleepTimerRef.current = null;
      }
      return;
    }
    if (!data) return;
    startSpeakingFromVerse(0);
  };

  const startSpeakingFromVerse = (verseIndex: number) => {
    if (!data) return;
    setCurrentVerseIndex(verseIndex);
    setAudioPosition({ bookId, chapter, verseIndex });
    
    const versesToRead = data.verses.slice(verseIndex);
    const text = versesToRead.map((v) => `${v.verse}. ${v.text}`).join(' ');
    
    const utter = new SpeechSynthesisUtterance(text);
    utter.rate = audioPlaybackSpeed;
    utter.pitch = audioPitch;
    const selectedVoice = getVoice();
    if (selectedVoice) utter.voice = selectedVoice;
    
    let verseIndexCounter = verseIndex;
    
    utter.onboundary = (event) => {
      if (event.name === 'sentence') {
        setCurrentVerseIndex(verseIndexCounter);
        setAudioPosition({ bookId, chapter, verseIndex: verseIndexCounter });
        verseIndexCounter++;
        // Scroll to current verse
        const el = document.querySelector(`[data-verse="${verseIndexCounter}"]`);
        if (el) {
          el.scrollIntoView({ behavior: 'smooth', block: 'center' });
        }
      }
    };
    
    utter.onend = () => {
      setSpeaking(false);
      setAudioPosition(null);
      if (sleepTimerRef.current) {
        clearTimeout(sleepTimerRef.current);
        sleepTimerRef.current = null;
      }
      // Auto-continue to next chapter if enabled
      if (audioReadingMode === 'chapter' || audioReadingMode === 'book') {
        const next = getAdjacentChapter(bookId, chapter, 1);
        if (next) {
          onNavigate(next.bookId, next.chapter);
          setTimeout(() => {
            const newData = data;
            if (newData) startSpeakingFromVerse(0);
          }, 500);
        }
      }
    };
    
    utter.onerror = () => {
      setSpeaking(false);
      setAudioPosition(null);
      if (sleepTimerRef.current) {
        clearTimeout(sleepTimerRef.current);
        sleepTimerRef.current = null;
      }
    };
    
    // Set sleep timer if enabled
    if (audioSleepTimer && audioSleepTimer > 0) {
      sleepTimerRef.current = setTimeout(() => {
        window.speechSynthesis.cancel();
        setSpeaking(false);
        setAudioPosition(null);
        showToast('Sleep timer ended playback', 'info');
      }, audioSleepTimer * 60 * 1000);
    }
    
    speechSynthesisRef.current = utter;
    window.speechSynthesis.speak(utter);
    setSpeaking(true);
  };

  const getVoice = () => {
    const voices = window.speechSynthesis.getVoices();
    if (audioVoice === 'default') return undefined;
    return voices.find((v) => v.name === audioVoice);
  };

  const handleSkipBack = () => {
    if (window.speechSynthesis.speaking) {
      window.speechSynthesis.cancel();
      const newIndex = Math.max(0, currentVerseIndex - 1);
      startSpeakingFromVerse(newIndex);
    }
  };

  const handleSkipForward = () => {
    if (window.speechSynthesis.speaking && data) {
      window.speechSynthesis.cancel();
      const newIndex = Math.min(data.verses.length - 1, currentVerseIndex + 1);
      startSpeakingFromVerse(newIndex);
    }
  };

  const handleSpeedChange = (speed: number) => {
    setAudioPlaybackSpeed(speed);
    if (window.speechSynthesis.speaking && speechSynthesisRef.current) {
      speechSynthesisRef.current.rate = speed;
      window.speechSynthesis.cancel();
      window.speechSynthesis.speak(speechSynthesisRef.current);
    }
  };

  const handlePitchChange = (pitch: number) => {
    setAudioPitch(pitch);
    if (window.speechSynthesis.speaking && speechSynthesisRef.current) {
      speechSynthesisRef.current.pitch = pitch;
      window.speechSynthesis.cancel();
      window.speechSynthesis.speak(speechSynthesisRef.current);
    }
  };

  const handleVoiceChange = (voiceName: string) => {
    setAudioVoice(voiceName);
    if (window.speechSynthesis.speaking && data) {
      // Restart from current position with new voice
      window.speechSynthesis.cancel();
      startSpeakingFromVerse(currentVerseIndex);
    }
  };

  const handleSleepTimer = (minutes: number | null) => {
    setAudioSleepTimer(minutes);
    if (minutes === null && sleepTimerRef.current) {
      clearTimeout(sleepTimerRef.current);
      sleepTimerRef.current = null;
    } else if (minutes && speaking) {
      if (sleepTimerRef.current) clearTimeout(sleepTimerRef.current);
      sleepTimerRef.current = setTimeout(() => {
        window.speechSynthesis.cancel();
        setSpeaking(false);
        showToast('Sleep timer ended playback', 'info');
      }, minutes * 60 * 1000);
    }
    showToast(minutes ? `Sleep timer set to ${minutes} minutes` : 'Sleep timer disabled', 'info');
  };

  const handleRepeatMode = (mode: 'none' | 'verse' | 'chapter' | 'book') => {
    setAudioRepeatMode(mode);
    showToast(`Repeat mode: ${mode}`, 'info');
  };

  const handlePlayFromVerse = (verseIndex: number) => {
    if (window.speechSynthesis.speaking) {
      window.speechSynthesis.cancel();
    }
    startSpeakingFromVerse(verseIndex);
  };

  const handleContentTap = () => {
    if (controlsVisible) {
      setControlsVisible(false);
    } else {
      setControlsVisible(true);
    }
    if (premiumToolbarOpen) {
      handlePremiumToolbarClose();
    }
    if (controlsTimerRef.current) {
      clearTimeout(controlsTimerRef.current);
    }
    controlsTimerRef.current = setTimeout(() => {
      setControlsVisible(false);
    }, 3000);
  };

  const handleCopy = async (verse: BibleVerse) => {
    const ref = `${verse.book} ${verse.chapter}:${verse.verse}`;
    await navigator.clipboard.writeText(`${ref} — ${verse.text}`);
    showToast('Copied to clipboard', 'success');
  };

  const handleShare = async (verse: BibleVerse) => {
    const ref = `${verse.book} ${verse.chapter}:${verse.verse}`;
    const text = `${ref} — ${verse.text}`;
    if (navigator.share) {
      try {
        await navigator.share({ title: ref, text });
        return;
      } catch {
        // fall through
      }
    }
    await navigator.clipboard.writeText(text);
    showToast('Copied to clipboard', 'success');
  };

  const selectedHighlight = useMemo(() => {
    if (!selectedVerse) return undefined;
    return highlights.find((h) => h.bookId === selectedVerse.bookId && h.chapter === selectedVerse.chapter && h.verse === selectedVerse.verse);
  }, [highlights, selectedVerse]);

  const hasNote = (v: BibleVerse) =>
    verseNotes.some((n) => n.bookId === v.bookId && n.chapter === v.chapter && n.verse === v.verse);

  const isBookmarked = (v: BibleVerse) =>
    bookmarks.some((b) => b.bookId === v.bookId && b.chapter === v.chapter && b.verse === v.verse);

  const handleHighlight = async (color: Highlight['color']) => {
    if (!selectedVerse) return;
    await toggleHighlight(userId, { bookId: selectedVerse.bookId, chapter: selectedVerse.chapter, verse: selectedVerse.verse }, color);
  };

  const handleBookmark = async () => {
    if (!selectedVerse) return;
    const existing = bookmarks.find((b) => b.bookId === selectedVerse.bookId && b.chapter === selectedVerse.chapter && b.verse === selectedVerse.verse);
    if (existing) {
      await removeBookmark(existing.id);
    } else {
      await addBookmark(userId, selectedVerse.bookId, selectedVerse.chapter, selectedVerse.verse);
    }
  };

  const onTapVerse = (v: BibleVerse) => {
    // Handle multi-verse selection
    if (isSelecting) {
      const existingIndex = selectedVerses.findIndex(sv => sv.verse === v.verse);
      if (existingIndex >= 0) {
        setSelectedVerses(selectedVerses.filter((_, i) => i !== existingIndex));
      } else {
        setSelectedVerses([...selectedVerses, v].sort((a, b) => a.verse - b.verse));
      }
    } else {
      // Single verse selection
      setSelectedVerses([v]);
      setSelectedVerse(v);
      setPremiumToolbarOpen(true);
    }
  };

  const handlePremiumToolbarClose = () => {
    setPremiumToolbarOpen(false);
    setSelectedVerses([]);
    setIsSelecting(false);
  };

  const handleListenFromVerse = () => {
    if (selectedVerses.length > 0) {
      const firstVerseIndex = data?.verses.findIndex(v => v.verse === selectedVerses[0].verse) ?? 0;
      setCurrentVerseIndex(firstVerseIndex);
      toggleSpeak();
    }
  };

  const handleOriginalLanguage = () => {
    // Open AI word study with focus on original language
    if (selectedVerses.length > 0) {
      const words = selectedVerses[0].text.split(' ').slice(0, 3).join(' ');
      setSelectedText(words);
      setAiWordStudyOpen(true);
    }
  };

  const handleAddToFavorites = () => {
    showToast('Added to favorites', 'success');
  };

  const handleReadingPlan = () => {
    showToast('Reading plan coming soon', 'info');
  };

  const handlePrint = () => {
    showToast('Print coming soon', 'info');
  };

  const handleOpenFullAIStudy = () => {
    handleAIWordStudy();
  };

  const handleRelatedSermons = () => {
    if (selectedVerse) {
      setRelatedSermonsVerse(selectedVerse);
      setRelatedSermonsOpen(true);
    }
  };

  const handleAIWordStudy = () => {
    if (selectedVerse) {
      // Use the first few words of the verse as the selected text for now
      const words = selectedVerse.text.split(' ').slice(0, 3).join(' ');
      setSelectedText(words);
      setAiWordStudyOpen(true);
    }
  };

  const handleTopicSearch = (topic: string) => {
    setSelectedText(topic);
    // Keep the modal open with the new topic
  };

  const handleSermonSelect = (sermonId: string) => {
    setRelatedSermonsOpen(false);
    navigate(`/sermons?active=${sermonId}&verse=${relatedSermonsVerse?.bookId} ${relatedSermonsVerse?.chapter}:${relatedSermonsVerse?.verse}`);
  };

  if (error) {
    return (
      <div className="flex min-h-[60vh] items-center justify-center p-6 text-center">
        <div className="rounded-2xl border border-[var(--border-subtle)] bg-[var(--bg-surface)] p-6">
          <p className="text-[var(--text-primary)]">Failed to load chapter.</p>
          <p className="mt-1 text-sm text-[var(--text-tertiary)]">{(error as Error).message}</p>
          <button
            onClick={undoDeleteHighlight}
            className="mt-4 rounded-lg bg-[var(--accent)] px-4 py-2 text-sm font-medium text-white"
          >
            Try again
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="relative flex min-h-screen flex-col">
      {/* Progress bar */}
      <div className="fixed left-0 right-0 top-0 z-40 h-1 bg-[var(--bg-hover)]">
        <div
          className="h-full bg-[var(--accent)] transition-all"
          style={{ width: `${progress}%` }}
        />
      </div>

      {/* Header */}
      <motion.header
        initial={{ y: 0 }}
        animate={{ y: controlsVisible ? 0 : -100 }}
        transition={{ duration: 0.25, ease: 'easeInOut' }}
        className="sticky top-0 z-30 bg-[var(--bg-app)]/95 backdrop-blur-sm border-b border-[var(--border-subtle)]"
      >
        <div className="flex items-center justify-between p-4 border-b border-[var(--border-subtle)]">
          <IconButton onClick={handlePrev} disabled={!prevChapter} aria-label="Previous chapter">
            <ChevronLeft />
          </IconButton>
          <BookSelector
            bookId={bookId}
            chapter={chapter}
            onSelect={onNavigate}
          />
          <IconButton onClick={handleNext} disabled={!nextChapter} aria-label="Next chapter">
            <ChevronRight />
          </IconButton>
        </div>
        <div className="flex items-center gap-2 px-4 py-2">
          <select
            value={preferences.translation}
            onChange={(e) => setPreference('translation', e.target.value as BibleTranslation)}
            className="rounded-lg border border-[var(--border-subtle)] bg-[var(--bg-surface)] px-2 py-1.5 text-xs font-medium text-[var(--text-primary)] outline-none"
          >
            {(Object.keys(TRANSLATION_LABELS) as BibleTranslation[]).map((t) => (
              <option key={t} value={t}>{TRANSLATION_LABELS[t]}</option>
            ))}
          </select>
          <button
            onClick={() => setTranslationManagerOpen(true)}
            className="p-2 rounded-lg hover:bg-[var(--bg-hover)] text-[var(--text-secondary)] transition-colors"
            aria-label="Manage translations"
          >
            <Globe size={16} />
          </button>
          <div className="w-px h-6 bg-[var(--border-subtle)]" />
          <div className="flex items-center gap-1">
            <button
              onClick={handleSkipBack}
              className="p-2 rounded-lg hover:bg-[var(--bg-hover)] text-[var(--text-secondary)] transition-colors"
              aria-label="Skip back"
            >
              <SkipBack size={18} />
            </button>
            <button
              onClick={() => setAudioPlayerOpen(true)}
              className="p-2 rounded-lg hover:bg-[var(--bg-hover)] text-[var(--text-secondary)] transition-colors"
              aria-label="Open audio player"
            >
              <Volume2 size={18} />
            </button>
            <button
              onClick={toggleSpeak}
              className={cn(
                'rounded-lg p-2 transition-colors',
                speaking ? 'bg-[var(--accent)] text-white' : 'hover:bg-[var(--bg-hover)] text-[var(--text-secondary)]'
              )}
              aria-label={speaking ? 'Stop reading' : 'Read aloud'}
            >
              {speaking ? <VolumeX size={18} /> : <Volume2 size={18} />}
            </button>
            <button
              onClick={handleSkipForward}
              className="p-2 rounded-lg hover:bg-[var(--bg-hover)] text-[var(--text-secondary)] transition-colors"
              aria-label="Skip forward"
            >
              <SkipForward size={18} />
            </button>
          </div>
          <div className="w-px h-6 bg-[var(--border-subtle)]" />
          <button
            onClick={() => handleSleepTimer(audioSleepTimer === 30 ? null : 30)}
            className={cn(
              'p-2 rounded-lg transition-colors',
              audioSleepTimer ? 'bg-[var(--accent)] text-white' : 'hover:bg-[var(--bg-hover)] text-[var(--text-secondary)]'
            )}
            aria-label="Sleep timer"
          >
            <Moon size={18} />
          </button>
        </div>
      </motion.header>

      {/* Chapter content */}
      <main
        ref={contentRef}
        className="flex-1 px-4 pb-32"
        style={{ paddingTop: 'calc(var(--spacing) * 2)' }}
        onTouchStart={onTouchStart}
        onClick={handleContentTap}
        onTouchEnd={onTouchEnd}
        onScroll={handleScroll}
      >
        <div className="mx-auto max-w-3xl">
          <h1 className="mb-1 text-2xl font-bold text-[var(--text-primary)]">
            {bookInfo?.name} {chapter}
          </h1>
          <p className="mb-6 text-xs font-medium uppercase tracking-wide text-[var(--text-tertiary)]">
            {TRANSLATION_LABELS[preferences.translation]}
          </p>

          {isLoading && (
            <div className="space-y-3">
              <div className="h-4 w-3/4 animate-pulse rounded bg-[var(--bg-hover)]" />
              <div className="h-4 w-full animate-pulse rounded bg-[var(--bg-hover)]" />
              <div className="h-4 w-5/6 animate-pulse rounded bg-[var(--bg-hover)]" />
            </div>
          )}

          <article
            className={cn(
              'prose prose-neutral max-w-none leading-[var(--reader-line-height)]',
              preferences.readingFont === 'serif' && 'font-serif',
              preferences.readingFont === 'sans' && 'font-sans',
              preferences.readingFont === 'mono' && 'font-mono'
            )}
            style={{
              fontSize: `${preferences.fontSize === 'sm' ? 15 : preferences.fontSize === 'md' ? 17 : preferences.fontSize === 'lg' ? 19 : 22}px`,
              lineHeight: preferences.lineHeight === 'tight' ? 1.5 : preferences.lineHeight === 'normal' ? 1.7 : preferences.lineHeight === 'relaxed' ? 1.9 : 2.1,
            }}
          >
            {data?.verses.map((v, index) => (
              <span key={v.verse} data-verse={v.verse}>
                <VerseRow
                  verse={v}
                  highlight={highlights.find((h) => h.bookId === v.bookId && h.chapter === v.chapter && h.verse === v.verse)}
                  hasNote={hasNote(v)}
                  isBookmarked={isBookmarked(v)}
                  isSelected={selectedVerses.some(sv => sv.verse === v.verse)}
                  isPlaying={speaking && currentVerseIndex === index}
                  showVerseNumber={preferences.showVerseNumbers}
                  onTap={() => onTapVerse(v)}
                  onPlayFrom={() => handlePlayFromVerse(index)}
                />
              </span>
            ))}
          </article>
        </div>
      </main>

      {/* Bottom navigation */}
      <div className="fixed inset-x-0 bottom-0 z-40 border-t border-[var(--border-subtle)] bg-[var(--bg-elevated)]/95 px-4 py-3 backdrop-blur">
        <div className="mx-auto flex max-w-3xl items-center justify-between gap-4">
          <button
            onClick={handlePrev}
            className="flex items-center gap-1 rounded-lg px-3 py-2 text-sm font-medium text-[var(--text-primary)] hover:bg-[var(--bg-hover)] disabled:opacity-40"
            disabled={!getAdjacentChapter(bookId, chapter, -1)}
          >
            <ChevronLeft size={18} /> Previous
          </button>

          <span className="text-xs font-medium text-[var(--text-tertiary)]">
            {Math.round(progress)}% · {bookInfo?.name} {chapter}
          </span>

          <button
            onClick={handleNext}
            className="flex items-center gap-1 rounded-lg px-3 py-2 text-sm font-medium text-[var(--text-primary)] hover:bg-[var(--bg-hover)] disabled:opacity-40"
            disabled={!getAdjacentChapter(bookId, chapter, 1)}
          >
            Next <ChevronRight size={18} />
          </button>
        </div>
      </div>

      {selectedVerse && (
        <VerseNoteModal
          open={noteModalOpen}
          onClose={() => setNoteModalOpen(false)}
          bookId={selectedVerse.bookId}
          chapter={selectedVerse.chapter}
          verse={selectedVerse.verse}
        />
      )}

      {selectedHighlight && (
        <HighlightEditorModal
          open={highlightModalOpen}
          onClose={() => setHighlightModalOpen(false)}
          highlight={selectedHighlight}
          onSave={(updates) => updateHighlight(selectedHighlight.id, updates)}
          onDelete={() => {
            void removeHighlight(selectedHighlight.id);
            setHighlightModalOpen(false);
          }}
        />
      )}

      {selectedVerse && (
        <CompareTranslationModal
          open={compareModalOpen}
          onClose={() => setCompareModalOpen(false)}
          verse={selectedVerse}
          currentTranslation={preferences.translation}
        />
      )}

      <RelatedSermonsSheet
        open={relatedSermonsOpen}
        onClose={() => setRelatedSermonsOpen(false)}
        verseReference={relatedSermonsVerse ? `${relatedSermonsVerse.book} ${relatedSermonsVerse.chapter}:${relatedSermonsVerse.verse}` : ''}
        sermons={relatedSermonsVerse ? searchByVerse(`${relatedSermonsVerse.book} ${relatedSermonsVerse.chapter}:${relatedSermonsVerse.verse}`) : []}
        onSermonSelect={handleSermonSelect}
      />

      <AudioPlayer
        open={audioPlayerOpen}
        onClose={() => setAudioPlayerOpen(false)}
        bookName={bookInfo?.name ?? ''}
        chapter={chapter}
        currentVerse={currentVerseIndex + 1}
        totalVerses={data?.verses.length ?? 0}
        isPlaying={speaking}
        onPlayPause={toggleSpeak}
        onSkipBack={handleSkipBack}
        onSkipForward={handleSkipForward}
        onSpeedChange={handleSpeedChange}
        onSleepTimer={handleSleepTimer}
        onRepeatMode={handleRepeatMode}
        onReadingMode={setAudioReadingMode}
        onVoiceSettings={() => setVoiceSettingsOpen(true)}
      />

      <VoiceSettings
        open={voiceSettingsOpen}
        onClose={() => setVoiceSettingsOpen(false)}
        onVoiceChange={handleVoiceChange}
        onPitchChange={handlePitchChange}
      />

      <TranslationManager
        open={translationManagerOpen}
        onClose={() => setTranslationManagerOpen(false)}
        onTranslationSelect={(translation) => setPreference('translation', translation as BibleTranslation)}
      />

      <AIWordStudyModal
        open={aiWordStudyOpen}
        onClose={() => setAiWordStudyOpen(false)}
        verse={selectedVerse}
        selectedText={selectedText}
        translation={preferences.translation}
        onNavigate={onNavigate}
        onTopicSearch={handleTopicSearch}
      />

      <PremiumVerseToolbar
        open={premiumToolbarOpen}
        onClose={handlePremiumToolbarClose}
        verses={selectedVerses}
        highlight={selectedHighlight}
        hasNote={!!selectedVerse && hasNote(selectedVerse)}
        isBookmarked={!!selectedVerse && isBookmarked(selectedVerse)}
        onHighlight={handleHighlight}
        onBookmark={handleBookmark}
        onCopy={() => selectedVerse && handleCopy(selectedVerse)}
        onShare={() => selectedVerse && handleShare(selectedVerse)}
        onAddNote={() => setNoteModalOpen(true)}
        onAIWordStudy={handleAIWordStudy}
        onListenFromVerse={handleListenFromVerse}
        onCompare={() => setCompareModalOpen(true)}
        onCrossReferences={() => showToast('Cross references coming soon', 'info')}
        onRelatedSermons={handleRelatedSermons}
        onOriginalLanguage={handleOriginalLanguage}
        onTag={() => showToast('Tags coming soon', 'info')}
        onAddToFavorites={handleAddToFavorites}
        onReadingPlan={handleReadingPlan}
        onPrint={handlePrint}
        onOpenFullAIStudy={handleOpenFullAIStudy}
      />
    </div>
  );
}
