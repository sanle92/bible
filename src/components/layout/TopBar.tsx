import { Menu, Moon, Sun, Monitor, Wifi, WifiOff, LogOut, Bell } from 'lucide-react';
import { Link } from 'react-router-dom';
import { IconButton } from '@/components/ui/IconButton';
import { useUiStore } from '@/stores/uiStore';
import { useThemeStore } from '@/stores/themeStore';
import { useOnlineStatus } from '@/hooks/useOnlineStatus';
import { useAuthStore } from '@/stores/authStore';
import { SyncStatusIndicator } from '@/components/sync/SyncStatusIndicator';
import { cn } from '@/utils/cn';

export function TopBar({ title, className }: { title?: string; className?: string }) {
  const toggleSidebar = useUiStore((s) => s.toggleSidebar);
  const { theme, setTheme } = useThemeStore();
  const online = useOnlineStatus();
  const { user, signOut } = useAuthStore();

  const cycleTheme = () => {
    const order: Array<typeof theme> = ['light', 'dark', 'system'];
    const next = order[(order.indexOf(theme) + 1) % order.length];
    setTheme(next);
  };

  const ThemeIcon = theme === 'light' ? Sun : theme === 'dark' ? Moon : Monitor;

  return (
    <header className={cn('h-16 flex items-center gap-3 px-4 md:px-6 border-b border-[var(--border-subtle)] bg-[var(--bg-surface)]/80 backdrop-blur-sm sticky top-0 z-30', className)}>
      <IconButton onClick={toggleSidebar} aria-label="Toggle sidebar">
        <Menu size={18} />
      </IconButton>
      <h1 className="text-base md:text-lg font-semibold text-[var(--text-primary)] truncate">{title}</h1>

      <div className="ml-auto flex items-center gap-1.5">
        <SyncStatusIndicator />
        <Link
          to="/notifications"
          className="flex h-8 w-8 items-center justify-center rounded-lg text-[var(--text-secondary)] hover:bg-[var(--bg-hover)]"
          aria-label="Notifications"
        >
          <Bell size={18} />
        </Link>
        <span
          title={online ? 'Online' : 'Offline — changes saved locally'}
          className="hidden sm:inline-flex items-center gap-1 text-xs text-[var(--text-tertiary)] mr-1"
        >
          {online ? <Wifi size={14} /> : <WifiOff size={14} />}
          {online ? 'Online' : 'Offline'}
        </span>
        <IconButton onClick={cycleTheme} aria-label="Toggle theme">
          <ThemeIcon size={18} />
        </IconButton>
        {user && (
          <>
            <Link
              to="/profile"
              className="h-8 w-8 rounded-full bg-[var(--accent-soft)] text-[var(--accent)] flex items-center justify-center text-xs font-semibold overflow-hidden shrink-0"
              title={user.email ?? undefined}
            >
              {user.avatarUrl ? (
                <img src={user.avatarUrl} alt="Avatar" className="h-full w-full object-cover" />
              ) : (
                (user.displayName ?? user.email ?? '?').charAt(0).toUpperCase()
              )}
            </Link>
            <IconButton onClick={() => void signOut()} aria-label="Sign out">
              <LogOut size={18} />
            </IconButton>
          </>
        )}
      </div>
    </header>
  );
}
