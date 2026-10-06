import { useEffect } from 'react';
import { Bell, BellOff, Check, Clock } from 'lucide-react';
import { useNotificationsStore } from '@/stores/notificationsStore';
import { scheduleNotifications } from '@/services/notificationService';
import { Button } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';
import { useToast } from '@/hooks/useToast';
import { cn } from '@/utils/cn';

const DAY_LABELS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

const TYPE_DESCRIPTIONS: Record<string, string> = {
  reading: 'Reminds you to read the Bible.',
  prayer: 'Reminds you to pray and check prayer requests.',
  dailyVerse: 'Sends the verse of the day.',
  readingPlan: 'Reminds you to complete your reading plan.',
  streak: 'Warns you before your reading streak breaks.',
};

export function NotificationSettingsPage() {
  const { preferences, requestPermission, toggleSchedule, updateSchedule } = useNotificationsStore();
  const { showToast } = useToast();

  useEffect(() => {
    if (preferences.permission === 'granted') {
      // Re-schedule on mount in case service worker restarted.
      void scheduleNotifications(preferences.schedules);
    }
  }, [preferences.permission, preferences.schedules]);

  const handleEnable = async () => {
    const permission = await requestPermission();
    if (permission === 'granted') {
      showToast('Notifications enabled', 'success');
    } else {
      showToast('Notification permission denied', 'error');
    }
  };

  const toggleDay = (scheduleId: string, day: number) => {
    const s = preferences.schedules.find((x) => x.id === scheduleId);
    if (!s) return;
    const days = s.days.includes(day) ? s.days.filter((d) => d !== day) : [...s.days, day].sort();
    void updateSchedule(scheduleId as typeof s.id, { days });
  };

  return (
    <div className="p-4 md:p-8 max-w-3xl mx-auto h-[calc(100vh-4rem)] overflow-y-auto">
      <h1 className="text-2xl font-bold text-[var(--text-primary)] mb-4">Notifications</h1>

      <Card className="p-5 mb-6">
        <div className="flex items-center justify-between">
          <div>
            <p className="font-semibold text-[var(--text-primary)]">Permission Status</p>
            <p className="text-sm text-[var(--text-secondary)] capitalize">{preferences.permission}</p>
          </div>
          {preferences.permission === 'granted' ? (
            <div className="flex items-center gap-2 text-green-500 text-sm font-medium">
              <Check size={16} /> Enabled
            </div>
          ) : (
            <Button onClick={() => void handleEnable()}>
              <Bell size={16} /> Enable Notifications
            </Button>
          )}
        </div>
      </Card>

      {preferences.permission !== 'granted' && (
        <Card className="p-4 mb-6 bg-yellow-500/10 border-yellow-500/30">
          <div className="flex items-start gap-3">
            <BellOff size={18} className="text-yellow-500 mt-0.5" />
            <p className="text-sm text-[var(--text-secondary)]">
              Enable push notifications to receive reading reminders, prayer reminders, daily verses, and streak alerts even when the app is closed.
            </p>
          </div>
        </Card>
      )}

      <div className="space-y-4">
        {preferences.schedules.map((schedule) => (
          <Card key={schedule.id} className={cn('p-4', !schedule.enabled && 'opacity-70')}>
            <div className="flex items-start justify-between gap-3 mb-3">
              <div>
                <p className="font-semibold text-[var(--text-primary)]">{schedule.title}</p>
                <p className="text-xs text-[var(--text-tertiary)]">{TYPE_DESCRIPTIONS[schedule.id]}</p>
              </div>
              <button
                onClick={() => void toggleSchedule(schedule.id)}
                className={cn(
                  'relative h-6 w-11 rounded-full transition-colors',
                  schedule.enabled ? 'bg-[var(--accent)]' : 'bg-[var(--bg-hover)]'
                )}
              >
                <span
                  className={cn(
                    'absolute top-1 h-4 w-4 rounded-full bg-white transition-all',
                    schedule.enabled ? 'left-6' : 'left-1'
                  )}
                />
              </button>
            </div>

            <div className="flex flex-wrap items-center gap-4 mb-3">
              <div className="flex items-center gap-2 rounded-lg border border-[var(--border-subtle)] bg-[var(--bg-hover)] px-3 py-2">
                <Clock size={14} className="text-[var(--text-tertiary)]" />
                <input
                  type="time"
                  value={schedule.time}
                  onChange={(e) => void updateSchedule(schedule.id, { time: e.target.value })}
                  className="bg-transparent outline-none text-sm text-[var(--text-primary)]"
                />
              </div>
            </div>

            <div className="flex items-center gap-1">
              {DAY_LABELS.map((label, i) => (
                <button
                  key={label}
                  onClick={() => toggleDay(schedule.id, i)}
                  className={cn(
                    'h-8 w-8 rounded-full text-[10px] font-medium transition-colors',
                    schedule.days.includes(i)
                      ? 'bg-[var(--accent)] text-white'
                      : 'bg-[var(--bg-hover)] text-[var(--text-secondary)]'
                  )}
                >
                  {label[0]}
                </button>
              ))}
            </div>
          </Card>
        ))}
      </div>
    </div>
  );
}
