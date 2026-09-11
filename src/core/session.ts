import { CurriculumTarget } from './domain';

export interface ClassSession {
  id: string;
  classId: string;
  subject: CurriculumTarget['subject'];
  scheduledDate: string;
  period?: number;
  targetIds: string[];
  assessmentStatus: 'not_assessed' | 'partially_assessed' | 'assessed';
}

export interface TimetableEntry {
  classId: string;
  weekday: number; // 0 Sunday .. 4 Thursday
  period: number;
  subject: CurriculumTarget['subject'];
}

export interface WeeklyPlanItem {
  id: string;
  weekKey: string;
  subject: CurriculumTarget['subject'];
  targetIds: string[];
  publishStatus: 'draft' | 'ready' | 'published';
  publishOnSaturday: boolean;
}

// لا نفترض غياب الطالب أو عدم إتقانه عند غياب تقييم الحصة.
export const isSessionPendingAssessment = (session: ClassSession) =>
  session.assessmentStatus === 'not_assessed';
