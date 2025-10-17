export type UserRole = 'parent' | 'coach';

export type AuthUser = {
  id: string;
  name: string;
  role: UserRole;
};



export type BasketballPhase = '投篮' | '运球' | '防守';

export type BasketballMetricPoint = {
  timestamp: string;
  wristAngle: number;
  elbowAngle: number;
  shoulderAngle: number;
  kneeAngle: number;
  ballHeight: number;
  dribbleFrequency: number;
  centerOfMass: number;
  verticalVelocity: number;
  shootingAccuracy: number;
};

export type TrainingSession = {
  id: string;
  athleteId: string;
  phase: BasketballPhase;
  points: BasketballMetricPoint[];
  feedback: string[];
};

export type StudentProfile = {
  id: string;
  name: string;
  age: number;
  height: number;
  weight: number;
  role: UserRole;
  className?: string;
  teamName?: string;
  avatar?: string;
};

export type TrendPoint = {
  label: string;
  value: number;
};

export type ReportSection = {
  title: string;
  description?: string;
  chartId?: string;
};



export type TeamMemberSnapshot = {
  id: string;
  name: string;
  progress: number;
  specialization: string;
  riskLevel: string;
};

export type TeamOverview = {
  id: string;
  name: string;
  coach: string;
  members: TeamMemberSnapshot[];
  progressRate: number;
  complianceScore: number;
  riskSummary: {
    falling: number;
    shoulder: number;
    knee: number;
  };
  monthlyProgress: TrendPoint[];
  remoteTeamsSample: string[];
};
