import { NavLink } from 'react-router-dom';
import { X, Home, BookOpen, StickyNote, Highlighter, Mic2, HandHeart, BookText, Settings, Bookmark, Search, CalendarCheck, Bell } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { useUiStore } from '@/stores/uiStore';
import { cn } from '@/utils/cn';

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

export function MobileSidebar() {
  const sidebarOpen = useUiStore((s) => s.sidebarOpen);
  const setSidebarOpen = useUiStore((s) => s.setSidebarOpen);

  return (
    <AnimatePresence>
      {sidebarOpen && (
        <>
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.2 }}
            onClick={() => setSidebarOpen(false)}
            className="fixed inset-0 z-50 bg-black/50 md:hidden"
          />
          <motion.aside
            initial={{ x: '-100%' }}
            animate={{ x: 0 }}
            exit={{ x: '-100%' }}
            transition={{ duration: 0.2, ease: 'easeInOut' }}
            className="fixed inset-y-0 left-0 z-50 w-64 flex flex-col bg-[var(--bg-surface)] border-r border-[var(--border-subtle)] md:hidden"
          >
            <div className="flex items-center justify-between h-16 px-5 border-b border-[var(--border-subtle)]">
              <div className="flex items-center gap-2">
                <div className="h-8 w-8 rounded-lg bg-[var(--accent)] flex items-center justify-center text-white font-serif font-bold shrink-0">
                  B
                </div>
                <span className="font-semibold text-[var(--text-primary)]">Bible Study</span>
              </div>
              <button
                onClick={() => setSidebarOpen(false)}
                className="p-2 rounded-lg text-[var(--text-secondary)] hover:bg-[var(--bg-hover)]"
                aria-label="Close sidebar"
              >
                <X size={20} />
              </button>
            </div>

            <nav className="flex-1 px-3 py-4 space-y-1 overflow-y-auto">
              {navItems.map(({ to, label, icon: Icon }) => (
                <NavLink
                  key={to}
                  to={to}
                  onClick={() => setSidebarOpen(false)}
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
                  <span>{label}</span>
                </NavLink>
              ))}
            </nav>

            <div className="px-3 py-4 border-t border-[var(--border-subtle)]">
              <NavLink
                to="/settings"
                onClick={() => setSidebarOpen(false)}
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
                <span>Settings</span>
              </NavLink>
            </div>
          </motion.aside>
        </>
      )}
    </AnimatePresence>
  );
}
