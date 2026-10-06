import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import type { NotificationPreferences, NotificationSchedule, NotificationType } from '@/types/notifications';
import { DEFAULT_NOTIFICATION_SCHEDULES } from '@/types/notifications';
import { requestNotificationPermission, scheduleNotifications, cancelNotification } from '@/services/notificationService';

interface NotificationsState {
  preferences: NotificationPreferences;
  requestPermission: () => Promise<NotificationPermission>;
  updateSchedule: (id: NotificationType, updates: Partial<NotificationSchedule>) => void;
  toggleSchedule: (id: NotificationType) => void;
  reset: () => void;
}

function getInitialState(): NotificationPreferences {
  return {
    permission: 'default' as NotificationPermission,
    schedules: DEFAULT_NOTIFICATION_SCHEDULES.map((s) => ({ ...s })),
  };
}

export const useNotificationsStore = create<NotificationsState>()(
  persist(
    (set, get) => ({
      preferences: getInitialState(),
      requestPermission: async () => {
        const permission = await requestNotificationPermission();
        set((state) => ({ preferences: { ...state.preferences, permission } }));
        if (permission === 'granted') {
          await scheduleNotifications(get().preferences.schedules);
        }
        return permission;
      },
      updateSchedule: async (id, updates) => {
        const schedules = get().preferences.schedules.map((s) => (s.id === id ? { ...s, ...updates } : s));
        set((state) => ({ preferences: { ...state.preferences, schedules } }));
        await scheduleNotifications(schedules);
      },
      toggleSchedule: async (id) => {
        const schedules = get().preferences.schedules.map((s) =>
          s.id === id ? { ...s, enabled: !s.enabled } : s
        );
        set((state) => ({ preferences: { ...state.preferences, schedules } }));
        await cancelNotification(id);
        await scheduleNotifications(schedules);
      },
      reset: () => {
        set({ preferences: getInitialState() });
      },
    }),
    { name: 'bible-notifications-store' }
  )
);
