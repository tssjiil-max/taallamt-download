import {describe,expect,it} from 'vitest';
import {askShakabamboRemote} from './lesson-assistant-client';
import type {LessonContext} from './lesson-session';

const context:LessonContext={subject:'islamic',subjectTitle:'الدراسات الإسلامية',unit:'أخلاق المسلم',lesson:'بر الوالدين',skills:['يبين صور بر الوالدين'],grade:'الثاني',className:'4'};

describe('askShakabamboRemote',()=>{
  it('sends only bounded lesson context and returns the assistant answer',async()=>{
    let sent:any=null;
    const fakeFetch=async(_url:string,init?:RequestInit)=>{
      sent=JSON.parse(String(init?.body||'{}'));
      return {ok:true,json:async()=>({ok:true,answer:'إجابة مرتبطة بالدرس'})} as Response;
    };
    const answer=await askShakabamboRemote(context,'اشرح للطالب','student',fakeFetch as typeof fetch);
    expect(answer).toBe('إجابة مرتبطة بالدرس');
    expect(sent.mode).toBe('student');
    expect(sent.context.lesson).toBe('بر الوالدين');
    expect(sent.context.skill).toBe('يبين صور بر الوالدين');
    expect(sent.context).not.toHaveProperty('students');
  });

  it('throws a clear error when the assistant service is unavailable',async()=>{
    const fakeFetch=async()=>({ok:false,json:async()=>({message:'تعذر تشغيل شكابمبو الآن.'})}) as Response;
    await expect(askShakabamboRemote(context,'مثال','teacher',fakeFetch as typeof fetch)).rejects.toThrow('تعذر تشغيل شكابمبو الآن.');
  });
});
