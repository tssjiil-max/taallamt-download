import type { ComprehensiveAssessment, CurriculumTarget, PortfolioEvent, RemediationPlan, Student } from './domain';
import type { ClassSession, TimetableEntry, WeeklyPlanItem } from './session';
export interface StudentRepository{listActive():Promise<Student[]>;get(studentId:string):Promise<Student|null>;save(student:Student):Promise<void>;archive(studentId:string):Promise<void>}
export interface CurriculumRepository{listTargets(subject?:CurriculumTarget['subject']):Promise<CurriculumTarget[]>;saveTargets(targets:CurriculumTarget[]):Promise<void>}
export interface LearningRepository{
 getSession(sessionId:string):Promise<ClassSession|null>;saveSession(session:ClassSession):Promise<void>;
 saveAssessment(assessment:ComprehensiveAssessment):Promise<void>;listStudentAssessments(studentId:string):Promise<ComprehensiveAssessment[]>;
 saveRemediation(plan:RemediationPlan):Promise<void>;listStudentRemediation(studentId:string):Promise<RemediationPlan[]>;
 appendPortfolio(events:PortfolioEvent[]):Promise<void>;listStudentPortfolio(studentId:string):Promise<PortfolioEvent[]>;
 listTimetable(classId:string):Promise<TimetableEntry[]>;listWeeklyPlan(weekKey:string):Promise<WeeklyPlanItem[]>;
}
