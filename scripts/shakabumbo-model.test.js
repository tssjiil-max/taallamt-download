import{describe,it,expect}from'vitest';
import worker,{makeMessages}from'../workers/shakabumbo/worker.js';
const context={subject:'spelling',title:'تنوين الكسر',explanation:'الكسرتان تحت الحرف الأخير',prompt:'سؤال',hint:'تلميح',assessment:true};
describe('curriculum model boundaries',()=>{
 it('blocks Quran before inference',()=>expect(()=>makeMessages({context:{...context,subject:'quran'},question:'اقرأ'})).toThrow('SUBJECT_BLOCKED'));
 it('blocks recitation requests on a spelling lesson',()=>expect(()=>makeMessages({context,question:'اقرأ سورة الفجر'})).toThrow('QURAN_BLOCKED'));
 it('sends only a bounded curriculum history and no assessment hint',()=>{const m=makeMessages({context,question:'اشرح',history:Array.from({length:20},()=>({role:'user',content:'سؤال'}))});expect(m).toHaveLength(6);expect(m[0].content).not.toContain('التلميح: تلميح');expect(m.at(-1).content).toContain('/no_think')});
 it('unauthenticated requests cannot invoke the model',async()=>{const r=await worker.fetch(new Request('https://worker/',{method:'POST'}),{SERVICE_TOKEN:'test'});expect(r.status).toBe(401)});
 it('exhausted budget never calls the model',async()=>{const r=await worker.fetch(new Request('https://worker/',{method:'POST',headers:{authorization:'Bearer test'},body:JSON.stringify({context,question:'اشرح'})}),{SERVICE_TOKEN:'test',BUDGET:{idFromName:()=>'',get:()=>({fetch:async()=>Response.json({allowed:false})})},AI:{run:()=>{throw new Error('must not run')}}});expect(r.status).toBe(429)});
});

it('keeps the published spelling of lesson examples',async()=>{const {groundReply}=await import('../workers/shakabumbo/worker.js');expect(groundReply('تكتب كُتَابٍ.',{context:{...context,explanation:'مثل: كتابٍ.'},question:'هل اكتب كتابن؟'})).toBe('تكتب كتابٍ.')});
it('rejects a contradicted mark position in favor of the explicit lesson reference',async()=>{const {groundReply}=await import('../workers/shakabumbo/worker.js');expect(groundReply('ضع الكسرتين بعد الحرف الأخير.',{context:{...context,assessment:false,hint:'ضع كسرتين تحت الحرف الأخير.'},question:'أين أضع الكسرتين؟'})).toBe('من شرح الدرس: ضع كسرتين تحت الحرف الأخير.')});
