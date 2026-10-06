import { motion } from 'framer-motion';

export function BarChart({ data }: { data: { label: string; value: number }[] }) {
  const max = Math.max(1, ...data.map((d) => d.value));
  return (
    <div className="h-40 flex items-end gap-2">
      {data.map((d, i) => (
        <div key={d.label} className="flex-1 flex flex-col items-center gap-1">
          <motion.div
            initial={{ height: 0 }}
            animate={{ height: `${(d.value / max) * 100}%` }}
            transition={{ duration: 0.6, delay: i * 0.05 }}
            className="w-full max-w-[28px] rounded-t-md bg-gradient-to-t from-[var(--accent)] to-[var(--accent)]/70"
          />
          <span className="text-[10px] text-[var(--text-tertiary)]">{d.label}</span>
        </div>
      ))}
    </div>
  );
}

export function RingChart({ value, size = 80, stroke = 10, color = 'var(--accent)' }: { value: number; size?: number; stroke?: number; color?: string }) {
  const radius = (size - stroke) / 2;
  const circumference = 2 * Math.PI * radius;
  const offset = circumference - (value / 100) * circumference;
  return (
    <div className="relative inline-flex items-center justify-center" style={{ width: size, height: size }}>
      <svg width={size} height={size} className="-rotate-90">
        <circle cx={size / 2} cy={size / 2} r={radius} stroke="var(--bg-hover)" strokeWidth={stroke} fill="transparent" />
        <motion.circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          stroke={color}
          strokeWidth={stroke}
          fill="transparent"
          strokeLinecap="round"
          initial={{ strokeDashoffset: circumference }}
          animate={{ strokeDashoffset: offset }}
          transition={{ duration: 0.8 }}
          strokeDasharray={circumference}
        />
      </svg>
      <span className="absolute text-sm font-bold text-[var(--text-primary)]">{Math.round(value)}%</span>
    </div>
  );
}

export function SparkLine({ data, color = 'var(--accent)' }: { data: number[]; color?: string }) {
  const width = 200;
  const height = 40;
  const max = Math.max(1, ...data);
  const min = 0;
  const points = data.map((v, i) => {
    const x = (i / (data.length - 1 || 1)) * width;
    const y = height - ((v - min) / (max - min)) * height;
    return `${x},${y}`;
  });
  return (
    <svg viewBox={`0 0 ${width} ${height}`} className="w-full h-full" preserveAspectRatio="none">
      <motion.polyline
        fill="none"
        stroke={color}
        strokeWidth={2}
        points={points.join(' ')}
        initial={{ pathLength: 0 }}
        animate={{ pathLength: 1 }}
        transition={{ duration: 1 }}
      />
    </svg>
  );
}
