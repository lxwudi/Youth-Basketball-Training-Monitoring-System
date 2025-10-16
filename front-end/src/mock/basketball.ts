import type { BasketballMetricPoint, TrainingSession } from '@/types';

function buildPoints(phase: '投篮' | '运球' | '防守'): BasketballMetricPoint[] {
  return Array.from({ length: 18 }, (_, index) => {
    const baseTime = new Date(Date.now() - (18 - index) * 120_000).toISOString();
    const mod = Math.sin(index / 3) * 6;
    return {
      timestamp: baseTime,
      wristAngle: Number((phase === '投篮' ? 52 : 44 + mod).toFixed(2)),
      elbowAngle: Number((phase === '投篮' ? 84 : 76 + mod * 0.4).toFixed(2)),
      shoulderAngle: Number((phase === '防守' ? 90 : 96 + mod * 0.3).toFixed(2)),
      kneeAngle: Number((phase === '运球' ? 108 : 112 + mod * 0.2).toFixed(2)),
      ballHeight: Number((phase === '投篮' ? 185 : 170 + Math.cos(index / 2) * 18).toFixed(2)),
      dribbleFrequency: Number((phase === '运球' ? 2.4 + Math.sin(index / 4) * 0.4 : 1.6).toFixed(2)),
      centerOfMass: Number((phase === '防守' ? 92 : 96 - Math.sin(index / 5) * 2).toFixed(2)),
      verticalVelocity: Number((phase === '投篮' ? 28 + Math.sin(index / 6) * 4 : 22 + Math.sin(index / 4) * 3).toFixed(2)),
      shootingAccuracy: Number((phase === '投篮' ? 65 + index * 1.5 : 0).toFixed(2)),
    };
  });
}

export const mockSessions: TrainingSession[] = [
  {
    id: 'session-001',
    athleteId: 'student-01',
    phase: '投篮',
    points: buildPoints('投篮'),
    feedback: ['出手最高点稳定', '随球手腕控制良好', '命中率较上周提升 6%'],
  },
  {
    id: 'session-002',
    athleteId: 'student-02',
    phase: '运球',
    points: buildPoints('运球'),
    feedback: ['换手动作流畅', '重心控制波动 < 6cm', '建议增加低位防守移动'],
  },
  {
    id: 'session-003',
    athleteId: 'student-03',
    phase: '防守',
    points: buildPoints('防守'),
    feedback: ['侧移速度提升 15%', '判断防守角度准确率 92%', '注意保持落地缓冲'],
  },
];
