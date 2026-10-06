export interface BibleVerse {
  book: string;
  bookId: string;
  chapter: number;
  verse: number;
  text: string;
}

export interface BibleChapter {
  bookId: string;
  book: string;
  chapter: number;
  verses: BibleVerse[];
}

export interface BibleBook {
  id: string;
  name: string;
  testament: 'OT' | 'NT';
  chapters: number;
}

export type HighlightColor = 'yellow' | 'green' | 'blue' | 'purple' | 'orange' | 'pink';

export interface Highlight {
  id: string;
  userId: string;
  bookId: string;
  chapter: number;
  verse: number;
  color: HighlightColor;
  category?: string;
  date?: string;
  notebookName?: string;
  tags?: string[];
  themeIds?: string[];
  createdAt: string;
  updatedAt: string;
  synced?: boolean;
}

export interface NoteAttachment {
  id: string;
  type: 'image' | 'audio' | 'pdf';
  name: string;
  dataUrl?: string;
  url?: string;
  createdAt: string;
}

export interface NoteVersion {
  content: string;
  createdAt: string;
}

export interface VerseNote {
  id: string;
  userId: string;
  bookId: string;
  chapter: number;
  verse: number;
  title?: string;
  content: string;
  attachments?: NoteAttachment[];
  versions?: NoteVersion[];
  themeIds?: string[];
  createdAt: string;
  updatedAt: string;
  synced?: boolean;
}

export interface Bookmark {
  id: string;
  userId: string;
  bookId: string;
  chapter: number;
  verse?: number;
  label?: string;
  createdAt: string;
}
