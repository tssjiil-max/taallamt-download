import type { RemediationPlan } from './domain';
export interface FailureRecord{studentId:string;targetId:string;result:'mastered'|'needs_practice'|'not_mastered';sessionDate?:string}
export function isOpenRemediation(plan:RemediationPlan){return plan.status==='active'||plan.status==='improved'||plan.status==='needs_more_support'}
export function decideRemediation(studentId:string,targetId:string,history:FailureRecord[],existing:RemediationPlan[],now:string):RemediationPlan|null{
 if(existing.some(p=>p.studentId===studentId&&p.targetId===targetId&&isOpenRemediation(p)))return null;
 const relevant=history.filter(h=>h.studentId===studentId&&h.targetId===targetId).sort((a,b)=>(a.sessionDate??'').localeCompare(b.sessionDate??''));
 let failures=0;for(const item of relevant)failures=item.result==='not_mastered'?failures+1:0;
 if(failures<3)return null;
 const cycle=existing.filter(p=>p.studentId===studentId&&p.targetId===targetId).length+1;
 return {id:`remediation:${studentId}:${targetId}:${cycle}`,studentId,targetId,trigger:'three_not_mastered',status:'active',startedAt:now};
}
export function resolveRemediation(plan:RemediationPlan,now:string):RemediationPlan{return {...plan,status:'resolved',resolvedAt:now}}
