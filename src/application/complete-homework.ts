import type { PortfolioEvent } from '../core/domain';
import type { HomeworkEvidence } from '../core/homework';
import type { LearningRepository } from '../core/ports';
export async function completeHomework(evidence:HomeworkEvidence,learning:LearningRepository,now:string){
 const completed:{evidence:HomeworkEvidence;portfolio:PortfolioEvent}={evidence:{...evidence,status:'completed',completedAt:now},portfolio:{id:`homework:${evidence.id}`,studentId:evidence.studentId,type:'achievement',occurredAt:now,sourceId:evidence.homeworkId,summary:'أكمل الواجب'}};
 await learning.saveHomeworkEvidence(completed.evidence);await learning.appendPortfolio([completed.portfolio]);return completed;
}
