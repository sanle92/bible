export type JournalMood = 'joyful' | 'grateful' | 'peaceful' | 'anxious' | 'sad' | 'angry' | 'hopeful' | 'neutral';

export interface JournalEntry {
  id: string;
  userId: string;
  title: string;
  date: string;
  scripture?: string;
  reflection: string;
  application?: string;
  prayer?: string;
  mood?: JournalMood;
  tags: string[];
  images?: string[];
  voiceNote?: string;
  isPrivate?: boolean;
  themeIds?: string[];
  createdAt: string;
  updatedAt: string;
  synced?: boolean;
  deleted?: boolean;
}
