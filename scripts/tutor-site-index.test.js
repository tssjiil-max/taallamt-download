import {describe,it,expect} from 'vitest';
import {buildTutorReferences} from '../server/tutor-site-index.js';
describe('site curriculum retrieval',()=>{
 it('recognizes الصديقان as Lughati without importing synthetic stories',()=>{const r=buildTutorReferences([], 'اشرح درس الصديقان');expect(r).toContain('الصديقان');expect(r).toContain('لغتي');expect(r).not.toContain('قرأ عمر قصة')});
 it('separates handwriting from the Lughati lesson',()=>{const r=buildTutorReferences([], 'الصديق الوفي');expect(r).toContain('الصديق الوفي');expect(r).toContain('فن الخط');expect(r).toContain('الصديقان')});
 it('retrieves approved Islamic content without answer keys',()=>{const r=buildTutorReferences([{title:'الله الواحد',subject:'islamic',learning:{status:'approved',explanation:'الله واحد لا شريك له.',questions:[{answers:['SECRET']}]} }], 'الله الواحد');expect(r).toContain('الله واحد لا شريك له');expect(r).not.toContain('SECRET')});
 it('never includes drafts, Quran or synthetic reading passages',()=>{const r=buildTutorReferences([{title:'private',subject:'islamic',learning:{status:'draft',explanation:'SECRET'}},{title:'الفجر',subject:'quran',learning:{status:'approved',explanation:'VERSE'}},{id:'original-arabic-3',title:'الصديقان',subject:'arabic',learning:{status:'approved',explanation:'FAKE'}}], 'اشرح');expect(r).not.toMatch(/SECRET|VERSE|FAKE/)});
});
