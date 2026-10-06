import { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { Plus, Trash2, Check, Trophy, Flame, BookOpen, Clock, Globe } from 'lucide-react';
import { useReadingPlansStore } from '@/stores/readingPlansStore';
import { useAuthStore } from '@/stores/authStore';
import { Button } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';
import { Progress } from '@/components/ui/Progress';
import { IconButton } from '@/components/ui/IconButton';
import { cn } from '@/utils/cn';

const TEMPLATES = [
  { key: '365-days', label: '365 Days', duration: 365 },
  { key: '90-days', label: '90 Days', duration: 90 },
  { key: '30-days', label: '30 Days', duration: 30 },
  { key: 'chronological', label: 'Chronological', duration: 365 },
  { key: 'new-testament', label: 'New Testament', duration: 60 },
  { key: 'old-testament', label: 'Old Testament', duration: 365 },
];

export function ReadingPlansPage() {
  const { plans, days, progress, loaded, loadAll, createPlan, createCustomPlan, updatePlan, publishPlan, deletePlan, toggleDay, getPlanProgress, getStreak } = useReadingPlansStore();
  const { user } = useAuthStore();
  const userId = user?.id ?? 'local-user';
  const navigate = useNavigate();

  const [activePlanId, setActivePlanId] = useState<string | null>(null);
  const [creating, setCreating] = useState(false);
  const [customName, setCustomName] = useState('');
  const [customText, setCustomText] = useState('');

  useEffect(() => {
    if (!loaded) void loadAll();
  }, [loaded, loadAll]);

  const activePlan = plans.find((p) => p.id === activePlanId);
  const activeDays = useMemo(
    () => days.filter((d) => d.planId === activePlanId).sort((a, b) => a.dayNumber - b.dayNumber),
    [days, activePlanId]
  );
  const activeProgress = useMemo(() => progress.filter((p) => p.planId === activePlanId), [progress, activePlanId]);
  const completedNumbers = useMemo(() => new Set(activeProgress.map((p) => p.dayNumber)), [activeProgress]);

  const stats = useMemo(() => {
    const total = plans.length;
    const completed = progress.length;
    const completedPlans = plans.filter((p) => {
      const pg = getPlanProgress(p.id);
      return pg.percentage === 100;
    }).length;
    return { total, completed, completedPlans, streak: getStreak() };
  }, [plans, progress, getPlanProgress, getStreak]);

  const achievements = useMemo(() => {
    const list = [
      { id: 'first-day', label: 'First Step', desc: 'Complete your first reading day.', unlocked: progress.length >= 1 },
      { id: 'week-streak', label: 'On Fire', desc: '7-day reading streak.', unlocked: getStreak() >= 7 },
      { id: 'month-streak', label: 'Faithful', desc: '30-day reading streak.', unlocked: getStreak() >= 30 },
      { id: 'finish-plan', label: 'Finisher', desc: 'Complete a reading plan.', unlocked: stats.completedPlans >= 1 },
      { id: 'five-plans', label: 'Explorer', desc: 'Start 5 different plans.', unlocked: plans.length >= 5 },
      { id: 'hundred-days', label: 'Centurion', desc: 'Complete 100 reading days.', unlocked: progress.length >= 100 },
    ];
    return list;
  }, [progress.length, getStreak, stats.completedPlans, plans.length]);

  const handleCreate = async (template: string, duration: number) => {
    const plan = await createPlan(userId, template, duration);
    setActivePlanId(plan.id);
  };

  const handleCreateCustom = async () => {
    const lines = customText
      .split('\n')
      .map((l) => l.trim())
      .filter(Boolean);
    const planDays = lines.map((line) => ({ passages: line.split(',').map((p) => p.trim()) }));
    if (!customName.trim() || planDays.length === 0) return;
    const plan = await createCustomPlan(userId, customName.trim(), planDays);
    setActivePlanId(plan.id);
    setCreating(false);
    setCustomName('');
    setCustomText('');
  };

  const todayNumber = useMemo(() => {
    if (!activePlan) return null;
    const today = new Date();
    // If plan was created today, day 1 = today, etc.
    const start = new Date(activePlan.createdAt.slice(0, 10));
    const diff = Math.floor((today.getTime() - start.getTime()) / (1000 * 60 * 60 * 24));
    return Math.max(1, Math.min(diff + 1, activePlan.durationDays));
  }, [activePlan]);

  return (
    <div className="p-4 md:p-8 max-w-5xl mx-auto h-[calc(100vh-4rem)] flex flex-col">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-4">
        <h1 className="text-2xl font-bold text-[var(--text-primary)]">Reading Plans</h1>
        <Button onClick={() => setCreating((s) => !s)}>
          <Plus size={16} /> New Plan
        </Button>
      </div>

      {!activePlan && (
        <div className="flex-1 overflow-y-auto space-y-6">
          {/* Stats */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
            <StatCard label="Plans" value={stats.total} icon={BookOpen} />
            <StatCard label="Days Done" value={stats.completed} icon={Check} />
            <StatCard label="Completed Plans" value={stats.completedPlans} icon={Trophy} />
            <StatCard label="Streak" value={stats.streak} icon={Flame} color="text-orange-500" />
          </div>

          {/* Templates */}
          <section>
            <h2 className="text-sm font-semibold text-[var(--text-secondary)] uppercase tracking-wide mb-3">Start a Plan</h2>
            <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
              {TEMPLATES.map((t) => (
                <Card key={t.key} className="p-4 hover:border-[var(--accent)] transition-colors">
                  <div className="flex items-start justify-between">
                    <div>
                      <p className="font-semibold text-[var(--text-primary)]">{t.label}</p>
                      <p className="text-xs text-[var(--text-tertiary)]">{t.duration} days</p>
                    </div>
                    <Button size="sm" onClick={() => void handleCreate(t.key, t.duration)}>
                      Start
                    </Button>
                  </div>
                </Card>
              ))}
            </div>
          </section>

          {/* Custom */}
          {creating && (
            <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }}>
              <Card className="p-4">
                <h3 className="font-semibold text-[var(--text-primary)] mb-3">Custom Plan</h3>
                <input
                  value={customName}
                  onChange={(e) => setCustomName(e.target.value)}
                  placeholder="Plan name"
                  className="w-full rounded-lg border border-[var(--border-subtle)] bg-[var(--bg-hover)] px-3 py-2 text-sm mb-3 outline-none"
                />
                <textarea
                  value={customText}
                  onChange={(e) => setCustomText(e.target.value)}
                  placeholder="One day per line, e.g. Genesis 1, Psalm 1"
                  rows={6}
                  className="w-full rounded-lg border border-[var(--border-subtle)] bg-[var(--bg-hover)] px-3 py-2 text-sm mb-3 outline-none"
                />
                <div className="flex gap-2">
                  <Button onClick={() => void handleCreateCustom()}>Create Custom Plan</Button>
                  <Button variant="ghost" onClick={() => setCreating(false)}>
                    Cancel
                  </Button>
                </div>
              </Card>
            </motion.div>
          )}

          {/* Active plans */}
          <section>
            <h2 className="text-sm font-semibold text-[var(--text-secondary)] uppercase tracking-wide mb-3">My Plans</h2>
            {plans.length === 0 && <p className="text-sm text-[var(--text-tertiary)]">No plans yet. Start one above.</p>}
            <div className="grid sm:grid-cols-2 gap-4">
              {plans.map((plan) => {
                const pg = getPlanProgress(plan.id);
                return (
                  <Card
                    key={plan.id}
                    className="p-4 cursor-pointer hover:border-[var(--accent)] transition-colors"
                    onClick={() => setActivePlanId(plan.id)}
                  >
                    <div className="flex items-start justify-between gap-2">
                      <div>
                        <p className="font-semibold text-[var(--text-primary)]">{plan.name}</p>
                        <p className="text-xs text-[var(--text-tertiary)] line-clamp-1">{plan.description}</p>
                      </div>
                      {!plan.isSystem && (
                        <IconButton
                          onClick={(e) => {
                            e.stopPropagation();
                            void deletePlan(plan.id);
                          }}
                          aria-label="Delete plan"
                        >
                          <Trash2 size={14} />
                        </IconButton>
                      )}
                    </div>
                    <div className="mt-3">
                      <div className="flex items-center justify-between text-xs mb-1">
                        <span className="text-[var(--text-secondary)]">{pg.completed}/{pg.total} days</span>
                        <span className="font-medium text-[var(--accent)]">{pg.percentage}%</span>
                      </div>
                      <Progress value={pg.percentage} className="h-2" />
                    </div>
                    <div className="mt-3 flex items-center gap-3">
                      {plan.scheduleReminder && (
                        <span className="flex items-center gap-1 text-[10px] text-[var(--text-tertiary)]">
                          <Clock size={10} /> {plan.scheduleReminder}
                        </span>
                      )}
                      {!plan.isSystem && (
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            void publishPlan(plan.id, !plan.isPublic);
                          }}
                          className={cn(
                            'flex items-center gap-1 text-[10px] font-medium',
                            plan.isPublic ? 'text-green-500' : 'text-[var(--text-tertiary)]'
                          )}
                        >
                          <Globe size={10} /> {plan.isPublic ? 'Public' : 'Private'}
                        </button>
                      )}
                    </div>
                  </Card>
                );
              })}
            </div>
          </section>

          {/* Achievements */}
          <section>
            <h2 className="text-sm font-semibold text-[var(--text-secondary)] uppercase tracking-wide mb-3">Achievements</h2>
            <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-3">
              {achievements.map((a) => (
                <div
                  key={a.id}
                  className={cn(
                    'rounded-xl border p-3 transition-colors',
                    a.unlocked ? 'border-[var(--accent)] bg-[var(--accent-soft)]' : 'border-[var(--border-subtle)] bg-[var(--bg-surface)] opacity-60'
                  )}
                >
                  <div className="flex items-center gap-2">
                    <Trophy size={16} className={a.unlocked ? 'text-[var(--accent)]' : 'text-[var(--text-tertiary)]'} />
                    <p className="font-medium text-sm text-[var(--text-primary)]">{a.label}</p>
                  </div>
                  <p className="text-xs text-[var(--text-secondary)] mt-1">{a.desc}</p>
                </div>
              ))}
            </div>
          </section>
        </div>
      )}

      {activePlan && (
        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="flex-1 overflow-y-auto">
          <Button variant="ghost" size="sm" className="mb-3" onClick={() => setActivePlanId(null)}>
            ← Back
          </Button>

          <div className="flex items-start justify-between gap-3 mb-4">
            <div>
              <h2 className="text-xl font-bold text-[var(--text-primary)]">{activePlan.name}</h2>
              <p className="text-sm text-[var(--text-tertiary)]">{activePlan.description}</p>
            </div>
            <div className="text-right">
              <p className="text-2xl font-bold text-[var(--accent)]">{getPlanProgress(activePlan.id).percentage}%</p>
              <p className="text-xs text-[var(--text-tertiary)]">
                {getPlanProgress(activePlan.id).completed}/{activePlan.durationDays} days
              </p>
            </div>
          </div>

          <Progress value={getPlanProgress(activePlan.id).percentage} className="h-3 mb-6" />

          <Card className="p-4 mb-4">
            <h3 className="mb-3 text-sm font-semibold text-[var(--text-primary)]">Plan Settings</h3>
            <div className="grid gap-4 sm:grid-cols-2">
              <div>
                <label className="mb-1 block text-xs font-medium text-[var(--text-secondary)]">Daily reminder time</label>
                <input
                  type="time"
                  value={activePlan.scheduleReminder ?? ''}
                  onChange={(e) => void updatePlan(activePlan.id, { scheduleReminder: e.target.value || null })}
                  className="w-full rounded-lg border border-[var(--border-subtle)] bg-[var(--bg-hover)] px-3 py-2 text-sm text-[var(--text-primary)] outline-none"
                />
              </div>
              {!activePlan.isSystem && (
                <div className="flex items-center justify-between rounded-lg border border-[var(--border-subtle)] bg-[var(--bg-hover)] px-3 py-2">
                  <div className="flex items-center gap-2">
                    <Globe size={16} className="text-[var(--text-secondary)]" />
                    <span className="text-sm text-[var(--text-primary)]">{activePlan.isPublic ? 'Public' : 'Private'}</span>
                  </div>
                  <Button size="sm" variant="secondary" onClick={() => void publishPlan(activePlan.id, !activePlan.isPublic)}>
                    {activePlan.isPublic ? 'Make Private' : 'Publish'}
                  </Button>
                </div>
              )}
            </div>
          </Card>

          {todayNumber && (
            <Card className="p-4 mb-4 bg-[var(--accent-soft)] border-[var(--accent)]/30">
              <div className="flex items-center justify-between">
                <div>
                  <p className="font-medium text-[var(--accent)]">Today&apos;s Reading</p>
                  <p className="text-sm text-[var(--text-secondary)]">Day {todayNumber}</p>
                </div>
                <Button size="sm" onClick={() => void toggleDay(userId, activePlan.id, todayNumber)}>
                  {completedNumbers.has(todayNumber) ? 'Mark Incomplete' : 'Mark Complete'}
                </Button>
              </div>
              <div className="flex flex-wrap gap-2 mt-3">
                {activeDays.find((d) => d.dayNumber === todayNumber)?.passages.map((p) => (
                  <button
                    key={p}
                    onClick={() => navigate(`/read/${passageToUrl(p)}`)}
                    className="text-xs px-2 py-1 rounded-lg bg-[var(--bg-hover)] text-[var(--text-primary)] hover:bg-[var(--accent)] hover:text-white transition-colors"
                  >
                    {p}
                  </button>
                ))}
              </div>
            </Card>
          )}

          <div className="grid sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3">
            {activeDays.map((day) => {
              const done = completedNumbers.has(day.dayNumber);
              return (
                <Card
                  key={day.id}
                  className={cn(
                    'p-3 transition-colors',
                    done ? 'bg-[var(--accent-soft)] border-[var(--accent)]/30' : 'bg-[var(--bg-surface)]'
                  )}
                >
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-sm font-medium text-[var(--text-primary)]">Day {day.dayNumber}</span>
                    <button
                      onClick={() => void toggleDay(userId, activePlan.id, day.dayNumber)}
                      className={cn(
                        'h-5 w-5 rounded border flex items-center justify-center',
                        done ? 'bg-[var(--accent)] border-[var(--accent)] text-white' : 'border-[var(--border-subtle)]'
                      )}
                    >
                      {done && <Check size={12} />}
                    </button>
                  </div>
                  <div className="flex flex-wrap gap-1">
                    {day.passages.map((p) => (
                      <button
                        key={p}
                        onClick={() => navigate(`/read/${passageToUrl(p)}`)}
                        className="text-[10px] px-1.5 py-0.5 rounded bg-[var(--bg-hover)] text-[var(--text-secondary)] hover:bg-[var(--accent)] hover:text-white transition-colors"
                      >
                        {p}
                      </button>
                    ))}
                  </div>
                </Card>
              );
            })}
          </div>
        </motion.div>
      )}
    </div>
  );
}

function StatCard({ label, value, icon: Icon, color }: { label: string; value: number; icon: React.ElementType; color?: string }) {
  return (
    <Card className="p-4 flex items-center gap-3">
      <div className={cn('p-2 rounded-lg bg-[var(--bg-hover)]', color)}>
        <Icon size={20} />
      </div>
      <div>
        <p className={cn('text-xl font-bold', color ?? 'text-[var(--text-primary)]')}>{value}</p>
        <p className="text-xs text-[var(--text-secondary)]">{label}</p>
      </div>
    </Card>
  );
}

function passageToUrl(passage: string) {
  const parts = passage.trim().split(' ');
  if (parts.length < 2) return '';
  const last = parts[parts.length - 1];
  const chapterVerse = last.split(':');
  const chapter = chapterVerse[0];
  const bookName = parts.slice(0, parts.length - 1).join(' ').toLowerCase().replace(/\s+/g, '');
  return `${bookName}/${chapter}`;
}
