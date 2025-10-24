import { Navigate, Route, Routes, useLocation } from 'react-router-dom';
import { Activity, Brain, Flame, ShieldAlert } from 'lucide-react';
import { AnglePanel } from '@/components/AnglePanel';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { MetricsBar } from '@/components/MetricsBar';
import { ProfileCard } from '@/components/ProfileCard';
import { ReportBuilder } from '@/components/ReportBuilder';
import { ReportCallout } from '@/components/ReportCallout';
import { RoleTabsLayout } from '@/components/RoleTabsLayout';
import { StatisticCard } from '@/components/StatisticCard';
import { TrendCharts } from '@/components/TrendCharts';
import { VideoPlayerWithOverlay } from '@/components/VideoPlayerWithOverlay';
import { useAsyncData } from '@/hooks/useAsyncData';
import { usePoseSequence } from '@/hooks/usePoseSequence';
import { getProfileByRole, getTrainingSessions } from '@/lib/api';
import { formatMinutes } from '@/utils/format';
import type { TrainingSession } from '@/types';
import { useRef, useEffect } from 'react';

const POSE_SEQUENCE_URL = '/poses/dribble_sequence.json';

const FALLBACK_SHOOTING = Array.from({ length: 12 }, (_, index) => ({
  label: `第${index + 1}次`,
  value: Number((64 + Math.sin(index / 2) * 6 + index * 1.5).toFixed(2)),
}));

const FALLBACK_VELOCITY = Array.from({ length: 12 }, (_, index) => ({
  label: `第${index + 1}段`,
  value: Number((26 + Math.cos(index / 1.8) * 4 + ((index % 3) - 1) * 1.8).toFixed(2)),
}));

function ParentBasketballTab() {
  const sessionsQuery = useAsyncData(() => getTrainingSessions(), []);
  const focus: TrainingSession | undefined = sessionsQuery.data?.[0];
  const { videoRef, sourceSize, isLoading: poseLoading, error: poseError, currentMetrics } = usePoseSequence(POSE_SEQUENCE_URL);
  const overlayStatus = poseError
    ? `姿态数据加载失败 · ${poseError}`
    : poseLoading
      ? '姿态数据加载中...'
      : '示例回放中 · 可逐帧查看骨架与角度';
  const forcedVideoUrl = '/videos/c62c073f-57f4-401b-be54-986fcd22a7c8_output.mp4';
  const flowRef = useRef<HTMLDivElement>(null);
  const focusPoints = focus?.points ?? [];
  const shootingLine = focusPoints.length
    ? focusPoints.map((point, index) => ({ label: `第${index + 1}次`, value: point.shootingAccuracy }))
    : FALLBACK_SHOOTING;
  const velocityLine = focusPoints.length
    ? focusPoints.map((point, index) => ({ label: `第${index + 1}段`, value: point.verticalVelocity }))
    : FALLBACK_VELOCITY;

  // 滚动进入后激活流线与卡片揭示
  useEffect(() => {
    const node = flowRef.current;
    if (!node) return;
    const io = new IntersectionObserver(([entry]) => {
      if (entry.isIntersecting) node.classList.add('is-activated');
      else node.classList.remove('is-activated');
    }, { threshold: 0.15 });
    io.observe(node);
    return () => io.disconnect();
  }, []);

  return (
    <div className="space-y-8" id="parent-basketball-report">
      {/* 视频播放器和统计卡片区域 */}
      <div className="grid gap-6 lg:grid-cols-[1.7fr,1fr]">
        <div className="relative overflow-hidden rounded-3xl shadow-2xl">
          <VideoPlayerWithOverlay
            keypoints={[]}
            className="bg-slate-900 rounded-3xl"
            videoUrl={forcedVideoUrl}
            videoRef={videoRef}
            sourceSize={sourceSize}
            overlayFooter={<span className="text-xs text-slate-200">{overlayStatus}</span>}
          />
          {/* 视频装饰边框 */}
          <div className="absolute inset-0 rounded-3xl border-2 border-neon-cyan/30 pointer-events-none" />
        </div>

        <div className="flowline-stage space-y-4" data-keep ref={flowRef}>
          {/* 命中率卡片 - 霓虹效果 */}
          <div className="glass-card p-5 relative overflow-hidden group animate-slide-up">
            <div className="absolute top-0 right-0 h-20 w-20 bg-gradient-to-br from-neon-cyan/20 to-transparent rounded-bl-full" />
            <div className="relative z-10">
              <div className="flex items-center justify-between mb-3">
                <span className="text-sm font-medium text-slate-600 dark:text-slate-400">本周命中率</span>
                <Activity className="h-5 w-5 text-neon-cyan" />
              </div>
              <div className="flex items-baseline gap-2 mb-2">
                <span className="text-4xl font-bold gradient-text">
                  {focus ? focus.points[focus.points.length - 1].shootingAccuracy.toFixed(1) : '75'}
                </span>
                <span className="text-lg text-slate-500 dark:text-slate-400">%</span>
              </div>
              <div className="flex items-center gap-2">
                <span className="inline-flex items-center gap-1 text-xs font-semibold text-green-600 dark:text-green-400">
                  <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7h8m0 0v8m0-8l-8 8-4-4-6 6" />
                  </svg>
                  +5.6%
                </span>
                <span className="text-xs text-slate-500 dark:text-slate-400">较上周提升</span>
              </div>
            </div>
            {/* 装饰线条 */}
            <div className="absolute bottom-0 left-0 right-0 h-1 bg-gradient-to-r from-neon-cyan via-neon-purple to-neon-pink opacity-50 group-hover:opacity-100 transition-opacity" />
          </div>

          {/* 运球稳定指数卡片 */}
          <div className="glass-card p-5 relative overflow-hidden group animate-slide-up" style={{ animationDelay: '0.1s' }}>
            <div className="absolute top-0 right-0 h-20 w-20 bg-gradient-to-br from-neon-purple/20 to-transparent rounded-bl-full" />
            <div className="relative z-10">
              <div className="flex items-center justify-between mb-3">
                <span className="text-sm font-medium text-slate-600 dark:text-slate-400">运球稳定指数</span>
                <Brain className="h-5 w-5 text-neon-purple" />
              </div>
              <div className="flex items-baseline gap-2 mb-2">
                <span className="text-4xl font-bold gradient-text">
                  {focus ? (focus.points.reduce((acc, item) => acc + item.dribbleFrequency, 0) / focus.points.length).toFixed(2) : '2.2'}
                </span>
                <span className="text-lg text-slate-500 dark:text-slate-400">次/秒</span>
              </div>
              <div className="flex items-center gap-2">
                <span className="inline-flex items-center gap-1 text-xs font-semibold text-green-600 dark:text-green-400">
                  <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7h8m0 0v8m0-8l-8 8-4-4-6 6" />
                  </svg>
                  +3.1%
                </span>
                <span className="text-xs text-slate-500 dark:text-slate-400">核心控制更稳</span>
              </div>
            </div>
            <div className="absolute bottom-0 left-0 right-0 h-1 bg-gradient-to-r from-neon-purple via-neon-pink to-neon-cyan opacity-50 group-hover:opacity-100 transition-opacity" />
          </div>

          {/* 防摔倒预警卡片 - 增强警示效果 */}
          <Card className="glass-card border-2 border-orange-500/30 animate-slide-up neon-border-cyan" style={{ animationDelay: '0.2s' }}>
            <CardHeader className="pb-3">
              <div className="flex items-center gap-3">
                <div className="h-10 w-10 rounded-xl bg-gradient-to-br from-orange-500 to-red-500 flex items-center justify-center shadow-lg shadow-orange-500/50 animate-glow-pulse">
                  <ShieldAlert className="h-6 w-6 text-white" />
                </div>
                <CardTitle className="text-base font-bold gradient-text">防摔倒预警</CardTitle>
              </div>
            </CardHeader>
            <CardContent className="pt-0">
              <p className="text-sm leading-6 text-slate-600 dark:text-slate-300">
                当监测到重心高度突降或躯干倾角超阈值时，训练界面会<span className="font-semibold text-orange-600 dark:text-orange-400">闪烁并播放提醒音</span>，协助及时纠正落地动作。
              </p>
            </CardContent>
          </Card>
        </div>
      </div>

      {focus ? (
        <AnglePanel
          angles={[
            { id: 'wrist', label: '腕关节角', value: currentMetrics.right_elbow_angle || currentMetrics.left_elbow_angle || 0, threshold: 52, description: '出手阶段保持 50° 左右的锁定姿态' },
            { id: 'elbow', label: '肘部角度', value: currentMetrics.right_elbow_angle || currentMetrics.left_elbow_angle || 0, threshold: 82, description: '肘部抬升充分，配合肩部发力' },
            { id: 'shoulder', label: '肩关节', value: currentMetrics.right_shoulder_angle || currentMetrics.left_shoulder_angle || 0, threshold: 90, description: '肩部展臂顺滑，注意放松肩颈' },
            { id: 'knee', label: '膝关节', value: currentMetrics.right_knee_angle || currentMetrics.left_knee_angle || 0, threshold: 110, description: '蹬地蓄力充分，保持髋膝同向' },
          ]}
        />
      ) : null}

      <MetricsBar
        items={[
          { id: 'frequency', label: '运球频率', value: 2, unit: '次/秒', trend: 'stable' },
          { id: 'lean', label: '身体前倾', value: (currentMetrics.body_lean ?? 0) * 100, unit: 'cm', trend: 'stable' },
          { id: 'knee', label: '膝盖弯曲', value: currentMetrics.knee_flexion ?? 120, unit: '°', trend: 'stable' },
        ]}
      />

      <TrendCharts
        lineCardSubtitle="逐次训练表现曲线"
        barCardSubtitle="与阶段平均的柱状对比"
        tabs={[
          {
            key: 'shooting',
            label: '命中率趋势',
            unit: '%',
            line: shootingLine,
            bar: shootingLine.map(point => ({ ...point, value: Number(point.value.toFixed(2)) })),
            metricLabel: '命中率',
            summary: '命中率稳步提升，可继续强化核心稳定与随球手腕控制。',
            accentColor: 'var(--c-shoot)',
          },
          {
            key: 'velocity',
            label: '纵向速度对比',
            unit: 'cm/s',
            line: velocityLine,
            bar: velocityLine.map((point) => ({ ...point, value: Number(Math.max(point.value, 0).toFixed(2)) })),
            metricLabel: '纵向速度',
            summary: '纵向速度维持在 24~33cm/s，结合爆发力训练可进一步提升弹跳质量。',
            accentColor: 'var(--c-dribble)',
          },
        ]}
      />

      <div className="mt-12">
        <ReportCallout
          accent="orange"
          icon={<Flame className="h-6 w-6" />}
          title="个性化建议"
          description="加入 3 组原地高抬腿配合随球跳投，注意落地缓冲"
          actions={
            <ReportBuilder
              targetId="parent-basketball-report"
              fileName="篮球训练矫正报告.pdf"
              title="篮球动作矫正训练报告"
            />
          }
        />
      </div>
    </div>
  );
}

function ParentProfileTab() {
  const profileQuery = useAsyncData(() => getProfileByRole('parent'), []);

  const suggestions = [
    '肩颈开合拉伸每日 3 组，每组 30 秒，并配合胸椎旋转动作。',
    '投篮训练前加入 5 组无球交叉步起跳，巩固动力链。',
    '晚间进行 10 分钟核心激活（平板支撑、桥式），稳定骨盆与腰椎。',
  ];

  return (
    <div className="space-y-6" id="parent-profile-report">
      {profileQuery.data ? <ProfileCard profile={profileQuery.data} /> : null}

      <div className="grid gap-4 md:grid-cols-2">
        <Card className="u-card-glass">
          <CardHeader>
            <CardTitle className="text-base">关键指标纵览</CardTitle>
          </CardHeader>
          <CardContent className="grid gap-3 sm:grid-cols-2">
            <StatisticCard label="体态异常" value={9} unit="次/月" trend={{ direction: 'down', value: 21.4 }} />
            <StatisticCard label="累计时长" value={formatMinutes(186)} trend={{ direction: 'down', value: 18.6 }} />
            <StatisticCard label="命中率" value={78} unit="%" trend={{ direction: 'up', value: 7.8 }} />
            <StatisticCard label="运球稳定性" value={92} unit="分" trend={{ direction: 'up', value: 6.2 }} />
          </CardContent>
        </Card>
        <Card className="border-none bg-slate-100/80 dark:bg-slate-900/80">
          <CardHeader>
            <CardTitle className="text-base">7/30 天个性化建议</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3 text-sm text-slate-600 dark:text-slate-300">
            {suggestions.map((item, index) => (
              <div key={item} className="flex items-start gap-2">
                <span className="mt-1 inline-flex h-5 w-5 items-center justify-center rounded-full bg-brand/10 text-xs font-semibold text-brand">{index + 1}</span>
                <p>{item}</p>
              </div>
            ))}
          </CardContent>
        </Card>
      </div>

      <TrendCharts
        lineCardSubtitle="命中率与速度随训练次数的细腻走势"
        barCardSubtitle="将每次训练与阶段平均进行霓虹对比"
        tabs={[
          {
            key: 'quarter',
            label: '季度进步率',
            metricLabel: '进步率',
            unit: '%',
            line: [
              { label: 'Q1', value: 12.00 },
              { label: 'Q2', value: 18.00 },
              { label: 'Q3', value: 23.00 },
              { label: 'Q4', value: 29.00 },
            ],
            bar: [
              { label: 'Q1', value: 10.00 },
              { label: 'Q2', value: 16.00 },
              { label: 'Q3', value: 20.00 },
              { label: 'Q4', value: 24.00 },
            ],
            summary: '连续三个季度保持正向增长，可继续加强力量与柔韧结合训练。',
            accentColor: 'var(--c-shoot)',
          },
          {
            key: 'focus',
            label: '专项训练完成度',
            metricLabel: '完成度',
            unit: '%',
            line: [
              { label: '姿态矫正', value: 86.00 },
              { label: '投篮动作', value: 78.00 },
              { label: '运球稳定', value: 82.00 },
              { label: '防守移动', value: 75.00 },
            ],
            bar: [
              { label: '姿态矫正', value: 90.00 },
              { label: '投篮动作', value: 74.00 },
              { label: '运球稳定', value: 85.00 },
              { label: '防守移动', value: 70.00 },
            ],
            summary: '防守移动完成度偏低，建议加入低位滑步与折返跑训练。',
            accentColor: 'var(--c-defense)',
          },
        ]}
      />

      <div className="mt-12">
        <ReportCallout
          accent="cyan"
          title="导出成长档案"
          description="获取完整的个人矫正成长档案 PDF，方便分享与留存。"
          actions={
            <ReportBuilder
              targetId="parent-profile-report"
              fileName="个人成长档案报告.pdf"
              title="个人矫正成长档案"
            />
          }
          className="sm:items-center"
        />
      </div>
    </div>
  );
}

const PARENT_TABS = [
  { key: 'basketball', label: '篮球动作', path: '/parent/basketball', icon: <Activity className="h-5 w-5" /> },
  { key: 'profile', label: '成长档案', path: '/parent/profile', icon: <Brain className="h-5 w-5" /> },
];

export default function ParentTabs() {
  const location = useLocation();
  const activeKey = PARENT_TABS.find((tab) => location.pathname.startsWith(tab.path))?.key ?? 'basketball';

  return (
    <RoleTabsLayout
      tabs={PARENT_TABS}
      activeKey={activeKey}
      title="篮球动作分析 · 家长同步"
      subtitle="训练数据采集 · 成长追踪 · 个性化建议"
    >
      <Routes>
        <Route path="basketball" element={<ParentBasketballTab />} />
        <Route path="profile" element={<ParentProfileTab />} />
        <Route path="" element={<Navigate to="basketball" replace />} />
        <Route path="*" element={<Navigate to="basketball" replace />} />
      </Routes>
    </RoleTabsLayout>
  );
}
