import { useEffect, useMemo, useState } from 'react';
import { Loader2, Columns } from 'lucide-react';
import { Modal } from '@/components/ui/Modal';
import { fetchChapter } from '@/services/bibleService';
import { TRANSLATIONS as ALL_TRANSLATIONS } from '@/utils/translationMetadata';
import type { BibleVerse } from '@/types/bible';
import type { BibleTranslation } from '@/types/user';

interface CompareTranslationModalProps {
  open: boolean;
  onClose: () => void;
  verse: BibleVerse | null;
  currentTranslation: string;
}

export function CompareTranslationModal({ open, onClose, verse, currentTranslation }: CompareTranslationModalProps) {
  const availableTranslations = useMemo(() => {
    return Object.values(ALL_TRANSLATIONS).filter(t => t.id !== currentTranslation);
  }, [currentTranslation]);

  const defaultTranslation = useMemo(() => {
    return availableTranslations[0]?.id ?? 'web';
  }, [availableTranslations]);

  const [selectedTranslation, setSelectedTranslation] = useState<BibleTranslation>(defaultTranslation as BibleTranslation);
  const [comparedVerse, setComparedVerse] = useState<BibleVerse | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [splitView, setSplitView] = useState(false);

  useEffect(() => {
    if (open) {
      setSelectedTranslation(defaultTranslation as BibleTranslation);
    }
  }, [open, defaultTranslation]);

  useEffect(() => {
    if (!open || !verse) return;

    let cancelled = false;
    setLoading(true);
    setError(null);
    setComparedVerse(null);

    fetchChapter(verse.bookId, verse.chapter, selectedTranslation)
      .then((chapter) => {
        if (cancelled) return;
        const found = chapter.verses.find((v) => v.verse === verse.verse);
        if (!found) {
          setError('Verse not available in this translation.');
        } else {
          setComparedVerse(found);
        }
      })
      .catch((err) => {
        if (cancelled) return;
        setError(err instanceof Error ? err.message : 'Failed to load translation.');
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, [open, verse, selectedTranslation]);

  if (!verse) return null;
  const reference = `${verse.book} ${verse.chapter}:${verse.verse}`;

  return (
    <Modal open={open} onClose={onClose} title={`Compare — ${reference}`}>
      <div className="flex items-center justify-between mb-4">
        <div className="flex flex-wrap gap-2">
          {availableTranslations.map((t) => (
            <button
              key={t.id}
              onClick={() => setSelectedTranslation(t.id as BibleTranslation)}
              className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-colors ${
                selectedTranslation === t.id
                  ? 'bg-[var(--accent)] text-white'
                  : 'bg-[var(--bg-hover)] text-[var(--text-secondary)] hover:bg-[var(--border-subtle)]'
              }`}
            >
              {t.name}
            </button>
          ))}
        </div>
        <button
          onClick={() => setSplitView(!splitView)}
          className={`p-2 rounded-lg transition-colors ${
            splitView ? 'bg-[var(--accent)] text-white' : 'bg-[var(--bg-hover)] text-[var(--text-secondary)] hover:bg-[var(--border-subtle)]'
          }`}
          title="Toggle split view"
        >
          <Columns size={18} />
        </button>
      </div>

      {splitView ? (
        <div className="grid grid-cols-2 gap-4">
          <div className="rounded-2xl bg-[var(--bg-hover)] p-4">
            <p className="text-xs font-semibold uppercase tracking-wide text-[var(--text-tertiary)] mb-2">
              {currentTranslation.toUpperCase()}
            </p>
            <p className="text-[var(--text-primary)] leading-relaxed">{verse.text}</p>
          </div>
          <div className="rounded-2xl border border-[var(--border-subtle)] p-4 min-h-[80px]">
            <div className="flex items-center justify-between mb-2">
              <p className="text-xs font-semibold uppercase tracking-wide text-[var(--text-tertiary)]">
                {selectedTranslation.toUpperCase()}
              </p>
              {loading && <Loader2 size={14} className="animate-spin text-[var(--text-tertiary)]" />}
            </div>
            {error ? (
              <p className="text-sm text-red-500">{error}</p>
            ) : comparedVerse ? (
              <p className="text-[var(--text-primary)] leading-relaxed">{comparedVerse.text}</p>
            ) : loading ? (
              <p className="text-sm text-[var(--text-tertiary)]">Loading translation...</p>
            ) : null}
          </div>
        </div>
      ) : (
        <>
          <div className="rounded-2xl bg-[var(--bg-hover)] p-4 mb-3">
            <p className="text-xs font-semibold uppercase tracking-wide text-[var(--text-tertiary)] mb-1">
              {currentTranslation.toUpperCase()}
            </p>
            <p className="text-[var(--text-primary)] leading-relaxed">{verse.text}</p>
          </div>

          <div className="rounded-2xl border border-[var(--border-subtle)] p-4 min-h-[80px]">
            <div className="flex items-center justify-between mb-1">
              <p className="text-xs font-semibold uppercase tracking-wide text-[var(--text-tertiary)]">
                {selectedTranslation.toUpperCase()}
              </p>
              {loading && <Loader2 size={14} className="animate-spin text-[var(--text-tertiary)]" />}
            </div>
            {error ? (
              <p className="text-sm text-red-500">{error}</p>
            ) : comparedVerse ? (
              <p className="text-[var(--text-primary)] leading-relaxed">{comparedVerse.text}</p>
            ) : loading ? (
              <p className="text-sm text-[var(--text-tertiary)]">Loading translation...</p>
            ) : null}
          </div>
        </>
      )}
    </Modal>
  );
}
