import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import type { StudentProfile } from '@/types';

export function ProfileCard({ profile, extra }: { profile: StudentProfile; extra?: React.ReactNode }) {
  const roleCopy = {
    parent: {
      specialty: '课堂体态矫正感知强 · 上肢灵活度佳',
      goal: '课堂保持颈肩直立，巩固核心稳定性，并提升下肢对称受力。',
    },
    teacher: {
      specialty: '体态教学经验丰富 · 班级管理节奏稳',
      goal: '构建课堂矫正闭环，保持家校沟通顺畅，并优化异常干预策略。',
    },
    coach: {
      specialty: '动作分解到位 · 训练节奏掌控力强',
      goal: '稳定运动员核心姿态，提升专项力量输出，降低伤病风险。',
    },
  } as const;

  const copy = roleCopy[profile.role] ?? {
    specialty: '体态控制良好 · 具备持续进步潜力',
    goal: '保持姿态稳定与动作协同，逐步提高专项表现。',
  };

  return (
    <Card className="u-card-glass">
      <CardHeader className="flex flex-row items-center gap-4">
        {profile.avatar ? (
          <img
            src={profile.avatar}
            alt={profile.name}
            className="avatar-anim h-16 w-16 rounded-2xl object-cover shadow"
          />
        ) : (
          <div className="avatar-anim flex h-16 w-16 items-center justify-center rounded-2xl bg-brand/20 text-xl font-semibold text-brand">
            {profile.name?.at(0)}
          </div>
        )}
        <div className="flex-1">
          <CardTitle className="text-lg">{profile.name}</CardTitle>
          <p className="text-xs text-slate-500 dark:text-slate-300">
            {profile.role === 'parent' ? '学生档案' : '篮球教练'} · {profile.className ?? profile.teamName ?? '教研组'}
          </p>
          <p className="mt-1 text-xs text-slate-400">
            年龄 {profile.age} · 身高 {profile.height}cm · 体重 {profile.weight}kg
          </p>
        </div>
        {extra ? <div className="text-right text-xs text-slate-500">{extra}</div> : null}
      </CardHeader>
      <CardContent className="text-sm text-slate-600 dark:text-slate-300">
        <p>{profile.role === 'coach' ? '训练特长' : '运动特长'}：{copy.specialty}</p>
        <p className="mt-1">矫正目标：{copy.goal}</p>
      </CardContent>
    </Card>
  );
}
