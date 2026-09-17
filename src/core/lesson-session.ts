export type LessonSubject='arabic'|'quran'|'islamic'|'spelling'|'handwriting';
export type LessonStepKind='warmup'|'strategy'|'activity'|'participation'|'differentiation'|'assessment'|'feedback'|'motivation'|'technology'|'time';

export interface LessonContext{
  subject:LessonSubject;
  subjectTitle:string;
  unit:string;
  lesson:string;
  skills:string[];
  grade:string;
  className:string;
  date?:string;
  period?:string;
  durationMinutes?:number;
}

export interface LessonPlanOptions{
  strategy?:string;
  includeTechnology?:boolean;
  includeTimeManagement?:boolean;
}

export interface LessonStep{
  id:string;
  title:string;
  kind:LessonStepKind;
  text:string;
  minutes?:number;
}

export interface LessonPlan{
  strategy:string;
  steps:LessonStep[];
}

const defaultStrategies:Record<LessonSubject,string>={
  arabic:'فكر – زاوج – شارك',
  quran:'استماع – محاكاة – ترديد – تسميع',
  islamic:'السؤال المتدرج',
  spelling:'الملاحظة ثم التطبيق',
  handwriting:'النمذجة ثم المحاكاة'
};

export function strategyAlternatives(context:LessonContext):string[]{
  const map:Record<LessonSubject,string[]>={
    arabic:['فكر – زاوج – شارك','القراءة الموجهة','السؤال المتدرج','التعلم التعاوني'],
    quran:['استماع – محاكاة – ترديد – تسميع','التسميع الثنائي','الترديد الجماعي','التسميع المتدرج'],
    islamic:['السؤال المتدرج','التعلم بالموقف','فكر – زاوج – شارك','التعلم التعاوني'],
    spelling:['الملاحظة ثم التطبيق','اكتشف القاعدة','التدريب الثنائي','التطبيق المتدرج'],
    handwriting:['النمذجة ثم المحاكاة','التتبع البصري','المحاكاة المتدرجة','التدريب الفردي الموجّه']
  };
  return map[context.subject];
}

function skill(context:LessonContext){return context.skills[0]||'هدف الدرس';}

function subjectSteps(context:LessonContext,strategy:string):LessonStep[]{
  if(context.subject==='quran')return [
    {id:'warmup',title:'تهيئة قصيرة',kind:'warmup',text:`استمعوا إلى قراءة نموذجية من ${context.lesson}، ثم لاحظوا النطق والوقف.`},
    {id:'strategy',title:'طريقة التعلّم',kind:'strategy',text:`طبّق ${strategy}: استماع ثم محاكاة وترديد قبل التسميع الفردي.`},
    {id:'activity',title:'التطبيق',kind:'activity',text:`قسّم ${context.lesson} إلى مقاطع قصيرة، وردّد كل مقطع ثم اسمح بتسميعه تدريجيًا.`},
    {id:'differentiation',title:'الفروق الفردية',kind:'differentiation',text:'خفّف مقدار التسميع لمن يحتاج تدريبًا، وزد الاستقلالية للطالب المتقن.'},
    {id:'assessment',title:'تقويم سريع',kind:'assessment',text:`استمع لتسميع فردي قصير يركز على ${skill(context)}، وصحح موضع الخطأ ثم أعد المحاولة.`}
  ];

  if(context.subject==='arabic')return [
    {id:'warmup',title:'تهيئة قصيرة',kind:'warmup',text:`ابدأ بسؤال توقع مرتبط بدرس «${context.lesson}» ثم استمع لإجابتين أو ثلاث.`},
    {id:'strategy',title:'الاستراتيجية',kind:'strategy',text:`طبّق «${strategy}» على مهارة: ${skill(context)}.`},
    {id:'activity',title:'نشاط الطلاب',kind:'activity',text:strategy==='التعلم التعاوني'?`وزّع الطلاب إلى مجموعات صغيرة لاستخراج فكرة أو معلومة من «${context.lesson}».`:`اطلب قراءة جزء قصير من «${context.lesson}» ثم استخراج فكرة أو معلومة مرتبطة بالمهارة.`},
    {id:'differentiation',title:'الفروق الفردية',kind:'differentiation',text:'اسأل الطالب الذي يحتاج تدريبًا سؤالًا مباشرًا، وامنح الطالب المتقدم سؤالًا استنتاجيًا.'},
    {id:'assessment',title:'تقويم سريع',kind:'assessment',text:`اختم بسؤال واحد يقيس «${skill(context)}» مباشرة.`}
  ];

  if(context.subject==='spelling')return [
    {id:'warmup',title:'تهيئة قصيرة',kind:'warmup',text:`اعرض كلمتين من سياق «${context.lesson}» واطلب ملاحظة النمط الإملائي.`},
    {id:'strategy',title:'الاستراتيجية',kind:'strategy',text:`استخدم «${strategy}» للوصول إلى مهارة ${skill(context)}.`},
    {id:'activity',title:'تطبيق',kind:'activity',text:'نفّذ تدريبًا قصيرًا: ملاحظة، نطق، كتابة، ثم مقارنة الإجابة بالنموذج.'},
    {id:'differentiation',title:'الفروق الفردية',kind:'differentiation',text:'قلّل عدد الكلمات لمن يحتاج دعمًا، وأضف كلمة جديدة للطالب المتقدم.'},
    {id:'assessment',title:'تقويم سريع',kind:'assessment',text:`أملِ كلمة أو جملة قصيرة تقيس ${skill(context)} فقط.`}
  ];

  if(context.subject==='handwriting')return [
    {id:'warmup',title:'تهيئة قصيرة',kind:'warmup',text:`اعرض نموذجًا واضحًا من «${context.lesson}» ولفت الانتباه إلى موضع الحروف على السطر.`},
    {id:'strategy',title:'الاستراتيجية',kind:'strategy',text:`طبّق «${strategy}» أمام الطلاب بخطوات بطيئة وواضحة.`},
    {id:'activity',title:'تطبيق',kind:'activity',text:'يقلّد الطلاب النموذج مرة موجهة ثم مرة مستقلة مع التركيز على شكل الحرف واتصاله.'},
    {id:'feedback',title:'تغذية راجعة',kind:'feedback',text:'صحح عنصرًا واحدًا فقط في كل محاولة ثم امنح الطالب فرصة إعادة الكتابة.'},
    {id:'assessment',title:'تقويم سريع',kind:'assessment',text:`اختر كلمة قصيرة تقيس ${skill(context)} دون إطالة.`}
  ];

  return [
    {id:'warmup',title:'تهيئة قصيرة',kind:'warmup',text:`اربط درس «${context.lesson}» بموقف بسيط من حياة الطالب، ثم اسأل سؤالًا تمهيديًا.`},
    {id:'strategy',title:'الاستراتيجية',kind:'strategy',text:`استخدم «${strategy}» للوصول إلى مهارة: ${skill(context)}.`},
    {id:'activity',title:'نشاط الطلاب',kind:'activity',text:strategy==='التعلم التعاوني'?`قسّم الطلاب إلى مجموعات صغيرة لمناقشة موقف مرتبط بدرس «${context.lesson}» ثم مشاركة مثال واحد.`:`اعرض موقفًا قصيرًا مرتبطًا بدرس «${context.lesson}» واطلب من الطلاب تحديد السلوك أو الفكرة الصحيحة.`},
    {id:'differentiation',title:'الفروق الفردية',kind:'differentiation',text:'استخدم سؤال اختيار مباشر لمن يحتاج دعمًا، وسؤال لماذا/كيف للطالب المتقدم.'},
    {id:'assessment',title:'تقويم سريع',kind:'assessment',text:`اطلب من طالب أن يذكر مثالًا أو موقفًا يثبت فهم «${skill(context)}».`}
  ];
}

export function buildLessonPlan(context:LessonContext,options:LessonPlanOptions):LessonPlan{
  const strategy=options.strategy||defaultStrategies[context.subject];
  const steps=subjectSteps(context,strategy);
  if(options.includeTechnology){
    steps.splice(Math.max(2,steps.length-1),0,{id:'technology',title:'تقنية عند الحاجة',kind:'technology',text:'استخدم وسيلة رقمية قصيرة فقط إذا كانت تضيف فهمًا واضحًا للهدف، وتجاوزها إذا لم تكن مفيدة.'});
  }
  if(options.includeTimeManagement){
    const total=context.durationMinutes||45;
    const suggested=[3,8,Math.max(10,total-18),5,2];
    steps.forEach((step,index)=>{step.minutes=suggested[Math.min(index,suggested.length-1)]});
  }
  return {strategy,steps};
}

function shortSkill(context:LessonContext){return context.skills.slice(0,2).join(' و ')||'هدف الدرس';}

export function replyAsShakabambo(context:LessonContext,prompt:string,audience:'student'|'teacher'='teacher'):string{
  const q=prompt.trim();
  const lesson=`«${context.lesson}»`;
  const primary=shortSkill(context);
  if(!q)return `أنا معك في درس ${lesson}. اسألني عن شرح، مثال، نشاط، سؤال أو تقويم مرتبط بالهدف.`;

  if(/سؤال|اسأل/.test(q)){
    const answer=context.subject==='quran'
      ?`في درس ${lesson}: استمع للمقطع، ثم ما الموضع الذي تحتاج أن تعيده لتحسن القراءة أو الحفظ؟`
      :`في درس ${lesson}: أعطني مثالًا يوضح ${context.skills[0]||'الفكرة التي تعلمناها اليوم'}؟`;
    return audience==='student'?answer:`سؤال مناسب الآن: ${answer}`;
  }
  if(/شرح|اشرح|بسط|بسّط/.test(q))return `درسنا ${lesson}. الفكرة التي نركز عليها هي ${primary}. ابدأ بمثال قريب من حياة الطالب، ثم ارجع إلى هدف الدرس.`;
  if(/مثال/.test(q))return context.subject==='islamic'?`مثال قريب من درس ${lesson}: موقف يومي يختار فيه الطالب السلوك الصحيح ثم يشرح لماذا هو صحيح.`:`مثال مرتبط بدرس ${lesson}: اختر كلمة أو جملة أو موقفًا يطبق ${context.skills[0]||'هدف الدرس'} مباشرة.`;
  if(/نشاط|لعبة/.test(q))return `نشاط سريع لدرس ${lesson}: طالب يجيب، ثم يشرح لزميله سبب إجابته، وبعدها يشارك زوج واحد أمام الصف. الهدف: ${primary}.`;
  if(/تقويم|فهم|تأكد|أتأكد/.test(q))return `تقويم سريع لدرس ${lesson}: سؤال واحد مباشر على ${context.skills[0]||'الهدف'}، ثم فرصة ثانية بعد تلميح قصير لمن يحتاج.`;
  if(/استراتيجية|طريقة/.test(q))return `لهذا الدرس أقترح «${defaultStrategies[context.subject]}». ويمكنك تغييرها من خيارات الحصة إذا أردت.`;

  return audience==='student'
    ?`سؤالك مرتبط بدرس ${lesson}. تذكّر أن هدفنا هو ${primary}. حاول أن تربط إجابتك بما تعلمناه في الدرس.`
    :`بالنسبة لدرس ${lesson} وهدف ${primary}: اجعل الطلب قصيرًا ومباشرًا، ثم افحص الفهم بسؤال واحد قبل الانتقال للخطوة التالية.`;
}
