export type NotificationType = 'reading' | 'prayer' | 'dailyVerse' | 'readingPlan' | 'streak';

export interface NotificationSchedule {
  id: NotificationType;
  enabled: boolean;
  time: string; // HH:mm
  days: number[]; // 0 = Sunday, 1 = Monday, etc.
  title: string;
  body: string;
  tag: string;
}

export const DEFAULT_NOTIFICATION_SCHEDULES: NotificationSchedule[] = [
  {
    id: 'reading',
    enabled: true,
    time: '08:00',
    days: [1, 2, 3, 4, 5, 6, 0],
    title: 'Reading Reminder',
    body: 'Start your day with Scripture.',
    tag: 'reading-reminder',
  },
  {
    id: 'prayer',
    enabled: true,
    time: '12:00',
    days: [1, 2, 3, 4, 5, 6, 0],
    title: 'Prayer Reminder',
    body: 'Take a moment to pray.',
    tag: 'prayer-reminder',
  },
  {
    id: 'dailyVerse',
    enabled: true,
    time: '07:00',
    days: [1, 2, 3, 4, 5, 6, 0],
    title: 'Daily Verse',
    body: 'Your verse of the day is ready.',
    tag: 'daily-verse',
  },
  {
    id: 'readingPlan',
    enabled: true,
    time: '20:00',
    days: [1, 2, 3, 4, 5, 6, 0],
    title: 'Reading Plan',
    body: 'Keep up with your reading plan.',
    tag: 'reading-plan',
  },
  {
    id: 'streak',
    enabled: true,
    time: '21:30',
    days: [1, 2, 3, 4, 5, 6, 0],
    title: 'Streak Reminder',
    body: 'Read today to keep your streak alive!',
    tag: 'streak-reminder',
  },
];

export interface NotificationPreferences {
  permission: NotificationPermission;
  schedules: NotificationSchedule[];
}
