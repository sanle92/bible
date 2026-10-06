export interface Note {
  id: string;
  userId: string;
  title: string;
  content: string;
  tags: string[];
  notebookId?: string | null;
  reference?: string | null;
  themeIds?: string[];
  isFavorite?: boolean;
  isArchived?: boolean;
  createdAt: string;
  updatedAt: string;
  synced?: boolean;
  deleted?: boolean;
}

export interface Notebook {
  id: string;
  userId: string;
  name: string;
  description?: string;
  color?: string;
  isFavorite?: boolean;
  createdAt: string;
  updatedAt: string;
  synced?: boolean;
  deleted?: boolean;
}
