import { describe,expect,it } from 'vitest';
import { decideRemediation } from './remediation';
import { rewardUnlocked } from './rewards';
import { publishableWeeklyPlan } from './weekly-plan-engine';
describe('core invariants',()=>{it('creates remediation on third failure and does not duplicate unresolved plans',()=>{const history=[1,2,3].map(()=>({studentId:'s1',targetId:'skill1',result:'not_mastered' as const}));const plan=decideRemediation('s1','skill1',history,[],'2026-09-11');expect(plan).not.toBeNull();expect(decideRemediation('s1','skill1',history,[plan!],'2026-09-11')).toBeNull()});it('unlocks reward at 30',()=>{expect(rewardUnlocked(29)).toBe(false);expect(rewardUnlocked(30)).toBe(true)});it('never auto publishes a draft',()=>{const draft={id:'w',weekKey:'1',subject:'arabic' as const,targetIds:[],publishStatus:'draft' as const,publishOnSaturday:true};expect(publishableWeeklyPlan([draft],new Date('2026-09-12T12:00:00Z'))[0].publishStatus).toBe('draft')})});
