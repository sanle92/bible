import { AnimatePresence, motion } from 'framer-motion';
import { X, Mic, Calendar, User, ArrowRight } from 'lucide-react';
import { format } from 'date-fns';
import type { Sermon } from '@/types/sermons';

interface RelatedSermonsSheetProps {
  open: boolean;
  onClose: () => void;
  verseReference: string;
  sermons: Sermon[];
  onSermonSelect: (sermonId: string) => void;
}

export function RelatedSermonsSheet({
  open,
  onClose,
  verseReference,
  sermons,
  onSermonSelect,
}: RelatedSermonsSheetProps) {
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
            className="fixed inset-x-0 bottom-0 z-50 rounded-t-3xl bg-[var(--bg-elevated)] border-t border-[var(--border-subtle)] shadow-[0_-8px_40px_rgba(0,0,0,0.12)] max-h-[80vh] overflow-y-auto"
          >
            <div className="sticky top-0 z-10 bg-[var(--bg-elevated)] rounded-t-3xl px-5 pt-4 pb-3 border-b border-[var(--border-subtle)]">
              <div className="mx-auto mb-4 h-1.5 w-10 rounded-full bg-[var(--border-subtle)]" />
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="text-lg font-semibold text-[var(--text-primary)]">Related Sermons</h3>
                  <p className="text-sm text-[var(--text-secondary)] mt-0.5">{verseReference}</p>
                </div>
                <button
                  onClick={onClose}
                  className="p-2 rounded-lg text-[var(--text-secondary)] hover:bg-[var(--bg-hover)] transition-colors"
                >
                  <X size={20} />
                </button>
              </div>
            </div>

            <div className="px-5 pb-8 pt-4">
              {sermons.length === 0 ? (
                <div className="text-center py-12">
                  <Mic size={48} className="mx-auto mb-4 text-[var(--text-tertiary)] opacity-50" />
                  <p className="text-sm text-[var(--text-secondary)]">No sermons found for this verse</p>
                  <p className="text-xs text-[var(--text-tertiary)] mt-2">Try searching for sermons from the same chapter or book</p>
                </div>
              ) : (
                <div className="space-y-3">
                  {sermons.map((sermon, index) => (
                    <motion.button
                      key={sermon.id}
                      initial={{ opacity: 0, y: 10 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: index * 0.05 }}
                      onClick={() => onSermonSelect(sermon.id)}
                      whileHover={{ scale: 1.01 }}
                      whileTap={{ scale: 0.99 }}
                      className="w-full text-left p-4 rounded-2xl border border-[var(--border-subtle)] bg-[var(--bg-surface)] hover:border-[var(--accent)] hover:bg-[var(--bg-hover)] transition-all"
                    >
                      <div className="flex items-start justify-between gap-3">
                        <div className="flex-1 min-w-0">
                          <h4 className="font-semibold text-[var(--text-primary)] text-sm truncate">{sermon.title}</h4>
                          {sermon.speaker && (
                            <div className="flex items-center gap-1 mt-1 text-xs text-[var(--text-secondary)]">
                              <User size={12} />
                              <span>{sermon.speaker}</span>
                            </div>
                          )}
                          {sermon.church && (
                            <p className="text-xs text-[var(--text-tertiary)] mt-0.5 truncate">{sermon.church}</p>
                          )}
                          {sermon.mainVerse && (
                            <p className="text-xs text-[var(--accent)] mt-1 truncate">{sermon.mainVerse}</p>
                          )}
                          <div className="flex items-center gap-3 mt-2 text-xs text-[var(--text-tertiary)]">
                            {sermon.date && (
                              <div className="flex items-center gap-1">
                                <Calendar size={12} />
                                <span>{format(new Date(sermon.date), 'MMM d, yyyy')}</span>
                              </div>
                            )}
                            {sermon.theme && (
                              <span className="truncate">{sermon.theme}</span>
                            )}
                          </div>
                        </div>
                        <ArrowRight size={18} className="text-[var(--text-tertiary)] shrink-0 mt-1" />
                      </div>
                    </motion.button>
                  ))}
                </div>
              )}
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}
