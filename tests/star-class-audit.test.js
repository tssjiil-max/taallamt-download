import {describe,it,expect} from 'vitest';
import {compareClassBalances} from '../server/star-class-audit.js';

describe('class-wide star audit is read-only and evidence-first',()=>{
 const month='2026-10'; const roster=[{id:'s2-4-02',name:'أسامة سلطان الصاعدي'},{id:'s2-4-03',name:'طالب آخر'}];
 it('flags a conflicting teacher record while retaining both figures',()=>{
  const result=compareClassBalances({roster,month,canonical:[{id:'s2-4-02_2026-10',exists:true,stars:1},{id:'s2-4-03_2026-10',exists:true,stars:0}],ledgers:[{id:'legacy',studentId:'s2-4-02',month,stars:12},{id:'s2-4-02_2026-10',studentId:'s2-4-02',month,stars:1}],events:[]});
  expect(result.students[0].canonicalStars).toBe(1);
  expect(result.students[0].candidateBalances).toEqual([1,12]);
  expect(result.students[0].status).toBe('CONFLICT_REQUIRES_EVIDENCE');
  expect(result.students[1].status).toBe('NO_CONFLICT');
  expect(result.safeToRestoreAutomatically).toBe(false);
 });
 it('never treats a cached value or an event sum as authorization to overwrite',()=>{
  const result=compareClassBalances({roster,month,canonical:[{id:'s2-4-02_2026-10',exists:true,stars:1}],ledgers:[],events:[{id:'one',studentId:'s2-4-02',month,stars:12}]});
  expect(result.students[0].eventNet).toBe(12);
  expect(result.students[0].status).toBe('EVENTS_REQUIRE_REVIEW');
  expect(result.safeToRestoreAutomatically).toBe(false);
 });
});