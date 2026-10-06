import type { NotificationSchedule } from '@/types/notifications';

export async function requestNotificationPermission(): Promise<NotificationPermission> {
  if (!('Notification' in window)) return 'denied';
  if (Notification.permission === 'granted') return 'granted';
  return Notification.requestPermission();
}

export async function showNotification(title: string, options?: NotificationOptions) {
  if (!('serviceWorker' in navigator)) return;
  const registration = await navigator.serviceWorker.ready;
  await registration.showNotification(title, {
    icon: '/icon-192x192.png',
    badge: '/icon-192x192.png',
    ...options,
  });
}

function nextOccurrence(time: string, days: number[]): Date | null {
  const [hours, minutes] = time.split(':').map(Number);
  const now = new Date();
  const candidate = new Date(now.getFullYear(), now.getMonth(), now.getDate(), hours, minutes, 0, 0);

  for (let i = 0; i < 8; i++) {
    const d = new Date(candidate.getTime() + i * 24 * 60 * 60 * 1000);
    const day = d.getDay();
    const isToday = i === 0;
    const isPast = isToday && d.getTime() <= now.getTime();
    if (days.includes(day) && !isPast) return d;
  }
  return null;
}

let scheduledTimeouts: number[] = [];

export async function scheduleNotifications(schedules: NotificationSchedule[]) {
  // Clear existing scheduled timeouts in this session.
  for (const id of scheduledTimeouts) window.clearTimeout(id);
  scheduledTimeouts = [];

  if (!('Notification' in window) || Notification.permission !== 'granted') return;

  for (const schedule of schedules) {
    if (!schedule.enabled) continue;
    const when = nextOccurrence(schedule.time, schedule.days);
    if (!when) continue;
    const delay = when.getTime() - Date.now();
    const id = window.setTimeout(() => {
      void showNotification(schedule.title, {
        body: schedule.body,
        tag: schedule.tag,
        requireInteraction: false,
        data: { type: schedule.id },
      });
      // Reschedule next occurrence after firing.
      void scheduleNotifications(schedules);
    }, delay);
    scheduledTimeouts.push(id);
  }
}

export async function cancelNotification(type: string) {
  if (!('serviceWorker' in navigator)) return;
  const registration = await navigator.serviceWorker.ready;
  if ('getNotifications' in registration) {
    const notifications = await registration.getNotifications({ tag: type });
    notifications.forEach((n) => n.close());
  }
}

export function getNotificationPermission(): NotificationPermission {
  if (!('Notification' in window)) return 'denied';
  return Notification.permission;
}
