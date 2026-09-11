import { reassessRemediation, supportForFailureCount } from './remediation-cycle';
import type { RemediationPlan } from '../core/domain';
function assert(v:boolean,m:string){if(!v)throw new Error(m)}
export function runRemediationCycleTests(){
 assert(supportForFailureCount(1)==='light_practice','first failure should use light practice');
 assert(supportForFailureCount(2)==='light_practice','second failure should use light practice');
 assert(supportForFailureCount(3)==='remediation_plan','third failure should create remediation');
 const p:RemediationPlan={id:'p',studentId:'s',targetId:'t',trigger:'three_not_mastered',status:'active',startedAt:'x'};
 const improved=reassessRemediation(p,'needs_practice','y');assert(improved.plan.status==='improved','practice result should mark improvement');
 const mastered=reassessRemediation(p,'mastered','z');assert(mastered.plan.status==='resolved'&&mastered.events.length===1,'mastery should resolve and enter portfolio');
 return true;
}
