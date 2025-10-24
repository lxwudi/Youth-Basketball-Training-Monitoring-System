import { ArrowDownRight, ArrowUpRight } from 'lucide-react';
import { Card, CardContent, CardHeader } from '@/components/ui/card';

interface Props {
  label: string;
  value?: number | string;
  unit?: string;
  trend?: { direction: 'up' | 'down'; value: number };
  caption?: string;
  className?: string;
}

export function StatisticCard({ label, value, unit, trend, caption, className }: Props) {
  const TrendIcon = trend?.direction === 'up' ? ArrowUpRight : ArrowDownRight;

  return (
    <Card className={`u-card-glass u-kpi-card ${className ?? ''}`}>
      {/* 角标徽章 */}
      <div className="u-kpi-badge"></div>
      
      <CardHeader className="flex flex-row items-center justify-between">
        <p className="text-sm text-slate-600 dark:text-slate-300">{label}</p>
        {trend ? (
          <span className={`inline-flex items-center gap-1 rounded-md px-1.5 py-0.5 text-xs ${trend.direction === 'up' ? 'bg-emerald-100 text-emerald-600 dark:bg-emerald-900/40 dark:text-emerald-300' : 'bg-rose-100 text-rose-600 dark:bg-rose-900/40 dark:text-rose-300'}`}>
            <TrendIcon className="h-3.5 w-3.5" />
            {trend.value}%
          </span>
        ) : null}
      </CardHeader>
      <CardContent className="flex items-baseline gap-2">
        <p className="kpi-rolling u-kpi-value text-2xl font-semibold tracking-tight">{value ?? '-'}</p>
        {unit ? <span className="badge-kpi rounded-md bg-slate-100 px-1.5 py-0.5 text-xs text-slate-600 dark:bg-slate-800 dark:text-slate-300">{unit}</span> : null}
        {caption ? <span className="ml-auto text-xs text-slate-500 dark:text-slate-400">{caption}</span> : null}
      </CardContent>
    </Card>
  );
}
