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
  const objectives=context.skills.filter(Boolean).slice(0,3);
  const first=objectives[0]||'هدف الدرس';
  const second=objectives[1];

  if(!q)return audience==='student'
    ?`أنا شكابمبو، معك في درس ${lesson}. اسألني عن فكرة الدرس أو اطلب مثالًا أو سؤالًا بسيطًا.`
    :`أنا معك في درس ${lesson}. أعرف المادة والوحدة وأهداف الحصة المتاحة، وأستطيع اقتراح شرح أو نشاط أو سؤال أو تقويم مرتبط بها.`;

  if(/نص (الحديث|الآية)|الحديث (كامل|الموجود)|الآية (كاملة|الموجودة)|رقم الصفحة|وش مكتوب في الكتاب|ماذا كتب في الكتاب|تعريف الكتاب/.test(q)){
    return audience==='student'
      ?`النص الدقيق مو موجود في سياق الدرس اللي وصلني. خلّنا نرجع لمصدر الدرس أو نسأل المعلم حتى ما أخمّن.`
      :`النص الحرفي المطلوب غير موجود في سياق الحصة المتاح لي؛ ارجع لمصدر الدرس قبل عرضه، وأنا أساعدك بعد ذلك في شرحه أو بناء سؤال عليه.`;
  }

  if(/أهداف|اهداف|هدف الدرس|المهارات|مهارات|وش نتعلم|ماذا نتعلم/.test(q)){
    const joined=objectives.join('، ');
    return audience==='student'
      ?`اليوم في درس ${lesson} نتعلم: ${joined||primary}.`
      :`أهداف الحصة المتاحة لدرس ${lesson}: ${joined||primary}.`;
  }

  if(/لخص|لخّص|ملخص|عن ايش الدرس|عن إيش الدرس|وش الدرس/.test(q)){
    return `ملخص سياق الحصة: درس ${lesson} من ${context.subjectTitle}${context.unit?` ضمن «${context.unit}»`:''}، ويركز على ${primary}.`;
  }

  if(/فروق|الفروق الفردية|متفاوت|طالب متقدم|يحتاج تدريب|طالب ضعيف/.test(q)){
    if(context.subject==='quran')return `راعِ الفروق في ${lesson}: اجعل الطالب الذي يحتاج دعمًا يسمّع مقطعًا أقصر بعد الترديد، والمتقدم يسمّع باستقلالية أكبر، مع التركيز على ${first}.`;
    if(context.subject==='spelling'||context.subject==='handwriting')return `في ${lesson}: قلّل عدد الكلمات أو مقدار الكتابة لمن يحتاج تدريبًا، وقدّم نموذجًا بصريًا، وأضف تطبيقًا جديدًا للطالب المتقدم.`;
    return `في ${lesson}: أعطِ من يحتاج تدريبًا سؤالًا مباشرًا أو خيارين، ثم سؤال «لماذا/كيف» للطالب المتقدم، مع بقاء الجميع على هدف ${first}.`;
  }

  if(/تغذية راجعة|تغذيه راجعه|صحح|تصحيح|إذا أخطأ|اذا اخطأ|خطأ الطالب/.test(q)){
    if(context.subject==='quran')return `حدّد موضع الخطأ فقط، أعد النموذج الصحيح باختصار، ثم أعطِ الطالب فرصة تسميع المقطع مرة ثانية دون إحراجه.`;
    if(context.subject==='handwriting')return `صحح عنصرًا واحدًا في المحاولة—شكل الحرف أو موضعه على السطر—ثم اطلب إعادة الكلمة مرة واحدة.`;
    return `قل للطالب ما الذي نجح فيه أولًا، ثم أعطه تلميحًا واحدًا مرتبطًا بـ${first} وامنحه فرصة ثانية للإجابة.`;
  }

  if(/تحفيز|حفز|شجع|تشجيع|ثناء|نجمة/.test(q)){
    return `استخدم تحفيزًا قصيرًا مرتبطًا بالمحاولة: «أعجبني أنك حاولت وراجعت إجابتك». وإذا كان نظام النجوم مناسبًا في اللحظة الحالية فقرار منحها يبقى لك.`;
  }

  if(/وقت|الوقت|دقائق|زمن/.test(q)){
    const total=context.durationMinutes||45;
    return `لديك نحو ${total} دقيقة. اجعل التهيئة قصيرة، واترك معظم الوقت للتطبيق على ${first}، ثم اختم بسؤال تقويم واحد قبل نهاية الحصة.`;
  }

  if(/ليش|لماذا/.test(q)){
    return audience==='student'
      ?`سؤال جميل. في درس ${lesson} هدفنا أن نتعلم ${first}${second?` و${second}`:''}. خلّنا نفكر: كيف يظهر هذا في موقف بسيط من حياتنا؟`
      :`اربط سؤال «لماذا» مباشرة بهدف ${first}. اطلب مثالًا من الطالب ثم اسأله: ما الأثر أو السبب الذي فهمته من درس ${lesson}؟`;
  }

  if(/كيف/.test(q)&&audience==='student'){
    return `خلّنا نمشي خطوة خطوة في درس ${lesson}: تذكّر أولًا أن هدفنا ${first}، ثم جرّب مثالًا واحدًا وأنا أساعدك تربطه بالهدف.`;
  }

  if(/سؤال|اسأل/.test(q)){
    const answer=context.subject==='quran'
      ?`في درس ${lesson}: استمع للمقطع، ثم ما الموضع الذي تحتاج أن تعيده لتحسن ${first}؟`
      :context.subject==='spelling'
        ?`في درس ${lesson}: ما العلامة التي تساعدك على تطبيق ${first} في هذه الكلمة؟`
        :context.subject==='handwriting'
          ?`في درس ${lesson}: ما الشيء الذي ستنتبه له في شكل الحرف أو موضعه على السطر؟`
          :`في درس ${lesson}: أعطني مثالًا يوضح ${first}؟`;
    return audience==='student'?answer:`سؤال مناسب الآن: ${answer}`;
  }

  if(/شرح|اشرح|بسط|بسّط|ما فهمت|مو فاهم/.test(q)){
    if(context.subject==='quran')return `نبسّطها هكذا: نستمع أولًا، ثم نكرر المقطع بهدوء، وبعدها نجرب التسميع. تركيزنا اليوم على ${primary}.`;
    if(context.subject==='spelling')return `نبسّط ${lesson}: لاحظ النمط أولًا، انطق الكلمة، ثم اكتبها وراجع هل طبقت ${first}.`;
    if(context.subject==='handwriting')return `شاهد النموذج في ${lesson}، لاحظ شكل الحروف ومكانها على السطر، ثم قلد النموذج مرة واحدة ببطء.`;
    return `درسنا ${lesson}. الفكرة التي نركز عليها هي ${primary}. نبدأ بموقف أو مثال قريب، ثم نسأل: كيف يرتبط هذا بهدف الدرس؟`;
  }

  if(/مثال/.test(q)){
    if(context.subject==='quran')return `بدل اختراع نص من السورة، استخدم المقطع المحدد في درس ${lesson} نفسه: اقرأه نموذجًا ثم اطلب محاكاته وتسميعه.`;
    if(context.subject==='spelling')return `اختر كلمة موجودة فعلًا في مادة الدرس، واطلب من الطالب ملاحظة موضع تطبيق ${first} ثم كتابتها. لا نحتاج كلمة جديدة إذا لم تكن من المصدر.`;
    if(context.subject==='handwriting')return `استخدم كلمة موجودة في نموذج الدرس نفسه، ثم اطلب من الطالب تقليدها مع التركيز على ${first}.`;
    return `مثال آمن لدرس ${lesson}: اعرض موقفًا يوميًا بسيطًا، واطلب من الطالب أن يربطه بـ${first} دون ادعاء أنه نص من الكتاب.`;
  }

  if(/نشاط|لعبة/.test(q)){
    if(context.subject==='quran')return `نشاط سريع: استماع لمقطع قصير من ${lesson}، ترديد ثنائي، ثم تسميع فردي لطالبين متفاوتي المستوى. الهدف: ${primary}.`;
    if(context.subject==='spelling')return `نشاط سريع: لاحظ – انطق – اكتب. يعرض المعلم مثالًا من الدرس، يحدّد الطلاب موضع المهارة، ثم يكتبون تطبيقًا قصيرًا.`;
    if(context.subject==='handwriting')return `نشاط سريع: تتبع بصري للنموذج، كتابة موجهة لكلمة واحدة، ثم محاولة مستقلة مع تصحيح عنصر واحد فقط.`;
    return `نشاط سريع لدرس ${lesson}: فكر فرديًا نصف دقيقة، ناقش مع زميلك مثالًا على ${first}، ثم يشارك زوج واحد أمام الصف.`;
  }

  if(/تقويم|فهم|تأكد|أتأكد/.test(q)){
    if(context.subject==='quran')return `تقويم سريع: تسميع فردي قصير من الجزء المحدد في ${lesson} مع ملاحظة ${primary}، ثم إعادة الموضع الذي يحتاج تحسينًا.`;
    if(context.subject==='spelling')return `تقويم سريع: تطبيق قصير جدًا على ${first} بكلمة أو جملة من سياق الدرس، ثم فرصة تصحيح واحدة.`;
    return `تقويم سريع لدرس ${lesson}: سؤال واحد مباشر على ${first}، ثم فرصة ثانية بعد تلميح قصير لمن يحتاج.`;
  }

  if(/استراتيجية|طريقة تدريس/.test(q))return `لهذا الدرس أقترح «${defaultStrategies[context.subject]}». وإذا رغبت بالتغيير فهذه بدائل مناسبة: ${strategyAlternatives(context).slice(1,4).join('، ')}.`;

  if(/فكرة أخرى|فكره اخرى/.test(q)){
    const alternate=strategyAlternatives(context)[1]||defaultStrategies[context.subject];
    return `فكرة بديلة لدرس ${lesson}: استخدم «${alternate}» مع تطبيق قصير على ${first}، ثم سؤال ختامي واحد يقيس نفس الهدف.`;
  }

  return audience==='student'
    ?`سؤالك مهم. الذي أعرفه يقينًا من حصتنا أن الدرس هو ${lesson} وهدفنا ${primary}. إذا كان سؤالك يحتاج نصًا أو معلومة دقيقة غير موجودة هنا، نرجع للمعلم أو لمصدر الدرس حتى ما أخمّن.`
    :`أربط طلبك بدرس ${lesson} وهدف ${primary}. أستطيع مساعدتك في صياغة شرح أو مثال أو نشاط أو سؤال أو تقويم، أما النصوص والمعلومات الدقيقة غير الموجودة في سياق الحصة فلن أخمّنها.`;
}

