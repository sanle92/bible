import { create } from 'zustand';
import type { ReadingPlan, ReadingPlanDay, ReadingProgress } from '@/types/readingPlan';
import { getAllRecords, putRecord, deleteRecord, enqueueSync } from '@/services/db';
import { flushSyncQueue } from '@/services/syncService';
import { generateReadingPlan } from '@/utils/readingPlanGenerators';

interface ReadingPlansState {
  plans: ReadingPlan[];
  days: ReadingPlanDay[];
  progress: ReadingProgress[];
  loaded: boolean;
  loadAll: () => Promise<void>;
  createPlan: (userId: string, template: string, durationDays: number) => Promise<ReadingPlan>;
  createCustomPlan: (userId: string, name: string, days: { passages: string[]; title?: string }[]) => Promise<ReadingPlan>;
  updatePlan: (id: string, updates: Partial<ReadingPlan>) => Promise<void>;
  publishPlan: (id: string, isPublic: boolean) => Promise<void>;
  deletePlan: (id: string) => Promise<void>;
  toggleDay: (userId: string, planId: string, dayNumber: number) => Promise<void>;
  getPlanProgress: (planId: string) => { completed: number; total: number; percentage: number };
  getStreak: () => number;
}

function genId() {
  return crypto.randomUUID();
}

const SYSTEM_PLAN_TEMPLATES: { template: string; durationDays: number; tags: string[] }[] = [
  { template: '365-days', durationDays: 365, tags: ['whole bible', 'year'] },
  { template: '90-days', durationDays: 90, tags: ['whole bible', 'intensive'] },
  { template: '30-days', durationDays: 30, tags: ['selected', 'beginner'] },
  { template: 'chronological', durationDays: 365, tags: ['whole bible', 'chronological'] },
  { template: 'new-testament', durationDays: 60, tags: ['new testament'] },
  { template: 'old-testament', durationDays: 365, tags: ['old testament'] },
];

export const useReadingPlansStore = create<ReadingPlansState>((set, get) => ({
  plans: [],
  days: [],
  progress: [],
  loaded: false,
  loadAll: async () => {
    const [plans, days, progress] = await Promise.all([
      getAllRecords<ReadingPlan>('readingPlans'),
      getAllRecords<ReadingPlanDay>('readingPlanDays'),
      getAllRecords<ReadingProgress>('readingProgress'),
    ]);
    const filteredPlans = plans.filter((p) => !p.deleted);
    set({ plans: filteredPlans, days: days.filter((d) => !d.deleted), progress: progress.filter((p) => !p.deleted), loaded: true });

    // Seed system plans once
    if (filteredPlans.length === 0) {
      for (const t of SYSTEM_PLAN_TEMPLATES) {
        await get().createPlan('system', t.template, t.durationDays);
      }
    }
  },
  createPlan: async (userId, template, durationDays) => {
    const now = new Date().toISOString();
    const generated = generateReadingPlan(template, durationDays);
    const plan: ReadingPlan = {
      id: genId(),
      userId,
      name: generated.name,
      description: generated.description,
      durationDays: generated.days.length,
      isPublic: userId === 'system',
      isSystem: userId === 'system',
      tags: SYSTEM_PLAN_TEMPLATES.find((t) => t.template === template)?.tags ?? [],
      createdAt: now,
      updatedAt: now,
    };
    const planDays: ReadingPlanDay[] = generated.days.map((d, i) => ({
      id: genId(),
      planId: plan.id,
      dayNumber: i + 1,
      passages: d.passages,
      title: d.title,
      createdAt: now,
      updatedAt: now,
    }));

    await putRecord('readingPlans', plan);
    for (const day of planDays) await putRecord('readingPlanDays', day);
    await enqueueSync({ id: genId(), table: 'reading_plans', op: 'upsert', payload: plan, createdAt: now });
    for (const day of planDays) {
      await enqueueSync({ id: genId(), table: 'reading_plan_days', op: 'upsert', payload: day, createdAt: now });
    }

    set({ plans: [plan, ...get().plans], days: [...planDays, ...get().days] });
    void flushSyncQueue();
    return plan;
  },
  createCustomPlan: async (userId, name, planDays) => {
    const now = new Date().toISOString();
    const plan: ReadingPlan = {
      id: genId(),
      userId,
      name,
      description: 'Custom reading plan',
      durationDays: planDays.length,
      isPublic: false,
      isSystem: false,
      tags: ['custom'],
      createdAt: now,
      updatedAt: now,
    };
    const days: ReadingPlanDay[] = planDays.map((d, i) => ({
      id: genId(),
      planId: plan.id,
      dayNumber: i + 1,
      passages: d.passages,
      title: d.title,
      createdAt: now,
      updatedAt: now,
    }));
    await putRecord('readingPlans', plan);
    for (const day of days) await putRecord('readingPlanDays', day);
    await enqueueSync({ id: genId(), table: 'reading_plans', op: 'upsert', payload: plan, createdAt: now });
    for (const day of days) {
      await enqueueSync({ id: genId(), table: 'reading_plan_days', op: 'upsert', payload: day, createdAt: now });
    }
    set({ plans: [plan, ...get().plans], days: [...days, ...get().days] });
    void flushSyncQueue();
    return plan;
  },
  updatePlan: async (id, updates) => {
    const existing = get().plans.find((p) => p.id === id);
    if (!existing) return;
    const now = new Date().toISOString();
    const updated: ReadingPlan = { ...existing, ...updates, updatedAt: now };
    await putRecord('readingPlans', updated);
    await enqueueSync({ id: genId(), table: 'reading_plans', op: 'upsert', payload: updated, createdAt: now });
    set({ plans: get().plans.map((p) => (p.id === id ? updated : p)) });
    void flushSyncQueue();
  },
  publishPlan: async (id, isPublic) => {
    await get().updatePlan(id, { isPublic });
  },
  deletePlan: async (id) => {
    await deleteRecord('readingPlans', id);
    await enqueueSync({ id: genId(), table: 'reading_plans', op: 'delete', payload: { id }, createdAt: new Date().toISOString() });
    set({ plans: get().plans.filter((p) => p.id !== id) });
    void flushSyncQueue();
  },
  toggleDay: async (userId, planId, dayNumber) => {
    const existing = get().progress.find((p) => p.planId === planId && p.dayNumber === dayNumber);
    if (existing) {
      await deleteRecord('readingProgress', existing.id);
      await enqueueSync({ id: genId(), table: 'reading_progress', op: 'delete', payload: { id: existing.id }, createdAt: new Date().toISOString() });
      set({ progress: get().progress.filter((p) => p.id !== existing.id) });
    } else {
      const now = new Date().toISOString();
      const record: ReadingProgress = { id: genId(), userId, planId, dayNumber, completedAt: now, createdAt: now, updatedAt: now };
      await putRecord('readingProgress', record);
      await enqueueSync({ id: genId(), table: 'reading_progress', op: 'upsert', payload: record, createdAt: now });
      set({ progress: [...get().progress, record] });
    }
    void flushSyncQueue();
  },
  getPlanProgress: (planId) => {
    const total = get().days.filter((d) => d.planId === planId).length;
    const completed = get().progress.filter((p) => p.planId === planId).length;
    return { completed, total, percentage: total ? Math.round((completed / total) * 100) : 0 };
  },
  getStreak: () => {
    const dates = get().progress.map((p) => p.completedAt.slice(0, 10));
    if (dates.length === 0) return 0;
    const unique = Array.from(new Set(dates)).sort((a, b) => b.localeCompare(a));
    const today = new Date().toISOString().slice(0, 10);
    let streak = 0;
    let cursor = new Date(today);
    // allow yesterday if nothing today
    if (unique[0] !== today) {
      cursor.setDate(cursor.getDate() - 1);
    }
    for (const d of unique) {
      const cursorStr = cursor.toISOString().slice(0, 10);
      if (d === cursorStr) {
        streak++;
        cursor.setDate(cursor.getDate() - 1);
      } else if (new Date(d).getTime() > cursor.getTime()) {
        continue;
      } else {
        break;
      }
    }
    return streak;
  },
}));
