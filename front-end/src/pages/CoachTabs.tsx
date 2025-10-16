import { useEffect, useState } from 'react';
import { Navigate, Route, Routes, useLocation } from 'react-router-dom';
import { CalendarRange, ClipboardCheck, Megaphone, Users2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Switch } from '@/components/ui/switch';
import { Textarea } from '@/components/ui/textarea';
import { ProfileCard } from '@/components/ProfileCard';
import { ReportBuilder } from '@/components/ReportBuilder';
import { RoleTabsLayout } from '@/components/RoleTabsLayout';
import { TrendCharts } from '@/components/TrendCharts';
import { useAsyncData } from '@/hooks/useAsyncData';
import { getTeamOverview } from '@/lib/api';
import { formatPercent } from '@/utils/format';
import type { TeamMemberSnapshot } from '@/types';
import { TrainingSelection } from './coach/TrainingSelection';
import { Dribbling } from './coach/Dribbling';
import { Defense } from './coach/Defense';
import { Shooting } from './coach/Shooting';

// 训练监测改为训练选择页面
function CoachTrainingTab() {
  return (
    <Routes>
      <Route path="/" element={<TrainingSelection />} />
      <Route path="dribbling" element={<Dribbling />} />
      <Route path="defense" element={<Defense />} />
      <Route path="shooting" element={<Shooting />} />
      <Route path="*" element={<Navigate to="/coach/training" replace />} />
    </Routes>
  );
}



function CoachTeamTab() {
  const teamQuery = useAsyncData(() => getTeamOverview(), []);
  const [newName, setNewName] = useState('');
  const [newRole, setNewRole] = useState('锋线');
  const [members, setMembers] = useState<TeamMemberSnapshot[]>([]);

  useEffect(() => {
    if (teamQuery.data) {
      setMembers(teamQuery.data.members);
    }
  }, [teamQuery.data]);



  const handleAdd = () => {
    if (!newName.trim()) return;
    setMembers((prev) => [
      ...prev,
      { id: 'member-' + (prev.length + 1), name: newName, progress: 70, specialization: newRole, riskLevel: '中' },
    ]);
    setNewName('');
  };

  return (
    <div className="space-y-6" id="coach-team-report">
      {teamQuery.data ? (
        <ProfileCard
          profile={{
            id: 'coach-profile',
            name: '张衡教练',
            age: 35,
            height: 182,
            weight: 78,
            role: 'coach',
            teamName: teamQuery.data.name,
            avatar: 'https://images.unsplash.com/photo-1579952363873-27f3bade9f55?auto=format&fit=facearea&w=120&h=120&q=60',
          }}
          extra={'球队进步率 ' + formatPercent(teamQuery.data.progressRate, 1) + ' · 动作规范度 ' + formatPercent(teamQuery.data.complianceScore, 1)}
        />
      ) : null}

      <Card className="border-none bg-white/90 shadow-brand dark:bg-slate-900/80">
        <CardHeader>
          <CardTitle className="text-base">队员档案管理</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid gap-4 md:grid-cols-3">
            <div className="space-y-2">
              <Label htmlFor="member-name">队员姓名</Label>
              <Input id="member-name" value={newName} onChange={(event) => setNewName(event.target.value)} placeholder="请输入" />
            </div>
            <div className="space-y-2">
              <Label htmlFor="member-role">专项位置</Label>
              <Input id="member-role" value={newRole} onChange={(event) => setNewRole(event.target.value)} />
            </div>
            <div className="flex items-end">
              <Button className="w-full" onClick={handleAdd}>
                添加队员
              </Button>
            </div>
          </div>
          <ScrollArea className="h-56 rounded-3xl border border-slate-200/70 p-4 dark:border-slate-800">
            <table className="w-full text-sm">
              <thead className="text-left text-slate-500 dark:text-slate-300">
                <tr>
                  <th className="py-2">队员</th>
                  <th>专项</th>
                  <th>规范度</th>
                  <th>风险等级</th>
                </tr>
              </thead>
              <tbody className="text-slate-700 dark:text-slate-200">
                {members.map((member) => (
                  <tr key={member.id} className="border-t border-slate-100/80 dark:border-slate-800/80">
                    <td className="py-2">{member.name}</td>
                    <td>{member.specialization}</td>
                    <td>{member.progress.toFixed(1)}%</td>
                    <td>{member.riskLevel}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </ScrollArea>
        </CardContent>
      </Card>

      <TrendCharts
        tabs={[
          {
            key: 'progress',
            label: '月度规范度',
            unit: '%',
            line: teamQuery.data?.monthlyProgress ?? [],
            metricLabel: '动作规范度',
            summary: '规范度逐月上升，防守协同和投篮节奏持续改善。',
          },
        ]}
      />

      <div className="flex justify-end">
        <ReportBuilder targetId="coach-team-report" fileName="球队档案报告.pdf" title="球队动作规范度对比报告" />
      </div>
    </div>
  );
}

function CoachPlanTab() {
  const [schedule, setSchedule] = useState([
    { id: 'plan-1', date: '周二 18:30', content: '投篮节奏强化 + 核心稳定训练' },
    { id: 'plan-2', date: '周四 18:30', content: '防守滑步 + 低位卡位练习' },
    { id: 'plan-3', date: '周六 09:00', content: '分组对抗赛 + 标注关键动作' },
  ]);
  const [message, setMessage] = useState('本周训练侧重投篮出手定型，请保持核心收紧。');
  const [enableReminder, setEnableReminder] = useState(true);
  const [latestFeedback, setLatestFeedback] = useState<string[]>([]);

  const handleAddPlan = () => {
    setSchedule((prev) => [...prev, { id: 'plan-' + (prev.length + 1), date: '待定', content: '自定义训练计划' }]);
  };

  // 设置默认反馈信息
  useEffect(() => {
    const feedbackList = [
      '后卫组：防守滑步配合提升 12%，期待下次强化对抗',
      '内线组：篮板卡位时机更准确，但落地缓冲仍需提醒',
      '全队：体能储备充足，注意训练后拉伸恢复'
    ];
    setLatestFeedback(feedbackList);
  }, []);

  return (
    <div className="space-y-6" id="coach-plan-report">
      <Card className="border-none bg-white/90 shadow-brand dark:bg-slate-900/80">
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle className="text-base">训练日程安排</CardTitle>
          <Button variant="outline" size="sm" onClick={handleAddPlan}>
            添加计划
          </Button>
        </CardHeader>
        <CardContent className="space-y-3">
          {schedule.map((item) => (
            <div key={item.id} className="rounded-2xl bg-slate-100/80 px-4 py-3 text-sm text-slate-600 dark:bg-slate-900/70 dark:text-slate-300">
              <p className="font-semibold text-slate-800 dark:text-slate-100">{item.date}</p>
              <p className="mt-1 text-xs">{item.content}</p>
            </div>
          ))}
        </CardContent>
      </Card>

      <Card className="border-none bg-slate-100/80 dark:bg-slate-900/80">
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle className="text-base">训练提醒与消息</CardTitle>
          <Switch checked={enableReminder} onCheckedChange={setEnableReminder} aria-label="开启训练提醒" />
        </CardHeader>
        <CardContent className="space-y-3 text-sm text-slate-600 dark:text-slate-300">
          <div className="rounded-2xl bg-white/90 p-4 dark:bg-slate-900/80">
            <p className="text-xs text-slate-500">推送内容</p>
            <Textarea value={message} onChange={(event) => setMessage(event.target.value)} rows={3} />
            <Button variant="ghost" size="sm" className="mt-2 self-end">
              <Megaphone className="mr-2 h-4 w-4" /> 发送到队员端
            </Button>
          </div>
          <div className="rounded-2xl bg-white/90 p-4 dark:bg-slate-900/80">
            <p className="text-xs text-slate-500">最新反馈</p>
            <ul className="mt-2 space-y-1">
              {latestFeedback.length > 0 ? (
                latestFeedback.map((feedback, index) => (
                  <li key={index} className="text-sm">{feedback}</li>
                ))
              ) : (
                <li className="text-sm text-slate-400">暂无反馈数据</li>
              )}
            </ul>
          </div>
        </CardContent>
      </Card>

      <TrendCharts
        tabs={[
          {
            key: 'reminder',
            label: '提醒响应率',
            unit: '%',
            line: [
              { label: '第1周', value: 72 },
              { label: '第2周', value: 78 },
              { label: '第3周', value: 85 },
              { label: '第4周', value: 91 },
            ],
            metricLabel: '响应率',
            summary: '提醒响应率持续提升，可继续推送针对性训练目标。',
          },
        ]}
      />

      <div className="flex justify-end">
        <ReportBuilder targetId="coach-plan-report" fileName="训练计划与提醒.pdf" title="训练计划与提醒执行报告" />
      </div>
    </div>
  );
}

const COACH_TABS = [
  { key: 'training', label: '训练分析', path: '/coach/training', icon: <ClipboardCheck className="h-5 w-5" /> },
  { key: 'team', label: '球队档案', path: '/coach/team', icon: <Users2 className="h-5 w-5" /> },
  { key: 'plan', label: '训练计划', path: '/coach/plan', icon: <CalendarRange className="h-5 w-5" /> },
];

export default function CoachTabs() {
  const location = useLocation();
  const activeKey = COACH_TABS.find((tab) => location.pathname.startsWith(tab.path))?.key ?? 'training';

  return (
    <RoleTabsLayout
      tabs={COACH_TABS}
      activeKey={activeKey}
      title="动作矫正监测 · 教练视角"
      subtitle="训练分析 · 球队档案 · 计划消息"
    >
      <Routes>
        <Route path="training/*" element={<CoachTrainingTab />} />
        <Route path="team" element={<CoachTeamTab />} />
        <Route path="plan" element={<CoachPlanTab />} />
        <Route path="" element={<Navigate to="training" replace />} />
        <Route path="*" element={<Navigate to="training" replace />} />
      </Routes>
    </RoleTabsLayout>
  );
}
