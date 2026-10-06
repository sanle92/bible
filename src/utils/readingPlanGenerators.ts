import { BIBLE_BOOKS } from '@/utils/bibleData';

interface PlanChapter {
  bookId: string;
  bookName: string;
  chapter: number;
}

const OT_BOOKS = [
  'genesis', 'exodus', 'leviticus', 'numbers', 'deuteronomy', 'joshua', 'judges', 'ruth',
  '1samuel', '2samuel', '1kings', '2kings', '1chronicles', '2chronicles', 'ezra', 'nehemiah',
  'esther', 'job', 'psalms', 'proverbs', 'ecclesiastes', 'songofsolomon', 'isaiah', 'jeremiah',
  'lamentations', 'ezekiel', 'daniel', 'hosea', 'joel', 'amos', 'obadiah', 'jonah', 'micah',
  'nahum', 'habakkuk', 'zephaniah', 'haggai', 'zechariah', 'malachi',
];

const NT_BOOKS = [
  'matthew', 'mark', 'luke', 'john', 'acts', 'romans', '1corinthians', '2corinthians',
  'galatians', 'ephesians', 'philippians', 'colossians', '1thessalonians', '2thessalonians',
  '1timothy', '2timothy', 'titus', 'philemon', 'hebrews', 'james', '1peter', '2peter',
  '1john', '2john', '3john', 'jude', 'revelation',
];

const CHRONOLOGICAL_ORDER = [
  'genesis', 'exodus', 'leviticus', 'numbers', 'deuteronomy', 'joshua', 'judges', 'ruth',
  '1samuel', '2samuel', '1kings', '2kings', '1chronicles', '2chronicles', 'ezra', 'nehemiah',
  'esther', 'job', 'psalms', 'proverbs', 'ecclesiastes', 'songofsolomon', 'isaiah', 'jeremiah',
  'lamentations', 'ezekiel', 'daniel', 'hosea', 'joel', 'amos', 'obadiah', 'jonah', 'micah',
  'nahum', 'habakkuk', 'zephaniah', 'haggai', 'zechariah', 'malachi', 'matthew', 'mark',
  'luke', 'john', 'acts', 'romans', '1corinthians', '2corinthians', 'galatians', 'ephesians',
  'philippians', 'colossians', '1thessalonians', '2thessalonians', '1timothy', '2timothy',
  'titus', 'philemon', 'hebrews', 'james', '1peter', '2peter', '1john', '2john', '3john',
  'jude', 'revelation',
];

function allChapters(bookIds: string[]): PlanChapter[] {
  const chapters: PlanChapter[] = [];
  for (const bookId of bookIds) {
    const book = BIBLE_BOOKS.find((b) => b.id === bookId);
    if (!book) continue;
    for (let c = 1; c <= book.chapters; c++) {
      chapters.push({ bookId, bookName: book.name, chapter: c });
    }
  }
  return chapters;
}

export function generateReadingPlan(template: string, durationDays: number): { name: string; description: string; days: { passages: string[]; title?: string }[] } {
  let bookIds: string[] = [];
  let name = 'Custom Plan';
  let description = '';

  switch (template) {
    case '365-days':
      name = '365-Day Bible Reading Plan';
      description = 'Read the entire Bible in one year.';
      bookIds = CHRONOLOGICAL_ORDER;
      break;
    case '90-days':
      name = '90-Day Bible Reading Plan';
      description = 'Read the entire Bible in 90 days.';
      bookIds = CHRONOLOGICAL_ORDER;
      break;
    case '30-days':
      name = '30-Day Scripture Journey';
      description = '30 selected chapters across the Bible.';
      return {
        name,
        description,
        days: [
          { passages: ['Genesis 1'] }, { passages: ['Genesis 12'] }, { passages: ['Exodus 20'] },
          { passages: ['Deuteronomy 6'] }, { passages: ['Joshua 1'] }, { passages: ['Psalm 23'] },
          { passages: ['Proverbs 3'] }, { passages: ['Isaiah 40'] }, { passages: ['Matthew 5'] },
          { passages: ['Matthew 6'] }, { passages: ['Matthew 28'] }, { passages: ['Mark 12'] },
          { passages: ['Luke 15'] }, { passages: ['John 3'] }, { passages: ['John 14'] },
          { passages: ['Acts 2'] }, { passages: ['Romans 5'] }, { passages: ['Romans 8'] },
          { passages: ['1 Corinthians 13'] }, { passages: ['Galatians 5'] },
          { passages: ['Ephesians 6'] }, { passages: ['Philippians 4'] }, { passages: ['Colossians 3'] },
          { passages: ['1 Thessalonians 5'] }, { passages: ['2 Timothy 3'] }, { passages: ['Hebrews 11'] },
          { passages: ['James 1'] }, { passages: ['1 Peter 5'] }, { passages: ['1 John 4'] },
          { passages: ['Revelation 21'] },
        ],
      };
    case 'chronological':
      name = 'Chronological Bible Plan';
      description = 'Read the Bible in chronological order.';
      bookIds = CHRONOLOGICAL_ORDER;
      break;
    case 'new-testament':
      name = 'New Testament Reading Plan';
      description = 'Read through the New Testament.';
      bookIds = NT_BOOKS;
      break;
    case 'old-testament':
      name = 'Old Testament Reading Plan';
      description = 'Read through the Old Testament.';
      bookIds = OT_BOOKS;
      break;
    default:
      name = 'Custom Plan';
      description = 'Your custom reading plan.';
      bookIds = CHRONOLOGICAL_ORDER;
  }

  const chapters = allChapters(bookIds);
  const days: { passages: string[] }[] = Array.from({ length: durationDays }, () => ({ passages: [] }));
  const perDay = Math.floor(chapters.length / durationDays);
  let remainder = chapters.length % durationDays;
  let idx = 0;

  for (let d = 0; d < durationDays && idx < chapters.length; d++) {
    let count = perDay + (remainder > 0 ? 1 : 0);
    if (remainder > 0) remainder--;
    if (count === 0) count = 1;
    for (let i = 0; i < count && idx < chapters.length; i++) {
      const ch = chapters[idx];
      days[d].passages.push(`${ch.bookName} ${ch.chapter}`);
      idx++;
    }
  }

  return { name, description, days: days.filter((d) => d.passages.length > 0) };
}
