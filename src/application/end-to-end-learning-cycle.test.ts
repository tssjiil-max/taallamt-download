import { deriveAssessmentEffects } from '../core/assessment-engine';
import { reassessRemediation } from './remediation-cycle';
import type { ComprehensiveAssessment } from '../core/domain';
function assert(v:boolean,m:string){if(!v)throw new Error(m)}
const assessment=(id:string,result:'mastered'|'not_mastered'):ComprehensiveAssessment=>({id,studentId:'student-1',classSessionId:id,sessionDate:`2026-09-${id.slice(-2)}`,enteredAt:`2026-09-${id.slice(-2)}T08:00:00`,track:'general',academic:[{targetId:'quran-layl-1-3',result}],behavior:[]});
export function runEndToEndLearningCycle(){
 const a1=assessment('a-01','not_mastered'),a2=assessment('a-02','not_mastered'),a3=assessment('a-03','not_mastered');
 const history=[a1,a2].flatMap(a=>a.academic.map(x=>({studentId:a.studentId,targetId:x.targetId,result:x.result,sessionDate:a.sessionDate})));
 const effects=deriveAssessmentEffects(a3,history,0,[]);
 assert(effects.remediationPlans.length===1,'third failure creates exactly one plan');
 const duplicate=deriveAssessmentEffects(assessment('a-04','not_mastered'),[...history,{studentId:'student-1',targetId:'quran-layl-1-3',result:'not_mastered' as const,sessionDate:a3.sessionDate}],0,effects.remediationPlans);
 assert(duplicate.remediationPlans.length===0,'active plan must not duplicate');
 const resolved=reassessRemediation(effects.remediationPlans[0],'mastered','2026-09-05T08:00:00');
 assert(resolved.plan.status==='resolved','successful reassessment resolves plan');
 assert(resolved.events[0].type==='remediation_resolved','resolution enters portfolio');
 return true;
}
