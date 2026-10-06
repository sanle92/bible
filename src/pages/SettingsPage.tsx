import { Sun, Moon, Monitor, Bell, Download, Info, User, LogOut, Type, Globe2, BookText } from 'lucide-react';
import { Link } from 'react-router-dom';
import { useThemeStore } from '@/stores/themeStore';
import { useAuthStore } from '@/stores/authStore';
import { usePreferencesStore, LANGUAGE_LABELS } from '@/stores/preferencesStore';
import { usePushNotifications } from '@/hooks/usePushNotifications';
import { Card } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { cn } from '@/utils/cn';
import { isSupabaseConfigured } from '@/services/supabaseClient';
import type { FontSize, Language, BibleTranslation } from '@/types/user';

const themeOptions = [
  { value: 'light', label: 'Light', icon: Sun },
  { value: 'dark', label: 'Dark', icon: Moon },
  { value: 'system', label: 'System', icon: Monitor },
] as const;

const fontSizeOptions: { value: FontSize; label: string }[] = [
  { value: 'sm', label: 'Small' },
  { value: 'md', label: 'Medium' },
  { value: 'lg', label: 'Large' },
  { value: 'xl', label: 'X-Large' },
];

const translationOptions: { value: BibleTranslation; label: string }[] = [
  { value: 'kjv', label: 'King James Version' },
  { value: 'web', label: 'World English Bible' },
  { value: 'bbe', label: 'Bible in Basic English' },
  { value: 'asv', label: 'American Standard Version' },
];

export function SettingsPage() {
  const { theme, setTheme } = useThemeStore();
  const { user, signOut } = useAuthStore();
  const { preferences, setPreference, keepScreenAwake, setKeepScreenAwake } = usePreferencesStore();
  const { permission, requestPermission } = usePushNotifications();

  return (
    <div className="p-4 md:p-8 max-w-2xl mx-auto flex flex-col gap-6">
      <h1 className="text-2xl font-bold text-[var(--text-primary)]">Settings</h1>

      <Card className="p-5">
        <h2 className="text-sm font-semibold text-[var(--text-secondary)] mb-3">Appearance</h2>
        <div className="grid grid-cols-3 gap-2">
          {themeOptions.map(({ value, label, icon: Icon }) => (
            <button
              key={value}
              onClick={() => setTheme(value)}
              className={cn(
                'flex flex-col items-center gap-1.5 rounded-lg border py-3 text-sm',
                theme === value
                  ? 'border-[var(--accent)] text-[var(--accent)] bg-[var(--accent-soft)]'
                  : 'border-[var(--border-subtle)] text-[var(--text-secondary)]'
              )}
            >
              <Icon size={18} />
              {label}
            </button>
          ))}
        </div>
      </Card>

      <Card className="p-5">
        <h2 className="text-sm font-semibold text-[var(--text-secondary)] mb-3 flex items-center gap-2">
          <Globe2 size={15} /> Language
        </h2>
        <select
          value={preferences.language}
          onChange={(e) => setPreference('language', e.target.value as Language)}
          className="w-full rounded-lg border border-[var(--border-subtle)] bg-[var(--bg-app)] px-3 py-2 text-sm outline-none focus:border-[var(--accent)]"
        >
          {Object.entries(LANGUAGE_LABELS).map(([code, label]) => (
            <option key={code} value={code}>
              {label}
            </option>
          ))}
        </select>
      </Card>

      <Card className="p-5">
        <h2 className="text-sm font-semibold text-[var(--text-secondary)] mb-3 flex items-center gap-2">
          <Type size={15} /> Font Size
        </h2>
        <div className="grid grid-cols-4 gap-2">
          {fontSizeOptions.map(({ value, label }) => (
            <button
              key={value}
              onClick={() => setPreference('fontSize', value)}
              className={cn(
                'rounded-lg border py-2 text-xs font-medium',
                preferences.fontSize === value
                  ? 'border-[var(--accent)] text-[var(--accent)] bg-[var(--accent-soft)]'
                  : 'border-[var(--border-subtle)] text-[var(--text-secondary)]'
              )}
            >
              {label}
            </button>
          ))}
        </div>
      </Card>

      <Card className="p-5">
        <h2 className="text-sm font-semibold text-[var(--text-secondary)] mb-3 flex items-center gap-2">
          <BookText size={15} /> Reading Preferences
        </h2>
        <div className="flex flex-col gap-4">
          <div>
            <p className="text-xs text-[var(--text-tertiary)] mb-1.5">Translation</p>
            <select
              value={preferences.translation}
              onChange={(e) => setPreference('translation', e.target.value as BibleTranslation)}
              className="w-full rounded-lg border border-[var(--border-subtle)] bg-[var(--bg-app)] px-3 py-2 text-sm outline-none focus:border-[var(--accent)]"
            >
              {translationOptions.map(({ value, label }) => (
                <option key={value} value={value}>
                  {label}
                </option>
              ))}
            </select>
          </div>
          <div>
            <p className="text-xs text-[var(--text-tertiary)] mb-1.5">Reading Font</p>
            <div className="grid grid-cols-2 gap-2">
              {(['serif', 'sans'] as const).map((f) => (
                <button
                  key={f}
                  onClick={() => setPreference('readingFont', f)}
                  className={cn(
                    'rounded-lg border py-2 text-xs font-medium capitalize',
                    f === 'serif' ? 'font-serif' : 'font-sans',
                    preferences.readingFont === f
                      ? 'border-[var(--accent)] text-[var(--accent)] bg-[var(--accent-soft)]'
                      : 'border-[var(--border-subtle)] text-[var(--text-secondary)]'
                  )}
                >
                  {f}
                </button>
              ))}
            </div>
          </div>
          <div>
            <p className="text-xs text-[var(--text-tertiary)] mb-1.5">Line Height</p>
            <div className="grid grid-cols-4 gap-2">
              {(['tight', 'normal', 'relaxed', 'loose'] as const).map((s) => (
                <button
                  key={s}
                  onClick={() => setPreference('lineHeight', s)}
                  className={cn(
                    'rounded-lg border py-2 text-xs font-medium capitalize',
                    preferences.lineHeight === s
                      ? 'border-[var(--accent)] text-[var(--accent)] bg-[var(--accent-soft)]'
                      : 'border-[var(--border-subtle)] text-[var(--text-secondary)]'
                  )}
                >
                  {s}
                </button>
              ))}
            </div>
          </div>
          <div>
            <p className="text-xs text-[var(--text-tertiary)] mb-1.5">Verse Spacing</p>
            <div className="grid grid-cols-3 gap-2">
              {(['compact', 'normal', 'relaxed'] as const).map((s) => (
                <button
                  key={s}
                  onClick={() => setPreference('verseSpacing', s)}
                  className={cn(
                    'rounded-lg border py-2 text-xs font-medium capitalize',
                    preferences.verseSpacing === s
                      ? 'border-[var(--accent)] text-[var(--accent)] bg-[var(--accent-soft)]'
                      : 'border-[var(--border-subtle)] text-[var(--text-secondary)]'
                  )}
                >
                  {s}
                </button>
              ))}
            </div>
          </div>
          <label className="flex items-center gap-2 text-sm text-[var(--text-primary)]">
            <input
              type="checkbox"
              checked={preferences.showVerseNumbers}
              onChange={(e) => setPreference('showVerseNumbers', e.target.checked)}
              className="accent-[var(--accent)]"
            />
            Show verse numbers
          </label>
          <label className="flex items-center gap-2 text-sm text-[var(--text-primary)]">
            <input
              type="checkbox"
              checked={keepScreenAwake}
              onChange={(e) => setKeepScreenAwake(e.target.checked)}
              className="accent-[var(--accent)]"
            />
            Keep screen awake while reading
          </label>
        </div>
      </Card>

      <Card className="p-5">
        <h2 className="text-sm font-semibold text-[var(--text-secondary)] mb-3">Account</h2>
        {user ? (
          <div className="flex items-center justify-between">
            <p className="text-sm text-[var(--text-primary)]">Signed in as {user.email}</p>
            <div className="flex items-center gap-2">
              <Link to="/profile">
                <Button size="sm" variant="secondary">
                  <User size={14} /> Profile
                </Button>
              </Link>
              <Button size="sm" variant="ghost" onClick={() => void signOut()}>
                <LogOut size={14} /> Sign out
              </Button>
            </div>
          </div>
        ) : (
          <p className="text-sm text-[var(--text-tertiary)]">
            You're using local mode. {isSupabaseConfigured ? 'Sign in to sync across devices.' : 'Configure Supabase to enable sync.'}
          </p>
        )}
      </Card>

      <Card className="p-5">
        <h2 className="text-sm font-semibold text-[var(--text-secondary)] mb-3 flex items-center gap-2">
          <Bell size={15} /> Notifications
        </h2>
        <p className="text-sm text-[var(--text-tertiary)] mb-3">
          Enable push notifications for prayer reminders and sync updates.
        </p>
        <Button size="sm" variant="secondary" onClick={() => void requestPermission()} disabled={permission === 'granted'}>
          {permission === 'granted' ? 'Enabled' : 'Enable Notifications'}
        </Button>
      </Card>

      <Card className="p-5">
        <h2 className="text-sm font-semibold text-[var(--text-secondary)] mb-3 flex items-center gap-2">
          <Download size={15} /> Install App
        </h2>
        <p className="text-sm text-[var(--text-tertiary)]">
          Use your browser's "Add to Home Screen" or install prompt to install Bible Study Workspace for offline access.
        </p>
      </Card>

      <Card className="p-5 flex items-center gap-2 text-xs text-[var(--text-tertiary)]">
        <Info size={14} />
        Bible Study Workspace v1.0.0 — offline-first, installable PWA.
      </Card>
    </div>
  );
}
