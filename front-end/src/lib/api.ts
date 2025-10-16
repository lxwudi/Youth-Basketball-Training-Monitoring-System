import { remoteSources } from '@/data/remoteSources';
import { mockSessions } from '@/mock/basketball';
import { mockTeamOverview } from '@/mock/students';
import { wait } from '@/lib/utils';
import type {
  StudentProfile,
  TeamOverview,
  TrainingSession,
  UserRole,
} from '@/types';

const REMOTE_ERROR_PREFIX = '远程数据源不可用:';



async function tryFetchJson<T>(url: string): Promise<T> {
  const response = await fetch(url);
  if (!response.ok) throw new Error(`${REMOTE_ERROR_PREFIX} ${url}`);
  return response.json() as Promise<T>;
}

const mockStudents = [
  { id: 'student-01', name: '李明', age: 14, height: 165, weight: 52, role: 'parent' as const, className: '启航实验班' },
  { id: 'student-02', name: '王芳', age: 15, height: 160, weight: 48, role: 'parent' as const, className: '启航实验班' },
  { id: 'student-03', name: '张伟', age: 14, height: 168, weight: 55, role: 'parent' as const, className: '启航实验班' },
];

async function fetchRemoteTeamsSample(): Promise<string[]> {
  for (const url of remoteSources.teamRoster) {
    try {
      const data = await tryFetchJson<Array<Record<string, unknown>>>(url);
      const names = data
        .map((item) => String(item['teamName'] ?? item['simpleName'] ?? ''))
        .filter(Boolean)
        .slice(0, 6);
      if (names.length) return names;
    } catch (error) {
      console.warn('远程球队数据获取失败', error);
    }
  }
  return [];
}

async function fetchRemoteSessions(): Promise<TrainingSession[] | null> {
  for (const url of remoteSources.basketballSessions) {
    try {
      const data = await tryFetchJson<Array<Record<string, unknown>>>(url);
      if (!Array.isArray(data) || data.length === 0) continue;
      const sessions: TrainingSession[] = data.slice(0, 18).map((item, index) => {
        const distance = Number(item['distance'] ?? item['driving'] ?? 0);
        const cost = Number(item['cost'] ?? index * 3);
        const baseTimestamp = new Date(Date.now() - (index + 1) * 180_000).toISOString();
        return {
          id: `remote-${index}`,
          athleteId: mockStudents[index % mockStudents.length].id,
          phase: index % 3 === 0 ? '投篮' : index % 3 === 1 ? '运球' : '防守',
          points: Array.from({ length: 12 }, (_, pointIndex) => ({
            timestamp: new Date(Date.parse(baseTimestamp) + pointIndex * 60_000).toISOString(),
            wristAngle: Number((46 + distance * 0.25 + pointIndex * 0.6).toFixed(2)),
            elbowAngle: Number((82 + distance * 0.2 + pointIndex * 0.4).toFixed(2)),
            shoulderAngle: Number((94 + cost * 0.35 + pointIndex * 0.5).toFixed(2)),
            kneeAngle: Number((110 - distance * 0.08 + pointIndex * 0.3).toFixed(2)),
            ballHeight: Number((178 + distance * 0.5 + pointIndex * 0.8).toFixed(2)),
            dribbleFrequency: Number((1.6 + cost * 0.02 + (pointIndex % 3) * 0.12).toFixed(2)),
            centerOfMass: Number((95 - distance * 0.04 + (pointIndex % 4) * 0.5).toFixed(2)),
            verticalVelocity: Number((26 + cost * 0.1 + pointIndex * 0.4).toFixed(2)),
            shootingAccuracy: Number((60 + distance * 0.12 + pointIndex * 0.5).toFixed(2)),
          })),
          feedback: ['基于远程公开数据生成的虚拟训练指标'],
        } satisfies TrainingSession;
      });
      return sessions;
    } catch (error) {
      console.warn('远程篮球数据获取失败', error);
    }
  }
  return null;
}

export async function getTrainingSessions(): Promise<TrainingSession[]> {
  const remote = await fetchRemoteSessions();
  if (remote) return remote;
  await wait(160);
  return mockSessions;
}

export async function getProfileByRole(role: UserRole): Promise<StudentProfile> {
  await wait(120);
  const fallback = mockStudents[0];
  if (role === 'parent') return fallback;
  return {
    id: 'coach-profile',
    name: '张衡',
    age: 35,
    height: 182,
    weight: 78,
    role,
    className: undefined,
    teamName: '启航少年队',
    avatar: 'https://images.unsplash.com/photo-1579952363873-27f3bade9f55?auto=format&fit=facearea&w=120&h=120&q=60',
  };
}

export async function getStudentProfile(id: string): Promise<StudentProfile | null> {
  await wait(100);
  return mockStudents.find((student) => student.id === id) ?? null;
}

export async function getTeamOverview(): Promise<TeamOverview> {
  const remoteTeamsSample = await fetchRemoteTeamsSample();
  await wait(150);
  return { ...mockTeamOverview, remoteTeamsSample };
}

// ===== 视频分析API =====

const API_BASE_URL = 'http://localhost:5000/api';

export interface VideoAnalysisTask {
  task_id: string;
  status: 'uploaded' | 'processing' | 'completed' | 'failed';
  progress: number;
  error?: string;
}

export interface MetricsFrame {
  frame: number;
  timestamp: number;
  people: Array<{
    person_id: number;
    metrics: Record<string, number>;
  }>;
}

export async function uploadVideo(
  file: File,
  trainingType: 'dribbling' | 'defense' | 'shooting'
): Promise<{ task_id: string }> {
  const formData = new FormData();
  formData.append('video', file);
  formData.append('training_type', trainingType);

  const response = await fetch(`${API_BASE_URL}/upload`, {
    method: 'POST',
    body: formData,
  });

  if (!response.ok) {
    throw new Error('视频上传失败');
  }

  return response.json();
}

export async function getTaskStatus(taskId: string): Promise<VideoAnalysisTask> {
  const response = await fetch(`${API_BASE_URL}/status/${taskId}`);
  
  if (!response.ok) {
    throw new Error('获取任务状态失败');
  }

  return response.json();
}

export async function getAnalysisResult(taskId: string): Promise<{ metrics: MetricsFrame[] }> {
  const response = await fetch(`${API_BASE_URL}/result/${taskId}`);
  
  if (!response.ok) {
    throw new Error('获取分析结果失败');
  }

  return response.json();
}

export function getVideoUrl(taskId: string): string {
  return `${API_BASE_URL}/video/${taskId}`;
}

export async function getPoseSequence(taskId: string): Promise<{
  videoSource: string;
  frameRate: number;
  size: { width: number; height: number };
  frames: Array<{
    time: number;
    keypoints: Array<{ name: string; x: number; y: number; confidence: number }>;
    metrics: Record<string, number>;
  }>;
}> {
  const response = await fetch(`${API_BASE_URL}/pose-sequence/${taskId}`);

  if (!response.ok) {
    throw new Error('获取骨架序列数据失败');
  }

  return response.json();
}

// ===== 大模型API接口 =====

export interface AIAnalysisRequest {
  trainingType: 'shooting' | 'dribbling' | 'defense';
  metrics: MetricsFrame[];
  videoSummary?: string;
}

export interface AIAnalysisResponse {
  summary: string;
  suggestions: string[];
  improvementAreas: string[];
  strengths: string[];
  overallScore: number;
}

export interface TrainingReport {
  id: string;
  studentId: string;
  studentName: string;
  trainingType: 'shooting' | 'dribbling' | 'defense';
  analysisResult: AIAnalysisResponse;
  metrics: MetricsFrame[];
  timestamp: string;
  sentToParent: boolean;
}

export async function analyzeWithAI(request: AIAnalysisRequest): Promise<AIAnalysisResponse> {
  const response = await fetch(`${API_BASE_URL}/ai-analysis`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(request),
  });

  if (!response.ok) {
    throw new Error('AI分析失败');
  }

  return response.json();
}

export async function generateTrainingReport(
  studentId: string,
  studentName: string,
  trainingType: 'shooting' | 'dribbling' | 'defense',
  analysisResult: AIAnalysisResponse,
  metrics: MetricsFrame[]
): Promise<TrainingReport> {
  const response = await fetch(`${API_BASE_URL}/training-reports`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      studentId,
      studentName,
      trainingType,
      analysisResult,
      metrics,
    }),
  });

  if (!response.ok) {
    throw new Error('生成训练报告失败');
  }

  return response.json();
}

export async function sendReportToParent(reportId: string, parentId: string): Promise<{ success: boolean; message: string }> {
  const response = await fetch(`${API_BASE_URL}/send-report-to-parent`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      reportId,
      parentId,
    }),
  });

  if (!response.ok) {
    throw new Error('发送报告到家长端失败');
  }

  return response.json();
}

export async function getStudentsList(): Promise<Array<{ id: string; name: string; parentId: string }>> {
  const response = await fetch(`${API_BASE_URL}/students`);

  if (!response.ok) {
    throw new Error('获取学员列表失败，请检查网络连接或联系管理员');
  }

  return response.json();
}

export async function getStudentReports(studentId: string): Promise<TrainingReport[]> {
  const response = await fetch(`${API_BASE_URL}/students/${studentId}/reports`);

  if (!response.ok) {
    return [];
  }

  return response.json();
}
