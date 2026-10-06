import type { BibleBook } from '@/types/bible';

export const BIBLE_BOOKS: BibleBook[] = [
  { id: 'genesis', name: 'Genesis', testament: 'OT', chapters: 50 },
  { id: 'exodus', name: 'Exodus', testament: 'OT', chapters: 40 },
  { id: 'leviticus', name: 'Leviticus', testament: 'OT', chapters: 27 },
  { id: 'numbers', name: 'Numbers', testament: 'OT', chapters: 36 },
  { id: 'deuteronomy', name: 'Deuteronomy', testament: 'OT', chapters: 34 },
  { id: 'joshua', name: 'Joshua', testament: 'OT', chapters: 24 },
  { id: 'judges', name: 'Judges', testament: 'OT', chapters: 21 },
  { id: 'ruth', name: 'Ruth', testament: 'OT', chapters: 4 },
  { id: '1samuel', name: '1 Samuel', testament: 'OT', chapters: 31 },
  { id: '2samuel', name: '2 Samuel', testament: 'OT', chapters: 24 },
  { id: '1kings', name: '1 Kings', testament: 'OT', chapters: 22 },
  { id: '2kings', name: '2 Kings', testament: 'OT', chapters: 25 },
  { id: '1chronicles', name: '1 Chronicles', testament: 'OT', chapters: 29 },
  { id: '2chronicles', name: '2 Chronicles', testament: 'OT', chapters: 36 },
  { id: 'ezra', name: 'Ezra', testament: 'OT', chapters: 10 },
  { id: 'nehemiah', name: 'Nehemiah', testament: 'OT', chapters: 13 },
  { id: 'esther', name: 'Esther', testament: 'OT', chapters: 10 },
  { id: 'job', name: 'Job', testament: 'OT', chapters: 42 },
  { id: 'psalms', name: 'Psalms', testament: 'OT', chapters: 150 },
  { id: 'proverbs', name: 'Proverbs', testament: 'OT', chapters: 31 },
  { id: 'ecclesiastes', name: 'Ecclesiastes', testament: 'OT', chapters: 12 },
  { id: 'songofsolomon', name: 'Song of Solomon', testament: 'OT', chapters: 8 },
  { id: 'isaiah', name: 'Isaiah', testament: 'OT', chapters: 66 },
  { id: 'jeremiah', name: 'Jeremiah', testament: 'OT', chapters: 52 },
  { id: 'lamentations', name: 'Lamentations', testament: 'OT', chapters: 5 },
  { id: 'ezekiel', name: 'Ezekiel', testament: 'OT', chapters: 48 },
  { id: 'daniel', name: 'Daniel', testament: 'OT', chapters: 12 },
  { id: 'hosea', name: 'Hosea', testament: 'OT', chapters: 14 },
  { id: 'joel', name: 'Joel', testament: 'OT', chapters: 3 },
  { id: 'amos', name: 'Amos', testament: 'OT', chapters: 9 },
  { id: 'obadiah', name: 'Obadiah', testament: 'OT', chapters: 1 },
  { id: 'jonah', name: 'Jonah', testament: 'OT', chapters: 4 },
  { id: 'micah', name: 'Micah', testament: 'OT', chapters: 7 },
  { id: 'nahum', name: 'Nahum', testament: 'OT', chapters: 3 },
  { id: 'habakkuk', name: 'Habakkuk', testament: 'OT', chapters: 3 },
  { id: 'zephaniah', name: 'Zephaniah', testament: 'OT', chapters: 3 },
  { id: 'haggai', name: 'Haggai', testament: 'OT', chapters: 2 },
  { id: 'zechariah', name: 'Zechariah', testament: 'OT', chapters: 14 },
  { id: 'malachi', name: 'Malachi', testament: 'OT', chapters: 4 },
  { id: 'matthew', name: 'Matthew', testament: 'NT', chapters: 28 },
  { id: 'mark', name: 'Mark', testament: 'NT', chapters: 16 },
  { id: 'luke', name: 'Luke', testament: 'NT', chapters: 24 },
  { id: 'john', name: 'John', testament: 'NT', chapters: 21 },
  { id: 'acts', name: 'Acts', testament: 'NT', chapters: 28 },
  { id: 'romans', name: 'Romans', testament: 'NT', chapters: 16 },
  { id: '1corinthians', name: '1 Corinthians', testament: 'NT', chapters: 16 },
  { id: '2corinthians', name: '2 Corinthians', testament: 'NT', chapters: 13 },
  { id: 'galatians', name: 'Galatians', testament: 'NT', chapters: 6 },
  { id: 'ephesians', name: 'Ephesians', testament: 'NT', chapters: 6 },
  { id: 'philippians', name: 'Philippians', testament: 'NT', chapters: 4 },
  { id: 'colossians', name: 'Colossians', testament: 'NT', chapters: 4 },
  { id: '1thessalonians', name: '1 Thessalonians', testament: 'NT', chapters: 5 },
  { id: '2thessalonians', name: '2 Thessalonians', testament: 'NT', chapters: 3 },
  { id: '1timothy', name: '1 Timothy', testament: 'NT', chapters: 6 },
  { id: '2timothy', name: '2 Timothy', testament: 'NT', chapters: 4 },
  { id: 'titus', name: 'Titus', testament: 'NT', chapters: 3 },
  { id: 'philemon', name: 'Philemon', testament: 'NT', chapters: 1 },
  { id: 'hebrews', name: 'Hebrews', testament: 'NT', chapters: 13 },
  { id: 'james', name: 'James', testament: 'NT', chapters: 5 },
  { id: '1peter', name: '1 Peter', testament: 'NT', chapters: 5 },
  { id: '2peter', name: '2 Peter', testament: 'NT', chapters: 3 },
  { id: '1john', name: '1 John', testament: 'NT', chapters: 5 },
  { id: '2john', name: '2 John', testament: 'NT', chapters: 1 },
  { id: '3john', name: '3 John', testament: 'NT', chapters: 1 },
  { id: 'jude', name: 'Jude', testament: 'NT', chapters: 1 },
  { id: 'revelation', name: 'Revelation', testament: 'NT', chapters: 22 },
];

export function getBookById(id: string): BibleBook | undefined {
  return BIBLE_BOOKS.find((b) => b.id === id);
}

export function getAdjacentChapter(
  bookId: string,
  chapter: number,
  direction: 1 | -1
): { bookId: string; chapter: number } | null {
  const idx = BIBLE_BOOKS.findIndex((b) => b.id === bookId);
  if (idx === -1) return null;
  const book = BIBLE_BOOKS[idx];
  const next = chapter + direction;
  if (next >= 1 && next <= book.chapters) {
    return { bookId, chapter: next };
  }
  const nextBookIdx = idx + direction;
  const nextBook = BIBLE_BOOKS[nextBookIdx];
  if (!nextBook) return null;
  return { bookId: nextBook.id, chapter: direction === 1 ? 1 : nextBook.chapters };
}
