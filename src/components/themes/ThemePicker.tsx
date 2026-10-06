import { useEffect, useMemo, useRef, useState } from 'react';
import { X, Plus, Check, Tag } from 'lucide-react';
import { useThemesStore, getThemeColor } from '@/stores/themesStore';
import { useAuthStore } from '@/stores/authStore';
import { DEFAULT_THEMES } from '@/types/themes';
import { cn } from '@/utils/cn';
import type { Theme } from '@/types/themes';

interface ThemePickerProps {
  selectedIds: string[];
  onChange: (ids: string[]) => void;
  allowCreate?: boolean;
  className?: string;
}

export function ThemePicker({ selectedIds, onChange, allowCreate = true, className }: ThemePickerProps) {
  const { themes, loaded, loadAll, createTheme } = useThemesStore();
  const { user } = useAuthStore();
  const userId = user?.id ?? 'local-user';
  const [open, setOpen] = useState(false);
  const [newName, setNewName] = useState('');
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!loaded) void loadAll();
  }, [loaded, loadAll]);

  // Seed default themes once.
  useEffect(() => {
    if (!loaded || themes.length > 0) return;
    for (const t of DEFAULT_THEMES) {
      void createTheme(userId, t.name);
    }
  }, [loaded, themes.length, createTheme, userId]);

  useEffect(() => {
    const handleClick = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener('mousedown', handleClick);
    return () => document.removeEventListener('mousedown', handleClick);
  }, []);

  const selected = useMemo(() => {
    const map = new Map(themes.map((t) => [t.id, t]));
    return selectedIds.map((id) => map.get(id)).filter(Boolean) as Theme[];
  }, [themes, selectedIds]);

  const toggle = (id: string) => {
    const next = selectedIds.includes(id) ? selectedIds.filter((i) => i !== id) : [...selectedIds, id];
    onChange(next);
  };

  const handleCreate = async () => {
    if (!newName.trim()) return;
    const theme = await createTheme(userId, newName.trim());
    onChange([...selectedIds, theme.id]);
    setNewName('');
  };

  return (
    <div ref={ref} className={cn('relative', className)}>
      <button
        type="button"
        onClick={() => setOpen((s) => !s)}
        className={cn(
          'w-full flex items-center flex-wrap gap-1.5 min-h-[38px] rounded-lg border border-[var(--border-subtle)] bg-[var(--bg-hover)] px-3 py-1.5 text-left text-sm',
          selected.length === 0 && 'text-[var(--text-tertiary)]'
        )}
      >
        {selected.length === 0 ? (
          <span className="flex items-center gap-1.5">
            <Tag size={14} /> Select themes
          </span>
        ) : (
          selected.map((t) => (
            <span
              key={t.id}
              className="inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-xs text-white"
              style={{ backgroundColor: t.color ?? getThemeColor(t.name) }}
            >
              {t.name}
            </span>
          ))
        )}
      </button>

      {open && (
        <div className="absolute z-50 mt-1 w-64 rounded-lg border border-[var(--border-subtle)] bg-[var(--bg-elevated)] shadow-md p-2">
          <div className="max-h-48 overflow-y-auto space-y-0.5">
            {themes.length === 0 && <p className="text-xs text-[var(--text-tertiary)] px-2 py-1">No themes yet.</p>}
            {themes.map((theme) => {
              const active = selectedIds.includes(theme.id);
              return (
                <button
                  key={theme.id}
                  onClick={() => toggle(theme.id)}
                  className={cn(
                    'w-full flex items-center gap-2 rounded-md px-2 py-1.5 text-sm transition-colors',
                    active ? 'bg-[var(--accent-soft)] text-[var(--accent)]' : 'text-[var(--text-secondary)] hover:bg-[var(--bg-hover)]'
                  )}
                >
                  <span
                    className="w-2.5 h-2.5 rounded-full shrink-0"
                    style={{ backgroundColor: theme.color ?? getThemeColor(theme.name) }}
                  />
                  <span className="flex-1 text-left truncate">{theme.name}</span>
                  {active && <Check size={14} />}
                </button>
              );
            })}
          </div>

          {allowCreate && (
            <div className="mt-2 pt-2 border-t border-[var(--border-subtle)] flex items-center gap-1">
              <input
                value={newName}
                onChange={(e) => setNewName(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') void handleCreate();
                }}
                placeholder="New theme"
                className="flex-1 rounded-md border border-[var(--border-subtle)] bg-[var(--bg-app)] px-2 py-1 text-xs outline-none"
              />
              <button
                onClick={() => void handleCreate()}
                disabled={!newName.trim()}
                className="p-1 rounded-md text-[var(--accent)] disabled:opacity-40"
              >
                <Plus size={14} />
              </button>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

export function ThemeBadge({ theme, onRemove }: { theme: Theme; onRemove?: () => void }) {
  return (
    <span
      className="inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-xs text-white"
      style={{ backgroundColor: theme.color ?? getThemeColor(theme.name) }}
    >
      {theme.name}
      {onRemove && (
        <button onClick={onRemove} className="hover:opacity-70">
          <X size={10} />
        </button>
      )}
    </span>
  );
}
