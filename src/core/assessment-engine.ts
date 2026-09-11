import { ComprehensiveAssessment, MONTHLY_STAR_CAP, PortfolioEvent, RemediationPlan } from './domain';
import { decideRemediation } from './remediation';

export interface AssessmentHistoryItem {studentId:string;targetId:string;result:'mastered'|'needs_practice'|'not_mastered';sessionDate:string}
export interface AssessmentEffects {studentViewUpdated:boolean;portfolioEvents:PortfolioEvent[];remediationPlans:RemediationPlan[];starsEarned:number}

export function deriveAssessmentEffects(assessment:ComprehensiveAssessment,history:AssessmentHistoryItem[],currentMonthlyStars:number,existingPlans:RemediationPlan[]=[]):AssessmentEffects{
 const portfolioEvents:PortfolioEvent[]=[];const remediationPlans:RemediationPlan[]=[];
 let positiveAcademic=false;let positiveBehavior=false;
 for(const item of assessment.academic){
  if(item.result==='mastered'){
   positiveAcademic=true;
   portfolioEvents.push({id:`${assessment.id}:${item.targetId}:mastery`,studentId:assessment.studentId,type:'mastery',occurredAt:assessment.enteredAt,sourceId:assessment.id,summary:`إتقان: ${item.targetId}`});
  }
  if(item.result==='not_mastered'){
   const current={studentId:assessment.studentId,targetId:item.targetId,result:item.result,sessionDate:assessment.sessionDate} as AssessmentHistoryItem;
   const plan=decideRemediation(assessment.studentId,item.targetId,[...history,current],existingPlans,assessment.enteredAt);
   if(plan){remediationPlans.push(plan);existingPlans=[...existingPlans,plan];portfolioEvents.push({id:`${assessment.id}:${item.targetId}:remediation`,studentId:assessment.studentId,type:'remediation_started',occurredAt:assessment.enteredAt,sourceId:assessment.id,summary:`بدء خطة علاجية: ${item.targetId}`});}
  }
 }
 for(const behavior of assessment.behavior){if(behavior.tone==='positive'){positiveBehavior=true;portfolioEvents.push({id:`${assessment.id}:behavior:${behavior.code}`,studentId:assessment.studentId,type:'positive_behavior',occurredAt:assessment.enteredAt,sourceId:assessment.id,summary:behavior.label});}}
 // لا نجمة لكل بند؛ الحد الأقصى في حدث التقييم الواحد نجمتان: أكاديمية + سلوك إيجابي.
 const candidate=(positiveAcademic?1:0)+(positiveBehavior?1:0);
 return {studentViewUpdated:true,portfolioEvents,remediationPlans,starsEarned:Math.max(0,Math.min(candidate,MONTHLY_STAR_CAP-currentMonthlyStars))};
}
// عدم وجود تقييم = غير مقيم، وليس عدم إتقان.
