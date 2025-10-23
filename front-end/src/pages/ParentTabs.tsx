import { Navigate, Route, Routes, useLocation } from 'react-router-dom';
import { Activity, Brain, Flame, ShieldAlert } from 'lucide-react';
import { AnglePanel } from '@/components/AnglePanel';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { MetricsBar } from '@/components/MetricsBar';
import { ProfileCard } from '@/components/ProfileCard';
import { ReportBuilder } from '@/components/ReportBuilder';
import { RoleTabsLayout } from '@/components/RoleTabsLayout';
import { StatisticCard } from '@/components/StatisticCard';
import { TrendCharts } from '@/components/TrendCharts';
import { VideoPlayerWithOverlay } from '@/components/VideoPlayerWithOverlay';
import { useAsyncData } from '@/hooks/useAsyncData';
import { usePoseSequence } from '@/hooks/usePoseSequence';
import { getProfileByRole, getTrainingSessions } from '@/lib/api';
import { formatMinutes } from '@/utils/format';
import type { TrainingSession } from '@/types';

const POSE_SEQUENCE_URL = '/poses/dribble_sequence.json';



function ParentBasketballTab() {
  const sessionsQuery = useAsyncData(() => getTrainingSessions(), []);
  const focus: TrainingSession | undefined = sessionsQuery.data?.[0];
  const { videoRef, sourceSize, isLoading: poseLoading, error: poseError, currentMetrics } = usePoseSequence(POSE_SEQUENCE_URL);
  const overlayStatus = poseError
    ? `姿态数据加载失败 · ${poseError}`
    : poseLoading
      ? '姿态数据加载中...'
      : '示例回放中 · 可逐帧查看骨架与角度';

  // 强制使用指定的输出视频
  const forcedVideoUrl = '/videos/c62c073f-57f4-401b-be54-986fcd22a7c8_output.mp4';

  return (
    <div className="space-y-6" id="parent-basketball-report">
      <div className="grid gap-4 lg:grid-cols-[1.7fr,1fr]">
        <VideoPlayerWithOverlay
          keypoints={[]}
          className="bg-slate-900"
          videoUrl={forcedVideoUrl}
          videoRef={videoRef}
          sourceSize={sourceSize}
          overlayFooter={<span className="text-xs text-slate-200">{overlayStatus}</span>}
        />
        <div className="space-y-3">
          <StatisticCard label="本周命中率" value={focus ? focus.points[focus.points.length - 1].shootingAccuracy.toFixed(1) : '75'} unit="%" trend={{ direction: 'up', value: 5.6 }} caption="较上周提升" />
          <StatisticCard label="运球稳定指数" value={focus ? (focus.points.reduce((acc, item) => acc + item.dribbleFrequency, 0) / focus.points.length).toFixed(2) : '2.2'} unit="次/秒" trend={{ direction: 'up', value: 3.1 }} caption="核心控制更稳" />
          <Card className="border-none bg-slate-100/80 dark:bg-slate-900/80">
            <CardHeader className="flex flex-row items-center gap-2">
              <ShieldAlert className="h-5 w-5 text-accent" />
              <CardTitle className="text-base">防摔倒预警</CardTitle>
            </CardHeader>
            <CardContent className="text-xs leading-5 text-slate-500 dark:text-slate-300">
              当监测到重心高度突降或躯干倾角超阈值时，训练界面会闪烁并播放提醒音，协助及时纠正落地动作。
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
        tabs={[
          {
            key: 'shooting',
            label: '命中率趋势',
            unit: '%',
            line: (focus?.points ?? []).map((point, index) => ({ label: '第' + (index + 1) + '次', value: point.shootingAccuracy })),
            metricLabel: '命中率',
            summary: '命中率稳步提升，可继续强化核心稳定与随球手腕控制。',
          },
          {
            key: 'velocity',
            label: '纵向速度',
            unit: 'cm/s',
            line: (focus?.points ?? []).map((point, index) => ({ label: '第' + (index + 1) + '段', value: point.verticalVelocity })),
            metricLabel: '纵向速度',
            summary: '纵向速度维持在 25~32cm/s，结合爆发力训练可进一步提升弹跳质量。',
          },
        ]}
      />

      <div className="flex flex-wrap items-center justify-between gap-3 text-xs text-slate-500 dark:text-slate-300">
        <div className="flex items-center gap-2">
          <Flame className="h-4 w-4 text-brand" />
          个性化建议：加入 3 组原地高抬腿配合随球跳投，注意落地缓冲。
        </div>
        <ReportBuilder targetId="parent-basketball-report" fileName="篮球训练矫正报告.pdf" title="篮球动作矫正训练报告" />
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
        <Card className="border-none bg-white/90 shadow-brand dark:bg-slate-900/80">
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
        tabs={[
          {
            key: 'quarter',
            label: '季度进步率',
                  metricLabel: '进步率',
            unit: '%',
            line: [
              { label: 'Q1', value: 12 },
              { label: 'Q2', value: 18 },
              { label: 'Q3', value: 23 },
              { label: 'Q4', value: 29 },
            ],
            summary: '连续三个季度保持正向增长，可继续加强力量与柔韧结合训练。',
          },
          {
            key: 'focus',
            label: '专项训练完成度',
                  metricLabel: '完成度',
            unit: '%',
            line: [
              { label: '姿态矫正', value: 86 },
              { label: '投篮动作', value: 78 },
              { label: '运球稳定', value: 82 },
              { label: '防守移动', value: 75 },
            ],
            summary: '防守移动完成度偏低，建议加入低位滑步与折返跑训练。',
          },
        ]}
      />

      <div className="flex justify-end">
        <ReportBuilder targetId="parent-profile-report" fileName="个人成长档案报告.pdf" title="个人矫正成长档案" />
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
