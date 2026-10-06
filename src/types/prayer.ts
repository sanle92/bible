export type PrayerStatus = 'pending' | 'answered' | 'archived';
export type PrayerPriority = 'low' | 'medium' | 'high';

export interface PrayerHistoryItem {
  id: string;
  status: PrayerStatus;
  note?: string;
  createdAt: string;
}

export interface PrayerEntry {
  id: string;
  userId: string;
  title: string;
  content: string;
  scripture?: string;
  category: 'praise' | 'request' | 'intercession' | 'gratitude' | 'other';
  status: PrayerStatus;
  priority: PrayerPriority;
  reminder?: string | null;
  images?: string[];
  voiceNote?: string;
  history?: PrayerHistoryItem[];
  themeIds?: string[];
  createdAt: string;
  updatedAt: string;
  synced?: boolean;
  deleted?: boolean;
}
