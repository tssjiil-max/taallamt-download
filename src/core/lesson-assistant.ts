export type LessonSubject='arabic'|'quran'|'islamic'|'spelling'|'handwriting';
export type LessonStepKey='warmup'|'teach'|'practice'|'assessment'|'close';

export interface LessonContext{
  subject:LessonSubject;
  subjectLabel:string;
  unit:string;
  lesson:string;
  skill:string;
  gradeLabel:string;
  classLabel:string;
  durationMinutes:number;
}

export interface LessonPlanOptions{
  strategy?:string;
  activityStyle?:'guided'|'pairs'|'individual';
  technology?:boolean;
  timeManagement?:boolean;
}

export interface LessonPlanStep{
  key:LessonStepKey;
  title:string;
  body:string;
  mascotTip:string;
}

export interface LessonPlanOptionalNote{
  kind:'technology'|'time_management';
  title:string;
  body:string;
}

export interface LessonPlan{
  subject:LessonSubject;
  lesson:string;
  skill:string;
  strategy:string;
  steps:LessonPlanStep[];
  optionalNotes:LessonPlanOptionalNote[];
}

const STRATEGIES:Record<LessonSubject,string[]>={
  arabic:['فكر – زاوج – شارك','القراءة الموجّهة','السؤال المتدرج','التعلم التعاوني'],
  quran:['استماع → محاكاة → ترديد → تسميع','الترديد الجماعي ثم الفردي','التسميع المتدرج','الاستماع النموذجي'],
  islamic:['موقف وقيمة','قصة قصيرة وسؤال','فكر – ناقش – طبّق','المثال والموقف'],
  spelling:['لاحظ – انطق – اكتب','التصنيف والمقارنة','إملاء منظور قصير','اكتشف القاعدة من الأمثلة'],
  handwriting:['ألاحظ – أحاكي – أكتب','النموذج ثم المحاكاة','التتبع ثم الكتابة الحرة','مقارنة النموذج بالمحاولة'],
};

export function strategyOptionsForLesson(context:LessonContext){
  return STRATEGIES[context.subject].slice(0,5);
}

function activityPhrase(context:LessonContext,style:LessonPlanOptions['activityStyle']){
  if(context.subject==='quran')return 'قسّم المقدار إلى مقاطع قصيرة، ثم انتقل من الترديد الجماعي إلى التسميع الفردي.';
  if(context.subject==='spelling')return style==='individual'?'اكتب كلمات قصيرة مرتبطة بالمهارة ثم راجعها مع الطالب.':'اعرض كلمات قصيرة، ودع الطلاب يلاحظون النمط ثم ينطقون ويكتبون.';
  if(context.subject==='handwriting')return 'اعرض نموذجًا واضحًا للحرف أو الكلمة، ثم نفّذ محاكاة قصيرة قبل الكتابة المستقلة.';
  if(style==='pairs')return `اطلب من كل طالبين تنفيذ مهمة قصيرة مرتبطة بمهارة «${context.skill}» ثم مشاركة النتيجة.`;
  if(style==='individual')return `أعط كل طالب تطبيقًا قصيرًا يقيس مهارة «${context.skill}» ثم راجع الإجابة بسرعة.`;
  return `نفّذ تطبيقًا موجّهًا قصيرًا على مهارة «${context.skill}» ثم اترك للطلاب فرصة المحاولة.`;
}

function warmup(context:LessonContext):LessonPlanStep{
  if(context.subject==='quran')return {key:'warmup',title:'تهيئة',body:`ابدأ باستماع أو قراءة نموذجية قصيرة لمقدار «${context.lesson}»، ثم ذكّر الطلاب أن الهدف هو القراءة الصحيحة والحفظ المتدرج.`,mascotTip:'خلّ البداية قصيرة وصوت النموذج واضحًا.'};
  if(context.subject==='spelling'||context.subject==='handwriting')return {key:'warmup',title:'تهيئة',body:`اعرض مثالًا بسيطًا من درس «${context.lesson}» واسأل الطلاب: ماذا تلاحظون؟`,mascotTip:'دعهم يلاحظون قبل أن تذكر القاعدة.'};
  return {key:'warmup',title:'تهيئة',body:`ابدأ بسؤال أو موقف قصير مرتبط بدرس «${context.lesson}» لاستدعاء خبرة الطلاب السابقة.`,mascotTip:'سؤال واحد واضح أفضل من مقدمة طويلة.'};
}

function teaching(context:LessonContext,strategy:string):LessonPlanStep{
  if(context.subject==='quran')return {key:'teach',title:'عرض وتعلّم',body:`طبّق استراتيجية «${strategy}» على «${context.lesson}». ركّز على مهارة «${context.skill}» وكرّر المقطع عند موضع الخطأ فقط.`,mascotTip:'النموذج الصحيح أولًا، ثم المحاكاة.'};
  return {key:'teach',title:'عرض المهارة',body:`اعرض مهارة «${context.skill}» من درس «${context.lesson}» باستخدام استراتيجية «${strategy}» وبمثال واحد واضح قبل التطبيق.`,mascotTip:'اربط الشرح بالمهارة، ولا تكثر الأمثلة قبل أن يجرب الطلاب.'};
}

function practice(context:LessonContext,style:LessonPlanOptions['activityStyle']):LessonPlanStep{
  const differentiation=context.subject==='quran'
    ?'خفّف مقدار التسميع لمن يحتاج دعمًا، وزد المقطع أو الاستقلالية للطالب المتقدم.'
    :'اجعل سؤال الطالب الذي يحتاج تدريبًا مباشرًا وواضحًا، وأضف سؤالًا أعمق للطالب المتقدم.';
  return {key:'practice',title:'نشاط الطلاب',body:`${activityPhrase(context,style)} ${differentiation}`,mascotTip:'اختلاف مستوى السؤال يكفي غالبًا لمراعاة الفروق الفردية.'};
}

function assessment(context:LessonContext):LessonPlanStep{
  if(context.subject==='quran')return {key:'assessment',title:'تقويم سريع',body:`نفّذ تسميعًا فرديًا قصيرًا لمقدار «${context.lesson}». عند الخطأ حدّد الموضع، أعد النموذج، ثم امنح الطالب محاولة ثانية.`,mascotTip:'التغذية الراجعة الفورية أهم من كثرة الأسئلة.'};
  if(context.subject==='spelling')return {key:'assessment',title:'تقويم سريع',body:`اطلب كتابة كلمة أو جملة قصيرة تقيس «${context.skill}»، ثم صحح الموضع نفسه وامنح فرصة إعادة المحاولة.`,mascotTip:'قِس المهارة نفسها لا كمية الكتابة.'};
  if(context.subject==='handwriting')return {key:'assessment',title:'تقويم سريع',body:`اطلب كتابة نموذج قصير يطبق «${context.skill}»، ثم وجّه الطالب إلى موضع واحد للتحسين وأعد المحاولة.`,mascotTip:'ملاحظة واحدة قابلة للتطبيق أفضل من عدة ملاحظات.'};
  return {key:'assessment',title:'تقويم سريع',body:`اطرح سؤالًا قصيرًا يقيس «${context.skill}». إذا تعثر الطالب، وجّهه إلى الفكرة أو المثال ثم امنحه فرصة ثانية.`,mascotTip:'اسأل سؤالًا يكشف الفهم، وليس الحفظ فقط.'};
}

function close(context:LessonContext):LessonPlanStep{
  if(context.subject==='quran')return {key:'close',title:'خاتمة',body:'اختم بتسميع قصير لطالب أو طالبين، ثم ذكّر بمقدار المراجعة التالي دون إطالة.',mascotTip:'خاتمة قصيرة تحفظ إيقاع الحصة.'};
  return {key:'close',title:'خاتمة',body:`اطلب من طالب أن يذكر في جملة واحدة ماذا تعلّم اليوم عن «${context.lesson}» أو كيف يستخدم مهارة «${context.skill}».`,mascotTip:'جملة واحدة من الطالب تكشف لك الكثير.'};
}

function timeNote(duration:number):LessonPlanOptionalNote{
  const total=Math.max(20,Math.min(60,Math.round(duration)||45));
  const warm=Math.max(2,Math.round(total*.08));
  const teach=Math.max(5,Math.round(total*.22));
  const assess=Math.max(4,Math.round(total*.12));
  const close=Math.max(2,Math.round(total*.06));
  const practice=Math.max(6,total-warm-teach-assess-close);
  return {kind:'time_management',title:'إدارة الوقت',body:`تهيئة ${warm} د · عرض ${teach} د · تطبيق ${practice} د · تقويم ${assess} د · خاتمة ${close} د.`};
}

export function buildLessonPlan(context:LessonContext,options:LessonPlanOptions={}):LessonPlan{
  const strategies=strategyOptionsForLesson(context);
  const strategy=options.strategy&&strategies.includes(options.strategy)?options.strategy:(options.strategy||strategies[0]);
  const optionalNotes:LessonPlanOptionalNote[]=[];
  if(options.technology)optionalNotes.push({kind:'technology',title:'تقنية عند الحاجة',body:'استخدم عرضًا أو صوتًا قصيرًا فقط إذا كان يوضح المهارة أسرع من الشرح المباشر؛ لا تستخدم التقنية لمجرد وجودها.'});
  if(options.timeManagement)optionalNotes.push(timeNote(context.durationMinutes));
  return {
    subject:context.subject,
    lesson:context.lesson,
    skill:context.skill,
    strategy,
    steps:[warmup(context),teaching(context,strategy),practice(context,options.activityStyle),assessment(context),close(context)],
    optionalNotes,
  };
}
