import { supabase, isSupabaseConfigured } from '@/services/supabaseClient';
import { getSyncQueue, clearSyncItem, updateSyncItem, type SyncQueueItem } from '@/services/db';

type SyncStatus = 'idle' | 'syncing' | 'error' | 'offline';

export interface SyncState {
  status: SyncStatus;
  queueCount: number;
  lastSyncAt?: string;
  message?: string;
}

const MAX_ATTEMPTS = 5;
const RETRY_DELAYS_MS = [5_000, 15_000, 60_000, 300_000, 900_000];

let syncing = false;
const listeners = new Set<(state: SyncState) => void>();
let currentState: SyncState = { status: 'idle', queueCount: 0 };

function emit(state: Partial<SyncState>) {
  currentState = { ...currentState, ...state };
  listeners.forEach((fn) => fn(currentState));
}

export function subscribeSyncStatus(fn: (state: SyncState) => void) {
  listeners.add(fn);
  fn(currentState);
  return () => {
    listeners.delete(fn);
  };
}

export function getSyncState() {
  return currentState;
}

function toSnakeCase(value: string) {
  return value.replace(/([A-Z])/g, '_$1').toLowerCase();
}

function toSnakeCasePayload(payload: Record<string, unknown>): Record<string, unknown> {
  const result: Record<string, unknown> = {};
  for (const [key, val] of Object.entries(payload)) {
    if (key === 'synced' || key === 'deleted') continue;
    result[toSnakeCase(key)] = val;
  }
  return result;
}

function getSupabaseTableName(queueTable: string): string {
  const map: Record<string, string> = {
    prayers: 'prayer_requests',
    verseNotes: 'verse_notes',
    readingPlanDays: 'reading_plan_days',
    readingProgress: 'reading_progress',
  };
  return map[queueTable] ?? toSnakeCase(queueTable);
}

function getRecordId(payload: unknown): string | undefined {
  return (payload as { id?: string })?.id;
}

async function resolveConflict(item: SyncQueueItem): Promise<boolean> {
  // Last-write-wins based on updated_at timestamps.
  const payload = item.payload as Record<string, unknown>;
  const id = getRecordId(payload);
  if (!id || item.op !== 'upsert') return true;

  const table = getSupabaseTableName(item.table);
  const { data, error } = await supabase.from(table).select('updated_at').eq('id', id).maybeSingle();
  if (error) throw error;
  if (!data?.updated_at) return true; // server has no record; push ours

  const clientUpdatedAt = payload.updatedAt ? new Date(payload.updatedAt as string) : null;
  const serverUpdatedAt = new Date(data.updated_at as string);
  if (!clientUpdatedAt) return true;

  // If server is newer and not deleted, we lose this conflict and drop the item.
  if (serverUpdatedAt.getTime() > clientUpdatedAt.getTime()) {
    return false;
  }
  return true;
}

async function processSyncItem(item: SyncQueueItem): Promise<void> {
  const table = getSupabaseTableName(item.table);
  const shouldProceed = await resolveConflict(item);
  if (!shouldProceed) return;

  if (item.op === 'upsert') {
    const payload = toSnakeCasePayload(item.payload as Record<string, unknown>);
    const { error } = await supabase.from(table).upsert(payload);
    if (error) throw error;
  } else {
    const payload = item.payload as { id: string };
    const { error } = await supabase.from(table).delete().eq('id', payload.id);
    if (error) throw error;
  }
}

export async function flushSyncQueue(): Promise<{ success: number; failed: number }> {
  if (!isSupabaseConfigured || syncing) {
    emit({ status: 'idle', message: 'Supabase not configured' });
    return { success: 0, failed: 0 };
  }
  if (!navigator.onLine) {
    emit({ status: 'offline', message: 'Waiting for connection' });
    return { success: 0, failed: 0 };
  }
  const { data: sessionData } = await supabase.auth.getSession();
  if (!sessionData.session?.user) {
    emit({ status: 'idle', message: 'Sign in to sync' });
    return { success: 0, failed: 0 };
  }
  syncing = true;
  emit({ status: 'syncing', message: 'Syncing...' });
  let success = 0;
  let failed = 0;
  const now = new Date().toISOString();

  try {
    const queue = (await getSyncQueue()).filter(
      (item) => !item.scheduledAt || new Date(item.scheduledAt) <= new Date(now)
    );
    emit({ queueCount: queue.length });

    for (const item of queue) {
      try {
        await processSyncItem(item);
        await clearSyncItem(item.id);
        success++;
      } catch (err) {
        const attempts = (item.attempts ?? 0) + 1;
        const delay = RETRY_DELAYS_MS[Math.min(attempts - 1, RETRY_DELAYS_MS.length - 1)] ?? 0;
        const scheduledAt = attempts >= MAX_ATTEMPTS ? undefined : new Date(Date.now() + delay).toISOString();
        const error = err instanceof Error ? err.message : String(err);
        // eslint-disable-next-line no-console
        console.error('[SyncService] failed to sync item:', item, error);
        await updateSyncItem({
          ...item,
          attempts,
          error,
          scheduledAt,
        });
        failed++;
      }
    }

    emit({
      status: failed > 0 ? 'error' : 'idle',
      message: failed > 0 ? `${failed} items failed to sync` : 'Sync complete',
      lastSyncAt: new Date().toISOString(),
    });
  } finally {
    syncing = false;
  }
  return { success, failed };
}

export async function pullServerChanges(): Promise<{ pulled: number }> {
  if (!isSupabaseConfigured || !navigator.onLine) return { pulled: 0 };
  // Pull down the latest updated records across user-owned tables.
  const tables = [
    'notes',
    'notebooks',
    'sermons',
    'prayer_requests',
    'journal_entries',
    'reading_plans',
    'reading_plan_days',
    'reading_progress',
    'themes',
    'highlights',
    'verseNotes',
    'bookmarks',
  ] as const;
  let pulled = 0;
  const since = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString(); // last 7 days
  for (const table of tables) {
    const dbTable = getSupabaseTableName(table);
    const { data, error } = await supabase
      .from(dbTable)
      .select('*')
      .gt('updated_at', since)
      .is('deleted_at', null)
      .limit(100);
    if (error || !data) continue;
    // We do not overwrite local state automatically here because it requires store-specific
    // merging logic. Instead, store owners should call pull-and-merge on load.
    pulled += data.length;
  }
  return { pulled };
}

export function registerBackgroundSync() {
  if (!('serviceWorker' in navigator)) return;
  navigator.serviceWorker.ready
    .then((registration) => {
      const syncRegistration = registration as ServiceWorkerRegistration & {
        sync?: { register: (tag: string) => Promise<void> };
      };
      return syncRegistration.sync?.register('sync-bible-workspace');
    })
    .catch(() => {
      /* Background Sync not supported; fallback to online listener flush */
    });
}

let periodicSyncInterval: number | undefined;

export function initSyncListeners() {
  window.addEventListener('online', () => {
    emit({ status: 'idle', message: 'Back online' });
    void flushSyncQueue();
  });
  window.addEventListener('offline', () => {
    emit({ status: 'offline', message: 'Offline' });
  });

  // Flush when the user signs in.
  supabase.auth.onAuthStateChange((event, session) => {
    if (event === 'SIGNED_IN' && session?.user) {
      emit({ status: 'idle', message: 'Signed in' });
      void flushSyncQueue();
    }
    if (event === 'SIGNED_OUT') {
      emit({ status: 'idle', message: 'Sign in to sync' });
    }
  });

  // Periodic sync every 30 seconds when online.
  if (periodicSyncInterval) window.clearInterval(periodicSyncInterval);
  periodicSyncInterval = window.setInterval(() => {
    if (navigator.onLine) void flushSyncQueue();
  }, 30_000);
}
