import type { ReactNode } from 'react';
import { ArrowBigDown, ArrowUp, CircleDot } from 'lucide-react';
import { cn } from '@/lib/utils';

type MetricTrend = 'up' | 'down' | 'stable';

type MetricItem = {
  id: string;
  label: string;
  unit: string;
  value: number;
  trend?: MetricTrend;
  highlight?: boolean;
};

type MetricsBarProps = {
  items: MetricItem[];
  className?: string;
};

const ICONS: Record<MetricTrend, ReactNode> = {
  up: <ArrowUp className="h-4 w-4 text-emerald-500" />,
  down: <ArrowBigDown className="h-4 w-4 text-accent" />,
  stable: <CircleDot className="h-4 w-4 text-slate-400" />,
};

export function MetricsBar({ items, className }: MetricsBarProps) {
  return (
    <div className={cn('u-card-glass grid gap-3 p-4 md:grid-cols-3', className)}>
      {items.map((item) => {
        const trend: MetricTrend = item.trend ?? 'stable';
        const trendLabel = trend === 'up' ? '上升' : trend === 'down' ? '下降' : '稳定';
        return (
          <div
            key={item.id}
            className={cn(
              'flex items-center justify-between rounded-2xl border border-transparent bg-slate-100/70 px-4 py-3 text-sm dark:bg-slate-800/60',
              item.highlight && 'border-accent/60 bg-accent/10',
            )}
          >
            <div>
              <p className="text-xs text-slate-500 dark:text-slate-300">{item.label}</p>
              <p className="text-xl font-semibold text-slate-900 dark:text-slate-100">
                {item.value.toFixed(1)} {item.unit}
              </p>
            </div>
            <div className="flex items-center gap-1 text-xs text-slate-500 dark:text-slate-400">
              {ICONS[trend]}
              <span>{trendLabel}</span>
            </div>
          </div>
        );
      })}
    </div>
  );
}
