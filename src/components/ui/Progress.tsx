import { cn } from '@/utils/cn';

interface ProgressProps {
  value: number;
  className?: string;
}

export function Progress({ value, className }: ProgressProps) {
  return (
    <div className={cn('w-full rounded-full bg-[var(--bg-hover)] overflow-hidden', className)}>
      <div
        className="h-full bg-[var(--accent)] transition-all duration-300"
        style={{ width: `${Math.min(100, Math.max(0, value))}%` }}
      />
    </div>
  );
}
