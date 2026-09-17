import {generateText} from 'ai';

const SUBJECTS=new Set(['arabic','quran','islamic','spelling','handwriting']);
const MODES=new Set(['teacher','student']);
const clean=(value,max)=>String(value||'').trim().replace(/\s+/g,' ').slice(0,max);
const jsonBody=(req)=>typeof req.body==='string'?JSON.parse(req.body||'{}'):(req.body||{});

function safeContext(raw={}){
  const subject=clean(raw.subject,24);
  if(!SUBJECTS.has(subject))throw new Error('SUBJECT_INVALID');
  const context={
    subject,
    subjectLabel:clean(raw.subjectLabel,80),
    unit:clean(raw.unit,140),
    lesson:clean(raw.lesson,180),
    skill:clean(raw.skill,220),
    gradeLabel:clean(raw.gradeLabel,40),
    classLabel:clean(raw.classLabel,40),
  };
  if(!context.lesson||!context.skill)throw new Error('LESSON_CONTEXT_REQUIRED');
  return context;
}

function lessonPrompt(mode,question,context){
  const audience=mode==='student'
    ?'أجب بلغة عربية شديدة الوضوح تناسب طفلًا في عمر ثماني سنوات. ابدأ بالجواب مباشرة، واستخدم مثالًا واحدًا عند الحاجة.'
    :'أجب المعلم باقتراح عملي قصير يمكن تطبيقه فورًا داخل الحصة. أعطِ خطوة أو مثالًا أو سؤالًا جاهزًا بحسب طلبه.';
  return `أنت «شكابمبو»، مساعد تعليمي داخل حصة صف ثاني ابتدائي في مشروع تعلّمت.

سياق درس اليوم فقط:
- المادة: ${context.subjectLabel||context.subject}
- الوحدة/السورة: ${context.unit||'غير محددة'}
- الدرس: ${context.lesson}
- المهارة/الهدف المتاح: ${context.skill}
- الصف: ${context.gradeLabel||'الثاني'} / ${context.classLabel||'4'}

القواعد الإلزامية:
1) التزم بسياق درس اليوم والمعلومات أعلاه.
2) لا تخمّن معلومة كتابية أو آية أو حديثًا أو تعريفًا غير موجود في السياق إذا لم تكن متأكدًا منه.
3) إذا كان السؤال يحتاج معلومة غير متاحة، قل باختصار: «هذا خارج سياق درس اليوم المتاح لي؛ خلّنا نرجع للمعلم أو لمصدر الدرس.»
4) لا تذكر درجات أو تقييمًا للمعلم، ولا تعدّل أو تقترح تعديل بيانات طالب.
5) لا تطلب اسم الطالب ولا أي بيانات شخصية.
6) اجعل الإجابة قصيرة: من جملة إلى أربع جمل غالبًا.
7) ${audience}

الطلب: ${question}`;
}

export default async function handler(req,res){
  try{
    if(req.method!=='POST')return res.status(405).json({ok:false,error:'METHOD_NOT_ALLOWED'});
    const body=jsonBody(req),mode=clean(body.mode,16)||'teacher';
    if(!MODES.has(mode))return res.status(400).json({ok:false,error:'MODE_INVALID'});
    const question=clean(body.question,500);
    if(!question)return res.status(400).json({ok:false,error:'QUESTION_REQUIRED'});
    const context=safeContext(body.context);
    const {text}=await generateText({model:'openai/gpt-5.6-luna',prompt:lessonPrompt(mode,question,context)});
    const answer=clean(text,1200);
    if(!answer)return res.status(503).json({ok:false,error:'ASSISTANT_EMPTY'});
    return res.status(200).json({ok:true,answer});
  }catch(error){
    const message=error instanceof Error?error.message:String(error);
    if(['SUBJECT_INVALID','LESSON_CONTEXT_REQUIRED'].includes(message))return res.status(400).json({ok:false,error:message});
    return res.status(503).json({ok:false,error:'ASSISTANT_UNAVAILABLE',message:'تعذر تشغيل شكابمبو الآن. الحصة نفسها ما زالت جاهزة ويمكن متابعة الخطة بدون المساعد.'});
  }
}
