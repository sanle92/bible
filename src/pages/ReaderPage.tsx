import { useEffect } from 'react';
import { useSearchParams } from 'react-router-dom';
import { ChapterReader } from '@/features/bible-reader/ChapterReader';
import { usePreferencesStore } from '@/stores/preferencesStore';

export function ReaderPage() {
  const [params, setParams] = useSearchParams();
  const { preferences, setPreference } = usePreferencesStore();

  const bookId = params.get('book') ?? preferences.lastRead?.bookId ?? 'john';
  const chapter = Number(params.get('chapter') ?? preferences.lastRead?.chapter ?? '1');
  const verse = Number(params.get('verse') ?? preferences.lastRead?.verse ?? '0') || undefined;

  useEffect(() => {
    if (!params.get('book') && preferences.lastRead) {
      setParams(
        {
          book: bookId,
          chapter: String(chapter),
          ...(verse ? { verse: String(verse) } : {}),
        },
        { replace: true }
      );
    }
  }, []);

  const onNavigate = (nextBook: string, nextChapter: number, nextVerse?: number) => {
    const next: Record<string, string> = { book: nextBook, chapter: String(nextChapter) };
    if (nextVerse && nextVerse > 0) next.verse = String(nextVerse);
    setParams(next);
    setPreference('lastRead', { bookId: nextBook, chapter: nextChapter, verse: nextVerse });
  };

  return <ChapterReader bookId={bookId} chapter={chapter} verse={verse} onNavigate={onNavigate} />;
}
