import type {LessonContext} from './lesson-session';

export async function askShakabamboRemote(
  context:LessonContext,
  question:string,
  mode:'teacher'|'student'='teacher',
  fetcher:typeof fetch=fetch,
  timeoutMs=4500,
):Promise<string>{
  const skill=context.skills.filter(Boolean).slice(0,3).join(' — ').slice(0,220);
  const controller=new AbortController();
  const timer=setTimeout(()=>controller.abort(),timeoutMs);
  let response:Response;
  try{response=await fetcher('/api/lesson-assistant',{
    method:'POST',
    headers:{'Content-Type':'application/json'},
    body:JSON.stringify({
      mode,
      question:question.trim().slice(0,500),
      context:{
        subject:context.subject,
        subjectLabel:context.subjectTitle,
        unit:context.unit,
        lesson:context.lesson,
        skill,
        gradeLabel:context.grade,
        classLabel:context.className,
      },
    }),
    signal:controller.signal,
  });}catch{throw new Error('تعذر تشغيل شكابمبو الآن.')}finally{clearTimeout(timer)}
  const data=await response.json().catch(()=>({})) as {answer?:unknown;message?:unknown};
  if(!response.ok||typeof data.answer!=='string'||!data.answer.trim()){
    throw new Error(typeof data.message==='string'&&data.message.trim()?data.message:'تعذر تشغيل شكابمبو الآن.');
  }
  return data.answer.trim();
}
