import { useEffect, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion, type Variants } from 'framer-motion';
import {
  BookOpen,
  Sun,
  Flame,
  Bell,
  StickyNote,
  Mic,
  Highlighter,
  Calendar as CalendarIcon,
  Plus,
  HandHeart,
  BookText,
  ArrowRight,
} from 'lucide-react';
import { useNotesStore } from '@/stores/notesStore';
import { useSermonsStore } from '@/stores/sermonsStore';
import { usePrayerStore } from '@/stores/prayerStore';
import { useBibleStore } from '@/stores/bibleStore';
import { useReadingPlansStore } from '@/stores/readingPlansStore';
import { useAuthStore } from '@/stores/authStore';
import { Button } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';
import { BarChart, RingChart, SparkLine } from '@/components/charts/SimpleCharts';
import { cn } from '@/utils/cn';
import { format, startOfWeek, addDays, isSameDay, subDays } from 'date-fns';

const TODAYS_VERSES = [
  { reference: 'Philippians 4:13', text: 'I can do all things through Christ who strengthens me.' },
  { reference: 'Psalm 23:1', text: 'The Lord is my shepherd; I shall not want.' },
  { reference: 'Jeremiah 29:11', text: 'For I know the plans I have for you, declares the Lord, plans to prosper you and not to harm you.' },
  { reference: 'Romans 8:28', text: 'And we know that in all things God works for the good of those who love him.' },
  { reference: 'Isaiah 40:31', text: 'But those who hope in the Lord will renew their strength.' },
  { reference: 'Proverbs 3:5-6', text: 'Trust in the Lord with all your heart and lean not on your own understanding.' },
  { reference: 'John 3:16', text: 'For God so loved the world that he gave his one and only Son.' },
];

const container: Variants = {
  hidden: { opacity: 0 },
  show: { opacity: 1, transition: { staggerChildren: 0.06 } },
};

const item: Variants = {
  hidden: { opacity: 0, y: 12 },
  show: { opacity: 1, y: 0 },
};

export function DashboardPage() {
  const navigate = useNavigate();
  const { user } = useAuthStore();
  const { notes, loaded: notesLoaded, loadAll: loadNotes } = useNotesStore();
  const { sermons, loaded: sermonsLoaded, loadAll: loadSermons } = useSermonsStore();
  const { entries: prayers, loaded: prayersLoaded, loadAll: loadPrayers } = usePrayerStore();
  const { highlights, loaded: bibleLoaded, loadAll: loadBible } = useBibleStore();
  const { plans, progress, loaded: plansLoaded, loadAll: loadPlans, getPlanProgress, getStreak } = useReadingPlansStore();

  useEffect(() => {
    if (!notesLoaded) void loadNotes();
    if (!sermonsLoaded) void loadSermons();
    if (!prayersLoaded) void loadPrayers();
    if (!bibleLoaded) void loadBible();
    if (!plansLoaded) void loadPlans();
  }, [notesLoaded, loadNotes, sermonsLoaded, loadSermons, prayersLoaded, loadPrayers, bibleLoaded, loadBible, plansLoaded, loadPlans]);

  const greeting = useMemo(() => {
    const hour = new Date().getHours();
    if (hour < 12) return 'Good morning';
    if (hour < 18) return 'Good afternoon';
    return 'Good evening';
  }, []);

  const todayVerse = useMemo(() => {
    const dayOfYear = Math.floor((Date.now() - new Date(new Date().getFullYear(), 0, 0).getTime()) / (1000 * 60 * 60 * 24));
    return TODAYS_VERSES[dayOfYear % TODAYS_VERSES.length];
  }, []);

  const recentNotes = useMemo(() => notes.slice().sort((a, b) => b.updatedAt.localeCompare(a.updatedAt)).slice(0, 3), [notes]);
  const recentSermons = useMemo(() => sermons.slice().sort((a, b) => b.updatedAt.localeCompare(a.updatedAt)).slice(0, 3), [sermons]);
  const recentHighlights = useMemo(() => highlights.slice().sort((a, b) => b.updatedAt.localeCompare(a.updatedAt)).slice(0, 3), [highlights]);

  const streak = useMemo(() => getStreak(), [getStreak, progress]);

  const activePlan = useMemo(() => plans[0], [plans]);
  const planProgress = useMemo(() => (activePlan ? getPlanProgress(activePlan.id) : null), [activePlan, getPlanProgress, progress]);

  const upcomingPrayer = useMemo(() => {
    const now = new Date().toISOString();
    return prayers
      .filter((p) => p.reminder && p.reminder > now && p.status !== 'answered')
      .sort((a, b) => (a.reminder ?? '').localeCompare(b.reminder ?? ''))[0];
  }, [prayers]);

  const activity = useMemo(() => {
    const today = new Date();
    const counts: Record<string, number> = {};
    for (let i = 6; i >= 0; i--) {
      const d = format(subDays(today, i), 'EEE');
      counts[d] = 0;
    }
    for (const p of progress) {
      const d = format(new Date(p.completedAt), 'EEE');
      if (counts[d] !== undefined) counts[d]++;
    }
    return Object.entries(counts).map(([label, value]) => ({ label, value }));
  }, [progress]);

  const calendarDays = useMemo(() => {
    const start = startOfWeek(new Date(), { weekStartsOn: 0 });
    return Array.from({ length: 7 }, (_, i) => addDays(start, i));
  }, []);

  return (
    <div className="p-4 md:p-8 max-w-7xl mx-auto h-[calc(100vh-4rem)] overflow-y-auto">
      <motion.div variants={container} initial="hidden" animate="show" className="space-y-6">
        {/* Header */}
        <motion.div variants={item} className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
          <div>
            <h1 className="text-2xl md:text-3xl font-bold text-[var(--text-primary)]">
              {greeting}, {user?.email?.split('@')[0] || 'Friend'}
            </h1>
            <p className="text-sm text-[var(--text-tertiary)]">{format(new Date(), 'EEEE, MMMM d, yyyy')}</p>
          </div>
          <div className="flex gap-2">
            <Button variant="secondary" size="sm" onClick={() => navigate('/read/genesis/1')}>
              <BookOpen size={14} /> Read
            </Button>
            <Button size="sm" onClick={() => navigate('/notes')}>
              <Plus size={14} /> Note
            </Button>
          </div>
        </motion.div>

        {/* Top cards */}
        <div className="grid lg:grid-cols-3 gap-4">
          <motion.div variants={item}>
            <Card className="h-full p-5 bg-gradient-to-br from-[var(--accent)] to-[var(--accent)]/80 text-white border-none">
              <div className="flex items-start justify-between">
                <div>
                  <p className="text-white/80 text-sm font-medium">Continue Reading</p>
                  <h2 className="text-xl font-bold mt-1">Genesis 1</h2>
                  <p className="text-white/80 text-sm mt-1">In the beginning, God created the heavens and the earth.</p>
                </div>
                <BookOpen size={28} className="text-white/80" />
              </div>
              <Button
                variant="secondary"
                size="sm"
                className="mt-4 bg-white text-[var(--accent)] hover:bg-white/90"
                onClick={() => navigate('/read/genesis/1')}
              >
                Continue <ArrowRight size={14} />
              </Button>
            </Card>
          </motion.div>

          <motion.div variants={item}>
            <Card className="h-full p-5">
              <div className="flex items-start justify-between mb-3">
                <p className="text-sm font-medium text-[var(--text-secondary)]">Today&apos;s Verse</p>
                <Sun size={18} className="text-yellow-500" />
              </div>
              <p className="text-lg font-semibold text-[var(--text-primary)] leading-snug">{todayVerse.text}</p>
              <p className="text-sm text-[var(--accent)] mt-2">{todayVerse.reference}</p>
            </Card>
          </motion.div>

          <motion.div variants={item}>
            <Card className="h-full p-5">
              <div className="flex items-start justify-between mb-3">
                <p className="text-sm font-medium text-[var(--text-secondary)]">Prayer Reminder</p>
                <Bell size={18} className="text-[var(--accent)]" />
              </div>
              {upcomingPrayer ? (
                <>
                  <p className="font-semibold text-[var(--text-primary)] truncate">{upcomingPrayer.title}</p>
                  <p className="text-sm text-[var(--text-tertiary)] mt-1">
                    {format(new Date(upcomingPrayer.reminder!), 'MMM d, h:mm a')}
                  </p>
                </>
              ) : (
                <p className="text-sm text-[var(--text-tertiary)]">No upcoming reminders.</p>
              )}
              <Button variant="ghost" size="sm" className="mt-3 px-0" onClick={() => navigate('/prayer')}>
                View prayers <ArrowRight size={14} />
              </Button>
            </Card>
          </motion.div>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <StatCard variants={item} label="Reading Streak" value={streak} unit="days" icon={Flame} color="text-orange-500" />
          <StatCard variants={item} label="Notes" value={notes.length} icon={StickyNote} />
          <StatCard variants={item} label="Sermons" value={sermons.length} icon={Mic} />
          <StatCard variants={item} label="Highlights" value={highlights.length} icon={Highlighter} />
        </div>

        {/* Middle section */}
        <div className="grid lg:grid-cols-3 gap-4">
          {/* Reading progress */}
          <motion.div variants={item} className="lg:col-span-2">
            <Card className="p-5 h-full">
              <div className="flex items-center justify-between mb-4">
                <p className="font-semibold text-[var(--text-primary)]">Reading Progress</p>
                {activePlan && (
                  <span className="text-xs text-[var(--text-secondary)]">
                    {activePlan.name} · {planProgress?.percentage ?? 0}%
                  </span>
                )}
              </div>
              <div className="flex flex-col sm:flex-row items-center gap-6">
                {activePlan && planProgress ? (
                  <>
                    <RingChart value={planProgress.percentage} size={120} stroke={12} />
                    <div className="flex-1 w-full">
                      <p className="text-sm text-[var(--text-secondary)] mb-2">Last 7 days</p>
                      <BarChart data={activity} />
                    </div>
                  </>
                ) : (
                  <div className="text-center w-full py-8 text-[var(--text-tertiary)]">
                    <p>No active reading plan.</p>
                    <Button size="sm" className="mt-3" onClick={() => navigate('/reading-plans')}>
                      Start a Plan
                    </Button>
                  </div>
                )}
              </div>
            </Card>
          </motion.div>

          {/* Calendar */}
          <motion.div variants={item}>
            <Card className="p-5 h-full">
              <div className="flex items-center gap-2 mb-4">
                <CalendarIcon size={18} className="text-[var(--accent)]" />
                <p className="font-semibold text-[var(--text-primary)]">This Week</p>
              </div>
              <div className="grid grid-cols-7 gap-1 text-center">
                {calendarDays.map((day) => {
                  const done = progress.some((p) => isSameDay(new Date(p.completedAt), day));
                  return (
                    <div key={day.toISOString()} className="flex flex-col items-center gap-1">
                      <span className="text-[10px] text-[var(--text-tertiary)]">{format(day, 'EEE')[0]}</span>
                      <div
                        className={cn(
                          'h-8 w-8 rounded-full flex items-center justify-center text-xs',
                          done ? 'bg-[var(--accent)] text-white' : 'bg-[var(--bg-hover)] text-[var(--text-secondary)]',
                          isSameDay(day, new Date()) && 'ring-2 ring-[var(--accent)]'
                        )}
                      >
                        {getDate(day)}
                      </div>
                    </div>
                  );
                })}
              </div>
              <div className="mt-4 h-16">
                <SparkLine data={activity.map((a) => a.value)} />
              </div>
            </Card>
          </motion.div>
        </div>

        {/* Recent lists */}
        <div className="grid md:grid-cols-3 gap-4">
          <RecentList variants={item} title="Recent Notes" icon={StickyNote} items={recentNotes} onClick={() => navigate('/notes')} getLabel={(n) => n.title} getSub={(n) => format(new Date(n.updatedAt), 'MMM d')} />
          <RecentList variants={item} title="Recent Sermons" icon={Mic} items={recentSermons} onClick={() => navigate('/sermons')} getLabel={(s) => s.title} getSub={(s) => s.speaker ?? 'No speaker'} />
          <RecentList variants={item} title="Recent Highlights" icon={Highlighter} items={recentHighlights} onClick={() => navigate('/highlights')} getLabel={(h) => `${h.bookId} ${h.chapter}:${h.verse}`} getSub={(h) => h.color} />
        </div>

        {/* Quick actions */}
        <motion.div variants={item}>
          <Card className="p-5">
            <p className="font-semibold text-[var(--text-primary)] mb-3">Quick Actions</p>
            <div className="flex flex-wrap gap-2">
              <Button variant="secondary" size="sm" onClick={() => navigate('/notes')}><StickyNote size={14} /> New Note</Button>
              <Button variant="secondary" size="sm" onClick={() => navigate('/sermons')}><Mic size={14} /> New Sermon</Button>
              <Button variant="secondary" size="sm" onClick={() => navigate('/prayer')}><HandHeart size={14} /> New Prayer</Button>
              <Button variant="secondary" size="sm" onClick={() => navigate('/journal')}><BookText size={14} /> Journal Entry</Button>
              <Button variant="secondary" size="sm" onClick={() => navigate('/reading-plans')}><BookOpen size={14} /> Reading Plan</Button>
            </div>
          </Card>
        </motion.div>
      </motion.div>
    </div>
  );
}

function StatCard({
  variants,
  label,
  value,
  unit,
  icon: Icon,
  color,
}: {
  variants: Variants;
  label: string;
  value: number;
  unit?: string;
  icon: React.ElementType;
  color?: string;
}) {
  return (
    <motion.div variants={variants}>
      <Card className="p-4 flex items-center gap-3">
        <div className={cn('p-2.5 rounded-xl bg-[var(--bg-hover)]', color)}>
          <Icon size={20} />
        </div>
        <div>
          <p className={cn('text-2xl font-bold', color ?? 'text-[var(--text-primary)]')}>{value}</p>
          <p className="text-xs text-[var(--text-secondary)]">{label}{unit ? ` (${unit})` : ''}</p>
        </div>
      </Card>
    </motion.div>
  );
}

function RecentList<T>({
  variants,
  title,
  icon: Icon,
  items,
  onClick,
  getLabel,
  getSub,
}: {
  variants: Variants;
  title: string;
  icon: React.ElementType;
  items: T[];
  onClick: (item: T) => void;
  getLabel: (item: T) => string;
  getSub: (item: T) => string;
}) {
  return (
    <motion.div variants={variants}>
      <Card className="p-4 h-full">
        <div className="flex items-center gap-2 mb-3">
          <Icon size={16} className="text-[var(--accent)]" />
          <p className="font-semibold text-[var(--text-primary)]">{title}</p>
        </div>
        <div className="space-y-2">
          {items.length === 0 && <p className="text-sm text-[var(--text-tertiary)]">No items yet.</p>}
          {items.map((item) => (
            <button
              key={getLabel(item)}
              onClick={() => onClick(item)}
              className="w-full text-left rounded-lg p-2.5 bg-[var(--bg-hover)] hover:bg-[var(--accent-soft)] transition-colors"
            >
              <p className="text-sm font-medium text-[var(--text-primary)] truncate">{getLabel(item)}</p>
              <p className="text-xs text-[var(--text-tertiary)]">{getSub(item)}</p>
            </button>
          ))}
        </div>
      </Card>
    </motion.div>
  );
}

function getDate(day: Date) {
  return day.getDate();
}
