import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Search, X, BookOpen, StickyNote, Folder, Mic, BookText, HandHeart, Highlighter, Tag, Filter } from 'lucide-react';
import { useGlobalSearch, type SearchResultType } from '@/hooks/useGlobalSearch';
import { cn } from '@/utils/cn';

const TYPE_ORDER: SearchResultType[] = ['verse', 'book', 'chapter', 'highlight', 'theme', 'note', 'notebook', 'sermon', 'prayer', 'journal'];

const TYPE_LABELS: Record<SearchResultType, string> = {
  verse: 'Verses',
  book: 'Books',
  chapter: 'Chapters',
  highlight: 'Highlights & Bookmarks',
  theme: 'Themes',
  note: 'Notes',
  notebook: 'Notebooks',
  sermon: 'Sermons',
  prayer: 'Prayers',
  journal: 'Journal',
};

const TYPE_ICONS: Record<SearchResultType, React.ElementType> = {
  verse: BookOpen,
  book: BookOpen,
  chapter: BookOpen,
  highlight: Highlighter,
  theme: Tag,
  note: StickyNote,
  notebook: Folder,
  sermon: Mic,
  prayer: HandHeart,
  journal: BookText,
};

function highlightText(text: string, query: string): string {
  if (!query) return text;
  const regex = new RegExp(`(${query.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')})`, 'gi');
  return text.replace(regex, '<mark class="bg-[var(--highlight-yellow)] text-[var(--text-primary)] px-0.5 rounded">$1</mark>');
}

export function GlobalSearchPage() {
  const [query, setQuery] = useState('');
  const [filterTestament, setFilterTestament] = useState<'all' | 'OT' | 'NT'>('all');
  const { results, grouped, isLoading } = useGlobalSearch(query);
  const navigate = useNavigate();

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const q = params.get('q');
    if (q) setQuery(q);
  }, []);

  useEffect(() => {
    const url = new URL(window.location.href);
    if (query) url.searchParams.set('q', query);
    else url.searchParams.delete('q');
    window.history.replaceState({}, '', url.toString());
  }, [query]);

  const filteredResults = results.filter((r) => {
    if (filterTestament === 'all') return true;
    if (r.type === 'verse' && r.data) {
      const verse = r.data as { bookId: string };
      const isOT = ['genesis', 'exodus', 'leviticus', 'numbers', 'deuteronomy', 'joshua', 'judges', 'ruth', '1samuel', '2samuel', '1kings', '2kings', '1chronicles', '2chronicles', 'ezra', 'nehemiah', 'esther', 'job', 'psalms', 'proverbs', 'ecclesiastes', 'songofsolomon', 'isaiah', 'jeremiah', 'lamentations', 'ezekiel', 'daniel', 'hosea', 'joel', 'amos', 'obadiah', 'jonah', 'micah', 'nahum', 'habakkuk', 'zephaniah', 'haggai', 'zechariah', 'malachi'].includes(verse.bookId);
      return filterTestament === 'OT' ? isOT : !isOT;
    }
    return true;
  });

  return (
    <div className="p-4 md:p-8 max-w-4xl mx-auto h-[calc(100vh-4rem)] flex flex-col">
      <h1 className="text-2xl font-bold text-[var(--text-primary)] mb-4">Bible Search</h1>
      <div className="relative mb-4">
        <Search size={18} className="absolute left-3 top-1/2 -translate-y-1/2 text-[var(--text-tertiary)]" />
        <input
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Search verses, words, phrases..."
          className="w-full rounded-xl border border-[var(--border-subtle)] bg-[var(--bg-surface)] pl-10 pr-10 py-3 text-[var(--text-primary)] outline-none focus:ring-2 focus:ring-[var(--accent)]"
          autoFocus
        />
        {query && (
          <button onClick={() => setQuery('')} className="absolute right-3 top-1/2 -translate-y-1/2 text-[var(--text-tertiary)] hover:text-[var(--text-primary)]">
            <X size={18} />
          </button>
        )}
      </div>

      <div className="flex items-center gap-2 mb-4">
        <Filter size={16} className="text-[var(--text-tertiary)]" />
        <div className="flex gap-1">
          {(['all', 'OT', 'NT'] as const).map((t) => (
            <button
              key={t}
              onClick={() => setFilterTestament(t)}
              className={cn(
                'px-3 py-1.5 rounded-lg text-xs font-medium transition-colors',
                filterTestament === t
                  ? 'bg-[var(--accent)] text-white'
                  : 'bg-[var(--bg-hover)] text-[var(--text-secondary)] hover:text-[var(--text-primary)]'
              )}
            >
              {t === 'all' ? 'All' : t === 'OT' ? 'Old Testament' : 'New Testament'}
            </button>
          ))}
        </div>
      </div>

      <div className="flex-1 overflow-y-auto">
        {isLoading && query && <p className="text-sm text-[var(--text-tertiary)]">Loading indexes...</p>}

        {!query && (
          <div className="text-center py-12 text-[var(--text-tertiary)]">
            <Search size={48} className="mx-auto mb-4 opacity-30" />
            <p className="text-lg font-medium mb-2">Search the Bible</p>
            <p className="text-sm">Type any word, phrase, or verse reference like "John 3:16"</p>
          </div>
        )}

        {query && filteredResults.length === 0 && !isLoading && (
          <p className="text-sm text-[var(--text-tertiary)] text-center py-10">No results for "{query}".</p>
        )}

        {query && (
          <div className="space-y-6">
            {TYPE_ORDER.map((type) => {
              const items = grouped[type].filter((item) => {
                if (filterTestament === 'all') return true;
                if (type === 'verse' && item.data) {
                  const verse = item.data as { bookId: string };
                  const isOT = ['genesis', 'exodus', 'leviticus', 'numbers', 'deuteronomy', 'joshua', 'judges', 'ruth', '1samuel', '2samuel', '1kings', '2kings', '1chronicles', '2chronicles', 'ezra', 'nehemiah', 'esther', 'job', 'psalms', 'proverbs', 'ecclesiastes', 'songofsolomon', 'isaiah', 'jeremiah', 'lamentations', 'ezekiel', 'daniel', 'hosea', 'joel', 'amos', 'obadiah', 'jonah', 'micah', 'nahum', 'habakkuk', 'zephaniah', 'haggai', 'zechariah', 'malachi'].includes(verse.bookId);
                  return filterTestament === 'OT' ? isOT : !isOT;
                }
                return true;
              });
              if (!items.length) return null;
              const Icon = TYPE_ICONS[type];
              return (
                <section key={type}>
                  <div className="flex items-center gap-2 mb-3">
                    <Icon size={16} className="text-[var(--accent)]" />
                    <h2 className="text-sm font-semibold text-[var(--text-secondary)] uppercase tracking-wide">{TYPE_LABELS[type]}</h2>
                    <span className="text-xs text-[var(--text-tertiary)]">({items.length})</span>
                  </div>
                  <div className="space-y-2">
                    {items.slice(0, 15).map((item) => (
                      <button
                        key={item.id}
                        onClick={() => item.href && navigate(item.href)}
                        className="w-full text-left rounded-xl border border-[var(--border-subtle)] bg-[var(--bg-surface)] p-4 hover:border-[var(--accent)] transition-colors"
                      >
                        <p className="font-medium text-[var(--text-primary)] text-sm">{item.title}</p>
                        {item.subtitle && (
                          <p
                            className="text-sm text-[var(--text-secondary)] mt-1.5 line-clamp-3"
                            dangerouslySetInnerHTML={{ __html: highlightText(item.subtitle, query) }}
                          />
                        )}
                      </button>
                    ))}
                    {items.length > 15 && (
                      <p className="text-xs text-[var(--text-tertiary)] pl-1">+{items.length - 15} more</p>
                    )}
                  </div>
                </section>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
