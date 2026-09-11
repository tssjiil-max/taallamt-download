import { describe,expect,it } from 'vitest';
import { decideRemediation } from './remediation';
import { rewardUnlocked } from './rewards';
import { publishableWeeklyPlan } from './weekly-plan-engine';
import { normalizeSaudiWhatsapp } from './communication-url';
import { canReadStudent,canWriteAssessment } from './security';
describe('core invariants',()=>{
 it('creates remediation only on three consecutive failures and does not duplicate open plans',()=>{const three=[1,2,3].map((n)=>({studentId:'s1',targetId:'skill1',result:'not_mastered' as const,sessionDate:`2026-09-${n.toString().padStart(2,'0')}`}));expect(decideRemediation('s1','skill1',[three[0],{...three[1],result:'needs_practice'},three[2]],[],'2026-09-11')).toBeNull();const plan=decideRemediation('s1','skill1',three,[],'2026-09-11');expect(plan).not.toBeNull();expect(decideRemediation('s1','skill1',three,[plan!],'2026-09-11')).toBeNull()});
 it('unlocks reward at 30',()=>{expect(rewardUnlocked(29)).toBe(false);expect(rewardUnlocked(30)).toBe(true)});
 it('never auto publishes a draft',()=>{const draft={id:'w',weekKey:'1',subject:'arabic' as const,targetIds:[],publishStatus:'draft' as const,publishOnSaturday:true};expect(publishableWeeklyPlan([draft],new Date('2026-09-12T12:00:00Z'))[0].publishStatus).toBe('draft')});
 it('normalizes Saudi mobile numbers and rejects invalid numbers',()=>{expect(normalizeSaudiWhatsapp('0551234567')).toBe('966551234567');expect(()=>normalizeSaudiWhatsapp('123')).toThrow('INVALID_SAUDI_MOBILE')});
 it('blocks cross-workspace student reads and writes',()=>{const teacher={workspaceId:'a',role:'teacher' as const};expect(canReadStudent(teacher,'s1','b')).toBe(false);expect(canWriteAssessment(teacher,'b')).toBe(false)});
});
