import { deriveAssessmentEffects } from '../core/assessment-engine';
import type { ComprehensiveAssessment } from '../core/domain';
import type { LearningRepository } from '../core/ports';
export interface RewardRepository{getMonthlyStars(studentId:string,month:string):Promise<number>;addStars(studentId:string,month:string,amount:number):Promise<void>}
export interface SaveAssessmentDeps{learning:LearningRepository;rewards:RewardRepository}
export async function saveComprehensiveAssessment(assessment:ComprehensiveAssessment,deps:SaveAssessmentDeps){
 const [history,existingPlans,currentStars]=await Promise.all([deps.learning.listStudentAssessments(assessment.studentId),deps.learning.listStudentRemediation(assessment.studentId),deps.rewards.getMonthlyStars(assessment.studentId,assessment.sessionDate.slice(0,7))]);
 const effects=deriveAssessmentEffects(assessment,history.flatMap(a=>a.academic.map(i=>({studentId:a.studentId,targetId:i.targetId,result:i.result,sessionDate:a.sessionDate}))),currentStars,existingPlans);
 await deps.learning.saveAssessment(assessment);
 for(const plan of effects.remediationPlans)await deps.learning.saveRemediation(plan);
 if(effects.portfolioEvents.length)await deps.learning.appendPortfolio(effects.portfolioEvents);
 if(effects.starsEarned>0)await deps.rewards.addStars(assessment.studentId,assessment.sessionDate.slice(0,7),effects.starsEarned);
 return effects;
}
