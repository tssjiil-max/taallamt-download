import type { PortfolioEvent } from '../core/domain';
import type { HomeworkEvidence } from '../core/homework';
import type { EvidenceRef } from '../core/portfolio';
import type { WeeklyPlanItem } from '../core/session';
import type { CommunicationEvent } from '../core/communication';
import { buildStudentPortfolio } from '../core/student-portfolio-engine';
import { buildTeacherPortfolio } from '../core/teacher-portfolio-engine';
const ref=(id:string,sourceType:EvidenceRef['sourceType'],title:string,occurredAt:string):EvidenceRef=>({id,sourceType,sourceId:id,title,occurredAt});
export function projectStudentPortfolio(studentId:string,events:PortfolioEvent[],homework:HomeworkEvidence[]){const items:EvidenceRef[]=[...events.filter(e=>e.studentId===studentId).map(e=>ref(e.id,e.type.startsWith('remediation_')?'remediation':e.type==='achievement'?'achievement':'assessment',e.summary,e.occurredAt)),...homework.filter(h=>h.studentId===studentId&&h.status!=='assigned').map(h=>ref(h.id,'homework','واجب مكتمل',h.completedAt??''))];return buildStudentPortfolio(items)}
export function projectTeacherPortfolio(plans:WeeklyPlanItem[],events:PortfolioEvent[],communications:CommunicationEvent[]){return buildTeacherPortfolio({weeklyPlans:plans.map(p=>ref(p.id,'weekly_plan','خطة أسبوعية',p.weekKey)),assessments:events.filter(e=>['mastery','improvement','positive_behavior'].includes(e.type)).map(e=>ref(e.id,'assessment',e.summary,e.occurredAt)),interventions:events.filter(e=>e.type.startsWith('remediation_')).map(e=>ref(e.id,'remediation',e.summary,e.occurredAt)),communications:communications.map(e=>ref(e.id,'communication',e.summary,e.createdAt)),files:[]})}
