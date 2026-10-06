import { useSyncStatus } from '@/hooks/useSyncStatus';
import { cn } from '@/utils/cn';
import { Cloud, CloudOff, Loader2, AlertCircle } from 'lucide-react';

export function SyncStatusIndicator() {
  const { status, queueCount, message } = useSyncStatus();

  const icon = {
    idle: <Cloud size={16} />,
    syncing: <Loader2 size={16} className="animate-spin" />,
    error: <AlertCircle size={16} />,
    offline: <CloudOff size={16} />,
  }[status];

  const color = {
    idle: 'text-green-500',
    syncing: 'text-[var(--accent)]',
    error: 'text-red-500',
    offline: 'text-[var(--text-tertiary)]',
  }[status];

  const label = message && status !== 'syncing' ? message : status;

  return (
    <div
      className={cn(
        'flex items-center gap-1.5 px-2 py-1 rounded-md text-xs font-medium bg-[var(--bg-hover)]',
        color
      )}
      title={message ?? `Sync status: ${status}`}
    >
      {icon}
      <span className="capitalize hidden sm:inline">{label}</span>
      {queueCount > 0 && <span className="text-[var(--text-secondary)]">({queueCount})</span>}
    </div>
  );
}
