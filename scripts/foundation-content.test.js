import {test,expect} from 'vitest';
import {FOUNDATION_CONTENT,foundationCatalog,foundationSnapshot} from '../server/foundation-content.js';
import {buildLearningModel,gradeAnswer,publicActivity,recordAttempt} from '../server/learning-core.js';
const preview={VERCEL_ENV:'preview',VERCEL_GIT_COMMIT_REF:'preview/shakabumbo-pilot-20261013'};
test('all four practice subjects have valid reviewed keys, with answers hidden from student activities',()=>{
 expect(new Set(FOUNDATION_CONTENT.map(t=>t.subject))).toEqual(new Set(['arabic','spelling','handwriting','islamic']));
 for(const target of FOUNDATION_CONTENT){expect(target.learning.questions.length).toBeGreaterThanOrEqual(3);for(const q of target.learning.questions){for(const answer of q.answers)expect(gradeAnswer(q,answer)).toBe(true);expect(gradeAnswer(q,'إجابة غير مناسبة')).toBe(false);expect(publicActivity(q).answers).toBeUndefined()}}
});
test('shared catalog does not activate on production or other branches, preserves teacher overrides without mutation',()=>{
 const draft={...FOUNDATION_CONTENT[0],learning:{...FOUNDATION_CONTENT[0].learning,status:'draft'}};
 const stored=[draft];const result=foundationCatalog(stored,preview);
 expect(result.filter(t=>t.id===draft.id)).toEqual([draft]);expect(stored).toHaveLength(1);
 expect(foundationCatalog([], {...preview,VERCEL_ENV:'production'})).toEqual([]);
 expect(foundationCatalog([], {...preview,VERCEL_GIT_COMMIT_REF:'main'})).toEqual([]);
 expect(foundationSnapshot({exists:true,data:()=>draft},draft.id).data()).toBe(draft);
});
test('all roster identities receive independent learning state and the same shared content',()=>{
 const targets=foundationCatalog([],preview);
 const memory=recordAttempt({}, {id:'a',targetId:targets[0].id,questionId:'q1',correct:false},'2026-10-18T09:00:00Z');
 const a=buildLearningModel({studentId:'same-name-a',targets,memory,weekNumber:1});
 const b=buildLearningModel({studentId:'same-name-b',targets,weekNumber:1});
 expect(a.skills[0].attempts).toBe(1);expect(b.skills.every(s=>s.attempts===0)).toBe(true);
 expect(b.skills).toHaveLength(8);
});
