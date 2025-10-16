import type { StudentProfile, TeamOverview } from '@/types';

export const mockStudents: StudentProfile[] = [
  { id: 'student-01', name: '李明', age: 14, height: 165, weight: 52, role: 'parent', className: '启航实验班' },
  { id: 'student-02', name: '王芳', age: 15, height: 160, weight: 48, role: 'parent', className: '启航实验班' },
  { id: 'student-03', name: '张伟', age: 14, height: 168, weight: 55, role: 'parent', className: '启航实验班' },
];

export const mockTeamOverview: TeamOverview = {
  id: 'team-001',
  name: '启航少年队',
  coach: '张衡',
  members: [
    { id: 'member-1', name: '李明', progress: 75, specialization: '锋线', riskLevel: '低' },
    { id: 'member-2', name: '王芳', progress: 82, specialization: '后卫', riskLevel: '中' },
    { id: 'member-3', name: '张伟', progress: 68, specialization: '中锋', riskLevel: '低' },
  ],
  progressRate: 12.5,
  complianceScore: 88.3,
  riskSummary: {
    falling: 2,
    shoulder: 1,
    knee: 3,
  },
  monthlyProgress: [
    { label: '1月', value: 65 },
    { label: '2月', value: 72 },
    { label: '3月', value: 78 },
    { label: '4月', value: 85 },
  ],
  remoteTeamsSample: [],
};