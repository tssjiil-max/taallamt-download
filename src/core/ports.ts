import { ComprehensiveAssessment, CurriculumTarget, PortfolioEvent, RemediationPlan, Student } from './domain';
import { ClassSession, TimetableEntry, WeeklyPlanItem } from './session';

export interface StudentRepository {
  listActive(): Promise<Student[]>;
  get(studentId: string): Promise<Student | null>;
  save(student: Student): Promise<void>;
  archive(studentId: string): Promise<void>;
}

export interface CurriculumRepository {
  listTargets(subject?: CurriculumTarget['subject']): Promise<CurriculumTarget[]>;
  saveTargets(targets: CurriculumTarget[]): Promise<void>;
}

export interface LearningRepository {
  getSession(sessionId: string): Promise<ClassSession | null>;
  saveSession(session: ClassSession): Promise<void>;
  saveAssessment(assessment: ComprehensiveAssessment): Promise<void>;
  listStudentAssessments(studentId: string): Promise<ComprehensiveAssessment[]>;
  saveRemediation(plan: RemediationPlan): Promise<void>;
  appendPortfolio(events: PortfolioEvent[]): Promise<void>;
  listTimetable(classId: string): Promise<TimetableEntry[]>;
  listWeeklyPlan(weekKey: string): Promise<WeeklyPlanItem[]>;
}

// هذه Ports فقط. Firebase/Firestore سيكون Adapter منفصل، وكذلك أي واجهة مستقبلية.
