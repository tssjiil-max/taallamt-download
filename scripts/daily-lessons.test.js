import {describe,it,expect} from 'vitest';
import {dailyLessons,gradeSelfTest} from '../server/daily-lessons.js';
const questions=[1,2,3].map(i=>({id:'q'+i,prompt:'سؤال '+i,answers:['صحيح'],hint:'راجع المثال'}));
const target={id:'approved',title:'الصديقان',weekNumber:8,subject:'arabic',learning:{status:'approved',reference:'الكتاب المعتمد',explanation:'شرح معتمد',questions,weekNumber:8}};
const plan={id:'p',weekNumber:8,subject:'arabic',lesson:'الصديقان',unit:'أصدقائي',publishStatus:'published',targetIds:['approved'],days:[{weekday:2}]};
const project=(patch={})=>dailyLessons({plans:[plan],catalog:[target],date:new Date('2026-10-20T09:00:00Z'),...patch});
describe('approved daily lessons',()=>{
 it('uses the exact published Quran day segment without inventing a quiz',()=>{const r=project({plans:[{...plan,subject:'quran',unit:'الغاشية',lesson:'الآيات 1 - 22',days:[{weekday:2,text:'الآيات 17 - 22'}]}]});expect(r.lessons[0].title).toBe('الآيات 17 - 22');expect(r.lessons[0].questions).toEqual([]);expect(r.gaps).toEqual([])});
 it('uses Saudi midnight and never publishes early',()=>{expect(project({date:new Date('2026-10-19T20:59:59Z')}).lessons).toHaveLength(0);expect(project({date:new Date('2026-10-19T21:00:00Z')}).lessons).toHaveLength(1)});
 it('projects stable identities without duplicates or writes',()=>{expect(project({plans:[plan,plan]}).lessons).toHaveLength(1);expect(project()).toEqual(project())});
 it('retains earlier lessons for review',()=>expect(project({date:new Date('2026-10-21T09:00:00Z')}).lessons[0].today).toBe(false));
 it('honors pause, hidden, holidays and postponed dates',()=>{for(const settings of [{enabled:false},{holidays:['2026-10-20']},{overrides:{'p:d2':{hidden:true}}},{overrides:{'p:d2':{date:'2026-10-21'}}}])expect(project({settings}).lessons).toHaveLength(0)});
 it('warns teacher when the current published plan is absent',()=>expect(project({plans:[]}).gaps[0].id).toBe('missing-current-week'));
 it('does not invent missing days, titles or approved content',()=>{expect(project({plans:[{...plan,days:[]}]}).lessons).toHaveLength(0);expect(project({catalog:[]}).lessons[0].targetId).toBeNull();expect(project({catalog:[]}).gaps).toHaveLength(1)});
 it('does not leak answer keys or use ambiguous matches',()=>{expect(JSON.stringify(project())).not.toContain('answers');expect(project({catalog:[target,{...target,id:'other'}]}).lessons[0].targetId).toBeNull()});
 it('never releases holidays, weekends or dates outside the term',()=>{expect(project({plans:[{...plan,holiday:true}]}).lessons).toHaveLength(0);expect(project({settings:{overrides:{'p:d2':{date:'2026-10-23'}}},date:new Date('2026-10-23T08:00:00Z')}).lessons).toHaveLength(0)});
});
describe('optional self test',()=>{
 it('grades approved questions, saves only training and avoids repeated rewards',()=>{const input={id:'attempt',lessonId:'p:d2',target,answers:{q1:'صحيح',q2:'صحيح',q3:'صحيح'}};const a=gradeSelfTest({},input,'2026-10-20T09:00:00Z');expect(a.result.correct).toBe(3);expect(a.result.official).toBe(false);expect(a.memory.learningStars).toHaveLength(1);const b=gradeSelfTest(a.memory,input,'2026-10-20T09:01:00Z');expect(b.memory).toBe(a.memory);expect(b.result.duplicate).toBe(true)});
 it('records errors for adaptive remediation and protects attempt identity',()=>{const a=gradeSelfTest({},{id:'attempt',lessonId:'p:d2',target,answers:{}},'2026-10-20T09:00:00Z');expect(a.result.correct).toBe(0);expect(a.memory.attempts[0].errorType).toBe('needs_review');expect(()=>gradeSelfTest(a.memory,{id:'attempt',lessonId:'other',target},'')).toThrow('ATTEMPT_CONFLICT')});
});
