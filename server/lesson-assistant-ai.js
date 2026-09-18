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
    ?'أجب بلغة عربية شديدة الوضوح تناسب طفلًا في عمر ثماني سنوات. ابدأ بالجواب مباشرة، واستخدم مثالًا واحدًا عند الحاجة، ويمكنك إعادة سؤال صغير للطالب ليشارك في التفكير.'
    :'أجب المعلم باقتراح عملي قصير يمكن تطبيقه فورًا داخل الحصة. أعطِ خطوة أو مثالًا أو سؤالًا جاهزًا بحسب طلبه.';
  return `أنت «شكابمبو»، مساعد تعليمي حي داخل حصة صف ثاني ابتدائي في مشروع تعلّمت.

سياق درس اليوم المتاح لك:
- المادة: ${context.subjectLabel||context.subject}
- الوحدة/السورة: ${context.unit||'غير محددة'}
- الدرس: ${context.lesson}
- المهارات/الأهداف المتاحة: ${context.skill}
- الصف: ${context.gradeLabel||'الثاني'} / ${context.classLabel||'4'}

القواعد الإلزامية:
1) اجعل إجابتك مرتبطة مباشرة بدرس اليوم والمهارات أعلاه.
2) فرّق بين ما هو موجود في سياق الدرس وما هو تبسيط أو مثال إضافي منك.
3) لا تخمّن نصًا من كتاب، أو آية، أو حديثًا، أو تعريفًا وتزعم أنه موجود في الدرس إذا لم يُعطَ لك نصه.
4) إذا احتاج السؤال معلومة كتابية دقيقة غير متاحة، قل باختصار: «هذا خارج سياق درس اليوم المتاح لي؛ خلّنا نرجع لمصدر الدرس أو للمعلم.»
5) لا تذكر درجات أو تقييمًا للمعلم، ولا تعدّل أو تقترح تعديل بيانات طالب.
6) لا تطلب اسم الطالب ولا أي بيانات شخصية.
7) اجعل الإجابة قصيرة غالبًا: من جملة إلى أربع جمل، إلا إذا طلب المعلم تفصيلًا.
8) عند اقتراح نشاط أو سؤال أو استراتيجية، راعِ عمر 8 سنوات والهدف الحالي، ولا تضف تقنية إلا إذا كانت مفيدة فعلًا.
9) ${audience}

الطلب: ${question}`;
}

export async function runLessonAssistant(body={}){
  const mode=clean(body.mode,16)||'teacher';
  if(!MODES.has(mode))throw new Error('MODE_INVALID');
  const question=clean(body.question,500);
  if(!question)throw new Error('QUESTION_REQUIRED');
  const context=safeContext(body.context);
  const {generateText}=await import('ai');
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
