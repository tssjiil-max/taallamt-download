import React from 'react';
import {CURRENT_LESSON,loadCurrentLessonContext} from '../core/current-lesson';
import {buildLessonPlan,replyAsShakabambo,strategyAlternatives} from '../core/lesson-session';
import {askShakabamboRemote} from '../core/lesson-assistant-client';
import './lesson-session-screen.css';

const mascot='/student-assets/student-main-logo.webp';

export function LessonSessionScreen(){
  const [context,setContext]=React.useState(CURRENT_LESSON);
  const [strategy,setStrategy]=React.useState<string>('');
  const [chooseStrategy,setChooseStrategy]=React.useState(false);
  const [includeTechnology,setIncludeTechnology]=React.useState(false);
  const [includeTime,setIncludeTime]=React.useState(false);
  const [started,setStarted]=React.useState(false);
  const [stepIndex,setStepIndex]=React.useState(0);
  const [audience,setAudience]=React.useState<'teacher'|'student'>('teacher');
  const [prompt,setPrompt]=React.useState('');
  const [reply,setReply]=React.useState(()=>replyAsShakabambo(context,'','teacher'));
  const [assistantBusy,setAssistantBusy]=React.useState(false);
  const [assistantNotice,setAssistantNotice]=React.useState('');
  React.useEffect(()=>{let live=true;loadCurrentLessonContext().then(value=>{if(live)setContext(value)});return()=>{live=false}},[]);
  React.useEffect(()=>{setStrategy('');setStarted(false);setStepIndex(0);setPrompt('');setAssistantNotice('');setReply(replyAsShakabambo(context,'','teacher'));},[context.subject,context.lesson,context.skills.join('|')]);
  const plan=React.useMemo(()=>buildLessonPlan(context,{strategy:strategy||undefined,includeTechnology,includeTimeManagement:includeTime}),[strategy,includeTechnology,includeTime,context]);
  const step=plan.steps[Math.min(stepIndex,plan.steps.length-1)];
  const ask=async(text:string)=>{const q=text.trim();if(!q||assistantBusy)return;setPrompt(q);setAssistantBusy(true);setAssistantNotice('');const localReply=replyAsShakabambo(context,q,audience);try{setReply(await askShakabamboRemote(context,q,audience));}catch{setReply(localReply);setAssistantNotice('تعذر تشغيل شكابمبو الآن عبر الاتصال الذكي، فاستخدمت المساعدة المحلية المرتبطة بالحصة.');}finally{setAssistantBusy(false)}};
  const saveTemplate=()=>{try{localStorage.setItem('taallamt:lesson-template',JSON.stringify({context,plan,savedAt:new Date().toISOString()}));setReply('تم حفظ هذه الحصة كنموذج لك فقط. لم يتغير أي تقييم أو بيانات طالب.')}catch{setReply('تعذر حفظ الحصة على هذا الجهاز.')}};

  return <main className="lessonSession" dir="rtl">
    <header className="lessonHeader">
      <button className="lessonBack" onClick={()=>location.assign('/teacher')} aria-label="العودة">‹</button>
      <div className="lessonHeaderText"><span>{context.subjectTitle} · {context.grade} / {context.className}</span><h1>{context.lesson}</h1><p>{context.unit} · {context.period||'الحصة الحالية'}{context.date?` · ${context.date}`:''}</p></div>
      <img src={mascot} alt="شكابمبو" className="lessonMascot"/>
    </header>

    <section className="lessonGoals">
      <b>هدف الحصة</b>
      {context.skills.map(item=><span key={item}>✓ {item}</span>)}
    </section>

    {!started?<>
      <section className="shakabamboIntro">
        <img src={mascot} alt="شكابمبو"/>
        <div><b>شكابمبو قرأ الحصة</b><p>سأساعدك في ترتيب الحصة، وأنت غيّر فقط الشيء الذي تريد التحكم فيه.</p></div>
      </section>
      <section className="lessonSetup">
        <h2>هل تريد تحديد شيء بنفسك؟</h2>
        <div className="setupChoices">
          <button className={chooseStrategy?'selected':''} onClick={()=>setChooseStrategy(v=>!v)}>الاستراتيجية</button>
          <button className={includeTechnology?'selected':''} onClick={()=>setIncludeTechnology(v=>!v)}>تقنية عند الحاجة</button>
          <button className={includeTime?'selected':''} onClick={()=>setIncludeTime(v=>!v)}>إدارة الوقت</button>
        </div>
        {chooseStrategy&&<div className="strategyPicker"><b>اختر استراتيجية مناسبة لهذه الحصة</b><div>{strategyAlternatives(context).map(item=><button key={item} className={(strategy||plan.strategy)===item?'selected':''} onClick={()=>setStrategy(item)}>{item}</button>)}</div></div>}
        <button className="prepareLesson" onClick={()=>{setStarted(true);setStepIndex(0);setReply(replyAsShakabambo(context,'ما أول شيء أفعله؟','teacher'))}}>✨ جهّز الحصة لي</button>
      </section>
    </>:<>
      <section className="liveLesson">
        <div className="lessonProgress"><span>الخطوة {stepIndex+1} من {plan.steps.length}</span><b>{step.title}</b></div>
        <article className="activeLessonStep">
          <span className="stepNumber">{stepIndex+1}</span>
          <div><h2>{step.title}</h2><p>{step.text}</p>{step.minutes&&<small>وقت مقترح: {step.minutes} دقائق</small>}</div>
        </article>
        <div className="lessonNavButtons">
          <button disabled={stepIndex===0} onClick={()=>setStepIndex(i=>Math.max(0,i-1))}>السابق</button>
          {stepIndex<plan.steps.length-1?<button className="primary" onClick={()=>{setStepIndex(i=>Math.min(plan.steps.length-1,i+1));setReply(replyAsShakabambo(context,'ما الخطوة التالية؟','teacher'))}}>التالي</button>:<button className="primary" onClick={()=>setReply('انتهت خطوات الحصة. إذا رغبت، اطلب مني سؤال خروج سريعًا قبل الإنهاء.')}>إنهاء الحصة</button>}
        </div>
      </section>

      <section className="assistantCard">
        <div className="assistantHead"><img src={mascot} alt="شكابمبو"/><div><b>يا شكابمبو</b><span>مساعدك في درس {context.lesson}</span></div></div>
        <div className="audienceSwitch"><button className={audience==='teacher'?'active':''} onClick={()=>setAudience('teacher')}>أنا أسأل</button><button className={audience==='student'?'active':''} onClick={()=>setAudience('student')}>سؤال طالب</button></div>
        <div className="quickPrompts">{['اشرح ببساطة','أعطني مثالًا','اسأل الطلاب','نشاط سريع','تقويم سريع'].map(q=><button key={q} disabled={assistantBusy} onClick={()=>void ask(q)}>{q}</button>)}</div>
        <div className="assistantReply">{assistantBusy?'شكابمبو يقرأ سياق الدرس...':reply}</div>
        {assistantNotice&&<div className="assistantNotice">{assistantNotice}</div>}
        <form className="assistantForm" onSubmit={e=>{e.preventDefault();void ask(prompt)}}><input value={prompt} onChange={e=>setPrompt(e.target.value)} placeholder={audience==='student'?'اكتب سؤال الطالب...':'اطلب من شكابمبو شيئًا...'} aria-label="سؤال شكابمبو"/><button type="submit" disabled={assistantBusy||!prompt.trim()}>{assistantBusy?'...':'اسأل'}</button></form>
      </section>

      <section className="lessonFooterActions">
        <button onClick={()=>{setStarted(false);setStepIndex(0)}}>تعديل التجهيز</button>
        <button disabled={assistantBusy} onClick={()=>void ask('فكرة أخرى')}>فكرة أخرى</button>
        <button onClick={saveTemplate}>♡ حفظ كحصة نموذجية</button>
      </section>
    </>}
  </main>;
}
