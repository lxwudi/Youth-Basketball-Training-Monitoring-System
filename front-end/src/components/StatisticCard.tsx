import { cn } from '@/lib/utils';

type TrendInfo = { direction: 'up' | 'down' | 'flat'; value: number; hint?: string } | undefined;

type StatisticCardProps = {
  label: string;
  value: string | number;
  unit?: string;
  trend?: TrendInfo;
  caption?: string;
  className?: string;
};

export function StatisticCard({ label, value, unit, trend, caption, className }: StatisticCardProps) {
  const trendText = trend
    ? trend.direction === 'up'
      ? `↑ ${trend.value.toFixed(1)}%`
      : trend.direction === 'down'
        ? `↓ ${trend.value.toFixed(1)}%`
        : `≈ ${trend.value.toFixed(1)}%`
    : null;

  return (
    <div
      className={cn(
        'rounded-3xl border border-slate-200/70 bg-white/90 p-4 shadow-sm shadow-slate-200/40 dark:border-slate-800 dark:bg-slate-900/70',
        className,
      )}
    >
      <p className="text-xs text-slate-500 dark:text-slate-300">{label}</p>
      <div className="mt-2 flex items-end gap-2">
        <p className="text-3xl font-semibold text-slate-900 dark:text-slate-100">{value}</p>
        {unit ? <span className="pb-1 text-xs text-slate-400">{unit}</span> : null}
      </div>
      <div className="mt-2 flex items-center justify-between text-xs text-slate-400">
        {trendText ? <span>{trendText}</span> : <span />}
        {caption ? <span>{caption}</span> : null}
      </div>
    </div>
  );
}
