import { decideRemediation } from './remediation';
import { rewardUnlocked } from './rewards';
import { publishableWeeklyPlan } from './weekly-plan-engine';

function assert(value:boolean,message:string){if(!value)throw new Error(message)}

export function runCoreInvariantTests(){
 const history=[1,2,3].map(()=>({studentId:'s1',targetId:'skill1',result:'not_mastered' as const}));
 assert(decideRemediation('s1','skill1',history,[],'2026-09-11')!==null,'third failure must create remediation');
 const existing=[decideRemediation('s1','skill1',history,[],'2026-09-11')!];
 assert(decideRemediation('s1','skill1',history,existing,'2026-09-11')===null,'active remediation must not duplicate');
 assert(rewardUnlocked(29)===false&&rewardUnlocked(30)===true,'reward threshold must be 30');
 const draft={id:'w',weekKey:'1',subject:'arabic' as const,targetIds:[],publishStatus:'draft' as const,publishOnSaturday:true};
 assert(publishableWeeklyPlan([draft],new Date('2026-09-12'))[0].publishStatus==='draft','draft must never auto-publish');
 return true;
}
