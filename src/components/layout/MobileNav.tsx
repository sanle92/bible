import { NavLink, useLocation } from 'react-router-dom';
import { Home, BookOpen, Search, StickyNote, Highlighter } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { cn } from '@/utils/cn';
import { useScrollDirection } from '@/hooks/useScrollDirection';

const navItems = [
  { to: '/', label: 'Dashboard', icon: Home },
  { to: '/read', label: 'Read', icon: BookOpen },
  { to: '/search', label: 'Search', icon: Search },
  { to: '/notes', label: 'Notes', icon: StickyNote },
  { to: '/highlights', label: 'Highlights', icon: Highlighter },
];

export function MobileNav() {
  const { scrollDirection } = useScrollDirection();
  const location = useLocation();
  const isReadingPage = location.pathname === '/read';
  const isVisible = scrollDirection === 'up' || scrollDirection === null;

  return (
    <AnimatePresence mode="wait">
      {(isVisible || !isReadingPage) && (
        <motion.nav
          initial={{ y: 0 }}
          animate={{ y: 0 }}
          exit={{ y: 100 }}
          transition={{ duration: 0.25, ease: 'easeInOut' }}
          className="md:hidden fixed bottom-4 left-4 right-4 z-40"
        >
          <div className="flex items-center justify-around bg-[var(--bg-elevated)]/90 backdrop-blur-xl border border-[var(--border-subtle)] rounded-2xl shadow-[var(--shadow-soft)] py-2 px-4 pb-[calc(0.5rem+env(safe-area-inset-bottom,0px))]">
            {navItems.map(({ to, label, icon: Icon }) => (
              <NavLink
                key={to}
                to={to}
                className={({ isActive }) =>
                  cn(
                    'relative flex flex-col items-center justify-center w-12 h-12 rounded-xl transition-all duration-200',
                    isActive
                      ? 'text-[var(--accent)]'
                      : 'text-[var(--text-tertiary)] hover:text-[var(--text-secondary)]'
                  )
                }
                aria-label={label}
              >
                {({ isActive }) => (
                  <>
                    <motion.div
                      initial={false}
                      animate={{
                        scale: isActive ? 1 : 0.85,
                        backgroundColor: isActive ? 'var(--accent-soft)' : 'transparent',
                      }}
                      transition={{ type: 'spring', stiffness: 400, damping: 20 }}
                      className="absolute inset-0 rounded-xl"
                    />
                    <Icon size={20} strokeWidth={isActive ? 2.5 : 2} className="relative z-10" />
                  </>
                )}
              </NavLink>
            ))}
          </div>
        </motion.nav>
      )}
    </AnimatePresence>
  );
}
