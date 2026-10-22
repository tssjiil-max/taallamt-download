import {describe,it,expect} from 'vitest';
import {summarizeStarAudit} from '../server/star-ledger-audit.js';

describe('teacher-only star balance audit',()=>{
 it('reports conflicting records without silently overwriting either balance',()=>{
  const result=summarizeStarAudit({studentId:'s2-4-02',month:'2026-10',canonical:{exists:true,stars:1},ledgers:[{id:'s2-4-02_2026-10',studentId:'s2-4-02',month:'2026-10',stars:1},{id:'legacy',studentId:'s2-4-02',month:'2026-10',stars:12}],events:[{id:'e1',studentId:'s2-4-02',month:'2026-10',stars:12}]});
  expect(result.canonicalStars).toBe(1);expect(result.candidateBalances).toEqual([1,12]);expect(result.mismatch).toBe(true);expect(result.eventNet).toBe(12);
 });
 it('does not infer a missing balance from another student or month',()=>{
  const result=summarizeStarAudit({studentId:'s2-4-02',month:'2026-10',canonical:{exists:false},ledgers:[{id:'other',studentId:'s2-4-03',month:'2026-10',stars:12},{id:'past',studentId:'s2-4-02',month:'2026-09',stars:8}],events:[]});
  expect(result.canonicalStars).toBe(null);expect(result.candidateBalances).toEqual([]);expect(result.mismatch).toBe(false);
 });
});
