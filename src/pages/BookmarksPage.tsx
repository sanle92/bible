import { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Trash2, BookOpen } from 'lucide-react';
import { useBibleStore } from '@/stores/bibleStore';
import { Card } from '@/components/ui/Card';
import { IconButton } from '@/components/ui/IconButton';
import { getBookById } from '@/utils/bibleData';
import { format } from 'date-fns';

export function BookmarksPage() {
  const { bookmarks, loaded, loadAll, removeBookmark } = useBibleStore();
  const navigate = useNavigate();

  useEffect(() => {
    if (!loaded) void loadAll();
  }, [loaded, loadAll]);

  return (
    <div className="p-4 md:p-8 max-w-3xl mx-auto">
      <h1 className="text-2xl font-bold text-[var(--text-primary)] mb-6">Bookmarks</h1>
      {bookmarks.length === 0 && (
        <p className="text-sm text-[var(--text-tertiary)] text-center py-10">
          No bookmarks yet. Tap the bookmark icon while reading to save a chapter.
        </p>
      )}
      <div className="flex flex-col gap-2">
        {bookmarks
          .slice()
          .sort((a, b) => b.createdAt.localeCompare(a.createdAt))
          .map((b) => {
            const book = getBookById(b.bookId);
            return (
              <Card key={b.id} className="flex items-center justify-between p-3">
                <button
                  className="flex items-center gap-3 text-left"
                  onClick={() => navigate(`/read?book=${b.bookId}&chapter=${b.chapter}`)}
                >
                  <BookOpen size={16} className="text-[var(--accent)]" />
                  <div>
                    <p className="text-sm font-medium text-[var(--text-primary)]">
                      {book?.name} {b.chapter}
                      {b.verse ? `:${b.verse}` : ''}
                    </p>
                    <p className="text-xs text-[var(--text-tertiary)]">{format(new Date(b.createdAt), 'MMM d, yyyy')}</p>
                  </div>
                </button>
                <IconButton onClick={() => void removeBookmark(b.id)} aria-label="Remove bookmark">
                  <Trash2 size={15} />
                </IconButton>
              </Card>
            );
          })}
      </div>
    </div>
  );
}
