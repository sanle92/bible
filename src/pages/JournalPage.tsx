import { useEffect, useMemo, useRef, useState } from 'react';
import { motion } from 'framer-motion';
import {
  Plus,
  Trash2,
  Search,
  Calendar as CalendarIcon,
  List,
  Mic,
  Image as ImageIcon,
  X,
  FileDown,
  Lock,
  Unlock,
  Tag,
} from 'lucide-react';
import { useJournalStore, JOURNAL_MOODS } from '@/stores/journalStore';
import { useAuthStore } from '@/stores/authStore';
import { useToast } from '@/hooks/useToast';
import { RichTextEditor } from '@/components/editor/RichTextEditor';
import { ThemePicker } from '@/components/themes/ThemePicker';
import { Button } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';
import { IconButton } from '@/components/ui/IconButton';
import { format, startOfMonth, endOfMonth, eachDayOfInterval, isSameDay, getDate, subMonths, addMonths, parseISO } from 'date-fns';
import { cn } from '@/utils/cn';
import type { JournalEntry, JournalMood } from '@/types/journal';

const MOODS: JournalMood[] = ['joyful', 'grateful', 'peaceful', 'hopeful', 'neutral', 'anxious', 'sad', 'angry'];

export function JournalPage() {
  const { entries, loaded, loadAll, upsertEntry, deleteEntry, searchEntries } = useJournalStore();
  const { user } = useAuthStore();
  const { showToast } = useToast();
  const userId = user?.id ?? 'local-user';

  const [activeId, setActiveId] = useState<string | null>(null);
  const [view, setView] = useState<'list' | 'calendar' | 'timeline'>('list');
  const [query, setQuery] = useState('');
  const [moodFilter, setMoodFilter] = useState<JournalMood | 'all'>('all');
  const [calendarDate, setCalendarDate] = useState(new Date());
  const [recording, setRecording] = useState(false);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (!loaded) void loadAll();
  }, [loaded, loadAll]);

  const active = entries.find((e) => e.id === activeId);
  const results = useMemo(() => {
    let list = searchEntries(query);
    if (moodFilter !== 'all') list = list.filter((e) => e.mood === moodFilter);
    return list.slice().sort((a, b) => b.date.localeCompare(a.date));
  }, [searchEntries, query, moodFilter, entries]);

  const handleNew = async () => {
    const entry = await upsertEntry({
      userId,
      title: 'Journal Entry',
      reflection: '',
      date: new Date().toISOString().slice(0, 10),
    });
    setActiveId(entry.id);
  };

  const update = async (updates: Partial<JournalEntry>) => {
    if (!active) return;
    await upsertEntry({ ...active, ...updates });
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

  const handleExport = () => {
    if (!active) return;
    const w = window.open('', '_blank');
    if (!w) return;
    w.document.write(`
      <html>
        <head><title>${active.title}</title>
        <style>
          body { font-family: system-ui, sans-serif; line-height: 1.6; padding: 2rem; color: #1c1c1e; }
          h1 { font-size: 1.75rem; margin-bottom: 0.25rem; }
          .meta { color: #6b6b6b; margin-bottom: 1rem; }
          h2 { font-size: 1rem; margin-top: 1.25rem; margin-bottom: 0.4rem; color: #9333ea; }
          .field { margin-bottom: 0.75rem; }
        </style></head>
        <body>
          <h1>${active.title}</h1>
          <p class="meta">${format(new Date(active.date), 'MMMM d, yyyy')} · ${active.mood ?? ''} · ${active.scripture ?? ''}</p>
          ${fieldHtml('Reflection', active.reflection)}
          ${fieldHtml('Application', active.application)}
          ${fieldHtml('Prayer', active.prayer)}
          ${fieldHtml('Tags', active.tags.join(', '))}
        </body>
      </html>
    `);
    w.document.close();
    w.focus();
    setTimeout(() => w.print(), 250);
    showToast('Export dialog opened', 'success');
  };

  return (
    <div className="p-4 md:p-8 max-w-6xl mx-auto h-[calc(100vh-4rem)] flex flex-col">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-4">
        <h1 className="text-2xl font-bold text-[var(--text-primary)]">Christian Journal</h1>
        <div className="flex items-center gap-2">
          <div className="flex bg-[var(--bg-hover)] rounded-lg p-1">
            <ViewTab active={view === 'list'} onClick={() => setView('list')} icon={List} label="List" />
            <ViewTab active={view === 'calendar'} onClick={() => setView('calendar')} icon={CalendarIcon} label="Calendar" />
            <ViewTab active={view === 'timeline'} onClick={() => setView('timeline')} icon={Tag} label="Timeline" />
          </div>
          <Button onClick={() => void handleNew()}>
            <Plus size={16} /> New
          </Button>
        </div>
      </div>

      {!active && view === 'list' && (
        <div className="flex-1 overflow-y-auto">
          <div className="flex flex-wrap items-center gap-2 mb-4">
            <div className="flex items-center gap-2 rounded-lg border border-[var(--border-subtle)] bg-[var(--bg-hover)] px-3 py-2 max-w-sm">
              <Search size={16} className="text-[var(--text-tertiary)]" />
              <input
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder="Search journal..."
                className="bg-transparent outline-none text-sm w-full placeholder:text-[var(--text-tertiary)]"
              />
            </div>
            <select
              value={moodFilter}
              onChange={(e) => setMoodFilter(e.target.value as JournalMood | 'all')}
              className="rounded-lg border border-[var(--border-subtle)] bg-[var(--bg-hover)] px-3 py-2 text-sm outline-none text-[var(--text-primary)]"
            >
              <option value="all">Mood: All</option>
              {MOODS.map((m) => (
                <option key={m} value={m}>
                  {m}
                </option>
              ))}
            </select>
          </div>

          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {results.length === 0 && (
              <p className="text-sm text-[var(--text-tertiary)] col-span-full text-center py-10">
                {query || moodFilter !== 'all' ? 'No entries match.' : 'No journal entries yet.'}
              </p>
            )}
            {results.map((entry) => (
              <Card
                key={entry.id}
                className="p-4 cursor-pointer hover:border-[var(--accent)] transition-colors"
                onClick={() => setActiveId(entry.id)}
              >
                <div className="flex items-start justify-between gap-2">
                  <p className="font-semibold text-[var(--text-primary)] truncate">{entry.title}</p>
                  {entry.isPrivate && <Lock size={14} className="text-[var(--text-tertiary)]" />}
                </div>
                <div className="flex items-center gap-2 mt-1">
                  <span className="text-xs text-[var(--text-secondary)]">{format(new Date(entry.date), 'MMM d, yyyy')}</span>
                  {entry.mood && <MoodBadge mood={entry.mood} />}
                </div>
                {entry.scripture && (
                  <p className="text-xs text-[var(--accent)] mt-1 truncate">{entry.scripture}</p>
                )}
                <p className="text-xs text-[var(--text-tertiary)] mt-2 line-clamp-2" dangerouslySetInnerHTML={{ __html: entry.reflection }} />
              </Card>
            ))}
          </div>
        </div>
      )}

      {!active && view === 'calendar' && (
        <CalendarView date={calendarDate} onChange={setCalendarDate} entries={entries} onSelect={(id) => setActiveId(id)} />
      )}

      {!active && view === 'timeline' && <TimelineView entries={entries} onSelect={(id) => setActiveId(id)} />}

      {active && (
        <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} className="flex-1 overflow-y-auto">
          <Button variant="ghost" size="sm" className="self-start mb-3" onClick={() => setActiveId(null)}>
            ← Back
          </Button>

          <div className="flex items-center justify-between gap-3 mb-4">
            <input
              value={active.title}
              onChange={(e) => void update({ title: e.target.value })}
              className="text-2xl font-bold bg-transparent outline-none flex-1 text-[var(--text-primary)]"
              placeholder="Journal title"
            />
            <IconButton onClick={() => void handleExport()} aria-label="Export">
              <FileDown size={18} />
            </IconButton>
            <IconButton
              onClick={() => void update({ isPrivate: !active.isPrivate })}
              aria-label="Toggle private"
              className={active.isPrivate ? 'text-[var(--accent)]' : 'text-[var(--text-tertiary)]'}
            >
              {active.isPrivate ? <Lock size={18} /> : <Unlock size={18} />}
            </IconButton>
            <Button variant="danger" size="sm" onClick={() => void deleteEntry(active.id).then(() => setActiveId(null))}>
              <Trash2 size={14} />
            </Button>
          </div>

          <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-3 mb-4">
            <div className="flex items-center gap-2 rounded-lg border border-[var(--border-subtle)] bg-[var(--bg-hover)] px-3 py-2">
              <CalendarIcon size={14} className="text-[var(--text-tertiary)]" />
              <input
                type="date"
                value={active.date}
                onChange={(e) => void update({ date: e.target.value })}
                className="bg-transparent outline-none text-sm w-full text-[var(--text-primary)]"
              />
            </div>
            <input
              value={active.scripture ?? ''}
              onChange={(e) => void update({ scripture: e.target.value })}
              placeholder="Scripture reference"
              className="rounded-lg border border-[var(--border-subtle)] bg-[var(--bg-hover)] px-3 py-2 text-sm outline-none text-[var(--text-primary)]"
            />
            <div className="flex items-center gap-2 rounded-lg border border-[var(--border-subtle)] bg-[var(--bg-hover)] px-3 py-2 sm:col-span-2">
              <Tag size={14} className="text-[var(--text-tertiary)]" />
              <input
                value={active.tags?.join(', ') ?? ''}
                onChange={(e) => void update({ tags: e.target.value.split(',').map((t) => t.trim()).filter(Boolean) })}
                placeholder="Tags (comma separated)"
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
            <div className="flex items-center gap-1 bg-[var(--bg-hover)] rounded-lg p-1">
              {JOURNAL_MOODS.map((m) => (
                <button
                  key={m.value}
                  onClick={() => void update({ mood: active.mood === m.value ? undefined : m.value })}
                  className={cn(
                    'px-2 py-1 rounded-md text-xs transition-colors',
                    active.mood === m.value ? 'bg-[var(--accent)] text-white' : 'text-[var(--text-secondary)] hover:bg-[var(--bg-hover)]'
                  )}
                  title={m.label}
                >
                  {m.emoji}
                </button>
              ))}
            </div>
          </div>

          <div className="space-y-4 mb-4">
            <EditorBlock label="Reflection" content={active.reflection} onChange={(html) => void update({ reflection: html })} />
            <EditorBlock label="Application" content={active.application ?? ''} onChange={(html) => void update({ application: html })} />
            <EditorBlock label="Prayer" content={active.prayer ?? ''} onChange={(html) => void update({ prayer: html })} />
          </div>

          <div className="grid sm:grid-cols-2 gap-4 mb-6">
            <Card className="p-3">
              <div className="flex items-center justify-between mb-2">
                <h3 className="text-sm font-medium text-[var(--text-primary)]">Pictures</h3>
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
                <IconButton onClick={() => fileInputRef.current?.click()} aria-label="Add picture">
                  <ImageIcon size={16} />
                </IconButton>
              </div>
              {active.images && active.images.length > 0 ? (
                <div className="flex flex-wrap gap-2">
                  {active.images.map((img, idx) => (
                    <div key={idx} className="relative">
                      <img src={img} alt="" className="h-16 w-16 object-cover rounded-lg" />
                      <button onClick={() => removeImage(idx)} className="absolute -top-1 -right-1 rounded-full bg-red-500 text-white p-0.5">
                        <X size={10} />
                      </button>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-xs text-[var(--text-tertiary)]">No pictures.</p>
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
              {active.voiceNote ? <audio controls src={active.voiceNote} className="w-full" /> : <p className="text-xs text-[var(--text-tertiary)]">No voice note.</p>}
            </Card>
          </div>
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

function MoodBadge({ mood }: { mood: JournalMood }) {
  const m = JOURNAL_MOODS.find((x) => x.value === mood);
  if (!m) return null;
  return (
    <span className="text-xs bg-[var(--bg-hover)] text-[var(--text-secondary)] px-1.5 py-0.5 rounded">
      {m.emoji} {m.label}
    </span>
  );
}

function EditorBlock({ label, content, onChange }: { label: string; content: string; onChange: (html: string) => void }) {
  return (
    <div>
      <h3 className="text-sm font-medium text-[var(--text-secondary)] mb-2">{label}</h3>
      <RichTextEditor content={content} onChange={onChange} placeholder={`Write ${label.toLowerCase()}...`} className="min-h-[120px]" />
    </div>
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
  entries: JournalEntry[];
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
          const dayEntries = entries.filter((e) => isSameDay(parseISO(e.date), day));
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
                {dayEntries.length > 3 && <p className="text-[10px] text-[var(--text-tertiary)]">+{dayEntries.length - 3} more</p>}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

function TimelineView({ entries, onSelect }: { entries: JournalEntry[]; onSelect: (id: string) => void }) {
  const sorted = useMemo(() => entries.slice().sort((a, b) => b.date.localeCompare(a.date)), [entries]);
  return (
    <div className="flex-1 overflow-y-auto">
      <div className="relative border-l border-[var(--border-subtle)] ml-3 space-y-6 pl-6 py-2">
        {sorted.map((entry) => (
          <button
            key={entry.id}
            onClick={() => onSelect(entry.id)}
            className="relative block w-full text-left"
          >
            <span className="absolute -left-[31px] top-1 h-3 w-3 rounded-full bg-[var(--accent)] border-2 border-[var(--bg-app)]" />
            <Card className="p-4 hover:border-[var(--accent)] transition-colors">
              <div className="flex items-center gap-2 mb-1">
                <span className="text-xs font-medium text-[var(--text-secondary)]">{format(new Date(entry.date), 'MMMM d, yyyy')}</span>
                {entry.mood && <MoodBadge mood={entry.mood} />}
              </div>
              <p className="font-semibold text-[var(--text-primary)]">{entry.title}</p>
              {entry.scripture && <p className="text-xs text-[var(--accent)] mt-1">{entry.scripture}</p>}
              <p className="text-xs text-[var(--text-tertiary)] mt-1 line-clamp-2" dangerouslySetInnerHTML={{ __html: entry.reflection }} />
            </Card>
          </button>
        ))}
        {sorted.length === 0 && <p className="text-sm text-[var(--text-tertiary)]">No journal entries yet.</p>}
      </div>
    </div>
  );
}

function fieldHtml(label: string, value?: string | null) {
  if (!value) return '';
  return `<div class="field"><h2>${label}</h2><div>${value}</div></div>`;
}
