import { NavLink } from 'react-router-dom';
import { Home, BookOpen, StickyNote, Highlighter, Mic2, HandHeart, BookText, Settings, Bookmark, Search, CalendarCheck, Bell } from 'lucide-react';
import { cn } from '@/utils/cn';
import { useUiStore } from '@/stores/uiStore';

const navItems = [
  { to: '/', label: 'Dashboard', icon: Home },
  { to: '/read', label: 'Read', icon: BookOpen },
  { to: '/notes', label: 'Notes', icon: StickyNote },
  { to: '/highlights', label: 'Highlights', icon: Highlighter },
  { to: '/sermons', label: 'Sermons', icon: Mic2 },
  { to: '/prayer', label: 'Prayer Journal', icon: HandHeart },
  { to: '/journal', label: 'Journal', icon: BookText },
  { to: '/reading-plans', label: 'Reading Plans', icon: CalendarCheck },
  { to: '/notifications', label: 'Notifications', icon: Bell },
  { to: '/search', label: 'Search', icon: Search },
  { to: '/bookmarks', label: 'Bookmarks', icon: Bookmark },
];

export function Sidebar() {
  const sidebarOpen = useUiStore((s) => s.sidebarOpen);

  return (
    <aside
      className={cn(
        'hidden md:flex flex-col shrink-0 sticky top-0 self-start h-screen border-r border-[var(--border-subtle)] bg-[var(--bg-surface)] transition-all duration-200 overflow-hidden',
        sidebarOpen ? 'w-64' : 'w-[76px]'
      )}
    >
      <div className="flex items-center gap-2 h-16 px-5 border-b border-[var(--border-subtle)]">
        <div className="h-8 w-8 rounded-lg bg-[var(--accent)] flex items-center justify-center text-white font-serif font-bold shrink-0">
          B
        </div>
        {sidebarOpen && (
          <span className="font-semibold text-[var(--text-primary)] truncate">Bible Study</span>
        )}
      </div>

      <nav className="flex-1 px-3 py-4 space-y-1">
        {navItems.map(({ to, label, icon: Icon }) => (
          <NavLink
            key={to}
            to={to}
            className={({ isActive }) =>
              cn(
                'flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-colors',
                isActive
                  ? 'bg-[var(--accent-soft)] text-[var(--accent)]'
                  : 'text-[var(--text-secondary)] hover:bg-[var(--bg-hover)] hover:text-[var(--text-primary)]'
              )
            }
          >
            <Icon size={18} className="shrink-0" />
            {sidebarOpen && <span className="truncate">{label}</span>}
          </NavLink>
        ))}
      </nav>

      <div className="px-3 py-4 border-t border-[var(--border-subtle)]">
        <NavLink
          to="/settings"
          className={({ isActive }) =>
            cn(
              'flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-colors',
              isActive
                ? 'bg-[var(--accent-soft)] text-[var(--accent)]'
                : 'text-[var(--text-secondary)] hover:bg-[var(--bg-hover)] hover:text-[var(--text-primary)]'
            )
          }
        >
          <Settings size={18} className="shrink-0" />
          {sidebarOpen && <span>Settings</span>}
        </NavLink>
      </div>
    </aside>
  );
}
