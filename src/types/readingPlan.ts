export interface ReadingPlanDay {
  id: string;
  planId: string;
  dayNumber: number;
  passages: string[];
  title?: string;
  createdAt: string;
  updatedAt: string;
  deleted?: boolean;
}

export interface ReadingPlan {
  id: string;
  userId?: string | null;
  name: string;
  description?: string;
  durationDays: number;
  isPublic: boolean;
  isSystem?: boolean;
  tags?: string[];
  scheduleReminder?: string | null; // HH:mm
  createdAt: string;
  updatedAt: string;
  deleted?: boolean;
}

export interface ReadingProgress {
  id: string;
  userId: string;
  planId: string;
  dayNumber: number;
  completedAt: string;
  createdAt: string;
  updatedAt: string;
  deleted?: boolean;
}

export type ReadingPlanTemplate =
  | '365-days'
  | '90-days'
  | '30-days'
  | 'chronological'
  | 'new-testament'
  | 'old-testament'
  | 'custom';
