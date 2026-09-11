import { deriveAssessmentEffects } from '../core/assessment-engine';
import type { ComprehensiveAssessment,PortfolioEvent,RemediationPlan } from '../core/domain';
import type { LearningRepository } from '../core/ports';
import { isOpenRemediation } from '../core/remediation';
export interface RewardRepository{getMonthlyStars(studentId:string,month:string):Promise<number>;addStars(studentId:string,month:string,amount:number):Promise<void>}
export interface SaveAssessmentDeps{learning:LearningRepository;rewards:RewardRepository}
function reassess(plan:RemediationPlan,result:'mastered'|'needs_practice'|'not_mastered',now:string):RemediationPlan{if(result==='mastered')return {...plan,status:'resolved',resolvedAt:now};if(result==='needs_practice')return {...plan,status:'improved'};return {...plan,status:'needs_more_support'}}
export async function saveComprehensiveAssessment(assessment:ComprehensiveAssessment,deps:SaveAssessmentDeps){
 const [history,existingPlans,currentStars]=await Promise.all([deps.learning.listStudentAssessments(assessment.studentId),deps.learning.listStudentRemediation(assessment.studentId),deps.rewards.getMonthlyStars(assessment.studentId,assessment.sessionDate.slice(0,7))]);
 const effects=deriveAssessmentEffects(assessment,history.flatMap(a=>a.academic.map(i=>({studentId:a.studentId,targetId:i.targetId,result:i.result,sessionDate:a.sessionDate}))),currentStars,existingPlans);
 const lifecycleEvents:PortfolioEvent[]=[];const updates:RemediationPlan[]=[];
 for(const item of assessment.academic){const plan=existingPlans.find(p=>p.studentId===assessment.studentId&&p.targetId===item.targetId&&isOpenRemediation(p));if(!plan)continue;const next=reassess(plan,item.result,assessment.enteredAt);updates.push(next);if(next.status!==plan.status)lifecycleEvents.push({id:`${assessment.id}:${plan.id}:${next.status}`,studentId:assessment.studentId,type:next.status==='resolved'?'remediation_resolved':'remediation_improved',occurredAt:assessment.enteredAt,sourceId:assessment.id,summary:next.status==='resolved'?`إغلاق الخطة العلاجية: ${item.targetId}`:`تحديث الخطة العلاجية: ${item.targetId}`})}
 await deps.learning.saveAssessment(assessment);for(const plan of [...effects.remediationPlans,...updates])await deps.learning.saveRemediation(plan);const events=[...effects.portfolioEvents,...lifecycleEvents];if(events.length)await deps.learning.appendPortfolio(events);if(effects.starsEarned>0)await deps.rewards.addStars(assessment.studentId,assessment.sessionDate.slice(0,7),effects.starsEarned);return {...effects,portfolioEvents:events};
}
