import type { ComprehensiveAssessment,PortfolioEvent } from '../core/domain';
import { buildWeeklySummary } from '../core/weekly-summary';
import { whatsappAction } from '../core/communication-url';
export function guardianWeeklySummaryAction(input:{studentId:string;studentName:string;phone:string;from:string;to:string;assessments:ComprehensiveAssessment[];portfolio:PortfolioEvent[]}){const s=buildWeeklySummary(input.studentId,input.from,input.to,input.assessments,input.portfolio);const message=`السلام عليكم، ملخص متابعة ${input.studentName} من ${s.from} إلى ${s.to}: أتقن ${s.mastered}، يحتاج تدريب ${s.needsPractice}، لم يتقن ${s.notMastered}، مؤشرات إيجابية ${s.positiveEvents}.`;return {summary:s,url:whatsappAction(input.phone,message)}}
