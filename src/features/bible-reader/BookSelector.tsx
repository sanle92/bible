import { useState, useEffect, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { ChevronDown, ChevronLeft, BookOpen, Search, X } from 'lucide-react';
import { useQuery } from '@tanstack/react-query';
import { BIBLE_BOOKS, getBookById } from '@/utils/bibleData';
import { fetchChapter } from '@/services/bibleService';
import { usePreferencesStore } from '@/stores/preferencesStore';
import { cn } from '@/utils/cn';

interface BookSelectorProps {
  bookId: string;
  chapter: number;
  verse?: number;
  onSelect: (bookId: string, chapter: number, verse?: number) => void;
}

type Step = 'book' | 'chapter' | 'verse';

export function BookSelector({ bookId, chapter, verse, onSelect }: BookSelectorProps) {
  const [open, setOpen] = useState(false);
  const [step, setStep] = useState<Step>('book');
  const [selectedBook, setSelectedBook] = useState(bookId);
  const [selectedChapter, setSelectedChapter] = useState(chapter);
  const [searchQuery, setSearchQuery] = useState('');
  const { preferences } = usePreferencesStore();
  const book = getBookById(bookId);

  const filteredBooks = useMemo(() => {
    if (!searchQuery) return BIBLE_BOOKS;
    const q = searchQuery.toLowerCase();
    return BIBLE_BOOKS.filter((b) => b.name.toLowerCase().includes(q));
  }, [searchQuery]);

  useEffect(() => {
    if (open) {
      setSelectedBook(bookId);
      setSelectedChapter(chapter);
      setStep('book');
      setSearchQuery('');
    }
  }, [open, bookId, chapter]);

  const { data: chapterData, isLoading: chapterLoading } = useQuery({
    queryKey: ['chapter', selectedBook, selectedChapter, preferences.translation],
    queryFn: () => fetchChapter(selectedBook, selectedChapter, preferences.translation),
    enabled: step === 'verse',
    staleTime: 1000 * 60 * 5,
  });

  const selectedBookInfo = getBookById(selectedBook);
  const verseCount = chapterData?.verses.length ?? 0;

  const handleBookSelect = (id: string) => {
    setSelectedBook(id);
    setSelectedChapter(1);
    setTimeout(() => setStep('chapter'), 50);
  };

  const handleChapterSelect = (c: number) => {
    setSelectedChapter(c);
    setTimeout(() => setStep('verse'), 50);
  };

  const handleVerseSelect = (v: number) => {
    onSelect(selectedBook, selectedChapter, v);
    setOpen(false);
  };

  const handleReadChapter = () => {
    onSelect(selectedBook, selectedChapter);
    setOpen(false);
  };

  const renderHeader = () => (
    <div className="flex items-center gap-2 mb-3 px-1">
      {step !== 'book' && (
        <button
          onClick={() => setStep(step === 'verse' ? 'chapter' : 'book')}
          className="p-1.5 rounded-lg hover:bg-[var(--bg-hover)] text-[var(--text-tertiary)] transition-colors"
          aria-label="Back"
        >
          <ChevronLeft size={18} />
        </button>
      )}
      <div className="flex-1 text-sm font-medium text-[var(--text-primary)]">
        {step === 'book' && 'Select book'}
        {step === 'chapter' && `${selectedBookInfo?.name} — Select chapter`}
        {step === 'verse' && `${selectedBookInfo?.name} ${selectedChapter} — Select verse`}
      </div>
    </div>
  );

  return (
    <div className="relative">
      <button
        onClick={() => setOpen((o) => !o)}
        className="flex items-center gap-2 rounded-xl px-4 py-2.5 text-sm font-semibold text-[var(--text-primary)] hover:bg-[var(--bg-hover)] transition-colors"
      >
        <BookOpen size={18} className="text-[var(--accent)]" />
        <span>{book?.name} {chapter}</span>
        {verse ? <span className="text-[var(--text-tertiary)] font-normal">:{verse}</span> : null}
        <ChevronDown size={16} className={cn('transition-transform', open && 'rotate-180')} />
      </button>

      <AnimatePresence>
        {open && (
          <>
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.15 }}
              onClick={() => setOpen(false)}
              className="fixed inset-0 z-30 bg-black/20"
            />
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: -10 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: -10 }}
              transition={{ type: 'spring', duration: 0.3, bounce: 0 }}
              className="absolute z-40 mt-3 w-full max-w-sm max-h-[85vh] overflow-y-auto rounded-2xl border border-[var(--border-subtle)] bg-[var(--bg-elevated)] shadow-[var(--shadow-soft)] p-4"
            >
              {renderHeader()}

              {step === 'book' && (
                <>
                  <motion.div
                    initial={{ opacity: 0, y: 5 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.1 }}
                    className="relative mb-4"
                  >
                    <Search size={18} className="absolute left-3 top-1/2 -translate-y-1/2 text-[var(--text-tertiary)]" />
                    <input
                      type="text"
                      placeholder="Search books..."
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                      className="w-full pl-10 pr-10 py-2.5 rounded-xl bg-[var(--bg-hover)] border border-[var(--border-subtle)] text-sm text-[var(--text-primary)] placeholder:text-[var(--text-tertiary)] focus:outline-none focus:ring-2 focus:ring-[var(--accent)]/20 focus:border-[var(--accent)] transition-all"
                    />
                    {searchQuery && (
                      <motion.button
                        initial={{ scale: 0 }}
                        animate={{ scale: 1 }}
                        exit={{ scale: 0 }}
                        onClick={() => setSearchQuery('')}
                        className="absolute right-3 top-1/2 -translate-y-1/2 text-[var(--text-tertiary)] hover:text-[var(--text-secondary)] transition-colors"
                      >
                        <X size={16} />
                      </motion.button>
                    )}
                  </motion.div>
                  <motion.div
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    transition={{ delay: 0.15 }}
                    className="grid grid-cols-1 gap-1"
                  >
                    <p className="text-xs font-semibold text-[var(--text-tertiary)] mb-2 px-1">Old Testament</p>
                    {filteredBooks.filter((b) => b.testament === 'OT').map((b, i) => (
                      <motion.button
                        key={b.id}
                        initial={{ opacity: 0, x: -10 }}
                        animate={{ opacity: 1, x: 0 }}
                        transition={{ delay: 0.2 + i * 0.02 }}
                        onClick={() => handleBookSelect(b.id)}
                        whileHover={{ scale: 1.02 }}
                        whileTap={{ scale: 0.98 }}
                        className={cn(
                          'block w-full text-left px-3 py-3 rounded-xl hover:bg-[var(--bg-hover)] transition-all',
                          b.id === bookId && 'bg-[var(--accent-soft)] text-[var(--accent)] font-medium'
                        )}
                      >
                        {b.name}
                      </motion.button>
                    ))}
                    <p className="text-xs font-semibold text-[var(--text-tertiary)] mb-2 mt-4 px-1">New Testament</p>
                    {filteredBooks.filter((b) => b.testament === 'NT').map((b, i) => (
                      <motion.button
                        key={b.id}
                        initial={{ opacity: 0, x: -10 }}
                        animate={{ opacity: 1, x: 0 }}
                        transition={{ delay: 0.25 + i * 0.02 }}
                        onClick={() => handleBookSelect(b.id)}
                        whileHover={{ scale: 1.02 }}
                        whileTap={{ scale: 0.98 }}
                        className={cn(
                          'block w-full text-left px-3 py-3 rounded-xl hover:bg-[var(--bg-hover)] transition-all',
                          b.id === bookId && 'bg-[var(--accent-soft)] text-[var(--accent)] font-medium'
                        )}
                      >
                        {b.name}
                      </motion.button>
                    ))}
                  </motion.div>
                </>
              )}

              {step === 'chapter' && selectedBookInfo && (
                <motion.div
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  transition={{ delay: 0.1 }}
                >
                  <div className="grid grid-cols-5 gap-2 max-h-60 overflow-y-auto">
                    {Array.from({ length: selectedBookInfo.chapters }, (_, i) => i + 1).map((c, i) => (
                      <motion.button
                        key={c}
                        initial={{ opacity: 0, scale: 0.8 }}
                        animate={{ opacity: 1, scale: 1 }}
                        transition={{ delay: 0.15 + i * 0.01 }}
                        onClick={() => handleChapterSelect(c)}
                        whileHover={{ scale: 1.1 }}
                        whileTap={{ scale: 0.95 }}
                        className={cn(
                          'h-12 text-sm font-medium rounded-xl hover:bg-[var(--bg-hover)] transition-all',
                          c === chapter && 'bg-[var(--accent)] text-white shadow-md'
                        )}
                      >
                        {c}
                      </motion.button>
                    ))}
                  </div>
                </motion.div>
              )}

              {step === 'verse' && (
                <motion.div
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  transition={{ delay: 0.1 }}
                >
                  {chapterLoading && (
                    <p className="text-sm text-[var(--text-tertiary)] py-8 text-center">Loading verses...</p>
                  )}
                  {!chapterLoading && verseCount > 0 && (
                    <>
                      <div className="grid grid-cols-6 gap-2 max-h-60 overflow-y-auto mb-4">
                        {Array.from({ length: verseCount }, (_, i) => i + 1).map((v, i) => (
                          <motion.button
                            key={v}
                            initial={{ opacity: 0, scale: 0.8 }}
                            animate={{ opacity: 1, scale: 1 }}
                            transition={{ delay: 0.15 + i * 0.005 }}
                            onClick={() => handleVerseSelect(v)}
                            whileHover={{ scale: 1.1 }}
                            whileTap={{ scale: 0.95 }}
                            className={cn(
                              'h-10 text-sm font-medium rounded-xl hover:bg-[var(--bg-hover)] transition-all',
                              v === verse && 'bg-[var(--accent)] text-white shadow-md'
                            )}
                          >
                            {v}
                          </motion.button>
                        ))}
                      </div>
                      <motion.button
                        initial={{ opacity: 0, y: 10 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: 0.2 }}
                        onClick={handleReadChapter}
                        whileHover={{ scale: 1.02 }}
                        whileTap={{ scale: 0.98 }}
                        className="w-full rounded-xl bg-[var(--accent)] px-4 py-3 text-sm font-semibold text-white hover:bg-[var(--accent)]/90 transition-all shadow-md"
                      >
                        Read full chapter
                      </motion.button>
                    </>
                  )}
                </motion.div>
              )}
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </div>
  );
}
