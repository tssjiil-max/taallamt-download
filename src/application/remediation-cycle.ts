import type { Mastery, PortfolioEvent, RemediationPlan } from '../core/domain';

export type SupportLevel='light_practice'|'remediation_plan'|'none';
export function supportForFailureCount(count:number):SupportLevel{return count>=3?'remediation_plan':count>=1?'light_practice':'none'}

export function reassessRemediation(plan:RemediationPlan,result:Mastery,now:string){
 let next:RemediationPlan=plan;
 const events:PortfolioEvent[]=[];
 if(result==='mastered'){
  next={...plan,status:'resolved',resolvedAt:now};
  events.push({id:`${plan.id}:resolved:${now}`,studentId:plan.studentId,type:'remediation_resolved',occurredAt:now,sourceId:plan.id,summary:`تم إتقان المهارة بعد الخطة العلاجية: ${plan.targetId}`});
 }else if(result==='needs_practice'){
  next={...plan,status:'improved'};
  events.push({id:`${plan.id}:improved:${now}`,studentId:plan.studentId,type:'remediation_improved',occurredAt:now,sourceId:plan.id,summary:`تحسن في المهارة ويحتاج تدريبًا إضافيًا: ${plan.targetId}`});
 }else{
  next={...plan,status:'needs_more_support'};
 }
 return {plan:next,events};
}
