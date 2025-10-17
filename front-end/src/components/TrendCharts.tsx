import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { cn } from '@/lib/utils';
import type { TrendPoint } from '@/types';
import { ResponsiveContainer, LineChart, Line, CartesianGrid, XAxis, YAxis, Tooltip, BarChart, Bar, PieChart, Pie, Cell } from 'recharts';

type TrendTab = {
  key: string;
  label: string;
  unit?: string;
  line: TrendPoint[];
  bar?: TrendPoint[];
  summary?: string;
  metricLabel?: string;
};

type PieSlice = {
  name: string;
  value: number;
};

type TrendChartsProps = {
  tabs: TrendTab[];
  pie?: PieSlice[];
  className?: string;
  palette?: string[];
  lineCardTitle?: string;
  lineCardSubtitle?: string;
  barCardTitle?: string;
  barCardSubtitle?: string;
  barMetricLabel?: string;
  lineMetricLabel?: string;
};

const COLORS = ['#1f4ab8', '#ff6b6b', '#0f172a', '#94a3b8'];

const QUARTER_LABELS: Record<string, string> = {
  Q1: '第一季度',
  Q2: '第二季度',
  Q3: '第三季度',
  Q4: '第四季度',
};

const formatXAxisLabel = (value: string | number) => {
  const normalized = String(value);
  return QUARTER_LABELS[normalized] ?? normalized;
};

export function TrendCharts({
  tabs,
  pie,
  className,
  palette = COLORS,
  lineCardTitle = '折线趋势',
  lineCardSubtitle,
  barCardTitle = '柱状对比',
  barCardSubtitle = '数据走势一目了然',
  barMetricLabel = '数据值',
  lineMetricLabel = '数据值',
}: TrendChartsProps) {
  if (!tabs.length) return null;
  const defaultValue = tabs[0].key;
  return (
    <Tabs defaultValue={defaultValue} className={cn('w-full', className)}>
      <div className="flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
        <TabsList>
          {tabs.map((tab) => (
            <TabsTrigger key={tab.key} value={tab.key}>
              {tab.label}
            </TabsTrigger>
          ))}
        </TabsList>
      </div>
      {tabs.map((tab) => (
        <TabsContent key={tab.key} value={tab.key}>
          <div className="flex flex-col gap-6">
            <div className="rounded-3xl bg-white/90 p-4 shadow-brand backdrop-blur dark:bg-slate-900/80">
              <div className="mb-2">
                <h4 className="text-base font-semibold text-slate-700 dark:text-slate-100">{lineCardTitle}</h4>
                {lineCardSubtitle ? (
                  <p className="mt-1 text-xs text-slate-400 dark:text-slate-400">{lineCardSubtitle}</p>
                ) : null}
              </div>
              <div className="h-60">
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart data={tab.line} margin={{ top: 16, right: 24, bottom: 48, left: 8 }}>
                    <CartesianGrid strokeDasharray="4 4" stroke="#cbd5f5" opacity={0.4} />
                    <XAxis
                      dataKey="label"
                      stroke="#64748b"
                      tickLine={false}
                      axisLine={false}
                      interval={0}
                      height={60}
                      tickMargin={12}
                      angle={-30}
                      textAnchor="end"
                      tick={{ fontSize: 12 }}
                      tickFormatter={formatXAxisLabel}
                    />
                    <YAxis
                      stroke="#64748b"
                      tickLine={false}
                      axisLine={false}
                      fontSize={12}
                      unit={tab.unit}
                      width={60}
                    />
                    <Tooltip
                      contentStyle={{ borderRadius: 16, border: '1px solid #dbeafe' }}
                      labelFormatter={formatXAxisLabel}
                      formatter={(value: number) => [
                        tab.unit ? `${value}${tab.unit}` : value,
                        tab.metricLabel ?? lineMetricLabel,
                      ]}
                    />
                    <Line
                      type="monotone"
                      dataKey="value"
                      stroke={palette[0]}
                      strokeWidth={3}
                      dot={{ r: 3 }}
                      activeDot={{ r: 6 }}
                      name={tab.metricLabel ?? lineMetricLabel}
                    />
                  </LineChart>
                </ResponsiveContainer>
              </div>
            </div>
            <div className="rounded-3xl bg-gradient-to-br from-slate-100 via-slate-50 to-white p-6 shadow-xl ring-1 ring-slate-200/60 dark:from-slate-900 dark:via-slate-800 dark:to-slate-900/70 dark:ring-slate-700/60">
              <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
                <div>
                  <h4 className="text-lg font-semibold text-slate-800 dark:text-slate-100">{barCardTitle}</h4>
                  {barCardSubtitle ? <p className="text-xs text-slate-400 dark:text-slate-400">{barCardSubtitle}</p> : null}
                </div>
                {tab.unit ? (
                  <div className="rounded-full border border-slate-200 bg-white/80 px-3 py-1 text-xs font-medium text-slate-500 shadow-sm dark:border-slate-700 dark:bg-slate-800/60 dark:text-slate-200">
                    单位：{tab.unit}
                  </div>
                ) : null}
              </div>
              <div className="h-64">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart
                    data={tab.bar ?? tab.line}
                    margin={{ top: 24, right: 32, bottom: 64, left: 24 }}
                    barSize={20}
                  >
                    <defs>
                      <linearGradient id="barGradient" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="0%" stopColor={palette[1]} stopOpacity={0.95} />
                        <stop offset="100%" stopColor={palette[1]} stopOpacity={0.55} />
                      </linearGradient>
                    </defs>
                    <CartesianGrid strokeDasharray="3 3" stroke="#cbd5f5" opacity={0.25} vertical={false} />
                    <XAxis
                      dataKey="label"
                      stroke="#475569"
                      tickLine={false}
                      axisLine={false}
                      interval={0}
                      height={78}
                      tickMargin={18}
                      angle={-26}
                      textAnchor="end"
                      tick={{ fontSize: 12, fill: '#475569' }}
                      tickFormatter={formatXAxisLabel}
                    />
                    <YAxis
                      stroke="#475569"
                      tickLine={false}
                      axisLine={false}
                      fontSize={12}
                      unit={tab.unit}
                      width={72}
                      tick={{ fill: '#475569' }}
                    />
                    <Tooltip
                      contentStyle={{
                        borderRadius: 18,
                        border: '1px solid #dbeafe',
                        boxShadow: '0 18px 45px rgba(43,86,226,0.1)',
                      }}
                      wrapperStyle={{ outline: 'none' }}
                      labelClassName="text-xs font-medium text-slate-500"
                      labelFormatter={formatXAxisLabel}
                      formatter={(value: number) => [
                        tab.unit ? `${value}${tab.unit}` : value,
                        tab.metricLabel ?? barMetricLabel,
                      ]}
                    />
                    <Bar
                      dataKey="value"
                      fill="url(#barGradient)"
                      radius={[18, 18, 18, 18]}
                      maxBarSize={42}
                    />
                  </BarChart>
                </ResponsiveContainer>
              </div>
              {tab.summary ? (
                <p className="mt-4 rounded-2xl bg-slate-50/90 p-3 text-sm leading-relaxed text-slate-500 shadow-inner dark:bg-slate-900/60 dark:text-slate-200">
                  {tab.summary}
                </p>
              ) : null}
            </div>
            {pie ? (
              <div className="rounded-3xl bg-white/80 p-4 shadow-sm dark:bg-slate-900/60">
                <h4 className="text-sm font-semibold text-slate-700 dark:text-slate-100">比例分布</h4>
                <div className="h-36">
                  <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                      <Pie data={pie} dataKey="value" nameKey="name" innerRadius={40} outerRadius={60} paddingAngle={3}>
                        {pie.map((entry, index) => (
                          <Cell key={entry.name} fill={palette[index % palette.length]} />
                        ))}
                      </Pie>
                      <Tooltip contentStyle={{ borderRadius: 16, border: '1px solid #dbeafe' }} />
                    </PieChart>
                  </ResponsiveContainer>
                </div>
                <ul className="mt-2 space-y-1 text-xs text-slate-500 dark:text-slate-300">
                  {pie.map((slice, index) => (
                    <li key={slice.name} className="flex items-center gap-2">
                      <svg className="h-3 w-3" viewBox="0 0 8 8" aria-hidden="true">
                        <circle cx="4" cy="4" r="4" fill={palette[index % palette.length]} />
                      </svg>
                      {slice.name}：{slice.value.toFixed(1)}
                    </li>
                  ))}
                </ul>
              </div>
            ) : null}
          </div>
        </TabsContent>
      ))}
    </Tabs>
  );
}
