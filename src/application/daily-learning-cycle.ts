import type { ComprehensiveAssessment, RemediationPlan } from '../core/domain';
import type { Homework, HomeworkEvidence } from '../core/homework';
import type { WeeklyPlanItem } from '../core/session';
import { visibleStudentPlan } from '../core/weekly-plan-engine';
import { isOpenRemediation } from '../core/remediation';

export interface DailyLearningState {studentId:string;weeklyPlan:WeeklyPlanItem[];homework:Homework[];homeworkEvidence:HomeworkEvidence[];assessments:ComprehensiveAssessment[];remediation:RemediationPlan[]}
export function buildDailyLearningState(input:DailyLearningState){
 const publishedHomework=input.homework.filter(h=>h.status==='published');
 const evidence=new Map(input.homeworkEvidence.filter(e=>e.studentId===input.studentId).map(e=>[e.homeworkId,e]));
 return {studentId:input.studentId,weeklyPlan:visibleStudentPlan(input.weeklyPlan),homework:publishedHomework.map(h=>({homework:h,evidence:evidence.get(h.id)??null})),focusedRemediation:input.remediation.filter(p=>p.studentId===input.studentId&&isOpenRemediation(p)),latestAssessments:[...input.assessments].filter(a=>a.studentId===input.studentId).sort((a,b)=>b.sessionDate.localeCompare(a.sessionDate)).slice(0,10)};
}
