import type { RemediationPlan } from './domain';
export interface FailureRecord {studentId:string;targetId:string;result:'mastered'|'needs_practice'|'not_mastered'}
export function decideRemediation(studentId:string,targetId:string,history:FailureRecord[],existing:RemediationPlan[],now:string):RemediationPlan|null{
 if(existing.some(p=>p.studentId===studentId&&p.targetId===targetId&&p.status!=='resolved'))return null;
 const failures=history.filter(h=>h.studentId===studentId&&h.targetId===targetId&&h.result==='not_mastered').length;
 if(failures<3)return null;
 const cycle=existing.filter(p=>p.studentId===studentId&&p.targetId===targetId).length+1;
 return {id:`remediation:${studentId}:${targetId}:${cycle}`,studentId,targetId,trigger:'three_not_mastered',status:'active',startedAt:now};
}
export function resolveRemediation(plan:RemediationPlan,now:string):RemediationPlan{return {...plan,status:'resolved',resolvedAt:now}}
