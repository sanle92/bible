import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  Search, X, BookOpen, Copy, Share2, ChevronDown, 
  Loader2, Volume2, Globe, Sparkles 
} from 'lucide-react';
import { getAIWordStudy } from '@/services/aiWordStudyService';
import type { AIWordStudyResponse, AIWordStudyRequest, CrossReference, RelatedTopic } from '@/types/aiWordStudy';
import type { BibleVerse } from '@/types/bible';
import { cn } from '@/utils/cn';

interface AIWordStudyModalProps {
  open: boolean;
  onClose: () => void;
  verse: BibleVerse | null;
  selectedText?: string;
  translation?: string;
  onNavigate?: (bookId: string, chapter: number, verse?: number) => void;
  onTopicSearch?: (topic: string) => void;
}

export function AIWordStudyModal({ open, onClose, verse, selectedText, translation = 'kjv', onNavigate, onTopicSearch }: AIWordStudyModalProps) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [response, setResponse] = useState<AIWordStudyResponse | null>(null);
  const [expandedSection, setExpandedSection] = useState<string | null>(null);

  useEffect(() => {
    if (!open || !verse || !selectedText) {
      setResponse(null);
      setError(null);
      return;
    }

    const fetchWordStudy = async () => {
      setLoading(true);
      setError(null);
      setResponse(null);

      try {
        const request: AIWordStudyRequest = {
          word: selectedText,
          book: verse.book,
          chapter: verse.chapter,
          verse: verse.verse,
          translation: translation,
          fullVerse: verse.text,
        };

        const result = await getAIWordStudy(request);
        setResponse(result);
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to load word study');
      } finally {
        setLoading(false);
      }
    };

    fetchWordStudy();
  }, [open, verse, selectedText]);

  const handleCopy = () => {
    if (!response) return;
    const text = `
Word Study: ${response.word}
${response.context.book} ${response.context.chapter}:${response.context.verse} (${response.context.translation})

Meaning: ${response.meaning}

Biblical Definition: ${response.biblicalDefinition}

${response.originalWord ? `Original: ${response.originalWord.word} (${response.originalWord.transliteration}) - ${response.originalWord.literalMeaning}` : ''}

Context: ${response.contextInScripture}

Simple Explanation: ${response.simpleExplanation}

Application: ${response.modernDayApplication}
    `.trim();
    navigator.clipboard.writeText(text);
  };

  const handleShare = async () => {
    if (!response) return;
    const text = `Word Study: ${response.word} - ${response.context.book} ${response.context.chapter}:${response.context.verse}`;
    if (navigator.share) {
      await navigator.share({ title: text, text });
    }
  };

  const toggleSection = (section: string) => {
    setExpandedSection(expandedSection === section ? null : section);
  };

  if (!verse) return null;

  return (
    <AnimatePresence>
      {open && (
        <>
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 bg-black/50"
            onClick={onClose}
          />
          <motion.div
            initial={{ y: '100%' }}
            animate={{ y: 0 }}
            exit={{ y: '100%' }}
            transition={{ type: 'spring', damping: 25, stiffness: 300 }}
            className="fixed inset-x-0 bottom-0 z-50 max-h-[90vh] overflow-hidden rounded-t-3xl bg-[var(--bg-app)] shadow-2xl"
          >
            {/* Header */}
            <div className="flex items-center justify-between border-b border-[var(--border-subtle)] p-4">
              <div className="flex items-center gap-2">
                <div className="flex h-8 w-8 items-center justify-center rounded-full bg-[var(--accent-soft)]">
                  <Sparkles size={16} className="text-[var(--accent)]" />
                </div>
                <div>
                  <h2 className="text-sm font-semibold text-[var(--text-primary)]">AI Word Study</h2>
                  <p className="text-xs text-[var(--text-tertiary)]">{selectedText}</p>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <button
                  onClick={handleCopy}
                  className="p-2 rounded-lg hover:bg-[var(--bg-hover)] text-[var(--text-secondary)] transition-colors"
                  title="Copy"
                >
                  <Copy size={18} />
                </button>
                <button
                  onClick={handleShare}
                  className="p-2 rounded-lg hover:bg-[var(--bg-hover)] text-[var(--text-secondary)] transition-colors"
                  title="Share"
                >
                  <Share2 size={18} />
                </button>
                <button
                  onClick={onClose}
                  className="p-2 rounded-lg hover:bg-[var(--bg-hover)] text-[var(--text-secondary)] transition-colors"
                >
                  <X size={20} />
                </button>
              </div>
            </div>

            {/* Content */}
            <div className="overflow-y-auto p-4 pb-8">
              {loading ? (
                <div className="flex flex-col items-center justify-center py-12">
                  <Loader2 size={32} className="animate-spin text-[var(--accent)] mb-4" />
                  <p className="text-sm text-[var(--text-tertiary)]">Analyzing word in biblical context...</p>
                </div>
              ) : error ? (
                <div className="rounded-xl border border-red-200 bg-red-50 p-4 dark:border-red-900/30 dark:bg-red-900/10">
                  <p className="text-sm text-red-600 dark:text-red-400">{error}</p>
                </div>
              ) : response ? (
                <div className="space-y-4">
                  {/* Context Badge */}
                  <div className="flex items-center gap-2 text-xs text-[var(--text-tertiary)]">
                    <BookOpen size={14} />
                    <span>{response.context.book} {response.context.chapter}:{response.context.verse}</span>
                    <span>•</span>
                    <span>{response.context.translation}</span>
                  </div>

                  {/* Meaning */}
                  <Section
                    title="Meaning"
                    icon={Search}
                    expanded={expandedSection === 'meaning'}
                    onToggle={() => toggleSection('meaning')}
                    defaultExpanded
                  >
                    <p className="text-sm text-[var(--text-secondary)] leading-relaxed">{response.meaning}</p>
                  </Section>

                  {/* Biblical Definition */}
                  <Section
                    title="Biblical Definition"
                    icon={BookOpen}
                    expanded={expandedSection === 'biblical'}
                    onToggle={() => toggleSection('biblical')}
                  >
                    <p className="text-sm text-[var(--text-secondary)] leading-relaxed">{response.biblicalDefinition}</p>
                  </Section>

                  {/* Original Word */}
                  {response.originalWord && (
                    <Section
                      title="Original Word"
                      icon={Globe}
                      expanded={expandedSection === 'original'}
                      onToggle={() => toggleSection('original')}
                    >
                      <div className="space-y-3">
                        <div className="rounded-lg bg-[var(--bg-hover)] p-3">
                          <p className="text-lg font-semibold text-[var(--text-primary)]">{response.originalWord.word}</p>
                          <p className="text-sm text-[var(--accent)] italic">{response.originalWord.transliteration}</p>
                          <p className="text-xs text-[var(--text-tertiary)]">{response.originalWord.pronunciation}</p>
                        </div>
                        {response.originalWord.strongsNumber && (
                          <p className="text-xs text-[var(--text-tertiary)]">
                            <span className="font-medium">Strong's:</span> {response.originalWord.strongsNumber}
                          </p>
                        )}
                        <p className="text-sm text-[var(--text-secondary)]">
                          <span className="font-medium">Literal meaning:</span> {response.originalWord.literalMeaning}
                        </p>
                        <p className="text-xs text-[var(--text-tertiary)] uppercase">
                          {response.originalWord.language}
                        </p>
                      </div>
                    </Section>
                  )}

                  {/* Context in Scripture */}
                  <Section
                    title="Context in Scripture"
                    icon={BookOpen}
                    expanded={expandedSection === 'context'}
                    onToggle={() => toggleSection('context')}
                  >
                    <p className="text-sm text-[var(--text-secondary)] leading-relaxed">{response.contextInScripture}</p>
                  </Section>

                  {/* Cross References */}
                  {response.crossReferences.length > 0 && (
                    <Section
                      title={`Cross References (${response.crossReferences.length})`}
                      icon={BookOpen}
                      expanded={expandedSection === 'crossRefs'}
                      onToggle={() => toggleSection('crossRefs')}
                    >
                      <div className="space-y-2">
                        {response.crossReferences.map((ref, index) => (
                          <CrossReferenceItem
                            key={index}
                            reference={ref}
                            onNavigate={onNavigate}
                          />
                        ))}
                      </div>
                    </Section>
                  )}

                  {/* Simple Explanation */}
                  <Section
                    title="Simple Explanation"
                    icon={Sparkles}
                    expanded={expandedSection === 'simple'}
                    onToggle={() => toggleSection('simple')}
                  >
                    <p className="text-sm text-[var(--text-secondary)] leading-relaxed">{response.simpleExplanation}</p>
                  </Section>

                  {/* Modern Day Application */}
                  <Section
                    title="Modern Day Application"
                    icon={Globe}
                    expanded={expandedSection === 'application'}
                    onToggle={() => toggleSection('application')}
                  >
                    <p className="text-sm text-[var(--text-secondary)] leading-relaxed">{response.modernDayApplication}</p>
                  </Section>

                  {/* Related Topics */}
                  {response.relatedTopics.length > 0 && (
                    <Section
                      title="Related Topics"
                      icon={Search}
                      expanded={expandedSection === 'topics'}
                    >
                      <div className="flex flex-wrap gap-2">
                        {response.relatedTopics.map((topic, index) => (
                          <RelatedTopicChip
                            key={index}
                            topic={topic}
                            onSearch={onTopicSearch}
                          />
                        ))}
                      </div>
                    </Section>
                  )}

                  {/* Related Sermons */}
                  {response.relatedSermons.length > 0 && (
                    <Section
                      title="Related Sermons"
                      icon={Volume2}
                      expanded={expandedSection === 'sermons'}
                  >
                      <div className="space-y-2">
                        {response.relatedSermons.map((sermon, index) => (
                          <div
                            key={index}
                            className="rounded-lg bg-[var(--bg-hover)] p-3 cursor-pointer hover:bg-[var(--border-subtle)] transition-colors"
                          >
                            <p className="text-sm font-medium text-[var(--text-primary)]">{sermon.title}</p>
                            {sermon.verse && (
                              <p className="text-xs text-[var(--text-tertiary)]">{sermon.verse}</p>
                            )}
                          </div>
                        ))}
                      </div>
                    </Section>
                  )}

                  {/* Related Devotions */}
                  {response.relatedDevotions.length > 0 && (
                    <Section
                      title="Related Devotions"
                      icon={BookOpen}
                      expanded={expandedSection === 'devotions'}
                    >
                      <div className="space-y-2">
                        {response.relatedDevotions.map((devotion, index) => (
                          <div
                            key={index}
                            className="rounded-lg bg-[var(--bg-hover)] p-3 cursor-pointer hover:bg-[var(--border-subtle)] transition-colors"
                          >
                            <p className="text-sm font-medium text-[var(--text-primary)]">{devotion.title}</p>
                            {devotion.verse && (
                              <p className="text-xs text-[var(--text-tertiary)]">{devotion.verse}</p>
                            )}
                          </div>
                        ))}
                      </div>
                    </Section>
                  )}
                </div>
              ) : null}
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}

interface SectionProps {
  title: string;
  icon: any;
  expanded?: boolean;
  onToggle?: () => void;
  defaultExpanded?: boolean;
  children: React.ReactNode;
}

function Section({ title, icon: Icon, expanded = false, onToggle, defaultExpanded = false, children }: SectionProps) {
  const [isExpanded, setIsExpanded] = useState(defaultExpanded);

  useEffect(() => {
    if (expanded !== undefined) {
      setIsExpanded(expanded);
    }
  }, [expanded]);

  const handleToggle = () => {
    if (onToggle) {
      onToggle();
    } else {
      setIsExpanded(!isExpanded);
    }
  };

  return (
    <div className="rounded-xl border border-[var(--border-subtle)] bg-[var(--bg-surface)] overflow-hidden">
      <button
        onClick={handleToggle}
        className="flex w-full items-center justify-between p-3 text-left transition-colors hover:bg-[var(--bg-hover)]"
      >
        <div className="flex items-center gap-2">
          <Icon size={16} className="text-[var(--accent)]" />
          <span className="text-sm font-semibold text-[var(--text-primary)]">{title}</span>
        </div>
        <ChevronDown
          size={16}
          className={cn(
            'text-[var(--text-tertiary)] transition-transform',
            isExpanded && 'rotate-180'
          )}
        />
      </button>
      {isExpanded && (
        <motion.div
          initial={{ height: 0, opacity: 0 }}
          animate={{ height: 'auto', opacity: 1 }}
          exit={{ height: 0, opacity: 0 }}
          className="px-3 pb-3"
        >
          {children}
        </motion.div>
      )}
    </div>
  );
}

interface CrossReferenceItemProps {
  reference: CrossReference;
  onNavigate?: (bookId: string, chapter: number, verse?: number) => void;
}

function CrossReferenceItem({ reference, onNavigate }: CrossReferenceItemProps) {
  const handleClick = () => {
    if (onNavigate && reference.bookId) {
      onNavigate(reference.bookId, reference.chapter, reference.verse);
    }
  };

  return (
    <button
      onClick={handleClick}
      className="w-full rounded-lg bg-[var(--bg-hover)] p-3 text-left hover:bg-[var(--border-subtle)] transition-colors"
    >
      <p className="text-sm font-medium text-[var(--text-primary)]">
        {reference.book} {reference.chapter}:{reference.verse}
      </p>
      <p className="text-xs text-[var(--text-tertiary)] mt-1">{reference.text}</p>
    </button>
  );
}

interface RelatedTopicChipProps {
  topic: RelatedTopic;
  onSearch?: (topic: string) => void;
}

function RelatedTopicChip({ topic, onSearch }: RelatedTopicChipProps) {
  const handleClick = () => {
    if (onSearch) {
      onSearch(topic.topic);
    }
  };

  return (
    <button
      onClick={handleClick}
      className="rounded-full bg-[var(--accent-soft)] px-3 py-1.5 text-xs font-medium text-[var(--accent)] hover:bg-[var(--accent)] hover:text-white transition-colors"
    >
      {topic.topic}
    </button>
  );
}
