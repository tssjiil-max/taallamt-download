// Student / guardian pages in the mandatory reference design: header, weekly plan, assessment, homework, stars and the
// bottom bar (الرئيسية — الفصول — النجوم — حسابي). Every card and its detail page read the same server payload.
import React from 'react';
import boy from './assets/boy.webp';
import gift from './assets/gift.webp';
import {
  api,asApiError,BottomNav,Card,CardsSkeleton,CARD_ICON,Check,countLabel,Cta,Empty,Fact,Failure,formatDay,formatStamp,greeting,Header,IconChevron,IconStar,
  Loading,NavBook,NavHome,NavHomeLine,NavStar,NavUser,PageHead,Pill,Plan,PlanSubject,planStamp,Result,RESULT_LABEL,Screen,SubjectImg,SubjectKey,subjectIcon,SUBJECT_LABEL,
  useHashRoute,useRemote,useToast,weekTitle
} from './kit';

type Homework={id:string;displayTitle?:string;subjectKey:string;subjectLabel:string;title:string;lesson:string;segment:string;skill:string;page:number|null;exercise:string;task:string;kind:string;source:string;publishedAt:string;publishedDate:string;dueDate:string;status:string;done:boolean;completedAt:string;confirmedBy:string;teacherApprovedAt:string};
type AssessmentItem={subjectKey:SubjectKey;label:string;short:string;week:number;skill:string;lesson:string;holiday?:boolean;status:Result|null;updatedAt:string};
type QuranWeek={week:number;surah:string;title:string;description:string;range:string;kind:string;status:Result|null;updatedAt:string};
type Home={
  role:'teacher'|'guardian';
  student:{id:string;name:string;firstName:string;number:number;classLabel:string;classShort:string;termLabel:string};
  today:{date:string;weekday:number;weekdayLabel:string;schoolDay:boolean};
  week:{number:number;label:string;termWeeks:number;range:{start:string;end:string}};
  plan:Plan;
  assessment:{week:number;items:AssessmentItem[];history:{subjectKey:SubjectKey;label:string;week:number|null;skill:string;lesson:string;status:Result;updatedAt:string}[]};
  homework:{today:Homework[];pending:Homework[];countToday:number;doneToday:number};
  stars:{count:number;goal:number;log:{id:string;stars:number;label:string;createdAt:string}[]};
  quran:{currentWeek:number;current:QuranWeek|null;counts:Record<Result,number>;assessedWeeks:number;pastWeeks:number;totalWeeks:number;upcoming:QuranWeek[];weeks:QuranWeek[]};
  notes:{id:string;reason:string;summary:string;createdAt:string}[];
};

const query=new URLSearchParams(location.search);
const STUDENT_ID=query.get('studentId')||'';
const INVITE=query.get('invite')||query.get('inviteToken')||'';
const accessQuery=`studentId=${encodeURIComponent(STUDENT_ID)}${INVITE?`&invite=${encodeURIComponent(INVITE)}`:''}`;

function homeworkCountText(home:Home){
  const {countToday,doneToday}=home.homework;
  if(!countToday)return home.today.schoolDay?'لا يوجد واجب لليوم':'لا يوجد واجب اليوم — إجازة';
  if(doneToday>=countToday)return 'أنجزت واجبات اليوم';
  return countToday===1?'يوجد 1 واجب لليوم':countToday===2?'يوجد واجبان لليوم':`يوجد ${countToday} واجبات لليوم`;
}
const dueText=(item:Homework)=>item.dueDate?`يُسلَّم ${formatDay(item.dueDate)}`:'';

export function StudentApp(){
  const [route,go,back]=useHashRoute();
  const [toast,showToast]=useToast();
  const home=useRemote<Home>(STUDENT_ID?`home:${STUDENT_ID}`:null,()=>api<Home>(`/api/student-state?view=home&${accessQuery}`));
  const [busy,setBusy]=React.useState<string>('');

  const toggleHomework=React.useCallback(async(item:Homework)=>{
    if(busy)return;setBusy(item.id);
    const apply=(done:boolean)=>home.setData(current=>{
      if(!current)return current;
      const patch=(list:Homework[])=>list.map(entry=>entry.id===item.id?{...entry,done,status:done?'done':'assigned',confirmedBy:done?'guardian':''}:entry);
      const today=patch(current.homework.today);
      return {...current,homework:{...current.homework,today,pending:patch(current.homework.pending),doneToday:today.filter(entry=>entry.done).length}};
    });
    apply(!item.done);
    try{
      await api('/api/homework-complete',{method:'POST',body:{studentId:STUDENT_ID,homeworkId:item.id,invite:INVITE,...(item.done?{undo:true}:{})}});
      showToast(item.done?'أُلغي تأشير الإنجاز':'تم تسجيل الإنجاز — يظهر الآن عند المعلم');
      void home.reload(true);
    }catch(caught){
      apply(item.done);
      const error=asApiError(caught);
      showToast(error.code==='HOMEWORK_ALREADY_APPROVED'?'اعتمد المعلم هذا الواجب، فلا يمكن إلغاء الإنجاز.':error.kind==='offline'?'تعذر الاتصال — لم يُحفظ الإنجاز.':'تعذر حفظ الإنجاز. حاول مرة أخرى.',true);
    }finally{setBusy('')}
  },[busy,home,showToast]);

  const tab=route.startsWith('week')?'weeks':route==='stars'?'stars':['me','quran','quran-log'].includes(route)?'me':'home';
  const nav=<BottomNav label="تنقل الطالب" active={tab} items={[
    {key:'home',label:'الرئيسية',icon:<NavHomeLine/>,activeIcon:<NavHome/>,onClick:()=>go('')},
    {key:'weeks',label:'الفصول',icon:<NavBook/>,onClick:()=>go('weeks')},
    {key:'stars',label:'النجوم',icon:<NavStar/>,onClick:()=>go('stars')},
    {key:'me',label:'حسابي',icon:<NavUser/>,onClick:()=>go('me')}
  ]}/>;

  if(!STUDENT_ID)return <Screen nav={nav}>
    <Header title={`${greeting()}`} subtitle="صفحة الطالب" hero={boy} avatarLabel="حسابي"/>
    <div className="tkState warn" role="alert"><b>لا توجد صلاحية</b><p>تُفتح صفحة الطالب من الرابط الخاص الذي يرسله المعلم لولي الأمر. اطلب الرابط من المعلم ثم افتحه من هذا الجهاز.</p></div>
  </Screen>;

  const data=home.data;
  const title=`${greeting()} ${data?.student.firstName||''}`.trim();
  const subtitle=data?.student.classLabel||'الصف الثاني الابتدائي';

  let body:React.ReactNode;
  if(!data){
    body=<><Header title={title} subtitle={subtitle} hero={boy} avatarLabel="حسابي" onAvatar={()=>go('me')}/>
      {home.error?<Failure error={home.error} role="student" onRetry={()=>void home.reload()}/>:<CardsSkeleton/>}</>;
  }else if(route==='plan')body=<PlanPage home={data} back={back} go={go}/>;
  else if(route==='assessment')body=<AssessmentPage home={data} back={back} go={go}/>;
  else if(route==='homework')body=<HomeworkPage home={data} back={back} toggle={toggleHomework} busy={busy}/>;
  else if(route.startsWith('subject/'))body=<SubjectPage home={data} subjectKey={route.slice(8) as SubjectKey} back={back} toggle={toggleHomework} busy={busy}/>;
  else if(route==='stars')body=<StarsPage home={data} back={back}/>;
  else if(route==='weeks')body=<WeeksPage home={data} back={back} go={go}/>;
  else if(route.startsWith('week/'))body=<WeekPage home={data} week={Number(route.slice(5))} back={back}/>;
  else if(route==='me')body=<AccountPage home={data} back={back} go={go}/>;
  else if(route==='quran')body=<QuranPage home={data} back={back} go={go}/>;
  else if(route==='quran-log')body=<QuranLogPage home={data} back={back}/>;
  else body=<HomeCards home={data} title={title} subtitle={subtitle} go={go} toggle={toggleHomework} busy={busy}/>;

  return <Screen nav={nav}>{body}{toast}</Screen>;
}

type Go=(route:string)=>void;
function HomeCards({home,title,subtitle,go,toggle,busy}:{home:Home;title:string;subtitle:string;go:Go;toggle:(item:Homework)=>void;busy:string}){
  const {plan,assessment,homework,stars}=home;
  const rows=[...homework.today.filter(item=>!item.done),...homework.today.filter(item=>item.done)].slice(0,2);
  const percent=Math.max(0,Math.min(100,Math.round(stars.count/Math.max(1,stars.goal)*100)));
  return <>
    <Header title={title} subtitle={subtitle} hero={boy} avatarLabel="حسابي" onAvatar={()=>go('me')}/>
    <div className="tkCards">
      <Card tone="plan" title="الخطة الأسبوعية" subtitle="ماذا سندرس هذا الأسبوع؟" small="مواعيد الدروس والمهارات في جميع المواد" onOpen={()=>go('plan')}>
        <div className="tkCardBody">
          {plan.holiday?<p className="tkCardNote">إجازة هذا الأسبوع — لا توجد دروس جديدة.</p>
          :!plan.published?<p className="tkCardNote">خطة هذا الأسبوع قيد النشر، وستظهر هنا تلقائيًا.</p>
          :<div className="tkTiles">{plan.items.map(item=><button className="tkTile" type="button" key={item.subjectKey} onClick={()=>go(`subject/${item.subjectKey}`)} aria-label={`${item.label}: ${item.summary}`}>
            <SubjectImg subject={item.subjectKey}/><b>{item.short}</b><small>{item.summary||'—'}</small></button>)}</div>}
          <Cta onClick={()=>go('plan')}/>
        </div>
      </Card>
      <Card tone="assessment" title="التقييم" subtitle="آخر تقييم لمهاراتك" onOpen={()=>go('assessment')}>
        <div className="tkCardBody">
          <div className="tkTiles">{assessment.items.map(item=><button className="tkTile" type="button" key={item.subjectKey} onClick={()=>go('assessment')} aria-label={`${item.label}: ${item.status?RESULT_LABEL[item.status]:'لم يُقيّم بعد'}`}>
            <SubjectImg subject={item.subjectKey}/><b>{item.short}</b><Pill status={item.status}/></button>)}</div>
          <Cta onClick={()=>go('assessment')}/>
        </div>
      </Card>
      <Card tone="homework" title="الواجبات" subtitle="واجباتك لهذا اليوم" onOpen={()=>go('homework')}>
        <div className="tkHwBody">
          <div className="tkHwCol">
            {rows.map(item=><button className="tkHwRow" type="button" key={item.id} onClick={()=>toggle(item)} aria-pressed={item.done} aria-label={`${item.title} — ${item.done?'أُنجز':'لم يُنجز بعد'}`}>
              <SubjectImg subject={item.subjectKey} scale={1.09} flat/><span className="tkHwText"><b>{item.displayTitle||item.title}</b><small>{item.subjectLabel}</small></span><Check on={item.done} busy={busy===item.id}/></button>)}
            {!rows.length&&<div className="tkHwRow" role="note"><SubjectImg subject="arabic" scale={1.09} flat/><span className="tkHwText"><b>{home.today.schoolDay?'لا يوجد واجب لليوم':'لا يوجد واجب اليوم'}</b><small>{homework.pending.length?`لديك ${countLabel(homework.pending.length,'واجب سابق','واجبان سابقان','واجبات سابقة','واجبًا سابقًا')}`:'استمتع بوقتك'}</small></span></div>}
            <p className="tkHwCount">{homeworkCountText(home)}</p>
          </div>
          <Cta onClick={()=>go('homework')}/>
        </div>
      </Card>
      <Card tone="stars" title="النجوم" subtitle="إنجازاتك وتحفيزك" onOpen={()=>go('stars')}>
        <div className="tkStarsBody">
          <Cta onClick={()=>go('stars')}/>
          <div className="tkReward"><img src={gift} alt="" aria-hidden="true"/><span><small>المكافأة القادمة</small><b><span className="num">{stars.goal}</span> نجمة</b></span></div>
          <div className="tkBar" role="progressbar" aria-valuemin={0} aria-valuemax={stars.goal} aria-valuenow={stars.count} aria-label="تقدم النجوم"><i style={{width:`${percent}%`}}/></div>
          <p className="tkStarCount"><b className="num">{stars.count}</b><span>من <span className="num">{stars.goal}</span></span></p>
        </div>
      </Card>
    </div>
  </>;
}

function PlanPage({home,back,go}:{home:Home;back:()=>void;go:Go}){
  const plan=home.plan;
  return <div className="tkPage">
    <PageHead title="الخطة الأسبوعية" subtitle={weekTitle(plan)} icon={CARD_ICON.plan} onBack={back}/>
    {plan.items.map(item=><PlanSubject key={item.subjectKey} item={item}/>)}
    <p className="tkMeta">{planStamp(plan)}</p>
    <div className="tkActions" style={{marginTop:'calc(var(--u)*8)'}}><button className="tkBtn ghost" type="button" onClick={()=>go('weeks')}>الأسابيع السابقة</button></div>
  </div>;
}

function HomeworkBox({item,toggle,busy}:{item:Homework;toggle:(item:Homework)=>void;busy:string}){
  return <section className="tkBox orange tkHwCard">
    <div className="tkBoxHead"><img src={subjectIcon(item.subjectKey)} alt="" aria-hidden="true"/><div><b>{item.displayTitle||item.title}</b><small>{item.subjectLabel}{item.kind==='training'?' · تدريب':''}{item.source==='teacher_class'?' · من المعلم':''}</small></div></div>
    <dl className="tkFacts">
      {item.lesson&&<Fact label="الدرس">{item.lesson}{item.segment?` — ${item.segment}`:''}</Fact>}
      {item.page&&<Fact label="الصفحة"><span className="num">{item.page}</span></Fact>}
      {item.exercise&&<Fact label="التمرين">{item.exercise}</Fact>}
      <Fact label="المطلوب">{item.task||'—'}</Fact>
      <Fact label="نُشر">{formatDay(item.publishedDate)}</Fact>
      {item.dueDate&&<Fact label="التسليم">{formatDay(item.dueDate)}</Fact>}
    </dl>
    <div className="tkHwDone">
      <span>{item.done?(item.teacherApprovedAt?'أنجزته واعتمده المعلم':'أنجزته — بانتظار اطلاع المعلم'):'لم يُنجز بعد'}</span>
      <button className={`tkToggle ${item.done?'on':''}`} type="button" onClick={()=>toggle(item)} disabled={busy===item.id} aria-pressed={item.done}><Check on={item.done} busy={busy===item.id}/>{item.done?'تم الإنجاز':'أنجزت الواجب'}</button>
    </div>
  </section>;
}
function HomeworkPage({home,back,toggle,busy}:{home:Home;back:()=>void;toggle:(item:Homework)=>void;busy:string}){
  const {today,pending}=home.homework;
  return <div className="tkPage">
    <PageHead title="الواجبات" subtitle={`${home.today.weekdayLabel} ${formatDay(home.today.date,false)}`} icon={CARD_ICON.homework} onBack={back}/>
    <h2 className="tkH">واجبات اليوم<small>{homeworkCountText(home)}</small></h2>
    {today.length?today.map(item=><HomeworkBox key={item.id} item={item} toggle={toggle} busy={busy}/>):<Empty>{home.today.schoolDay?'لا يوجد واجب منشور لهذا اليوم.':'اليوم إجازة — لا توجد واجبات.'}</Empty>}
    {pending.length>0&&<><h2 className="tkH">واجبات سابقة لم تُنجز<small>{pending.length}</small></h2>{pending.map(item=><HomeworkBox key={item.id} item={item} toggle={toggle} busy={busy}/>)}</>}
    <p className="tkMeta">تأشير الإنجاز يصل إلى المعلم مباشرة، وليس تقييمًا للمهارة.</p>
  </div>;
}

function AssessmentPage({home,back,go}:{home:Home;back:()=>void;go:Go}){
  const {items,history}=home.assessment;
  const older=history.filter(entry=>!(items.some(item=>item.subjectKey===entry.subjectKey&&item.week===entry.week)));
  return <div className="tkPage">
    <PageHead title="التقييم" subtitle={`مهارات ${home.week.label}`} icon={CARD_ICON.assessment} onBack={back}/>
    <div className="tkList">{items.map(item=><div className="tkRow" key={item.subjectKey}>
      <img src={subjectIcon(item.subjectKey)} alt="" aria-hidden="true"/>
      <div className="tkGrow"><b>{item.label}</b><small>{item.holiday?'إجازة هذا الأسبوع':item.skill||'—'}{item.lesson&&item.lesson!==item.skill?` · ${item.lesson}`:''}</small>{item.status&&item.updatedAt&&<small>{formatStamp(item.updatedAt)}</small>}</div>
      <Pill status={item.status}/></div>)}</div>
    <button className="tkRow" type="button" style={{marginTop:'calc(var(--u)*6)'}} onClick={()=>go('quran')}><img src={subjectIcon('quran')} alt="" aria-hidden="true"/><span className="tkGrow"><b>متابعة حفظ القرآن الكريم</b><small>سجل الحفظ الأسبوعي</small></span><IconChevron/></button>
    <h2 className="tkH">تقييمات سابقة</h2>
    {older.length?<div className="tkList">{older.slice(0,40).map((entry,index)=><div className="tkRow" key={`${entry.subjectKey}-${entry.week}-${index}`}>
      <img src={subjectIcon(entry.subjectKey)} alt="" aria-hidden="true"/><div className="tkGrow"><b>{entry.label}{entry.week?` · الأسبوع ${entry.week}`:''}</b><small>{entry.skill||'—'}</small></div><Pill status={entry.status}/></div>)}</div>:<Empty>لا توجد تقييمات سابقة بعد.</Empty>}
    <h2 className="tkH">ملاحظات المعلم</h2>
    {home.notes.length?<div className="tkList">{home.notes.map(note=><div className="tkRow" key={note.id}><div className="tkGrow"><b>{note.reason}</b><small>{note.summary}</small><small>{formatStamp(note.createdAt)}</small></div></div>)}</div>:<Empty>لا توجد ملاحظات من المعلم.</Empty>}
  </div>;
}

function SubjectPage({home,subjectKey,back,toggle,busy}:{home:Home;subjectKey:SubjectKey;back:()=>void;toggle:(item:Homework)=>void;busy:string}){
  const planItem=home.plan.items.find(item=>item.subjectKey===subjectKey),assessment=home.assessment.items.find(item=>item.subjectKey===subjectKey);
  const homework=[...home.homework.today,...home.homework.pending].filter(item=>item.subjectKey===subjectKey);
  if(!planItem)return <div className="tkPage"><PageHead title="المادة" onBack={back}/><Empty>هذه المادة غير موجودة في الخطة.</Empty></div>;
  return <div className="tkPage">
    <PageHead title={SUBJECT_LABEL[subjectKey]||planItem.label} subtitle={weekTitle(home.plan)} icon={subjectIcon(subjectKey)} onBack={back}/>
    <h2 className="tkH">خطة الأسبوع</h2>
    {home.plan.published||home.plan.holiday?<PlanSubject item={planItem}/>:<Empty>خطة هذا الأسبوع قيد النشر.</Empty>}
    <h2 className="tkH">تقييم مهارة الأسبوع</h2>
    <div className="tkRow"><div className="tkGrow"><b>{assessment?.skill||planItem.skill||'—'}</b>{assessment?.status&&assessment.updatedAt&&<small>{formatStamp(assessment.updatedAt)}</small>}</div><Pill status={assessment?.status||null}/></div>
    <h2 className="tkH">واجبات المادة</h2>
    {homework.length?homework.map(item=><HomeworkBox key={item.id} item={item} toggle={toggle} busy={busy}/>):<Empty>لا يوجد واجب حالي في هذه المادة.</Empty>}
  </div>;
}

function StarsPage({home,back}:{home:Home;back:()=>void}){
  const {count,goal,log}=home.stars,left=Math.max(0,goal-count);
  return <div className="tkPage">
    <PageHead title="النجوم" subtitle="إنجازاتك وتحفيزك هذا الشهر" icon={CARD_ICON.stars} onBack={back}/>
    <section className="tkBox purple">
      <div className="tkBigStars"><img src={CARD_ICON.stars} alt="" aria-hidden="true"/><div><b className="num">{count}</b> <span>من <span className="num">{goal}</span> نجمة</span><p className="tkMeta" style={{textAlign:'right',margin:0}}>{left?`بقي ${left} للوصول إلى المكافأة القادمة`:'وصلت إلى المكافأة — أحسنت!'}</p></div></div>
      <div className="tkStarGrid" aria-hidden="true">{Array.from({length:goal},(_,index)=><i key={index} className={index<count?'on':''}><IconStar/></i>)}</div>
    </section>
    <h2 className="tkH">سجل النجوم</h2>
    {log.length?<div className="tkList">{log.map(entry=><div className="tkRow" key={entry.id}><div className="tkGrow"><b>{entry.label}</b><small>{formatStamp(entry.createdAt)}</small></div><span className={`tkDelta num ${entry.stars<0?'minus':''}`}>{entry.stars>0?`+${entry.stars}`:entry.stars}</span></div>)}</div>:<Empty>لم تُسجَّل نجوم هذا الشهر بعد. النجوم يمنحها المعلم.</Empty>}
  </div>;
}

function WeeksPage({home,back,go}:{home:Home;back:()=>void;go:Go}){
  const current=home.plan.week,weeks=Array.from({length:current},(_,index)=>current-index);
  return <div className="tkPage">
    <PageHead title="الفصول" subtitle={home.student.termLabel} icon={CARD_ICON.plan} onBack={back}/>
    <h2 className="tkH">أسابيع الفصل الدراسي<small>{current} من {home.week.termWeeks}</small></h2>
    <div className="tkList">{weeks.map(week=><button className="tkRow" type="button" key={week} onClick={()=>go(week===current?'plan':`week/${week}`)}>
      <span className="tkNumber num">{week}</span><span className="tkGrow"><b>الأسبوع {week}</b><small>{week===current?'الأسبوع الحالي':'عرض خطة الأسبوع ونتائجي'}</small></span><IconChevron/></button>)}</div>
  </div>;
}
function WeekPage({home,week,back}:{home:Home;week:number;back:()=>void}){
  const remote=useRemote<{plan:Plan}>(`week:${week}`,()=>api(`/api/student-state?view=week&week=${week}&${accessQuery}`));
  const results=home.assessment.history.filter(entry=>entry.week===week&&entry.subjectKey!=='quran');
  return <div className="tkPage">
    <PageHead title={`الأسبوع ${week}`} subtitle={remote.data?weekTitle(remote.data.plan):home.student.termLabel} icon={CARD_ICON.plan} onBack={back}/>
    {remote.error?<Failure error={remote.error} role="student" onRetry={()=>void remote.reload()}/>:!remote.data?<Loading/>:<>
      {remote.data.plan.items.map(item=><PlanSubject key={item.subjectKey} item={item} action={(()=>{const result=results.find(entry=>entry.subjectKey===item.subjectKey);return result?<Pill status={result.status}/>:undefined})()}/>)}
      <p className="tkMeta">{planStamp(remote.data.plan)}</p></>}
  </div>;
}

function AccountPage({home,back,go}:{home:Home;back:()=>void;go:Go}){
  const student=home.student;
  return <div className="tkPage">
    <PageHead title="حسابي" subtitle={student.classLabel} onBack={back}/>
    <section className="tkBox"><div className="tkStudentCard"><img src={boy} alt="" aria-hidden="true"/><div><b>{student.name}</b><small>{student.classLabel} · {student.classShort}</small></div></div></section>
    <div className="tkList">
      <button className="tkRow" type="button" onClick={()=>go('quran')}><img src={subjectIcon('quran')} alt="" aria-hidden="true"/><span className="tkGrow"><b>متابعة حفظ القرآن الكريم</b><small>الأسبوع الحالي وسجل الحفظ</small></span><IconChevron/></button>
      <button className="tkRow" type="button" onClick={()=>go('assessment')}><img src={CARD_ICON.assessment} alt="" aria-hidden="true"/><span className="tkGrow"><b>تقييماتي وملاحظات المعلم</b><small>{home.notes.length?`${home.notes.length} ملاحظة`:'لا توجد ملاحظات'}</small></span><IconChevron/></button>
      <button className="tkRow" type="button" onClick={()=>go('weeks')}><img src={CARD_ICON.plan} alt="" aria-hidden="true"/><span className="tkGrow"><b>خطط الأسابيع السابقة</b><small>{student.termLabel}</small></span><IconChevron/></button>
    </div>
    <p className="tkMeta">{home.role==='teacher'?'أنت تعاين صفحة الطالب بجلسة المعلم.':'هذه الصفحة خاصة بالطالب وولي أمره، وتُفتح من رابط الطالب فقط.'}</p>
  </div>;
}

function QuranStatus({week}:{week:QuranWeek}){return week.kind==='exam'?<span className="tkPill pending">اختبارات</span>:<Pill status={week.status}/>}
function QuranPage({home,back,go}:{home:Home;back:()=>void;go:Go}){
  const quran=home.quran,current=quran.current;
  return <div className="tkPage">
    <PageHead title="متابعة حفظ القرآن الكريم" subtitle={`${home.student.classLabel} · الفصل الدراسي الأول`} icon={subjectIcon('quran')} onBack={back}/>
    <section className="tkBox"><div className="tkStudentCard"><img src={boy} alt="" aria-hidden="true"/><div><b>{home.student.name}</b><small>{home.student.classLabel}</small></div></div></section>
    <h2 className="tkH">الأسبوع الحالي</h2>
    {current?<div className="tkRow"><span className="tkNumber num">{current.week}</span><div className="tkGrow"><b>{current.title||current.description}</b><small>{current.range||current.description||'حفظ'}</small>{current.status&&current.updatedAt&&<small>{formatStamp(current.updatedAt)}</small>}</div><QuranStatus week={current}/></div>:<Empty>لا يوجد أسبوع حفظ حالي.</Empty>}
    <h2 className="tkH">ملخص المتابعة<small>قُيّم {quran.assessedWeeks} من {quran.pastWeeks} أسابيع</small></h2>
    <div className="tkCounts">{(['mastered','needs_repeat','not_mastered'] as Result[]).map(key=><div className={key} key={key}><b className="num">{quran.counts[key]}</b><span>{RESULT_LABEL[key]}</span></div>)}</div>
    <h2 className="tkH">الأسابيع القادمة</h2>
    {quran.upcoming.length?<div className="tkList">{quran.upcoming.map(week=><div className="tkRow" key={week.week}><span className="tkNumber num">{week.week}</span><div className="tkGrow"><b>{week.title||week.description}</b><small>{week.range||week.description||'حفظ'}</small></div></div>)}</div>:<Empty>لا توجد أسابيع حفظ قادمة في التوزيع.</Empty>}
    <div className="tkActions" style={{marginTop:'calc(var(--u)*9)'}}><button className="tkBtn wide green" type="button" onClick={()=>go('quran-log')}>عرض السجل</button></div>
  </div>;
}
function QuranLogPage({home,back}:{home:Home;back:()=>void}){
  return <div className="tkPage">
    <PageHead title="سجل المتابعة" subtitle="حفظ القرآن الكريم — الفصل الدراسي الأول" icon={subjectIcon('quran')} onBack={back}/>
    <div className="tkList">{home.quran.weeks.map(week=><div className="tkRow" key={week.week}><span className="tkNumber num">{week.week}</span><div className="tkGrow"><b>{week.title||week.description}</b>{(week.range||(week.surah&&week.description))&&<small>{week.range||week.description}</small>}</div>{week.week<=home.quran.currentWeek||week.status?<QuranStatus week={week}/>:week.kind==='exam'?<QuranStatus week={week}/>:null}</div>)}</div>
  </div>;
}
