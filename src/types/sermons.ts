export interface SermonAttachment {
  id: string;
  type: 'audio' | 'pdf' | 'image' | 'file';
  name: string;
  dataUrl?: string;
  url?: string;
  createdAt: string;
}

export interface Sermon {
  id: string;
  userId: string;
  title: string;
  speaker?: string;
  church?: string;
  location?: string;
  date: string;
  theme?: string;
  mainVerse?: string;
  supportingVerses?: string[];
  outline?: string;
  notes?: string;
  application?: string;
  prayer?: string;
  content?: string; // legacy / summary
  tags: string[];
  themeIds?: string[];
  attachments?: SermonAttachment[];
  isFavorite?: boolean;
  createdAt: string;
  updatedAt: string;
  synced?: boolean;
  deleted?: boolean;
}
