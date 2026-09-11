export type Mastery = 'mastered' | 'needs_practice' | 'not_mastered';
export type AssessmentTrack = 'general' | 'focused';
export type BehaviorTone = 'positive' | 'needs_attention';

export interface Student {
  id: string;
  fullName: string;
  active: boolean;
  guardian?: { name?: string; whatsapp?: string };
  createdAt: string;
  archivedAt?: string;
}

export interface CurriculumTarget {
  id: string;
  subject: 'arabic' | 'quran' | 'islamic' | 'spelling' | 'handwriting';
  title: string;
  unit?: string;
  skill?: string;
  reference?: string;
}

export interface AssessmentItem {
  targetId: string;
  result: Mastery;
}

export interface BehaviorItem {
  code: string;
  label: string;
  tone: BehaviorTone;
}

export interface ComprehensiveAssessment {
  id: string;
  studentId: string;
  classSessionId: string;
  sessionDate: string;
  enteredAt: string;
  track: AssessmentTrack;
  academic: AssessmentItem[];
  behavior: BehaviorItem[];
}

export interface RemediationPlan {
  id: string;
  studentId: string;
  targetId: string;
  trigger: 'three_not_mastered';
  status: 'active' | 'improved' | 'resolved' | 'needs_more_support';
  startedAt: string;
  resolvedAt?: string;
}

export interface PortfolioEvent {
  id: string;
  studentId: string;
  type: 'mastery' | 'improvement' | 'remediation_started' | 'remediation_improved' | 'remediation_resolved' | 'achievement' | 'positive_behavior';
  occurredAt: string;
  sourceId: string;
  summary: string;
}

export interface RewardLedger {
  studentId: string;
  month: string;
  stars: number; // capped at 30
}

export const MONTHLY_STAR_CAP = 30;
export const REMEDIATION_TRIGGER_COUNT = 3;
