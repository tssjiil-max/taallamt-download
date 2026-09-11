import { describe,expect,it } from 'vitest';
import { supportForFailureCount } from '../application/remediation-cycle';
import { shikabomboMay } from './shikabombo-guard';
import { canAccessStudent } from './student-access';
import { removalDecision } from './student-management';
import { whatsappAction } from './communication-url';
describe('critical invariants',()=>{
 it('starts remediation only at third failure',()=>{expect(supportForFailureCount(2)).toBe('light_practice');expect(supportForFailureCount(3)).toBe('remediation_plan')});
 it('keeps Shikabombo read-only',()=>{expect(shikabomboMay('explain')).toBe(true);expect(shikabomboMay('change_assessment')).toBe(false);expect(shikabomboMay('change_stars')).toBe(false)});
 it('isolates student grants',()=>{const g={id:'g',workspaceId:'w1',studentId:'s1',tokenHash:'x',createdAt:'x'};expect(canAccessStudent(g,'w1','s1')).toBe(true);expect(canAccessStudent(g,'w1','s2')).toBe(false)});
 it('archives students with history',()=>expect(removalDecision(true)).toBe('archive_with_history'));
 it('prepares Saudi WhatsApp links',()=>expect(whatsappAction('0501234567','اختبار')).toContain('wa.me/966501234567'));
});
