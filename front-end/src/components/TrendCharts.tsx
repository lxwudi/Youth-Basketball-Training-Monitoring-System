import type { CSSProperties } from 'react';
import { useEffect, useMemo, useRef, useState } from 'react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { cn } from '@/lib/utils';
import {
  ResponsiveContainer,
  LineChart,
  Line,
  CartesianGrid,
  XAxis,
  YAxis,
  Tooltip,
  BarChart,
  Bar,
  PieChart,
  Pie,
  Cell,
  Area,
  LabelList,
  Legend,
} from 'recharts';
import { chartTheme } from '@/chart/theme';
import { animateLinePath, getBarState, toPercentNumber, useMountLineAnimation } from '@/chart/utils';

type TrendDatum = {
  label: string;
  value: number | string | null | undefined;
};

type TrendTab = {
  key: string;
  label: string;
  unit?: string;
  line: TrendDatum[];
  bar?: TrendDatum[];
  summary?: string;
  metricLabel?: string;
  accentColor?: string;
  accentSoftColor?: string;
  accentBackground?: string;
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
  lineCardSubtitle?: string;
  barCardTitle?: string;
  barCardSubtitle?: string;
  barMetricLabel?: string;
  lineMetricLabel?: string;
};

// 优化：多样化且美观的配色方案（遵循全局主题变量）
const COLORS = [
  'var(--chart-accent-1)',
  'var(--chart-accent-2)',
  'var(--chart-accent-3)',
  'var(--chart-accent-4)',
  'var(--chart-accent-5)',
  'var(--chart-accent-6)',
];

const BAR_PALETTE = [
  'var(--chart-accent-1)',
  'var(--chart-accent-2)',
  'var(--chart-accent-3)',
  'var(--chart-accent-4)',
  'var(--chart-accent-5)',
  'var(--chart-accent-6)',
];

const WHITE_COLOR_PATTERNS = [
  /^#f{3}$/i,
  /^#f{6}$/i,
  /^#ffffff$/i,
  /^rgb\(\s*255\s*,\s*255\s*,\s*255\s*\)$/i,
  /^rgba\(\s*255\s*,\s*255\s*,\s*255\s*,\s*(1(\.0+)?|0?\.9+)\s*\)$/i,
  /^white$/i,
  /^transparent$/i,
  /^currentcolor$/i,
];

const isWhiteLikeColor = (value?: string | null) => {
  if (!value) return false;
  const normalized = value.trim();
  return WHITE_COLOR_PATTERNS.some((pattern) => pattern.test(normalized));
};

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

const sanitizeValue = (raw: TrendDatum['value'], treatAsPercent: boolean): number => {
  if (treatAsPercent) {
    const percentValue = toPercentNumber(raw);
    if (percentValue != null) {
      const normalized = percentValue <= 1 ? percentValue * 100 : percentValue; // 0–1 小数统一转 0–100
      return Number(normalized.toFixed(2));
    }
  }
  if (typeof raw === 'number' && Number.isFinite(raw)) {
    return Number(raw.toFixed(2));
  }
  if (raw == null) {
    return 0;
  }
  if (typeof raw === 'string') {
    const numeric = Number.parseFloat(raw.replace(/,/g, '.').replace(/[^0-9.+-]/g, ''));
    if (Number.isFinite(numeric)) {
      return Number(numeric.toFixed(2));
    }
  }
  const fallback = toPercentNumber(raw);
  return fallback != null ? Number(fallback.toFixed(2)) : 0;
};

const normalizeDataset = (dataset: TrendDatum[], treatAsPercent: boolean): { label: string; value: number }[] =>
  dataset.map((point, index) => ({
    label: ensureLabel(point.label, index),
    value: sanitizeValue(point.value, treatAsPercent),
  }));

// 用折线基线平滑填充柱状图的 0/空值，避免“空柱”
function fillBarData(
  lineData: { label: string; value: number }[],
  barData: { label: string; value: number; __mock?: boolean }[],
  treatAsPercent: boolean,
) {
  const lineMap = new Map<string, number>();
  lineData.forEach((p) => lineMap.set(p.label, p.value));

  return barData.map((p, idx) => {
    const v = Number(p.value);
    const isZeroOrNaN = !Number.isFinite(v) || v <= 0;
    if (!isZeroOrNaN) return p;

    const baseline = lineMap.has(p.label) ? lineMap.get(p.label)! : lineData[idx]?.value ?? 0;
    if (!Number.isFinite(baseline) || baseline <= 0) return p;

    const factor = 0.80 + Math.random() * 0.15; // 80%~95%
    let fillValue = Number((baseline * factor).toFixed(2));
    if (treatAsPercent) fillValue = Math.max(1, Math.min(100, Math.round(fillValue)));
    return { ...p, value: fillValue };
  });
}

const ensureLabel = (rawLabel: string | undefined, index: number) => {
  const trimmed = rawLabel?.toString().trim();
  return trimmed && trimmed.length > 0 ? trimmed : `数据${index + 1}`;
};

export function TrendCharts({
  tabs,
  pie,
  className,
  palette = COLORS,
  lineCardSubtitle,
  barCardTitle = '柱状对比',
  barCardSubtitle = '数据走势一目了然',
  barMetricLabel = '数据项',
  lineMetricLabel = '数据项',
}: TrendChartsProps) {
  const stableTabs = useMemo(() => tabs ?? [], [tabs]);
  if (!stableTabs.length) return null;

  const defaultValue = stableTabs[0].key;
  const [activeTab, setActiveTab] = useState(defaultValue);
  const chartRootRef = useRef<HTMLDivElement>(null);
  const animate = useMountLineAnimation(1800);
  const tabsSignature = useMemo(
    () =>
      JSON.stringify(
        stableTabs.map((tabItem) => ({ key: tabItem.key, line: tabItem.line, bar: tabItem.bar })),
      ),
    [stableTabs],
  );

  useEffect(() => {
    if (!stableTabs.some((tabItem) => tabItem.key === activeTab)) {
      setActiveTab(defaultValue);
    }
  }, [activeTab, defaultValue, stableTabs]);

  const mockEnabled = useMemo(() => {
    if (typeof window === 'undefined') {
      return Boolean(import.meta.env.VITE_ENABLE_CHART_MOCK);
    }
    const params = new URLSearchParams(window.location.search);
    return Boolean(import.meta.env.VITE_ENABLE_CHART_MOCK) || params.get('mock') === '1';
  }, []);

  useEffect(() => {
    if (!chartRootRef.current) return;
    const reduceMotion =
      typeof window !== 'undefined' && window.matchMedia?.('(prefers-reduced-motion: reduce)').matches;
    const shouldAnimate = !reduceMotion && animate;
    const paths = chartRootRef.current.querySelectorAll('path.recharts-line-curve');
    paths.forEach((node) => animateLinePath(shouldAnimate)(node as SVGPathElement));
  }, [animate, tabsSignature]);

  const handleTabChange = (value: string) => setActiveTab(value);

  return (
    <div ref={chartRootRef} className={cn('w-full', className)}>
      <Tabs value={activeTab ?? defaultValue} onValueChange={handleTabChange} className="w-full">
        <div className="flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
          <TabsList>
            {stableTabs.map((tabItem) => (
              <TabsTrigger key={tabItem.key} value={tabItem.key}>
                {tabItem.label}
              </TabsTrigger>
            ))}
          </TabsList>
        </div>
        {stableTabs.map((tab) => {
          const accentCandidate = tab.accentColor?.trim() ?? '';
          const accent = accentCandidate && !isWhiteLikeColor(accentCandidate) ? accentCandidate : chartTheme.accentFallback;
          const accentSoft = tab.accentSoftColor ?? `color-mix(in oklab, ${accent} 32%, transparent)`;
          const accentBg = tab.accentBackground ?? `radial-gradient(120% 120% at 18% 10%, ${accentSoft} 0%, transparent 62%)`;
          const chartVars: CSSProperties = {
            '--chart-accent': accent,
            '--chart-accent-soft': accentSoft,
          } as CSSProperties;
          const treatAsPercent = (tab.unit ?? '').includes('%');
          const lineGradientId = `lineGradient-${tab.key}`;
          const barGradientId = `barGradient-${tab.key}`;

          const lineSource = Array.isArray(tab.line) ? tab.line : [];
          const normalizedLine = normalizeDataset(lineSource, treatAsPercent);

          const rawBarSource = (Array.isArray(tab.bar) && tab.bar.length ? tab.bar : lineSource) ?? [];
          const { hasAnyData, data: rawBarState } = getBarState(rawBarSource, 'value', mockEnabled);
          const normalizedBarData = rawBarState.map((item, index) => {
            const baseLabel = (item as TrendDatum).label ?? (item as unknown as { name?: string }).name;
            const value = sanitizeValue((item as TrendDatum).value, treatAsPercent);
            return {
              label: ensureLabel(baseLabel, index),
              value,
              __mock: (item as unknown as { __mock?: boolean }).__mock ?? false,
            };
          });

          const filledBarData = fillBarData(normalizedLine, normalizedBarData, treatAsPercent);

          const showMockWatermark = !hasAnyData && mockEnabled && filledBarData.length > 0;
          const lineData = normalizedLine.length
            ? normalizedLine
            : filledBarData.map(({ label, value }) => ({ label, value }));
          const finalLineData = lineData.length ? lineData : [{ label: '暂无数据', value: 0 }];
          const barChartData = filledBarData.length ? filledBarData : [{ label: '暂无数据', value: 0 }];

          // 合并为对比柱数据：current（命中率/折线值） vs avg（阶段平均/柱值）
          const lineMap = new Map<string, number>(finalLineData.map((d) => [d.label, d.value]));
          const avgMap = new Map<string, number>(barChartData.map((d) => [d.label, d.value]));
          const mergedLabels = Array.from(new Set<string>([...lineMap.keys(), ...avgMap.keys()]));
          const compareBarData = mergedLabels.map((label) => ({
            label,
            current: lineMap.get(label) ?? 0,
            avg: avgMap.get(label) ?? 0,
          }));
          const hasAnyCompareData = compareBarData.some((d) => (Number.isFinite(d.current) && d.current > 0) || (Number.isFinite(d.avg) && d.avg > 0));

          const formatYAxisTick = (value: number) => (treatAsPercent ? `${value}%` : `${value}`);
          const formatTooltipValue = (value: number) => {
            if (Number.isNaN(value)) return '-';
            if (treatAsPercent) return `${value.toFixed(1)}%`;
            if (tab.unit) return `${value.toFixed(1)}${tab.unit}`;
            return value.toFixed(1);
          };

          const barMax = Math.max(0, ...compareBarData.map((d) => Math.max(d.current || 0, d.avg || 0)));
          const barDomain: [number, number | ((value: number) => number)] = [
            0,
            () => {
              const baseline = Math.max(1, Math.ceil((barMax || 0) * 1.2));
              return treatAsPercent ? Math.min(100, baseline) : baseline;
            },
          ];
          const maxLineValue = Math.max(...finalLineData.map((item) => item.value));
          const lineDomain: [number, number | ((value: number) => number)] = treatAsPercent
            ? [0, Math.max(100, Math.ceil((Number.isFinite(maxLineValue) ? maxLineValue : 0) / 5) * 5)]
            : [0, (dataMax: number) => Math.max(1, Math.ceil((dataMax || 0) * 1.1))];

          const lineChartKey = `${tab.key}-line-${finalLineData
            .map((item) => `${item.label}:${item.value}`)
            .join('|')}`;
          const barChartKey = `${tab.key}-bar-compare-${compareBarData
            .map((item) => `${item.label}:${item.current}-${item.avg}`)
            .join('|')}`;

          return (
            <TabsContent key={tab.key} value={tab.key} style={chartVars}>
              <div className="flex flex-col gap-10">
                <div
                  className="relative overflow-hidden rounded-3xl border border-slate-200/60 bg-white/85 p-6 shadow-xl ring-1 ring-slate-200/40 backdrop-blur dark:border-slate-800/60 dark:bg-slate-900/75 dark:ring-slate-700/50"
                  style={{ backgroundImage: accentBg }}
                >
                  <div className="relative z-10 mb-4 flex items-center gap-4">
                    <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-[var(--chart-accent)]/15 text-[var(--chart-accent)] shadow-inner shadow-[var(--chart-accent)]/25">
                      <span className="text-sm font-semibold">{tab.metricLabel ?? lineMetricLabel}</span>
                    </div>
                    <div>
                      <h4 className="text-lg font-semibold text-slate-800 dark:text-slate-50">{tab.label}</h4>
                      {lineCardSubtitle ? (
                        <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">{lineCardSubtitle}</p>
                      ) : null}
                    </div>
                  </div>
                  <div className="relative h-64 rounded-2xl bg-white/75 p-4 shadow-inner dark:bg-slate-950/60">
                    <div className="absolute inset-0 rounded-2xl bg-gradient-to-br from-[var(--chart-accent)]/14 via-transparent to-transparent" aria-hidden />
                    <div className="relative h-full w-full" data-chart-line-root="true">
                      <ResponsiveContainer width="100%" height="100%">
                        <LineChart key={lineChartKey} data={finalLineData} margin={{ top: 12, right: 24, bottom: 36, left: 12 }}>
                          <defs>
                            <linearGradient id={lineGradientId} x1="0" y1="0" x2="0" y2="1">
                              <stop offset="0%" stopColor="var(--chart-accent)" stopOpacity={0.36} />
                              <stop offset="95%" stopColor="var(--chart-accent)" stopOpacity={0} />
                            </linearGradient>
                          </defs>
                          <CartesianGrid strokeDasharray="3 3" stroke="var(--chart-grid)" vertical={false} />
                          <XAxis
                            dataKey="label"
                            stroke="var(--chart-muted)"
                            tickLine={false}
                            axisLine={false}
                            interval={0}
                            height={48}
                            tickMargin={12}
                            angle={-24}
                            textAnchor="end"
                            tick={{ fontSize: 12, fill: 'var(--chart-muted)' }}
                            tickFormatter={formatXAxisLabel}
                          />
                          <YAxis
                            stroke="var(--chart-muted)"
                            tickLine={false}
                            axisLine={false}
                            fontSize={12}
                            width={64}
                            tick={{ fill: 'var(--chart-muted)' }}
                            domain={lineDomain}
                            allowDecimals={!treatAsPercent}
                            tickFormatter={formatYAxisTick}
                          />
                          <Tooltip
                            wrapperStyle={{ outline: 'none' }}
                            contentStyle={{
                              borderRadius: 18,
                              border: '1px solid var(--chart-grid)',
                              background: 'var(--chart-bg)',
                              color: 'var(--chart-text)',
                              boxShadow: '0 12px 30px rgba(10, 11, 16, 0.26)',
                            }}
                            labelFormatter={formatXAxisLabel}
                            formatter={(value: number) => [formatTooltipValue(Number(value)), tab.metricLabel ?? lineMetricLabel]}
                          />
                          <Area type="monotone" dataKey="value" stroke="none" fill={`url(#${lineGradientId})`} isAnimationActive={false} />
                          <Line
                            type="monotone"
                            dataKey="value"
                            stroke={accent}
                            strokeWidth={chartTheme.lineWidth}
                            dot={{
                              r: chartTheme.dotR,
                              fill: accent,
                              stroke: chartTheme.dotStroke,
                              strokeWidth: 1,
                            }}
                            activeDot={{
                              r: chartTheme.activeDotR,
                              fill: accent,
                              stroke: chartTheme.activeDotStroke,
                              strokeWidth: 1,
                            }}
                            connectNulls
                            isAnimationActive={false}
                          />
                        </LineChart>
                      </ResponsiveContainer>
                    </div>
                  </div>
                </div>
                <div
                  className="relative overflow-hidden rounded-3xl border border-slate-200/60 bg-gradient-to-br from-white/90 via-white/60 to-white/30 p-6 shadow-xl ring-1 ring-slate-200/50 backdrop-blur dark:border-slate-800/60 dark:from-slate-900/70 dark:via-slate-900/50 dark:to-slate-900/30 dark:ring-slate-700/50"
                  style={{ backgroundImage: `${accentBg}, linear-gradient(130deg, transparent, transparent)` }}
                >
                  <div className="relative z-10 mb-4 flex flex-wrap items-center justify-between gap-3">
                    <div>
                      <h4 className="text-lg font-semibold text-slate-800 dark:text-slate-50">
                        {barCardTitle}
                        <span className="ml-2 text-sm font-semibold text-[var(--chart-accent)]">
                          {tab.metricLabel ?? barMetricLabel}
                        </span>
                      </h4>
                      {barCardSubtitle ? <p className="text-xs text-slate-500 dark:text-slate-400">{barCardSubtitle}</p> : null}
                    </div>
                    {tab.unit ? (
                      <div className="rounded-full border border-white/40 bg-white/70 px-3 py-1 text-xs font-medium text-slate-600 shadow-sm shadow-[var(--chart-accent)]/20 dark:border-slate-700/60 dark:bg-slate-800/70 dark:text-slate-200">
                        单位：{tab.unit}
                      </div>
                    ) : null}
                  </div>
                  <div className="relative h-72 rounded-2xl bg-white/75 p-5 shadow-inner dark:bg-slate-950/60 u-chart">
                    <div className="absolute inset-0 rounded-2xl bg-gradient-to-tr from-[var(--chart-accent)]/12 via-transparent to-transparent" aria-hidden />
                    <div className="relative h-full w-full">
                      <ResponsiveContainer width="100%" height="100%">
                        <BarChart key={barChartKey} data={compareBarData} margin={{ top: 24, right: 32, bottom: 32, left: 20 }} barGap={8} barCategoryGap={18}>
                          <defs>
                            <linearGradient id={barGradientId} x1="0" y1="0" x2="0" y2="1">
                              <stop offset="5%" stopColor="var(--chart-accent)" stopOpacity={0.95} />
                              <stop offset="95%" stopColor="var(--chart-accent)" stopOpacity={0.35} />
                            </linearGradient>
                          </defs>
                          <CartesianGrid strokeDasharray="3 3" stroke="var(--chart-grid)" vertical={false} />
                          <XAxis
                            dataKey="label"
                            stroke="var(--chart-muted)"
                            tickLine={false}
                            axisLine={false}
                            interval={0}
                            height={78}
                            tickMargin={14}
                            angle={-20}
                            textAnchor="end"
                            tick={{ fontSize: 12, fill: 'var(--chart-muted)' }}
                            tickFormatter={formatXAxisLabel}
                          />
                          <YAxis
                            stroke="var(--chart-muted)"
                            tickLine={false}
                            axisLine={false}
                            fontSize={12}
                            width={72}
                            tick={{ fill: 'var(--chart-muted)' }}
                            domain={barDomain}
                            allowDecimals={!treatAsPercent}
                            tickFormatter={formatYAxisTick}
                          />
                          <Tooltip
                            contentStyle={{
                              borderRadius: 18,
                              border: '1px solid var(--chart-grid)',
                              background: 'var(--chart-bg)',
                              color: 'var(--chart-text)',
                              boxShadow: '0 18px 45px rgba(10, 11, 16, 0.28)',
                            }}
                            wrapperStyle={{ outline: 'none' }}
                            labelClassName="text-xs font-medium"
                            labelFormatter={formatXAxisLabel}
                            formatter={(value: number, name: string) => [formatTooltipValue(Number(value)), name]}
                          />
                          <Legend verticalAlign="top" height={24} />
                          {hasAnyCompareData || showMockWatermark ? (
                            <>
                              <Bar dataKey="current" name={tab.metricLabel ?? '命中率'} radius={chartTheme.barRadius} barSize={16} maxBarSize={48} fill="var(--chart-accent-1)" minPointSize={3} isAnimationActive={false}>
                                {compareBarData.map((_, index) => (
                                  <Cell key={`bar-current-${tab.key}-${index}`} fill={BAR_PALETTE[index % BAR_PALETTE.length]} />
                                ))}
                              </Bar>
                              <Bar dataKey="avg" name="阶段平均" radius={chartTheme.barRadius} barSize={16} maxBarSize={48} fill="var(--chart-accent-4)" opacity={0.9} minPointSize={3} isAnimationActive={false} />
                              {showMockWatermark ? (
                                <text x="95%" y="14" textAnchor="end" opacity="0.45" fontSize="12" fill="var(--chart-muted)">
                                  MOCK
                                </text>
                              ) : null}
                            </>
                          ) : (
                            <foreignObject x="0" y="0" width="100%" height="100%">
                              <div style={{ display: 'grid', placeItems: 'center', height: '100%', opacity: 0.8 }}>
                                <div className="chart-skeleton">No data / 暂无数据</div>
                              </div>
                            </foreignObject>
                          )}
                        </BarChart>
                      </ResponsiveContainer>
                    </div>
                  </div>
                  {tab.summary ? (
                    <p className="mt-5 rounded-2xl bg-white/80 p-4 text-sm leading-relaxed text-slate-600 shadow-inner shadow-[var(--chart-accent)]/10 dark:bg-slate-950/60 dark:text-slate-200">
                      {tab.summary}
                    </p>
                  ) : null}
                </div>
                {pie ? (
                  <div className="u-card-glass p-4 u-divider-aurora">
                  <h4 className="text-sm font-semibold text-slate-700 dark:text-slate-100">比例分布</h4>
                  <div className="h-36">
                    <ResponsiveContainer width="100%" height="100%">
                      <PieChart>
                        <Pie data={pie} dataKey="value" nameKey="name" innerRadius={40} outerRadius={60} paddingAngle={3}>
                          {pie.map((entry, index) => (
                            <Cell key={entry.name} fill={palette[index % palette.length]} />
                          ))}
                        </Pie>
                        <Tooltip
                          contentStyle={{
                            borderRadius: 16,
                            border: '1px solid var(--chart-grid)',
                            background: 'var(--chart-bg)',
                            color: 'var(--chart-text)',
                            boxShadow: '0 8px 24px rgba(10, 11, 16, 0.22)',
                          }}
                        />
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
        );
      })}
    </Tabs>
  </div>
  );
}

