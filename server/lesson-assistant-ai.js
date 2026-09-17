import {generateText} from 'ai';

const SUBJECTS=new Set(['arabic','quran','islamic','spelling','handwriting']);
const MODES=new Set(['teacher','student']);
const clean=(value,max)=>String(value||'').trim().replace(/\s+/g,' ').slice(0,max);

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

export async function runLessonAssistant(body={}){
  const mode=clean(body.mode,16)||'teacher';
  if(!MODES.has(mode))throw new Error('MODE_INVALID');
  const question=clean(body.question,500);
  if(!question)throw new Error('QUESTION_REQUIRED');
  const context=safeContext(body.context);
  const {text}=await generateText({
    model:'openai/gpt-5.6-luna',
    reasoning:'none',
    providerOptions:{gateway:{disallowPromptTraining:true}},
    prompt:lessonPrompt(mode,question,context),
  });
  const answer=clean(text,1200);
  if(!answer)throw new Error('ASSISTANT_EMPTY');
  return {answer};
}
