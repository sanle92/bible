export interface Theme {
  id: string;
  userId: string;
  name: string;
  parentId?: string | null;
  color?: string;
  createdAt: string;
  updatedAt: string;
  synced?: boolean;
  deleted?: boolean;
}

export const DEFAULT_THEMES = [
  { name: 'Faith' },
  { name: 'Grace' },
  { name: 'Love' },
  { name: 'Prayer' },
  { name: 'Salvation' },
  { name: 'Repentance' },
  { name: 'Kingdom' },
  { name: 'Healing' },
  { name: 'Wisdom' },
  { name: 'Holy Spirit' },
  { name: 'Evangelism' },
  { name: 'Leadership' },
  { name: 'Marriage' },
  { name: 'Business' },
];
