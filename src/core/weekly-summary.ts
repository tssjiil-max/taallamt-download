import type { ComprehensiveAssessment, PortfolioEvent } from './domain';
export interface WeeklySummary {studentId:string;mastered:number;needsPractice:number;notMastered:number;positiveEvents:number}
export function buildWeeklySummary(studentId:string,assessments:ComprehensiveAssessment[],portfolio:PortfolioEvent[]):WeeklySummary{
 const academic=assessments.filter(a=>a.studentId===studentId).flatMap(a=>a.academic);
 return {studentId,mastered:academic.filter(x=>x.result==='mastered').length,needsPractice:academic.filter(x=>x.result==='needs_practice').length,notMastered:academic.filter(x=>x.result==='not_mastered').length,positiveEvents:portfolio.filter(e=>e.studentId===studentId&&['mastery','improvement','positive_behavior','achievement'].includes(e.type)).length};
}
