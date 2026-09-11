import { ComprehensiveAssessment, MONTHLY_STAR_CAP, PortfolioEvent, RemediationPlan } from './domain';
import { decideRemediation } from './remediation';
export interface AssessmentHistoryItem {studentId:string;targetId:string;result:'mastered'|'needs_practice'|'not_mastered';sessionDate:string}
export interface AssessmentEffects {studentViewUpdated:boolean;portfolioEvents:PortfolioEvent[];remediationPlans:RemediationPlan[];starsEarned:number}
const rank={not_mastered:0,needs_practice:1,mastered:2} as const;
export function deriveAssessmentEffects(assessment:ComprehensiveAssessment,history:AssessmentHistoryItem[],currentMonthlyStars:number,existingPlans:RemediationPlan[]=[]):AssessmentEffects{
 const portfolioEvents:PortfolioEvent[]=[];const remediationPlans:RemediationPlan[]=[];let mastery=false,improvement=false,positiveBehavior=false;
 const ordered=[...history].sort((a,b)=>a.sessionDate.localeCompare(b.sessionDate));
 for(const item of assessment.academic){
  const previous=ordered.filter(h=>h.studentId===assessment.studentId&&h.targetId===item.targetId).at(-1);
  if(item.result==='mastered'){mastery=true;portfolioEvents.push({id:`${assessment.id}:${item.targetId}:mastery`,studentId:assessment.studentId,type:'mastery',occurredAt:assessment.enteredAt,sourceId:assessment.id,summary:`إتقان: ${item.targetId}`})}
  if(previous&&rank[item.result]>rank[previous.result]){improvement=true;portfolioEvents.push({id:`${assessment.id}:${item.targetId}:improvement`,studentId:assessment.studentId,type:'improvement',occurredAt:assessment.enteredAt,sourceId:assessment.id,summary:`تحسن: ${item.targetId}`})}
  if(item.result==='not_mastered'){const current={studentId:assessment.studentId,targetId:item.targetId,result:item.result,sessionDate:assessment.sessionDate} as AssessmentHistoryItem;const plan=decideRemediation(assessment.studentId,item.targetId,[...ordered,current],existingPlans,assessment.enteredAt);if(plan){remediationPlans.push(plan);existingPlans=[...existingPlans,plan];portfolioEvents.push({id:`${assessment.id}:${item.targetId}:remediation`,studentId:assessment.studentId,type:'remediation_started',occurredAt:assessment.enteredAt,sourceId:assessment.id,summary:`بدء خطة علاجية: ${item.targetId}`})}}
 }
 for(const behavior of assessment.behavior){if(behavior.tone==='positive'){positiveBehavior=true;portfolioEvents.push({id:`${assessment.id}:behavior:${behavior.code}`,studentId:assessment.studentId,type:'positive_behavior',occurredAt:assessment.enteredAt,sourceId:assessment.id,summary:behavior.label})}}
 const candidate=(mastery?1:0)+(improvement?1:0)+(positiveBehavior?1:0);
 return {studentViewUpdated:true,portfolioEvents,remediationPlans,starsEarned:Math.max(0,Math.min(3,candidate,MONTHLY_STAR_CAP-currentMonthlyStars))};
}
// عدم وجود تقييم = غير مقيم، وليس عدم إتقان.
