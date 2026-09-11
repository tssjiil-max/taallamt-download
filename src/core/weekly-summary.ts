import type { ComprehensiveAssessment, PortfolioEvent } from './domain';
export interface WeeklySummary {studentId:string;from:string;to:string;mastered:number;needsPractice:number;notMastered:number;positiveEvents:number}
export function buildWeeklySummary(studentId:string,from:string,to:string,assessments:ComprehensiveAssessment[],portfolio:PortfolioEvent[]):WeeklySummary{
 const inRange=(value:string)=>value.slice(0,10)>=from&&value.slice(0,10)<=to;
 const academic=assessments.filter(a=>a.studentId===studentId&&inRange(a.sessionDate)).flatMap(a=>a.academic);
 const events=portfolio.filter(e=>e.studentId===studentId&&inRange(e.occurredAt));
 return {studentId,from,to,mastered:academic.filter(x=>x.result==='mastered').length,needsPractice:academic.filter(x=>x.result==='needs_practice').length,notMastered:academic.filter(x=>x.result==='not_mastered').length,positiveEvents:events.filter(e=>['mastery','improvement','positive_behavior','achievement','remediation_improved','remediation_resolved'].includes(e.type)).length};
}
