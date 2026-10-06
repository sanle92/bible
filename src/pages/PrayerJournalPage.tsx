import { useEffect, useMemo, useRef, useState } from 'react';
import { motion } from 'framer-motion';
import {
  Plus,
  Trash2,
  CheckCircle2,
  Circle,
  Calendar as CalendarIcon,
  BarChart3,
  List,
  Mic,
  Image as ImageIcon,
  X,
  Clock,
  AlertCircle,
  History,
} from 'lucide-react';
import { usePrayerStore } from '@/stores/prayerStore';
import { useAuthStore } from '@/stores/authStore';
import { useToast } from '@/hooks/useToast';
import { RichTextEditor } from '@/components/editor/RichTextEditor';
import { ThemePicker } from '@/components/themes/ThemePicker';
import { Button } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';
import { IconButton } from '@/components/ui/IconButton';
import { format, startOfMonth, endOfMonth, eachDayOfInterval, isSameDay, getDate, subMonths, addMonths } from 'date-fns';
import { cn } from '@/utils/cn';
import type { PrayerEntry, PrayerStatus } from '@/types/prayer';

const CATEGORIES: PrayerEntry['category'][] = ['praise', 'request', 'intercession', 'gratitude', 'other'];
const PRIORITIES: PrayerEntry['priority'][] = ['low', 'medium', 'high'];
const STATUSES: PrayerStatus[] = ['pending', 'answered', 'archived'];

export function PrayerJournalPage() {
  const { entries, loaded, loadAll, upsertEntry, setStatus, deleteEntry } = usePrayerStore();
  const { user } = useAuthStore();
  const { showToast } = useToast();
  const userId = user?.id ?? 'local-user';

  const [activeId, setActiveId] = useState<string | null>(null);
  const [view, setView] = useState<'list' | 'calendar' | 'stats'>('list');
  const [statusFilter, setStatusFilter] = useState<PrayerStatus | 'all'>('all');
  const [categoryFilter, setCategoryFilter] = useState<PrayerEntry['category'] | 'all'>('all');
  const [priorityFilter, setPriorityFilter] = useState<PrayerEntry['priority'] | 'all'>('all');
  const [calendarDate, setCalendarDate] = useState(new Date());
  const [statusNote, setStatusNote] = useState('');
  const [recording, setRecording] = useState(false);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (!loaded) void loadAll();
  }, [loaded, loadAll]);

  const active = entries.find((e) => e.id === activeId);

  const filtered = useMemo(() => {
    let list = entries;
    if (statusFilter !== 'all') list = list.filter((e) => e.status === statusFilter);
    if (categoryFilter !== 'all') list = list.filter((e) => e.category === categoryFilter);
    if (priorityFilter !== 'all') list = list.filter((e) => e.priority === priorityFilter);
    return list.slice().sort((a, b) => b.updatedAt.localeCompare(a.updatedAt));
  }, [entries, statusFilter, categoryFilter, priorityFilter]);

  const stats = useMemo(() => {
    const total = entries.length;
    const pending = entries.filter((e) => e.status === 'pending').length;
    const answered = entries.filter((e) => e.status === 'answered').length;
    const archived = entries.filter((e) => e.status === 'archived').length;
    const byCategory = CATEGORIES.map((c) => ({ category: c, count: entries.filter((e) => e.category === c).length }));
    const byPriority = PRIORITIES.map((p) => ({ priority: p, count: entries.filter((e) => e.priority === p).length }));
    return { total, pending, answered, archived, byCategory, byPriority };
  }, [entries]);

  const handleNew = async () => {
    const entry = await upsertEntry({
      userId,
      title: 'New Prayer',
      content: '',
      category: 'request',
    });
    setActiveId(entry.id);
  };

  const update = async (updates: Partial<PrayerEntry>) => {
    if (!active) return;
    await upsertEntry({ ...active, ...updates });
  };

  const handleStatusChange = async (status: PrayerStatus) => {
    if (!active) return;
    await setStatus(active.id, status, statusNote || undefined);
    setStatusNote('');
    showToast(`Marked ${status}`, 'success');
  };

  const toggleRecording = async () => {
    if (recording && mediaRecorderRef.current) {
      mediaRecorderRef.current.stop();
      setRecording(false);
      return;
    }
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const recorder = new MediaRecorder(stream);
      const chunks: BlobPart[] = [];
      recorder.ondataavailable = (e) => chunks.push(e.data);
      recorder.onstop = () => {
        const blob = new Blob(chunks, { type: 'audio/webm' });
        const reader = new FileReader();
        reader.onload = () => {
          void update({ voiceNote: reader.result as string });
          showToast('Voice note saved', 'success');
        };
        reader.readAsDataURL(blob);
        stream.getTracks().forEach((t) => t.stop());
      };
      recorder.start();
      mediaRecorderRef.current = recorder;
      setRecording(true);
    } catch {
      showToast('Microphone not available', 'error');
    }
  };

  const handleImageUpload = (file: File) => {
    const reader = new FileReader();
    reader.onload = () => {
      void update({ images: [...(active?.images ?? []), reader.result as string] });
    };
    reader.readAsDataURL(file);
  };

  const removeImage = (idx: number) => {
    if (!active) return;
    void update({ images: active.images?.filter((_, i) => i !== idx) ?? [] });
  };

  return (
    <div className="p-4 md:p-8 max-w-6xl mx-auto h-[calc(100vh-4rem)] flex flex-col">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-4">
        <h1 className="text-2xl font-bold text-[var(--text-primary)]">Prayer Manager</h1>
        <div className="flex items-center gap-2">
          <div className="flex bg-[var(--bg-hover)] rounded-lg p-1">
            <ViewTab active={view === 'list'} onClick={() => setView('list')} icon={List} label="List" />
            <ViewTab active={view === 'calendar'} onClick={() => setView('calendar')} icon={CalendarIcon} label="Calendar" />
            <ViewTab active={view === 'stats'} onClick={() => setView('stats')} icon={BarChart3} label="Stats" />
          </div>
          <Button onClick={() => void handleNew()}>
            <Plus size={16} /> New
          </Button>
        </div>
      </div>

      {!active && view === 'list' && (
        <div className="flex-1 overflow-y-auto">
          <div className="flex flex-wrap gap-2 mb-4">
            <FilterSelect
              value={statusFilter}
              onChange={(v) => setStatusFilter(v as PrayerStatus | 'all')}
              options={['all', ...STATUSES]}
              label="Status"
            />
            <FilterSelect
              value={categoryFilter}
              onChange={(v) => setCategoryFilter(v as PrayerEntry['category'] | 'all')}
              options={['all', ...CATEGORIES]}
              label="Category"
            />
            <FilterSelect
              value={priorityFilter}
              onChange={(v) => setPriorityFilter(v as PrayerEntry['priority'] | 'all')}
              options={['all', ...PRIORITIES]}
              label="Priority"
            />
          </div>

          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {filtered.length === 0 && (
              <p className="text-sm text-[var(--text-tertiary)] col-span-full text-center py-10">
                No prayer entries match the filters.
              </p>
            )}
            {filtered.map((entry) => (
              <Card
                key={entry.id}
                className="p-4 cursor-pointer hover:border-[var(--accent)] transition-colors"
                onClick={() => setActiveId(entry.id)}
              >
                <div className="flex items-start justify-between gap-2">
                  <p className="font-semibold text-[var(--text-primary)] truncate">{entry.title}</p>
                  <StatusIcon status={entry.status} />
                </div>
                <div className="flex items-center gap-2 mt-1">
                  <span className="text-[10px] uppercase font-semibold text-[var(--accent)]">{entry.category}</span>
                  <PriorityBadge priority={entry.priority} />
                </div>
                {entry.scripture && (
                  <p className="text-xs text-[var(--text-tertiary)] mt-1 truncate">{entry.scripture}</p>
                )}
                <p className="text-xs text-[var(--text-tertiary)] mt-2">
                  {format(new Date(entry.updatedAt), 'MMM d, yyyy')}
                </p>
              </Card>
            ))}
          </div>
        </div>
      )}

      {!active && view === 'calendar' && (
        <CalendarView
          date={calendarDate}
          onChange={setCalendarDate}
          entries={entries}
          onSelect={(id) => setActiveId(id)}
        />
      )}

      {!active && view === 'stats' && <StatsView stats={stats} />}

      {active && (
        <motion.div
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          className="flex-1 overflow-y-auto"
        >
          <Button variant="ghost" size="sm" className="self-start mb-3" onClick={() => setActiveId(null)}>
            ← Back
          </Button>

          <div className="flex items-center justify-between gap-3 mb-4">
            <input
              value={active.title}
              onChange={(e) => void update({ title: e.target.value })}
              className="text-2xl font-bold bg-transparent outline-none flex-1 text-[var(--text-primary)]"
              placeholder="Prayer title"
            />
            <Button variant="danger" size="sm" onClick={() => void deleteEntry(active.id).then(() => setActiveId(null))}>
              <Trash2 size={14} />
            </Button>
          </div>

          <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-3 mb-4">
            <input
              value={active.scripture ?? ''}
              onChange={(e) => void update({ scripture: e.target.value })}
              placeholder="Scripture reference"
              className="rounded-lg border border-[var(--border-subtle)] bg-[var(--bg-hover)] px-3 py-2 text-sm outline-none text-[var(--text-primary)]"
            />
            <select
              value={active.category}
              onChange={(e) => void update({ category: e.target.value as PrayerEntry['category'] })}
              className="rounded-lg border border-[var(--border-subtle)] bg-[var(--bg-hover)] px-3 py-2 text-sm outline-none text-[var(--text-primary)] capitalize"
            >
              {CATEGORIES.map((c) => (
                <option key={c} value={c}>
                  {c}
                </option>
              ))}
            </select>
            <select
              value={active.priority}
              onChange={(e) => void update({ priority: e.target.value as PrayerEntry['priority'] })}
              className="rounded-lg border border-[var(--border-subtle)] bg-[var(--bg-hover)] px-3 py-2 text-sm outline-none text-[var(--text-primary)] capitalize"
            >
              {PRIORITIES.map((p) => (
                <option key={p} value={p}>
                  {p}
                </option>
              ))}
            </select>
            <div className="flex items-center gap-2 rounded-lg border border-[var(--border-subtle)] bg-[var(--bg-hover)] px-3 py-2">
              <Clock size={14} className="text-[var(--text-tertiary)]" />
              <input
                type="datetime-local"
                value={active.reminder ? active.reminder.slice(0, 16) : ''}
                onChange={(e) => void update({ reminder: e.target.value ? new Date(e.target.value).toISOString() : null })}
                className="bg-transparent outline-none text-sm w-full text-[var(--text-primary)]"
              />
            </div>
          </div>

          <div className="flex items-center gap-3 mb-4 flex-wrap">
            <ThemePicker
              selectedIds={active.themeIds ?? []}
              onChange={(ids) => void update({ themeIds: ids })}
              className="w-56"
            />
            {STATUSES.map((s) => (
              <button
                key={s}
                onClick={() => void handleStatusChange(s)}
                className={cn(
                  'flex items-center gap-1.5 text-sm px-3 py-1.5 rounded-lg border border-[var(--border-subtle)] capitalize',
                  active.status === s && s === 'answered' && 'text-green-500 border-green-500/40',
                  active.status === s && s === 'pending' && 'text-[var(--accent)] border-[var(--accent)]/40',
                  active.status === s && s === 'archived' && 'text-[var(--text-tertiary)] border-[var(--text-tertiary)]/40'
                )}
              >
                <StatusIcon status={s} />
                {s}
              </button>
            ))}
          </div>

          {active.status !== 'answered' && (
            <div className="flex items-center gap-2 mb-4">
              <input
                value={statusNote}
                onChange={(e) => setStatusNote(e.target.value)}
                placeholder="Note when changing status..."
                className="flex-1 rounded-lg border border-[var(--border-subtle)] bg-[var(--bg-hover)] px-3 py-2 text-sm outline-none text-[var(--text-primary)]"
              />
            </div>
          )}

          <RichTextEditor
            content={active.content}
            onChange={(html) => void update({ content: html })}
            placeholder="Write your prayer..."
            className="min-h-[180px] mb-4"
          />

          <div className="grid sm:grid-cols-2 gap-4 mb-6">
            <Card className="p-3">
              <div className="flex items-center justify-between mb-2">
                <h3 className="text-sm font-medium text-[var(--text-primary)]">Images</h3>
                <input
                  ref={fileInputRef}
                  type="file"
                  accept="image/*"
                  className="hidden"
                  onChange={(e) => {
                    const file = e.target.files?.[0];
                    if (file) handleImageUpload(file);
                  }}
                />
                <IconButton onClick={() => fileInputRef.current?.click()} aria-label="Add image">
                  <ImageIcon size={16} />
                </IconButton>
              </div>
              {active.images && active.images.length > 0 ? (
                <div className="flex flex-wrap gap-2">
                  {active.images.map((img, idx) => (
                    <div key={idx} className="relative">
                      <img src={img} alt="" className="h-16 w-16 object-cover rounded-lg" />
                      <button
                        onClick={() => removeImage(idx)}
                        className="absolute -top-1 -right-1 rounded-full bg-red-500 text-white p-0.5"
                      >
                        <X size={10} />
                      </button>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-xs text-[var(--text-tertiary)]">No images.</p>
              )}
            </Card>

            <Card className="p-3">
              <div className="flex items-center justify-between mb-2">
                <h3 className="text-sm font-medium text-[var(--text-primary)]">Voice Note</h3>
                <Button
                  variant="secondary"
                  size="sm"
                  onClick={() => void toggleRecording()}
                  className={cn('gap-1', recording && 'bg-red-500/10 text-red-500')}
                >
                  <Mic size={14} /> {recording ? 'Stop' : active.voiceNote ? 'Re-record' : 'Record'}
                </Button>
              </div>
              {active.voiceNote ? (
                <audio controls src={active.voiceNote} className="w-full" />
              ) : (
                <p className="text-xs text-[var(--text-tertiary)]">No voice note.</p>
              )}
            </Card>
          </div>

          <Card className="p-4">
            <div className="flex items-center gap-2 mb-3">
              <History size={16} className="text-[var(--text-secondary)]" />
              <h3 className="text-sm font-medium text-[var(--text-primary)]">Prayer History</h3>
            </div>
            <div className="space-y-2">
              {(active.history ?? []).length === 0 && (
                <p className="text-xs text-[var(--text-tertiary)]">No history yet.</p>
              )}
              {[...(active.history ?? [])].reverse().map((h) => (
                <div key={h.id} className="flex items-start gap-2 text-sm border-l-2 border-[var(--border-subtle)] pl-3 py-1">
                  <StatusIcon status={h.status} />
                  <div className="flex-1">
                    <p className="capitalize text-[var(--text-primary)]">{h.status}</p>
                    {h.note && <p className="text-xs text-[var(--text-secondary)]">{h.note}</p>}
                    <p className="text-[10px] text-[var(--text-tertiary)]">{format(new Date(h.createdAt), 'MMM d, yyyy h:mm a')}</p>
                  </div>
                </div>
              ))}
            </div>
          </Card>
        </motion.div>
      )}
    </div>
  );
}

function ViewTab({
  active,
  onClick,
  icon: Icon,
  label,
}: {
  active: boolean;
  onClick: () => void;
  icon: React.ElementType;
  label: string;
}) {
  return (
    <button
      onClick={onClick}
      className={cn(
        'flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-medium transition-colors',
        active ? 'bg-[var(--accent)] text-white' : 'text-[var(--text-secondary)] hover:bg-[var(--bg-hover)]'
      )}
    >
      <Icon size={14} />
      {label}
    </button>
  );
}

function FilterSelect({ value, onChange, options, label }: { value: string; onChange: (v: string) => void; options: string[]; label: string }) {
  return (
    <select
      value={value}
      onChange={(e) => onChange(e.target.value)}
      className="rounded-lg border border-[var(--border-subtle)] bg-[var(--bg-hover)] px-3 py-1.5 text-xs outline-none text-[var(--text-primary)] capitalize"
    >
      <option value="all">{label}: All</option>
      {options.filter((o) => o !== 'all').map((o) => (
        <option key={o} value={o}>
          {o}
        </option>
      ))}
    </select>
  );
}

function StatusIcon({ status }: { status: PrayerStatus }) {
  if (status === 'answered') return <CheckCircle2 size={16} className="text-green-500" />;
  if (status === 'archived') return <AlertCircle size={16} className="text-[var(--text-tertiary)]" />;
  return <Circle size={16} className="text-[var(--accent)]" />;
}

function PriorityBadge({ priority }: { priority: PrayerEntry['priority'] }) {
  const colors: Record<PrayerEntry['priority'], string> = {
    low: 'bg-blue-500/10 text-blue-500',
    medium: 'bg-yellow-500/10 text-yellow-600',
    high: 'bg-red-500/10 text-red-500',
  };
  return (
    <span className={cn('text-[10px] uppercase font-semibold px-1.5 py-0.5 rounded', colors[priority])}>
      {priority}
    </span>
  );
}

function CalendarView({
  date,
  onChange,
  entries,
  onSelect,
}: {
  date: Date;
  onChange: (d: Date) => void;
  entries: PrayerEntry[];
  onSelect: (id: string) => void;
}) {
  const days = useMemo(() => {
    const start = startOfMonth(date);
    const end = endOfMonth(date);
    return eachDayOfInterval({ start, end });
  }, [date]);

  return (
    <div className="flex-1 overflow-y-auto">
      <div className="flex items-center justify-between mb-4">
        <button onClick={() => onChange(subMonths(date, 1))} className="p-2 rounded-lg hover:bg-[var(--bg-hover)]">
          ←
        </button>
        <h2 className="font-semibold text-[var(--text-primary)]">{format(date, 'MMMM yyyy')}</h2>
        <button onClick={() => onChange(addMonths(date, 1))} className="p-2 rounded-lg hover:bg-[var(--bg-hover)]">
          →
        </button>
      </div>
      <div className="grid grid-cols-7 gap-2">
        {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map((d) => (
          <div key={d} className="text-center text-xs font-medium text-[var(--text-tertiary)] py-1">
            {d}
          </div>
        ))}
        {days.map((day) => {
          const dayEntries = entries.filter((e) => isSameDay(new Date(e.createdAt), day));
          return (
            <div
              key={day.toISOString()}
              className="min-h-[80px] rounded-lg border border-[var(--border-subtle)] bg-[var(--bg-surface)] p-1.5"
            >
              <p className="text-xs font-medium text-[var(--text-secondary)] mb-1">{getDate(day)}</p>
              <div className="space-y-1">
                {dayEntries.slice(0, 3).map((e) => (
                  <button
                    key={e.id}
                    onClick={() => onSelect(e.id)}
                    className="w-full text-left text-[10px] truncate rounded px-1 py-0.5 bg-[var(--accent-soft)] text-[var(--accent)] hover:bg-[var(--accent)] hover:text-white"
                    title={e.title}
                  >
                    {e.title}
                  </button>
                ))}
                {dayEntries.length > 3 && (
                  <p className="text-[10px] text-[var(--text-tertiary)]">+{dayEntries.length - 3} more</p>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

function StatsView({ stats }: { stats: { total: number; pending: number; answered: number; archived: number; byCategory: { category: string; count: number }[]; byPriority: { priority: string; count: number }[] } }) {
  return (
    <div className="flex-1 overflow-y-auto">
      <div className="grid sm:grid-cols-4 gap-4 mb-6">
        <StatCard label="Total" value={stats.total} />
        <StatCard label="Pending" value={stats.pending} color="text-[var(--accent)]" />
        <StatCard label="Answered" value={stats.answered} color="text-green-500" />
        <StatCard label="Archived" value={stats.archived} color="text-[var(--text-tertiary)]" />
      </div>

      <div className="grid md:grid-cols-2 gap-6">
        <Card className="p-4">
          <h3 className="text-sm font-medium text-[var(--text-primary)] mb-3">By Category</h3>
          <div className="space-y-2">
            {stats.byCategory.map(({ category, count }) => (
              <div key={category} className="flex items-center justify-between text-sm">
                <span className="capitalize text-[var(--text-secondary)]">{category}</span>
                <span className="font-medium text-[var(--text-primary)]">{count}</span>
              </div>
            ))}
          </div>
        </Card>

        <Card className="p-4">
          <h3 className="text-sm font-medium text-[var(--text-primary)] mb-3">By Priority</h3>
          <div className="space-y-2">
            {stats.byPriority.map(({ priority, count }) => (
              <div key={priority} className="flex items-center justify-between text-sm">
                <span className="capitalize text-[var(--text-secondary)]">{priority}</span>
                <span className="font-medium text-[var(--text-primary)]">{count}</span>
              </div>
            ))}
          </div>
        </Card>
      </div>
    </div>
  );
}

function StatCard({ label, value, color }: { label: string; value: number; color?: string }) {
  return (
    <Card className="p-4 text-center">
      <p className={cn('text-2xl font-bold', color ?? 'text-[var(--text-primary)]')}>{value}</p>
      <p className="text-xs text-[var(--text-secondary)] mt-1">{label}</p>
    </Card>
  );
}
