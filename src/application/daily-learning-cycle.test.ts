import { describe,expect,it } from 'vitest';
import { buildDailyLearningState } from './daily-learning-cycle';

describe('daily learning cycle',()=>{
 it('shows only published plan and homework while keeping open remediation',()=>{
  const state=buildDailyLearningState({studentId:'s1',weeklyPlan:[{id:'w1',weekKey:'2026-37',subject:'arabic',targetIds:[],publishStatus:'published',publishOnSaturday:true},{id:'w2',weekKey:'2026-37',subject:'quran',targetIds:[],publishStatus:'draft',publishOnSaturday:true}],homework:[{id:'h1',classId:'c',subject:'arabic',title:'واجب',targetIds:[],assignedAt:'2026-09-11',status:'published'},{id:'h2',classId:'c',subject:'quran',title:'مسودة',targetIds:[],assignedAt:'2026-09-11',status:'draft'}],homeworkEvidence:[],assessments:[],remediation:[{id:'r1',studentId:'s1',targetId:'x',trigger:'three_not_mastered',status:'active',startedAt:'2026-09-11'}]});
  expect(state.weeklyPlan.map(x=>x.id)).toEqual(['w1']);expect(state.homework.map(x=>x.homework.id)).toEqual(['h1']);expect(state.focusedRemediation).toHaveLength(1);
 });
});
