export interface AppUser {
  id: string;
  email: string | null;
  displayName?: string | null;
  avatarUrl?: string | null;
  emailVerified?: boolean;
  provider?: string;
}

export type Language = 'en' | 'es' | 'fr' | 'de' | 'pt' | 'zh' | 'ko' | 'sw' | 'lug';
export type FontSize = 'sm' | 'md' | 'lg' | 'xl';
export type ReadingFont = 'serif' | 'sans' | 'mono';
export type BibleTranslation = 'kjv' | 'web' | 'bbe' | 'asv' | 'lsg' | 'ubs' | 'bhn' | 'bst';
export type LineHeight = 'tight' | 'normal' | 'relaxed' | 'loose';
export type VerseSpacing = 'compact' | 'normal' | 'relaxed';
export type ReaderTheme = 'system' | 'light' | 'dark' | 'sepia';
export type ReadingMode = 'continuous' | 'verse-list';

export interface ReadingPosition {
  bookId: string;
  chapter: number;
  verse?: number;
}

export interface UserPreferences {
  language: Language;
  fontSize: FontSize;
  readingFont: ReadingFont;
  translation: BibleTranslation;
  showVerseNumbers: boolean;
  lineHeight: LineHeight;
  verseSpacing: VerseSpacing;
  readerTheme: ReaderTheme;
  readingMode: ReadingMode;
  distractionFree: boolean;
  splitScreen: boolean;
  lastRead: ReadingPosition | null;
}

export const DEFAULT_PREFERENCES: UserPreferences = {
  language: 'en',
  fontSize: 'md',
  readingFont: 'serif',
  translation: 'kjv',
  showVerseNumbers: true,
  lineHeight: 'normal',
  verseSpacing: 'normal',
  readerTheme: 'system',
  readingMode: 'continuous',
  distractionFree: false,
  splitScreen: false,
  lastRead: null,
};
