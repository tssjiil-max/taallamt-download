import { deriveAssessmentEffects } from '../core/assessment-engine';
import type { ComprehensiveAssessment,PortfolioEvent,RemediationPlan } from '../core/domain';
import type { LearningRepository } from '../core/ports';
import { isOpenRemediation } from '../core/remediation';
export interface RewardRepository{getMonthlyStars(studentId:string,month:string):Promise<number>;applyAssessmentStars(studentId:string,month:string,assessmentId:string,amount:number):Promise<number>}
export interface SaveAssessmentDeps{learning:LearningRepository;rewards:RewardRepository}
function reassess(plan:RemediationPlan,result:'mastered'|'needs_practice'|'not_mastered',now:string):RemediationPlan{if(result==='mastered')return {...plan,status:'resolved',resolvedAt:now};if(result==='needs_practice')return {...plan,status:'improved',resolvedAt:undefined};return {...plan,status:'needs_more_support',resolvedAt:undefined}}
export async function saveComprehensiveAssessment(assessment:ComprehensiveAssessment,deps:SaveAssessmentDeps){
 const month=assessment.sessionDate.slice(0,7);
 const [history,existingPlans,currentStars]=await Promise.all([deps.learning.listStudentAssessments(assessment.studentId),deps.learning.listStudentRemediation(assessment.studentId),deps.rewards.getMonthlyStars(assessment.studentId,month)]);
 const effects=deriveAssessmentEffects(assessment,history.flatMap(a=>a.academic.map(i=>({studentId:a.studentId,targetId:i.targetId,result:i.result,sessionDate:a.sessionDate}))),currentStars,existingPlans);
 const lifecycleEvents:PortfolioEvent[]=[];const updates:RemediationPlan[]=[];
 for(const item of assessment.academic){const plan=existingPlans.find(p=>p.studentId===assessment.studentId&&p.targetId===item.targetId&&isOpenRemediation(p));if(!plan)continue;const next=reassess(plan,item.result,assessment.enteredAt);updates.push(next);if(next.status==='resolved'&&plan.status!=='resolved')lifecycleEvents.push({id:`${assessment.id}:${plan.id}:resolved`,studentId:assessment.studentId,type:'remediation_resolved',occurredAt:assessment.enteredAt,sourceId:assessment.id,summary:`إغلاق الخطة العلاجية: ${item.targetId}`});else if(next.status==='improved'&&plan.status!=='improved')lifecycleEvents.push({id:`${assessment.id}:${plan.id}:improved`,studentId:assessment.studentId,type:'remediation_improved',occurredAt:assessment.enteredAt,sourceId:assessment.id,summary:`تحسن في الخطة العلاجية: ${item.targetId}`})}
 await deps.learning.saveAssessment(assessment);for(const plan of [...effects.remediationPlans,...updates])await deps.learning.saveRemediation(plan);const events=[...effects.portfolioEvents,...lifecycleEvents];if(events.length)await deps.learning.appendPortfolio(events);const starsEarned=effects.starsEarned>0?await deps.rewards.applyAssessmentStars(assessment.studentId,month,assessment.id,effects.starsEarned):0;return {...effects,starsEarned,portfolioEvents:events};
}
