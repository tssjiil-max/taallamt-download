import React from 'react';
import {createRoot} from 'react-dom/client';
import './ui.css';
import './teacher-lesson.css';
import {buildLessonPlan,strategyOptionsForLesson,type LessonContext,type LessonSubject} from './core/lesson-assistant';

type ContentItem={subject?:string;title:string;unit?:string;lesson?:string;skill?:string;surah?:string;weekly?:string;days?:string[]};
type AutomationPreview={
  ok:boolean;
  localDate:string;
  weekday:number;
  week:number;
  weekKey:string;
  timetableMissing:boolean;
  scheduleSource:string;
  scheduledSubjects:string[];
  content:Record<string,ContentItem>;
};

type AssistantMode='teacher'|'student';
type ActivityStyle='guided'|'pairs'|'individual';

const subjectOrder:LessonSubject[]=['arabic','quran','islamic','spelling','handwriting'];
const isLessonSubject=(value:string):value is LessonSubject=>subjectOrder.includes(value as LessonSubject);
const subjectLabel=(subject:LessonSubject)=>subject==='arabic'?'لغتي':subject==='quran'?'القرآن الكريم':subject==='islamic'?'الدراسات الإسلامية':'الإملاء والخط';
const subjectEmoji=(subject:LessonSubject)=>subject==='arabic'?'📘':subject==='quran'?'📖':subject==='islamic'?'🌿':'✍️';

function contextFrom(preview:AutomationPreview,subject:LessonSubject):LessonContext|null{
  const item=preview.content?.[subject];
  if(!item)return null;
  const lesson=String(item.lesson||item.weekly||'').trim();
  const skill=String(item.skill||'').trim();
  if(!lesson||!skill)return null;
  return {
    subject,
    subjectLabel:item.title||subjectLabel(subject),
    unit:String(item.unit||item.surah||'').trim(),
    lesson,
    skill,
    gradeLabel:'الثاني',
    classLabel:'4',
    durationMinutes:45,
  };
}

function TeacherLessonPage(){
  const [preview,setPreview]=React.useState<AutomationPreview|null>(null);
  const [loading,setLoading]=React.useState(true);
  const [loadError,setLoadError]=React.useState('');
  const [subject,setSubject]=React.useState<LessonSubject|null>(null);
  const [strategy,setStrategy]=React.useState('');
  const [activityStyle,setActivityStyle]=React.useState<ActivityStyle>('guided');
  const [technology,setTechnology]=React.useState(false);
  const [timeManagement,setTimeManagement]=React.useState(false);
  const [prepared,setPrepared]=React.useState(false);
  const [stepIndex,setStepIndex]=React.useState(0);
  const [assistantMode,setAssistantMode]=React.useState<AssistantMode>('teacher');
  const [question,setQuestion]=React.useState('');
  const [assistantAnswer,setAssistantAnswer]=React.useState('');
  const [assistantError,setAssistantError]=React.useState('');
  const [assistantBusy,setAssistantBusy]=React.useState(false);

  React.useEffect(()=>{
    let live=true;
    fetch('/api/learning-automation?action=preview',{cache:'no-store'})
      .then(async response=>{if(!response.ok)throw new Error('PREVIEW_FAILED');return response.json()})
      .then((data:AutomationPreview)=>{
        if(!live)return;
        setPreview(data);
        const scheduled=(data.scheduledSubjects||[]).filter(isLessonSubject);
        const first=scheduled[0]||subjectOrder.find(key=>Boolean(data.content?.[key]))||null;
        setSubject(first);
        setLoading(false);
      })
      .catch(()=>{if(live){setLoadError('تعذر تحديد درس هذه الحصة تلقائيًا.');setLoading(false)}});
    return()=>{live=false};
  },[]);

  const context=React.useMemo(()=>preview&&subject?contextFrom(preview,subject):null,[preview,subject]);
  const strategies=React.useMemo(()=>context?strategyOptionsForLesson(context):[],[context]);
  React.useEffect(()=>{if(context){setStrategy(strategyOptionsForLesson(context)[0]||'');setPrepared(false);setStepIndex(0);setAssistantAnswer('');setAssistantError('')}},[context?.subject,context?.lesson,context?.skill]);
  const plan=React.useMemo(()=>context?buildLessonPlan(context,{strategy:strategy||undefined,activityStyle,technology,timeManagement}):null,[context,strategy,activityStyle,technology,timeManagement]);
  const currentStep=plan?.steps[stepIndex];

  const prepare=()=>{
    setPrepared(true);
    setStepIndex(0);
    requestAnimationFrame(()=>document.getElementById('lesson-steps')?.scrollIntoView({behavior:'smooth',block:'start'}));
  };

  const nextIdea=()=>{
    if(!strategies.length)return;
    const index=Math.max(0,strategies.indexOf(strategy));
    setStrategy(strategies[(index+1)%strategies.length]);
  };

  async function askAssistant(forcedQuestion?:string){
    if(!context)return;
    const raw=(forcedQuestion??question).trim();
    if(!raw)return;
    const stepContext=currentStep?`أنا الآن في مرحلة «${currentStep.title}»: ${currentStep.body}. `:'';
    setAssistantBusy(true);setAssistantError('');setAssistantAnswer('');
    try{
      const response=await fetch('/api/lesson-assistant',{
        method:'POST',headers:{'Content-Type':'application/json'},
        body:JSON.stringify({
          mode:assistantMode,
          question:`${stepContext}${raw}`.slice(0,500),
          context:{subject:context.subject,subjectLabel:context.subjectLabel,unit:context.unit,lesson:context.lesson,skill:context.skill,gradeLabel:context.gradeLabel,classLabel:context.classLabel}
        })
      });
      const data=await response.json().catch(()=>({}));
      if(!response.ok||!data?.answer)throw new Error(data?.message||'تعذر تشغيل شكابمبو الآن.');
      setAssistantAnswer(String(data.answer));
      if(!forcedQuestion)setQuestion('');
    }catch(error){setAssistantError(error instanceof Error?error.message:'تعذر تشغيل شكابمبو الآن. الحصة ما زالت جاهزة.')}
    finally{setAssistantBusy(false)}
  }

  const quickRequests=[
    ['بسّط','بسّط لي هذه الفكرة للطلاب بعبارة قصيرة جدًا.'],
    ['مثال آخر','أعطني مثالًا آخر بسيطًا مرتبطًا بمهارة الدرس.'],
    ['سؤال سريع','اكتب سؤالًا شفهيًا سريعًا يكشف فهم المهارة.'],
    ['نشاط دقيقتين','اقترح نشاطًا لا يتجاوز دقيقتين ويخدم مهارة الدرس.'],
    ['للطالب المتقدم','أعطني سؤالًا أعمق لطالب متقدم دون الخروج عن الدرس.'],
  ] as const;

  if(loading)return <main className="lessonWorkspace lessonState" dir="rtl"><img src="/student-assets/student-main-logo.webp" alt="شكابمبو"/><h1>أجهّز حصتك...</h1><p>أقرأ الجدول والتوزيع والمهارة الحالية.</p></main>;
  if(loadError||!preview||!context)return <main className="lessonWorkspace lessonState" dir="rtl"><img src="/student-assets/student-main-logo.webp" alt="شكابمبو"/><h1>تعذر تجهيز الحصة</h1><p>{loadError||'تعذر تحديد المادة أو الدرس أو المهارة تلقائيًا.'}</p><button onClick={()=>location.assign('/teacher')}>العودة للمعلم</button></main>;

  const scheduled=(preview.scheduledSubjects||[]).filter(isLessonSubject);
  return <main className="lessonWorkspace" dir="rtl">
    <header className="lessonTopbar">
      <button className="lessonBack" onClick={()=>location.assign('/teacher')} aria-label="العودة">‹</button>
      <div><small>تعلّمت · حصتي الآن</small><h1>{context.subjectLabel}</h1></div>
      <span className="lessonDate">{preview.localDate}</span>
    </header>

    <section className="lessonHeroCard">
      <div className="lessonHeroText">
        <span className="lessonSubjectMark">{subjectEmoji(context.subject)} {context.subjectLabel}</span>
        <h2>{context.lesson}</h2>
        {context.unit&&<p><b>{context.subject==='quran'?'السورة / الوحدة':'الوحدة'}:</b> {context.unit}</p>}
        <p><b>المهارة:</b> {context.skill}</p>
        <small>{preview.timetableMissing?'من توزيع المنهج المعتمد':'مرتبط بجدول الحصص والتوزيع'} · الثاني / 4</small>
      </div>
      <div className="lessonMascotIntro"><img src="/student-assets/student-main-logo.webp" alt="شكابمبو"/><span>أنا معك في الحصة 👋</span></div>
    </section>

    {scheduled.length>1&&<section className="lessonCard subjectPicker"><h3>اختر حصة اليوم</h3><div>{scheduled.map(key=><button key={key} className={subject===key?'selected':''} onClick={()=>setSubject(key)}>{subjectEmoji(key)} {subjectLabel(key)}</button>)}</div></section>}

    <section className="lessonCard lessonSetup">
      <div className="sectionTitle"><div><small>قبل البداية</small><h3>هل تريد تحديد شيء بنفسك؟</h3></div><span>اختياري</span></div>
      <div className="setupBlock"><b>الاستراتيجية</b><div className="strategyChips">{strategies.map(value=><button key={value} className={strategy===value?'selected':''} onClick={()=>setStrategy(value)}>{value}</button>)}</div><button className="ideaButton" onClick={nextIdea}>↻ فكرة أخرى</button></div>
      <div className="setupBlock"><b>النشاط</b><div className="smallChoices"><button className={activityStyle==='guided'?'selected':''} onClick={()=>setActivityStyle('guided')}>موجّه</button><button className={activityStyle==='pairs'?'selected':''} onClick={()=>setActivityStyle('pairs')}>ثنائي</button><button className={activityStyle==='individual'?'selected':''} onClick={()=>setActivityStyle('individual')}>فردي</button></div></div>
      <div className="lessonToggles"><button className={technology?'selected':''} onClick={()=>setTechnology(v=>!v)}>💡 تقنية عند الحاجة</button><button className={timeManagement?'selected':''} onClick={()=>setTimeManagement(v=>!v)}>⏱ إدارة الوقت</button></div>
      <button className="prepareLesson" onClick={prepare}>✨ جهّز الحصة لي</button>
    </section>

    {prepared&&plan&&currentStep&&<section id="lesson-steps" className="lessonExecution">
      <div className="lessonProgress" aria-label="مراحل الحصة">{plan.steps.map((step,index)=><button key={step.key} aria-label={step.title} className={index===stepIndex?'active':index<stepIndex?'done':''} onClick={()=>setStepIndex(index)}><span>{index+1}</span></button>)}</div>
      <article className="currentLessonStep">
        <div className="stepCount">الخطوة {stepIndex+1} من {plan.steps.length}</div>
        <h3>{currentStep.title}</h3>
        <p>{currentStep.body}</p>
        <div className="shakabomboTip"><img src="/student-assets/student-main-logo.webp" alt="شكابمبو"/><div><b>شكابمبو يقول:</b><span>{currentStep.mascotTip}</span></div></div>
        {plan.optionalNotes.map(note=><div className="optionalLessonNote" key={note.kind}><b>{note.title}</b><span>{note.body}</span></div>)}
        <div className="stepNav"><button disabled={stepIndex===0} onClick={()=>setStepIndex(i=>Math.max(0,i-1))}>السابق</button>{stepIndex<plan.steps.length-1?<button className="primary" onClick={()=>setStepIndex(i=>Math.min(plan.steps.length-1,i+1))}>التالي</button>:<button className="primary" onClick={()=>location.assign('/teacher')}>إنهاء الحصة</button>}</div>
      </article>
    </section>}

    <section className="lessonCard shakabomboAssistant">
      <div className="assistantHead"><img src="/student-assets/student-main-logo.webp" alt="شكابمبو"/><div><small>مساعد الحصة</small><h3>اسأل شكابمبو</h3><p>يعرف مادة اليوم ودرسها ومهارتها المتاحة.</p></div></div>
      <div className="assistantModes"><button className={assistantMode==='teacher'?'selected':''} onClick={()=>setAssistantMode('teacher')}>أنا المعلم</button><button className={assistantMode==='student'?'selected':''} onClick={()=>setAssistantMode('student')}>سؤال طالب</button></div>
      <div className="quickAssistantActions">{quickRequests.map(([label,prompt])=><button key={label} disabled={assistantBusy} onClick={()=>askAssistant(prompt)}>{label}</button>)}</div>
      <div className="assistantAsk"><input value={question} maxLength={360} onChange={event=>setQuestion(event.target.value)} onKeyDown={event=>{if(event.key==='Enter')askAssistant()}} placeholder={assistantMode==='student'?'اكتب سؤال الطالب هنا...':'اطلب شرحًا أو مثالًا أو سؤالًا أو نشاطًا...'}/><button disabled={assistantBusy||!question.trim()} onClick={()=>askAssistant()}>{assistantBusy?'...':'إرسال'}</button></div>
      {assistantBusy&&<div className="assistantStatus">شكابمبو يفكر في الدرس...</div>}
      {assistantError&&<div className="assistantError">{assistantError}</div>}
      {assistantAnswer&&<div className="assistantAnswer"><b>شكابمبو</b><p>{assistantAnswer}</p></div>}
      <small className="assistantBoundary">إذا احتاج السؤال معلومة خارج سياق الدرس المتاح، لن يخمّن شكابمبو.</small>
    </section>
  </main>;
}

function mountTeacherLesson(){
  document.body.classList.add('teacherLessonMode');
  let host=document.getElementById('teacher-lesson-root');
  if(!host){host=document.createElement('div');host.id='teacher-lesson-root';document.body.appendChild(host)}
  createRoot(host).render(<TeacherLessonPage/>);
}

if(location.pathname==='/teacher/lesson'){
  mountTeacherLesson();
}else{
  document.addEventListener('click',event=>{
    const target=event.target;
    const button=target instanceof Element?target.closest('.startLesson'):null;
    if(!button)return;
    event.preventDefault();
    event.stopImmediatePropagation();
    location.assign('/teacher/lesson');
  },true);
}
