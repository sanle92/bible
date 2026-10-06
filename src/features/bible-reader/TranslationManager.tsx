import { useState, useMemo } from 'react';
import { Search, Download, Trash2, Check, Globe, X, ChevronDown, BookOpen } from 'lucide-react';
import { AnimatePresence, motion } from 'framer-motion';
import { usePreferencesStore } from '@/stores/preferencesStore';
import { TRANSLATIONS, LANGUAGE_CATEGORIES, getTranslationsByLanguage, searchTranslations, type TranslationMetadata, type TranslationLanguage } from '@/utils/translationMetadata';
import { cn } from '@/utils/cn';

interface TranslationManagerProps {
  open: boolean;
  onClose: () => void;
  onTranslationSelect?: (translation: string) => void;
}

export function TranslationManager({ open, onClose, onTranslationSelect }: TranslationManagerProps) {
  const { preferences, setPreference, downloadedTranslations, toggleDownloadedTranslation } = usePreferencesStore();
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedLanguage, setSelectedLanguage] = useState<TranslationLanguage | 'all'>('all');
  const [downloading, setDownloading] = useState<string | null>(null);

  const languages: (TranslationLanguage | 'all')[] = ['all', 'english', 'french', 'swahili', 'lugbara', 'other'];

  const filteredTranslations = useMemo(() => {
    let translations = selectedLanguage === 'all' 
      ? Object.values(TRANSLATIONS)
      : getTranslationsByLanguage(selectedLanguage);

    if (searchQuery) {
      translations = searchTranslations(searchQuery);
    }

    return translations;
  }, [selectedLanguage, searchQuery]);

  const isDownloaded = (translationId: string) => downloadedTranslations.includes(translationId as any);
  const isCurrent = (translationId: string) => preferences.translation === translationId;

  const handleDownload = async (translation: TranslationMetadata) => {
    if (downloading) return;
    
    if (isDownloaded(translation.id)) {
      // Remove translation
      toggleDownloadedTranslation(translation.id);
    } else {
      // Download translation (simulated)
      setDownloading(translation.id);
      // Simulate download delay
      await new Promise(resolve => setTimeout(resolve, 2000));
      toggleDownloadedTranslation(translation.id);
      setDownloading(null);
    }
  };

  const handleSelect = (translation: TranslationMetadata) => {
    if (!isDownloaded(translation.id)) {
      // Must download first
      return;
    }
    setPreference('translation', translation.id);
    onTranslationSelect?.(translation.id);
    onClose();
  };

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
              <span className="text-sm font-medium text-[var(--text-tertiary)]">Bible Translations</span>
              <button
                onClick={onClose}
                className="p-2 rounded-lg text-[var(--text-secondary)] hover:bg-[var(--bg-hover)] transition-colors"
              >
                <X size={20} />
              </button>
            </div>

            {/* Content */}
            <div className="flex-1 overflow-y-auto p-4 md:p-8 max-w-4xl mx-auto w-full">
              <h1 className="text-2xl font-bold text-[var(--text-primary)] mb-6">Manage Translations</h1>

              {/* Search */}
              <div className="relative mb-6">
                <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-[var(--text-tertiary)]" />
                <input
                  type="text"
                  placeholder="Search translations..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full rounded-lg border border-[var(--border-subtle)] bg-[var(--bg-app)] pl-10 pr-10 py-3 text-sm outline-none focus:border-[var(--accent)]"
                />
                {searchQuery && (
                  <button
                    onClick={() => setSearchQuery('')}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-[var(--text-tertiary)] hover:text-[var(--text-secondary)]"
                  >
                    <X size={16} />
                  </button>
                )}
              </div>

              {/* Language Filter */}
              <div className="flex flex-wrap gap-2 mb-6">
                {languages.map((lang) => {
                  const category = lang === 'all' ? { label: 'All Languages', flag: '🌍' } : LANGUAGE_CATEGORIES[lang];
                  return (
                    <button
                      key={lang}
                      onClick={() => setSelectedLanguage(lang)}
                      className={cn(
                        'flex items-center gap-2 px-4 py-2 rounded-lg text-sm transition-colors',
                        selectedLanguage === lang
                          ? 'bg-[var(--accent)] text-white'
                          : 'bg-[var(--bg-hover)] text-[var(--text-secondary)] hover:bg-[var(--border-subtle)]'
                      )}
                    >
                      <span>{category.flag}</span>
                      <span>{category.label}</span>
                    </button>
                  );
                })}
              </div>

              {/* Translation List */}
              <div className="space-y-3">
                {filteredTranslations.length === 0 ? (
                  <div className="text-center py-12">
                    <BookOpen size={48} className="mx-auto text-[var(--text-tertiary)] mb-4" />
                    <p className="text-sm text-[var(--text-tertiary)]">No translations found</p>
                  </div>
                ) : (
                  filteredTranslations.map((translation) => (
                    <div
                      key={translation.id}
                      className={cn(
                        'p-4 rounded-xl border transition-colors',
                        isCurrent(translation.id)
                          ? 'border-[var(--accent)] bg-[var(--accent-soft)]'
                          : 'border-[var(--border-subtle)] bg-[var(--bg-surface)]'
                      )}
                    >
                      <div className="flex items-start justify-between gap-4">
                        <div className="flex-1">
                          <div className="flex items-center gap-2 mb-1">
                            <span className="text-lg">{LANGUAGE_CATEGORIES[translation.language].flag}</span>
                            <h3 className="text-base font-semibold text-[var(--text-primary)]">{translation.fullName}</h3>
                            {isCurrent(translation.id) && (
                              <Check size={16} className="text-[var(--accent)]" />
                            )}
                          </div>
                          <p className="text-sm text-[var(--text-secondary)] mb-2">{translation.description}</p>
                          <div className="flex items-center gap-3 text-xs text-[var(--text-tertiary)]">
                            <span>{translation.languageCode.toUpperCase()}</span>
                            {translation.hasAudio && <span>• Audio Available</span>}
                            {translation.offlineSize && <span>• {translation.offlineSize} MB</span>}
                            <span>• {translation.license}</span>
                          </div>
                        </div>
                        <div className="flex flex-col gap-2">
                          {translation.requiresDownload && (
                            <button
                              onClick={() => handleDownload(translation)}
                              disabled={downloading === translation.id}
                              className={cn(
                                'flex items-center gap-2 px-3 py-2 rounded-lg text-sm transition-colors',
                                isDownloaded(translation.id)
                                  ? 'bg-red-50 text-red-600 hover:bg-red-100 dark:bg-red-900/20 dark:text-red-400 dark:hover:bg-red-900/30'
                                  : 'bg-[var(--accent)] text-white hover:opacity-90'
                              )}
                            >
                              {downloading === translation.id ? (
                                <span className="animate-pulse">Downloading...</span>
                              ) : isDownloaded(translation.id) ? (
                                <>
                                  <Trash2 size={14} />
                                  <span>Remove</span>
                                </>
                              ) : (
                                <>
                                  <Download size={14} />
                                  <span>Download</span>
                                </>
                              )}
                            </button>
                          )}
                          {isDownloaded(translation.id) && (
                            <button
                              onClick={() => handleSelect(translation)}
                              className={cn(
                                'flex items-center gap-2 px-3 py-2 rounded-lg text-sm transition-colors',
                                isCurrent(translation.id)
                                  ? 'bg-[var(--accent)] text-white'
                                  : 'bg-[var(--bg-hover)] text-[var(--text-secondary)] hover:bg-[var(--border-subtle)]'
                              )}
                            >
                              <Globe size={14} />
                              <span>{isCurrent(translation.id) ? 'Current' : 'Select'}</span>
                            </button>
                          )}
                        </div>
                      </div>
                    </div>
                  ))
                )}
              </div>

              {/* Storage Info */}
              <div className="mt-8 p-4 rounded-xl border border-[var(--border-subtle)] bg-[var(--bg-surface)]">
                <h3 className="text-sm font-semibold text-[var(--text-secondary)] mb-2">Storage Info</h3>
                <p className="text-xs text-[var(--text-tertiary)]">
                  Downloaded translations: {downloadedTranslations.length} / {Object.keys(TRANSLATIONS).length}
                </p>
              </div>
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}
