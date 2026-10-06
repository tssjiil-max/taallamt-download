// Teacher pages in the same identity as the student pages. The teacher's usual work is one screen: the quick assessment
// ("أتقن بقية الطلاب" + individual results for the focused follow-up list). Plan and homework publish themselves.
import React from 'react';
import gift from './assets/gift.webp';
import {
  api,ApiError,asApiError,BottomNav,Card,CardsSkeleton,CARD_ICON,Cta,Empty,Fact,Failure,formatDay,formatStamp,gregorianDate,hijriDate,IconAlert,IconBookLogo,IconCalendar,IconChevron,IconMessage,IconSpark,IconSprout,IconStar,IconUserFilled,Loading,NavBook,NavHome,NavHomeLine,
  NavMore,NavPeople,newRequestId,PageHead,Pill,Plan,PlanItem,PlanSubject,planStamp,Result,RESULTS,RESULT_LABEL,Screen,studentsLabel,SubjectImg,SubjectKey,subjectIcon,SUBJECT_LABEL,SUBJECT_ORDER,SUBJECT_SHORT,
  useHashRoute,useNow,useRemote,useToast,weekTitle
} from './kit';

type Session={teacher:boolean;gateConfigured:boolean;gateSource:string|null;gateReason?:string|null;environment:string};
type Progress={subjectKey:SubjectKey;label:string;short:string;week:number;skill:string;lesson:string;assessable:boolean;reason:string;total:number;focused:number;rest:number;assessed:number;pending:number;mastered:number;needs_repeat:number;not_mastered:number;restPending:number;focusedPending:number};
type HomeworkStudent={id:string;status:string;completedAt:string;confirmedBy:string;approved:boolean};
type ClassHomework={id:string;displayTitle?:string;subjectKey:string;subjectLabel:string;title:string;lesson:string;segment:string;skill:string;page:number|null;exercise:string;task:string;kind:string;source:string;publishedAt:string;publishedDate:string;dueDate:string;edited:boolean;assigned:number;done:number;approved:number;students:HomeworkStudent[]};
type ClassStudent={id:string;number:number;name:string;focused:boolean;stars:number;week:Record<SubjectKey,Result|null>;assessedToday:boolean};
type TeacherHome={
  teacher:{name:string;firstName:string;school:string;classLabel:string;classShort:string;termLabel:string};
  today:{date:string;weekday:number;weekdayLabel:string;schoolDay:boolean};
  week:{number:number;label:string;termWeeks:number;range:{start:string;end:string}};
  summary:{students:number;focused:number;assessedToday:number;messages:number};
  todayAssessments:{studentId:string;subjectKey:SubjectKey;label:string;result:Result;at:string}[];
  messages:{id:string;studentId:string;name:string;summary:string;createdAt:string}[];
  plan:Plan;
  assessment:{week:number;items:Progress[];focusedCount:number};
  homework:{date:string;items:ClassHomework[];assignedTotal:number;doneTotal:number};
  stars:{month:string;goal:number;total:number;withStars:number;top:number};
  students:ClassStudent[];
  automation:{schedule:{timezone:string;weekly:string;daily:string;catchup:string};today:{firstRunAt:string;firstSource:string;lastRunAt:string;lastSource:string;runs:number;homeworkCreated:number;gaps:{message:string}[]}|null};
};
type AssessStudent={id:string;number:number;name:string;focused:boolean;focusScope:'all'|'subject'|null;result:Result|null;mode:string|null;updatedAt:string};
type AssessView={
  scope:{subjectKey:SubjectKey;label:string;week:number;currentWeek:number;isCurrent:boolean;weekLabel:string;skill:string;lesson:string;unit:string;description:string;assessable:boolean;reason:string};
  weeks:{week:number;label:string;current:boolean}[];students:AssessStudent[];
  counts:{total:number;focused:number;rest:number;assessed:number;pending:number;mastered:number;needs_repeat:number;not_mastered:number;restPending:number;focusedPending:number};
  lastBulk:{id:string;mode:string;count:number;createdAt:string}|null;
};
type Go=(route:string)=>void;
const AUTOMATION='/api/learning-automation';
const post=<T=any,>(action:string,body:Record<string,unknown>={})=>api<T>(AUTOMATION,{method:'POST',body:{action,...body}});
const SOURCE_LABEL:Record<string,string>={'cron-daily':'التشغيل المجدول اليومي','cron-weekly':'التشغيل المجدول الأسبوعي',catchup:'الاستدراك التلقائي',teacher:'طلب المعلم'};

export function TeacherApp({initialRoute=''}:{initialRoute?:string}){
  const session=useRemote<Session>('session',()=>api<Session>(`${AUTOMATION}?action=session`));
  React.useEffect(()=>{if(initialRoute&&!location.hash)history.replaceState(null,'',`/teacher#${initialRoute}`)},[initialRoute]);
  if(session.error)return <Screen><TeacherTop/><Failure error={session.error} role="teacher" onRetry={()=>void session.reload()}/></Screen>;
  if(!session.data)return <Screen><TeacherTop/><CardsSkeleton/></Screen>;
  if(!session.data.teacher)return <Login session={session.data} onDone={()=>void session.reload()}/>;
  return <TeacherPages environment={session.data.environment} onSignedOut={()=>void session.reload()}/>;
}

function loginMessage(error:ApiError){
  if(error.code==='TEACHER_CODE_INVALID'){const left=Number(error.data?.attemptsLeft);return `رمز المعلم غير صحيح.${Number.isFinite(left)?` بقي ${left} من المحاولات قبل الإيقاف المؤقت.`:''}`}
  if(error.code==='TEACHER_LOGIN_LOCKED')return 'محاولات كثيرة غير صحيحة. أُوقف الدخول مؤقتًا؛ حاول بعد 15 دقيقة.';
  if(error.code==='TEACHER_GATE_NOT_CONFIGURED')return 'بوابة المعلم غير مهيأة في هذه البيئة: لم يُضبط رمز المعلم (TEACHER_ACCESS_CODE) في إعدادات الخادم.';
  if(error.code==='TEACHER_CODE_REQUIRED')return 'اكتب رمز المعلم أولًا.';
  if(error.code==='ORIGIN_INVALID')return 'رُفض الطلب لأنه لم يصدر من صفحة الموقع نفسها. افتح الموقع مباشرة ثم حاول.';
  if(error.kind==='offline')return 'تعذر الاتصال بالخادم. تحقق من الإنترنت ثم حاول.';
  if(error.kind==='nobackend')return 'هذه النسخة بلا خادم بيانات، فلا يمكن التحقق من الرمز هنا. افتح رابط Staging الكامل.';
  if(error.code==='FIREBASE_ADMIN_NOT_CONFIGURED')return 'قاعدة البيانات غير مهيأة في هذه البيئة، فلا يمكن إتمام الدخول.';
  return `تعذر إتمام الدخول (${error.code}).`;
}
function Login({session,onDone}:{session:Session;onDone:()=>void}){
  const [code,setCode]=React.useState(''),[busy,setBusy]=React.useState(false),[message,setMessage]=React.useState('');
  const submit=async(event:React.FormEvent)=>{
    event.preventDefault();if(busy)return;setBusy(true);setMessage('');
    try{await post('login',{code});onDone()}catch(caught){setMessage(loginMessage(asApiError(caught)))}finally{setBusy(false)}
  };
  return <Screen>
    <TeacherTop/>
    <form className="tkLogin" onSubmit={submit}>
      <h2>دخول المعلم</h2>
      <p>أدوات المعلم وبيانات الصف لا تُفتح إلا برمز المعلم. يبقى الدخول محفوظًا على هذا الجهاز 30 يومًا.</p>
      {!session.gateConfigured?<div className="tkAlert">{session.gateReason==='TEACHER_CODE_TOO_SHORT'?'بوابة المعلم غير مهيأة: رمز المعلم المضبوط في الخادم أقصر من 8 خانات. اضبط رمزًا أطول في TEACHER_ACCESS_CODE.':'بوابة المعلم غير مهيأة في هذه البيئة: لم يُضبط رمز المعلم (TEACHER_ACCESS_CODE) في إعدادات الخادم.'}</div>:<>
        <label className="tkField">رمز المعلم<input type="password" inputMode="text" autoComplete="current-password" autoCapitalize="characters" value={code} onChange={event=>setCode(event.target.value)} placeholder="XXXX-XXXX-XXXX" aria-label="رمز المعلم"/></label>
        <button className="tkBtn wide" type="submit" disabled={busy||!code.trim()}>{busy?'جارٍ التحقق…':'دخول'}</button>
      </>}
      {message&&<div className="tkAlert" role="alert">{message}</div>}
      {session.environment==='staging'&&<div className="tkAlert info">نسخة Staging: بياناتها منفصلة عن الموقع الأساسي.</div>}
    </form>
  </Screen>;
}

function TeacherPages({environment,onSignedOut}:{environment:string;onSignedOut:()=>void}){
  const [route,go,back]=useHashRoute();
  const [toast,showToast]=useToast();
  const home=useRemote<TeacherHome>('teacher-home',()=>api<TeacherHome>(`${AUTOMATION}?action=teacher_home`));
  React.useEffect(()=>{if(home.error&&home.error.kind==='unauthorized')onSignedOut()},[home.error,onSignedOut]);
  const refresh=React.useCallback(()=>void home.reload(true),[home]);
  // Moving between pages picks up what changed on the other site, without reloading on every tap.
  const refreshIfOlder=home.refreshIfOlder;
  React.useEffect(()=>refreshIfOlder(20000),[route,refreshIfOlder]);
  const tab=route==='students'?'students':route==='more'?'more':'home';
  const nav=<BottomNav label="تنقل المعلم" active={tab} items={[
    {key:'home',label:'الرئيسية',icon:<NavHomeLine/>,activeIcon:<NavHome/>,onClick:()=>go('')},
    {key:'students',label:'الطلاب',icon:<NavPeople/>,onClick:()=>go('students')},
    {key:'library',label:'الكتب',icon:<NavBook/>,href:'/teacher/library'},
    {key:'more',label:'المزيد',icon:<NavMore/>,onClick:()=>go('more')}
  ]}/>;
  const data=home.data;
  const header=<TeacherTop home={data} go={go}/>;

  let body:React.ReactNode;
  if(!data)body=<>{header}{home.error?<Failure error={home.error} role="teacher" onRetry={()=>void home.reload()}/>:<CardsSkeleton/>}</>;
  else if(route==='plan')body=<PlanPage home={data} back={back} refresh={refresh} toast={showToast}/>;
  else if(route==='assess'||route.startsWith('assess/'))body=<AssessPage home={data} subjectKey={(route.slice(7)||firstOpenSubject(data)) as SubjectKey} back={back} go={go} refresh={refresh} toast={showToast}/>;
  else if(route==='homework')body=<HomeworkPage home={data} back={back} refresh={refresh} toast={showToast}/>;
  else if(route==='stars')body=<StarsPage home={data} back={back} refresh={refresh} toast={showToast} setHome={home.setData}/>;
  else if(route==='students')body=<StudentsPage home={data} back={back} toast={showToast}/>;
  else if(route==='more')body=<MorePage home={data} environment={environment} back={back} go={go} onSignedOut={onSignedOut}/>;
  else if(route==='followup')body=<FollowupPage home={data} back={back} go={go} refresh={refresh} toast={showToast}/>;
  else if(route==='today')body=<TodayPage home={data} back={back} go={go}/>;
  else if(route==='messages')body=<MessagesPage home={data} back={back}/>;
  else body=<>{header}<HomeCards home={data} go={go}/><p className="tkCredit">برمجة: سلطان الصاعدي</p></>;
  return <Screen nav={nav}>{body}{toast}</Screen>;
}
/* ---------- teacher header: identity card, day strip, four summary tiles ---------- */
const TEACHER_DEFAULT={name:'أ. سلطان الصاعدي',school:'مدرسة عمرو بن أوس الثقفي',classShort:'الثاني / 4'};
function TeacherTop({home,go}:{home?:TeacherHome|null;go?:Go}){
  const now=useNow(),teacher=home?.teacher||TEACHER_DEFAULT,summary=home?.summary;
  const tiles:[string,string,number,React.ReactNode,string][]=summary?[
    ['green','عدد الطلاب',summary.students,<NavPeople/>,'students'],
    ['red','يحتاجون متابعة',summary.focused,<IconAlert/>,'followup'],
    ['gold','تم تقييمهم اليوم',summary.assessedToday,<IconStar/>,'today'],
    ['blue','رسائل جديدة',summary.messages,<IconMessage/>,'messages']
  ]:[];
  return <header className="tkTeacherTop">
    <section className="tkIdCard" aria-label="بطاقة المعلم">
      {go?<button className="tkIdAvatar" type="button" onClick={()=>go('more')} aria-label="حساب المعلم والمزيد"><IconUserFilled/></button>:<span className="tkIdAvatar" aria-hidden="true"><IconUserFilled/></span>}
      <div className="tkIdText"><h1>{teacher.name}</h1><p>{teacher.school}</p><p>الصف: {teacher.classShort}</p></div>
      <div className="tkBrand" aria-label="تعلّمت — معًا نصنع جيلًا أفضل"><div><i aria-hidden="true"><IconSpark/></i><b>تعلّمت</b><IconBookLogo/></div><small>معًا نصنع جيلًا أفضل</small></div>
    </section>
    <div className="tkDay" aria-label="تاريخ اليوم">
      <span><IconCalendar/><span dir="rtl">{hijriDate(now)}</span></span>
      <span><IconCalendar/><span dir="rtl">{gregorianDate(now)}</span></span>
      <p><IconSprout/>كل خطوة في التعليم … تصنع فرقًا كبيرًا</p>
    </div>
    {go&&tiles.length>0&&<div className="tkStats" aria-label="ملخص اليوم">{tiles.map(([tone,label,value,icon,route])=><button key={route} type="button" className={`tkStat ${tone}`} onClick={()=>go(route)} aria-label={`${label}: ${value}`}>
      <span className="tkStatIcon" aria-hidden="true">{icon}</span><span className="tkStatText"><small>{label}</small><b className="num">{value}</b></span></button>)}</div>}
  </header>;
}
const firstOpenSubject=(home:TeacherHome)=>(home.assessment.items.find(item=>item.assessable&&item.pending>0)||home.assessment.items[0]).subjectKey;

function progressPill(item:Progress){
  if(!item.assessable)return <span className="tkPill progress none">لا تقييم</span>;
  const tone=item.assessed>=item.total?'full':item.assessed===0?'none':'';
  return <span className={`tkPill progress ${tone}`}><span className="num">{item.assessed}/{item.total}</span></span>;
}
function HomeCards({home,go}:{home:TeacherHome;go:Go}){
  const {plan,assessment,homework,stars}=home,first=homework.items[0];
  const starPercent=Math.round(stars.withStars/Math.max(1,home.students.length)*100);
  return <div className="tkCards">
    <Card tone="plan" title="الخطة الأسبوعية" subtitle={plan.holiday?'إجازة هذا الأسبوع':plan.published?`خطة ${home.week.label} منشورة للطلاب`:'خطة الأسبوع قيد النشر'} small="تُنشر تلقائيًا من توزيع المنهج دون تدخل منك" onOpen={()=>go('plan')}>
      <div className="tkCardBody">
        {plan.holiday?<p className="tkCardNote">إجازة — لا توجد دروس جديدة هذا الأسبوع.</p>
        :<div className="tkTiles">{plan.items.map(item=><button className="tkTile" type="button" key={item.subjectKey} onClick={()=>go('plan')} aria-label={`${item.label}: ${item.summary}`}><SubjectImg subject={item.subjectKey}/><b>{item.short}</b><small>{item.summary||'—'}</small></button>)}</div>}
        <Cta onClick={()=>go('plan')}/>
      </div>
    </Card>
    <Card tone="assessment" title="التقييم" subtitle="قيّم مهارة الأسبوع بضغطة واحدة" onOpen={()=>go('assess')}>
      <div className="tkCardBody">
        <div className="tkTiles">{assessment.items.map(item=><button className="tkTile" type="button" key={item.subjectKey} onClick={()=>go(`assess/${item.subjectKey}`)} aria-label={`تقييم ${item.label}: ${item.assessed} من ${item.total}`}><SubjectImg subject={item.subjectKey}/><b>{item.short}</b>{progressPill(item)}</button>)}</div>
        <Cta onClick={()=>go('assess')} label="بدء التقييم"/>
      </div>
    </Card>
    <Card tone="homework" title="الواجبات" subtitle="واجبات اليوم" onOpen={()=>go('homework')}>
      <div className="tkHwBody">
        <div className="tkHwCol">
          {first?<button className="tkHwRow" type="button" onClick={()=>go('homework')}><SubjectImg subject={first.subjectKey} scale={1.09} flat/><span className="tkHwText"><b>{first.displayTitle||first.title}</b><small>{first.subjectLabel}</small></span><span className="tkHwRing num" aria-label={`أنجز ${first.done} من ${first.assigned}`}>{first.done}/{first.assigned}</span></button>
          :<div className="tkHwRow" role="note"><SubjectImg subject="arabic" scale={1.09} flat/><span className="tkHwText"><b>{home.today.schoolDay?'لا يوجد واجب منشور اليوم':'اليوم إجازة'}</b><small>تُنشر الواجبات تلقائيًا أيام الدراسة</small></span></div>}
          <p className="tkHwCount">{homework.items.length?`${homework.items.length===1?'يوجد 1 واجب لليوم':homework.items.length===2?'يوجد واجبان لليوم':`يوجد ${homework.items.length} واجبات لليوم`} · أنجز ${homework.doneTotal} من ${homework.assignedTotal}`:'لا يوجد واجب لليوم'}</p>
        </div>
        <Cta onClick={()=>go('homework')}/>
      </div>
    </Card>
    <Card tone="stars" title="النجوم" subtitle="تحفيز الطلاب هذا الشهر" onOpen={()=>go('stars')}>
      <div className="tkStarsBody">
        <Cta onClick={()=>go('stars')} label="منح النجوم"/>
        <div className="tkReward"><img src={gift} alt="" aria-hidden="true"/><span><small>أعلى رصيد</small><b><span className="num">{stars.top}</span> نجمة</b></span></div>
        <div className="tkBar" role="progressbar" aria-valuemin={0} aria-valuemax={home.students.length} aria-valuenow={stars.withStars} aria-label="طلاب حصلوا على نجوم"><i style={{width:`${starPercent}%`}}/></div>
        <p className="tkStarCount"><b className="num">{stars.total}</b><span>نجمة</span></p>
      </div>
    </Card>
  </div>;
}

/* ---------- weekly plan (automatic; edit only when exceptional) ---------- */
function PlanPage({home,back,refresh,toast}:{home:TeacherHome;back:()=>void;refresh:()=>void;toast:(text:string,bad?:boolean)=>void}){
  const current=home.plan.week;
  const [week,setWeek]=React.useState(current),[editing,setEditing]=React.useState<PlanItem|null>(null);
  const remote=useRemote<{plan:Plan}>(`plan:${week}`,()=>api(`${AUTOMATION}?action=plan_week&week=${week}`));
  const plan=week===current&&!remote.data?home.plan:remote.data?.plan||null;
  const run=home.automation.today;
  return <div className="tkPage">
    <PageHead title="الخطة الأسبوعية" subtitle={plan?weekTitle(plan):home.week.label} icon={CARD_ICON.plan} onBack={back}/>
    <select className="tkSelect" value={week} onChange={event=>{setWeek(Number(event.target.value));setEditing(null)}} aria-label="الأسبوع" style={{marginBottom:'calc(var(--u)*6)'}}>
      {Array.from({length:current},(_,index)=>current-index).map(value=><option key={value} value={value}>الأسبوع {value}{value===current?' — الحالي':''}</option>)}
    </select>
    {remote.error&&!plan?<Failure error={remote.error} role="teacher" onRetry={()=>void remote.reload()}/>:!plan?<Loading/>:<>
      {plan.items.map(item=><PlanSubject key={item.subjectKey} item={item} action={plan.published&&!item.holiday?<button className="tkMini" type="button" onClick={()=>setEditing(item)}>تعديل</button>:undefined}/>)}
      <p className="tkMeta">{planStamp(plan)}{plan.published?' · تظهر للطلاب كما هي هنا':''}</p>
      {plan.gaps.map(gap=><div className="tkAlert" key={gap.message}>{gap.message}</div>)}
    </>}
    {editing&&<PlanEdit week={week} item={editing} onClose={()=>setEditing(null)} onSaved={()=>{setEditing(null);void remote.reload(true);refresh();toast('حُفظ التعديل ووصل للطلاب')}} toast={toast}/>}
    <section className="tkBox" style={{marginTop:'calc(var(--u)*8)'}}>
      <div className="tkBoxHead"><div><b>الأتمتة</b><small>لا تحتاج إلى فتح الموقع أو الضغط على «نشر»</small></div></div>
      <dl className="tkFacts">
        <Fact label="الخطة">{home.automation.schedule.weekly}</Fact>
        <Fact label="الواجبات">{home.automation.schedule.daily}</Fact>
        <Fact label="الاستدراك">{home.automation.schedule.catchup}</Fact>
        <Fact label="تشغيل اليوم">{run?`${SOURCE_LABEL[run.firstSource]||run.firstSource} — ${formatStamp(run.firstRunAt)}`:'لم يُسجَّل تشغيل اليوم بعد'}</Fact>
      </dl>
      {run?.gaps?.map(gap=><div className="tkAlert" key={gap.message}>{gap.message}</div>)}
      <p className="tkMeta" style={{textAlign:'right'}}>أرقام الصفحات متوفرة في المصدر لتمرين الخط والنسخ في لغتي فقط؛ بقية المواد تُعرض بالدرس والمهارة دون رقم صفحة.</p>
    </section>
  </div>;
}
function PlanEdit({week,item,onClose,onSaved,toast}:{week:number;item:PlanItem;onClose:()=>void;onSaved:()=>void;toast:(text:string,bad?:boolean)=>void}){
  const [lesson,setLesson]=React.useState(item.edited?item.lesson:''),[skill,setSkill]=React.useState(item.edited?item.skill:''),[note,setNote]=React.useState(item.note),[busy,setBusy]=React.useState(false);
  const save=async(clear:boolean)=>{
    setBusy(true);
    try{await post('plan_edit',clear?{week,subjectKey:item.subjectKey,clear:true}:{week,subjectKey:item.subjectKey,lesson,skill,note});onSaved()}
    catch(caught){const error=asApiError(caught);toast(error.code==='TEXT_REQUIRED'?'اكتب التعديل أو الملاحظة أولًا.':`تعذر الحفظ (${error.code}).`,true)}
    finally{setBusy(false)}
  };
  return <section className="tkBox orange">
    <div className="tkBoxHead"><img src={subjectIcon(item.subjectKey)} alt="" aria-hidden="true"/><div><b>تعديل استثنائي — {item.label}</b><small>اترك الحقل فارغًا ليبقى ما في توزيع المنهج</small></div></div>
    <label className="tkField">الدرس<input value={lesson} onChange={event=>setLesson(event.target.value)} placeholder={item.lesson}/></label>
    <label className="tkField">المهارة<input value={skill} onChange={event=>setSkill(event.target.value)} placeholder={item.skill}/></label>
    <label className="tkField">ملاحظة للطلاب<textarea value={note} onChange={event=>setNote(event.target.value)} placeholder="مثال: اختبار قصير يوم الأربعاء"/></label>
    <div className="tkActions"><button className="tkBtn orange" type="button" disabled={busy} onClick={()=>void save(false)}>حفظ</button>{item.edited&&<button className="tkBtn ghost" type="button" disabled={busy} onClick={()=>void save(true)}>إلغاء التعديل</button>}<button className="tkBtn ghost" type="button" onClick={onClose}>إغلاق</button></div>
  </section>;
}

/* ---------- quick assessment ---------- */
function recount(students:AssessStudent[]):AssessView['counts']{
  const count=(test:(student:AssessStudent)=>boolean)=>students.filter(test).length;
  return {total:students.length,focused:count(s=>s.focused),rest:count(s=>!s.focused),assessed:count(s=>Boolean(s.result)),pending:count(s=>!s.result),mastered:count(s=>s.result==='mastered'),needs_repeat:count(s=>s.result==='needs_repeat'),not_mastered:count(s=>s.result==='not_mastered'),restPending:count(s=>!s.focused&&!s.result),focusedPending:count(s=>s.focused&&!s.result)};
}
function AssessPage({home,subjectKey,back,go,refresh,toast}:{home:TeacherHome;subjectKey:SubjectKey;back:()=>void;go:Go;refresh:()=>void;toast:(text:string,bad?:boolean)=>void}){
  const valid=SUBJECT_ORDER.includes(subjectKey)?subjectKey:'arabic';
  const [week,setWeek]=React.useState<number|null>(null);
  React.useEffect(()=>setWeek(null),[valid]);
  const remote=useRemote<AssessView>(`assess:${valid}:${week??'current'}`,()=>api<AssessView>(`${AUTOMATION}?action=assess_view&subjectKey=${valid}${week?`&week=${week}`:''}`));
  const [busy,setBusy]=React.useState(false),[open,setOpen]=React.useState(''),[subjectOnly,setSubjectOnly]=React.useState(false),[saved,setSaved]=React.useState(false);
  const view=remote.data,quran=valid==='quran';
  const patch=(update:(students:AssessStudent[])=>AssessStudent[])=>remote.setData(current=>{if(!current)return current;const students=update(current.students);return {...current,students,counts:recount(students)}});
  const fail=(caught:unknown)=>{const error=asApiError(caught);toast(error.kind==='offline'?'تعذر الاتصال — لم يُحفظ التغيير.':error.kind==='unauthorized'?'انتهت جلسة المعلم. سجّل الدخول من جديد.':`تعذر الحفظ (${error.code}).`,true);void remote.reload(true)};
  const done=()=>{setSaved(true);void remote.reload(true);refresh()};
  const scopeBody=()=>({subjectKey:valid,week:view?.scope.week});

  const setResult=async(student:AssessStudent,result:Result)=>{
    const next=student.result===result?null:result;
    patch(students=>students.map(entry=>entry.id===student.id?{...entry,result:next,mode:next?'individual':null}:entry));
    try{await post('assess_one',{...scopeBody(),studentId:student.id,result:next});done()}catch(caught){fail(caught)}
  };
  const bulk=async(mode:'rest'|'all')=>{
    if(busy||!view)return;setBusy(true);
    try{
      const result=await post<{written:number;skippedExisting:number}>('assess_bulk',{...scopeBody(),mode});
      toast(result.written?`سُجّل «أتقن» لـ ${studentsLabel(result.written)}${result.skippedExisting?` · بقيت ${result.skippedExisting} نتيجة سابقة كما هي`:''}`:'لا يوجد طلاب بلا تقييم ضمن هذا النطاق.');
      done();
    }catch(caught){fail(caught)}finally{setBusy(false)}
  };
  const undo=async()=>{
    if(busy)return;setBusy(true);
    try{const result=await post<{undone:number;kept:number}>('assess_undo',scopeBody());toast(`تم التراجع عن ${studentsLabel(result.undone)}${result.kept?` · بقيت ${result.kept} نتيجة عُدّلت يدويًا`:''}`);done()}
    catch(caught){fail(caught)}finally{setBusy(false)}
  };
  const setFocus=async(student:AssessStudent,focused:boolean)=>{
    patch(students=>students.map(entry=>entry.id===student.id?{...entry,focused,focusScope:focused?(subjectOnly?'subject':'all'):null}:entry));
    try{await post('focus_set',{studentId:student.id,focused,...(subjectOnly?{subjectKey:valid}:{})});toast(focused?`أُضيف ${student.name} إلى المتابعة المركزة`:`أُخرج ${student.name} من المتابعة المركزة`);done()}catch(caught){fail(caught)}
  };

  const focused=view?view.students.filter(student=>student.focused):[],rest=view?view.students.filter(student=>!student.focused):[];
  return <div className="tkPage">
    <PageHead title={quran?'متابعة حفظ القرآن الكريم':'التقييم السريع'} subtitle={view?`${view.scope.weekLabel}${view.scope.isCurrent?' — الحالي':''} · ${studentsLabel(view.counts.total)}`:SUBJECT_LABEL[valid]} icon={quran?subjectIcon('quran'):CARD_ICON.assessment} onBack={back}/>
    <div className="tkChips" role="tablist" aria-label="المادة">{SUBJECT_ORDER.map(key=><button key={key} role="tab" aria-selected={key===valid} className={`tkChip ${key===valid?'on':''}`} type="button" onClick={()=>go(`assess/${key}`)}><img src={subjectIcon(key)} alt="" aria-hidden="true"/>{SUBJECT_SHORT[key]}</button>)}</div>
    {remote.error&&!view?<Failure error={remote.error} role="teacher" onRetry={()=>void remote.reload()}/>:!view?<Loading/>:<>
      <select className="tkSelect" value={view.scope.week} onChange={event=>setWeek(Number(event.target.value))} aria-label="الأسبوع">{view.weeks.map(item=><option key={item.week} value={item.week}>{item.label}{item.current?' (الحالي)':''}</option>)}</select>
      <section className="tkBox green" style={{marginTop:'calc(var(--u)*6)'}}>
        <div className="tkSkill"><small>{quran?'المطلوب حفظه هذا الأسبوع':'مهارة التقييم — من خطة الأسبوع'}</small><b>{view.scope.skill||'—'}</b>
          <span>{[view.scope.lesson&&(quran?view.scope.lesson:`الدرس: ${view.scope.lesson}`),view.scope.description].filter(Boolean).join(' · ')||view.scope.label}</span>
          <span>قُيّم <span className="num">{view.counts.assessed}</span> من <span className="num">{view.counts.total}</span> · المتابعة المركزة <span className="num">{view.counts.focused}</span> · بقية الطلاب <span className="num">{view.counts.rest}</span></span>
          <div className="tkProgressLine" aria-hidden="true"><i style={{width:`${Math.round(view.counts.assessed/Math.max(1,view.counts.total)*100)}%`}}/></div>
        </div>
        {!view.scope.assessable?<div className="tkAlert info">{view.scope.reason}</div>:<div className="tkBulk">
          <button className="tkBtn wide green" type="button" disabled={busy||view.counts.restPending===0} onClick={()=>void bulk('rest')}>
            {view.counts.restPending?<>أتقن بقية الطلاب<small>يسجّل «أتقن» لـ {studentsLabel(view.counts.restPending)} خارج المتابعة المركزة</small></>:<>تم تقييم بقية الطلاب<small>لا يوجد طالب بلا تقييم خارج المتابعة المركزة</small></>}
          </button>
          <div className="tkBulkRow">
            <button className="tkBtn ghost" type="button" disabled={busy||view.counts.pending===0} onClick={()=>void bulk('all')}>أتقن جميع الطلاب ({view.counts.pending})</button>
            <button className="tkBtn ghost" type="button" disabled={busy||!view.lastBulk} onClick={()=>void undo()}>تراجع عن آخر عملية{view.lastBulk?` (${view.lastBulk.count})`:''}</button>
          </div>
        </div>}
        {saved&&<p className="tkSaved">يُحفظ كل تغيير تلقائيًا ويظهر في صفحة الطالب.</p>}
      </section>
      <h2 className="tkH">المتابعة المركزة<small>{studentsLabel(focused.length)} · تقييم فردي</small></h2>
      <div className="tkSeg" role="group" aria-label="نطاق قائمة المتابعة المركزة"><button type="button" className={!subjectOnly?'on':''} onClick={()=>setSubjectOnly(false)}>القائمة لكل المواد</button><button type="button" className={subjectOnly?'on':''} onClick={()=>setSubjectOnly(true)}>لهذه المادة فقط</button></div>
      {focused.length?<div className="tkList">{focused.map(student=><div className="tkStudent focus" key={student.id}>
        <div className="tkStudentTop"><span className="tkNumber num">{student.number}</span><b>{student.name}</b><button className="tkMini on" type="button" onClick={()=>void setFocus(student,false)} aria-label={`إخراج ${student.name} من المتابعة المركزة`}>إخراج</button></div>
        {view.scope.assessable&&<div className="tkTri" role="group" aria-label={`تقييم ${student.name}`}>{RESULTS.map(result=><button key={result} type="button" className={`${result} ${student.result===result?'on':''}`} aria-pressed={student.result===result} onClick={()=>void setResult(student,result)}>{RESULT_LABEL[result]}</button>)}</div>}
      </div>)}</div>:<Empty>لا يوجد طلاب في المتابعة المركزة. اضغط «＋ متابعة» بجانب أي طالب لإضافته.</Empty>}
      <h2 className="tkH">بقية الطلاب<small>{studentsLabel(rest.length)}</small></h2>
      <div className="tkList">{rest.map(student=><div className="tkStudent" key={student.id}>
        <div className="tkStudentTop"><span className="tkNumber num">{student.number}</span><b>{student.name}</b>
          {view.scope.assessable&&<button type="button" onClick={()=>setOpen(open===student.id?'':student.id)} aria-expanded={open===student.id} aria-label={`تعديل تقييم ${student.name}`} style={{display:'grid'}}><Pill status={student.result}/></button>}
          <button className="tkMini" type="button" onClick={()=>void setFocus(student,true)} aria-label={`إضافة ${student.name} إلى المتابعة المركزة`}>＋ متابعة</button></div>
        {open===student.id&&view.scope.assessable&&<div className="tkTri" role="group" aria-label={`تقييم ${student.name}`}>{RESULTS.map(result=><button key={result} type="button" className={`${result} ${student.result===result?'on':''}`} aria-pressed={student.result===result} onClick={()=>void setResult(student,result)}>{RESULT_LABEL[result]}</button>)}</div>}
      </div>)}</div>
      <p className="tkMeta">اضغط على حالة أي طالب لتصحيحها. الضغط على الحالة المختارة نفسها يعيدها إلى «لم يُقيّم بعد». قائمة المتابعة المركزة لا تظهر للطلاب ولا لأولياء الأمور.</p>
    </>}
  </div>;
}

/* ---------- homework follow-up ---------- */
function HomeworkPage({home,back,refresh,toast}:{home:TeacherHome;back:()=>void;refresh:()=>void;toast:(text:string,bad?:boolean)=>void}){
  const [open,setOpen]=React.useState(''),[sending,setSending]=React.useState(false),[editing,setEditing]=React.useState('');
  const names=React.useMemo(()=>new Map(home.students.map(student=>[student.id,student])),[home.students]);
  const approve=async(homework:ClassHomework,student:HomeworkStudent)=>{
    try{await post('homework_review',{homeworkId:homework.id,studentId:student.id,approved:!student.approved});refresh();toast(student.approved?'أُلغي الاعتماد':'اعتُمد إنجاز الطالب')}catch(caught){toast(`تعذر الحفظ (${asApiError(caught).code}).`,true)}
  };
  return <div className="tkPage">
    <PageHead title="واجبات اليوم" subtitle={`${home.today.weekdayLabel} ${formatDay(home.today.date,false)}`} icon={CARD_ICON.homework} onBack={back}/>
    {home.homework.items.length?home.homework.items.map(item=><section className="tkBox orange" key={item.id}>
      <div className="tkBoxHead"><img src={subjectIcon(item.subjectKey)} alt="" aria-hidden="true"/><div><b>{item.displayTitle||item.title}</b><small>{item.subjectLabel} · {item.source==='automation'?'نُشر تلقائيًا':'من المعلم'}{item.edited?' · معدَّل':''}</small></div><span className="tkHwRing num">{item.done}/{item.assigned}</span></div>
      <dl className="tkFacts">
        {item.lesson&&<Fact label="الدرس">{item.lesson}{item.segment?` — ${item.segment}`:''}</Fact>}
        {item.subjectKey!=='quran'&&<Fact label="الصفحة">{item.page?<span className="num">{item.page}</span>:'غير متوفرة في المصدر'}</Fact>}
        {item.exercise&&<Fact label="التمرين">{item.exercise}</Fact>}
        <Fact label="المطلوب">{item.task}</Fact>
        <Fact label="النشر">{formatStamp(item.publishedAt)}</Fact>
        {item.dueDate&&<Fact label="الاستحقاق">{formatDay(item.dueDate)}</Fact>}
        <Fact label="الإنجاز">أقرّ {item.done} من {item.assigned} بالإنجاز{item.approved?` · اعتمدتَ ${item.approved}`:''}</Fact>
      </dl>
      <div className="tkProgressLine" aria-hidden="true"><i style={{width:`${Math.round(item.done/Math.max(1,item.assigned)*100)}%`}}/></div>
      <div className="tkActions" style={{marginTop:'calc(var(--u)*7)'}}><button className="tkBtn ghost" type="button" onClick={()=>setOpen(open===item.id?'':item.id)}>{open===item.id?'إخفاء الطلاب':'متابعة الطلاب'}</button><button className="tkBtn ghost" type="button" onClick={()=>setEditing(editing===item.id?'':item.id)}>تعديل استثنائي</button></div>
      {editing===item.id&&<HomeworkEdit item={item} onDone={()=>{setEditing('');refresh();toast('حُفظ التعديل ووصل للطلاب')}} toast={toast}/>}
      {open===item.id&&<div className="tkList" style={{marginTop:'calc(var(--u)*6)'}}>{[...item.students].sort((a,b)=>Number(b.status==='done')-Number(a.status==='done')).map(student=><div className="tkRow" key={student.id}>
        <span className="tkNumber num">{names.get(student.id)?.number}</span><div className="tkGrow"><b>{names.get(student.id)?.name||student.id}</b><small>{student.status==='done'?`أقرّ بالإنجاز${student.completedAt?` — ${formatStamp(student.completedAt)}`:''}`:student.status==='submitted'?'أرسل إجابة':'لم يُنجز بعد'}</small></div>
        {student.status==='done'&&<button className={`tkMini ${student.approved?'on':''}`} type="button" onClick={()=>void approve(item,student)}>{student.approved?'معتمد ✓':'اعتماد'}</button>}</div>)}</div>}
    </section>):<Empty>{home.today.schoolDay?'لا يوجد واجب منشور اليوم وفق توزيع الحصص.':'اليوم إجازة — لا تُنشر واجبات.'}</Empty>}
    {home.automation.today?.gaps?.map(gap=><div className="tkAlert" key={gap.message}>{gap.message}</div>)}
    <div className="tkActions" style={{marginTop:'calc(var(--u)*8)'}}><button className="tkBtn orange" type="button" onClick={()=>setSending(!sending)}>{sending?'إغلاق':'واجب استثنائي للصف'}</button></div>
    {sending&&<HomeworkSend onDone={()=>{setSending(false);refresh();toast('أُرسل الواجب لجميع الطلاب')}} toast={toast}/>}
    <p className="tkMeta">الواجبات اليومية تُنشر تلقائيًا من خطة الأسبوع. إنجاز الطالب إقرار منه، وليس تقييمًا للمهارة.</p>
  </div>;
}
function HomeworkEdit({item,onDone,toast}:{item:ClassHomework;onDone:()=>void;toast:(text:string,bad?:boolean)=>void}){
  const [task,setTask]=React.useState(item.task),[busy,setBusy]=React.useState(false);
  const save=async(body:Record<string,unknown>)=>{setBusy(true);try{await post('homework_edit',{homeworkId:item.id,...body});onDone()}catch(caught){toast(`تعذر الحفظ (${asApiError(caught).code}).`,true)}finally{setBusy(false)}};
  return <div style={{marginTop:'calc(var(--u)*7)'}}>
    <label className="tkField">المطلوب من الطالب<textarea value={task} onChange={event=>setTask(event.target.value)}/></label>
    <div className="tkActions"><button className="tkBtn orange" type="button" disabled={busy||!task.trim()} onClick={()=>void save({task})}>حفظ التعديل</button><button className="tkBtn ghost" type="button" disabled={busy} onClick={()=>void save({cancel:true})}>إلغاء الواجب</button></div>
  </div>;
}
function HomeworkSend({onDone,toast}:{onDone:()=>void;toast:(text:string,bad?:boolean)=>void}){
  const [title,setTitle]=React.useState(''),[task,setTask]=React.useState(''),[subjectKey,setSubjectKey]=React.useState<SubjectKey>('arabic'),[busy,setBusy]=React.useState(false);
  const requestId=React.useRef(newRequestId());
  const send=async()=>{setBusy(true);try{await post('homework_send',{requestId:requestId.current,title,task,subjectKey});onDone()}catch(caught){const error=asApiError(caught);toast(error.code==='TITLE_REQUIRED'||error.code==='TEXT_REQUIRED'?'اكتب عنوان الواجب والمطلوب بدقة.':`تعذر الإرسال (${error.code}).`,true)}finally{setBusy(false)}};
  return <section className="tkBox orange" style={{marginTop:'calc(var(--u)*6)'}}>
    <div className="tkChips">{SUBJECT_ORDER.map(key=><button key={key} type="button" className={`tkChip ${key===subjectKey?'on':''}`} onClick={()=>setSubjectKey(key)}><img src={subjectIcon(key)} alt="" aria-hidden="true"/>{SUBJECT_SHORT[key]}</button>)}</div>
    <label className="tkField">عنوان الواجب<input value={title} onChange={event=>setTitle(event.target.value)} placeholder="مثال: نسخ جملة من الدرس"/></label>
    <label className="tkField">المطلوب بدقة<textarea value={task} onChange={event=>setTask(event.target.value)} placeholder="ماذا يكتب الطالب أو ينسخ، ومن أي صفحة، وكم مرة"/></label>
    <button className="tkBtn wide orange" type="button" disabled={busy||!title.trim()||!task.trim()} onClick={()=>void send()}>{busy?'جارٍ الإرسال…':'إرسال لجميع الطلاب'}</button>
  </section>;
}

/* ---------- stars ---------- */
function StarsPage({home,back,refresh,toast,setHome}:{home:TeacherHome;back:()=>void;refresh:()=>void;toast:(text:string,bad?:boolean)=>void;setHome:React.Dispatch<React.SetStateAction<TeacherHome|null>>}){
  const [busy,setBusy]=React.useState('');
  const adjust=async(student:ClassStudent,delta:1|-1)=>{
    if(busy)return;setBusy(student.id);
    try{
      const result=await api<{stars:number;changed:boolean}>('/api/star-adjust',{method:'POST',body:{studentId:student.id,delta,requestId:newRequestId()}});
      setHome(current=>current?{...current,students:current.students.map(entry=>entry.id===student.id?{...entry,stars:result.stars}:entry)}:current);
      if(!result.changed)toast(delta>0?'وصل الطالب إلى الحد الأعلى (30 نجمة).':'رصيد الطالب صفر.');
      refresh();
    }catch(caught){toast(`تعذر تعديل النجوم (${asApiError(caught).code}).`,true)}finally{setBusy('')}
  };
  return <div className="tkPage">
    <PageHead title="النجوم" subtitle={`${home.stars.total} نجمة هذا الشهر · ${home.stars.withStars} من ${home.students.length} طالبًا`} icon={CARD_ICON.stars} onBack={back}/>
    <div className="tkList">{home.students.map(student=><div className="tkRow" key={student.id}>
      <span className="tkNumber num">{student.number}</span><div className="tkGrow"><b>{student.name}</b><small><span className="num">{student.stars}</span> من <span className="num">{home.stars.goal}</span></small></div>
      <div className="tkStarBtns"><button type="button" disabled={busy===student.id||student.stars<=0} onClick={()=>void adjust(student,-1)} aria-label={`خصم نجمة من ${student.name}`}>−</button><b className="num">{student.stars}</b><button type="button" disabled={busy===student.id||student.stars>=home.stars.goal} onClick={()=>void adjust(student,1)} aria-label={`منح نجمة لـ ${student.name}`}>+</button></div>
    </div>)}</div>
    <p className="tkMeta">النجوم يمنحها المعلم فقط، وتظهر فورًا في رصيد الطالب وسجله.</p>
  </div>;
}

/* ---------- students ---------- */
function StudentsPage({home,back,toast}:{home:TeacherHome;back:()=>void;toast:(text:string,bad?:boolean)=>void}){
  const [search,setSearch]=React.useState(''),[open,setOpen]=React.useState(''),[busy,setBusy]=React.useState(false);
  const list=home.students.filter(student=>student.name.includes(search.trim()));
  const link=async(student:ClassStudent)=>{
    const result=await api<{inviteToken:string}>('/api/student-state',{method:'POST',body:{studentId:student.id,action:'access_share'}});
    return `${location.origin}/student?studentId=${encodeURIComponent(student.id)}&invite=${encodeURIComponent(result.inviteToken)}`;
  };
  const act=async(student:ClassStudent,mode:'open'|'share')=>{
    if(busy)return;setBusy(true);
    try{
      const url=await link(student);
      if(mode==='open'){location.assign(url);return}
      const share=(navigator as Navigator&{share?:(data:{title:string;text:string;url:string})=>Promise<void>}).share;
      if(share){try{await share.call(navigator,{title:'تعلّمت',text:`صفحة الطالب ${student.name}`,url})}catch{/* dismissed */}}
      else{await navigator.clipboard.writeText(url);toast('نُسخ رابط ولي الأمر')}
    }catch(caught){toast(`تعذر تجهيز رابط الطالب (${asApiError(caught).code}).`,true)}finally{setBusy(false)}
  };
  return <div className="tkPage">
    <PageHead title="الطلاب" subtitle={`الصف ${home.teacher.classShort} · ${studentsLabel(home.students.length)}`} onBack={back}/>
    <label className="tkField"><input type="search" value={search} onChange={event=>setSearch(event.target.value)} placeholder="ابحث عن طالب…" aria-label="بحث"/></label>
    <div className="tkList">{list.map(student=><div className="tkStudent" key={student.id}>
      <button className="tkStudentTop" type="button" style={{width:'100%',textAlign:'right'}} onClick={()=>setOpen(open===student.id?'':student.id)} aria-expanded={open===student.id}>
        <span className="tkNumber num">{student.number}</span><b>{student.name}</b>{student.focused&&<span className="tkMini on">متابعة مركزة</span>}<span className="tkMini"><span className="num">{student.stars}</span> ★</span></button>
      {open===student.id&&<div className="tkActions" style={{marginTop:'calc(var(--u)*6)'}}>
        <button className="tkBtn" type="button" disabled={busy} onClick={()=>void act(student,'open')}>معاينة صفحة الطالب</button>
        <button className="tkBtn ghost" type="button" disabled={busy} onClick={()=>void act(student,'share')}>مشاركة رابط ولي الأمر</button>
        <a className="tkBtn ghost" href={`/teacher/student/${student.id}`}>ملف الطالب</a>
      </div>}
    </div>)}</div>
    {!list.length&&<Empty>لا يوجد طالب بهذا الاسم.</Empty>}
  </div>;
}

/* ---------- summary pages ---------- */
function WeekChips({student}:{student:ClassStudent}){
  return <div className="tkWeekChips">{SUBJECT_ORDER.map(key=><span key={key} className={`tkWeekChip ${student.week?.[key]||'pending'}`}>{SUBJECT_SHORT[key]}: {student.week?.[key]?RESULT_LABEL[student.week[key] as Result]:'لم يُقيّم'}</span>)}</div>;
}
function FollowupPage({home,back,go,refresh,toast}:{home:TeacherHome;back:()=>void;go:Go;refresh:()=>void;toast:(text:string,bad?:boolean)=>void}){
  const [busy,setBusy]=React.useState('');
  const focused=home.students.filter(student=>student.focused);
  const remove=async(student:ClassStudent)=>{
    if(busy)return;setBusy(student.id);
    try{await post('focus_set',{studentId:student.id,focused:false});toast(`أُخرج ${student.name} من المتابعة المركزة`);refresh()}
    catch(caught){toast(`تعذر الحفظ (${asApiError(caught).code}).`,true)}finally{setBusy('')}
  };
  return <div className="tkPage">
    <PageHead title="يحتاجون متابعة" subtitle={`المتابعة المركزة · ${studentsLabel(focused.length)}`} onBack={back}/>
    {focused.length?<div className="tkList">{focused.map(student=><div className="tkStudent focus" key={student.id}>
      <div className="tkStudentTop"><span className="tkNumber num">{student.number}</span><b>{student.name}</b><a className="tkMini" href={`/teacher/student/${student.id}`}>الملف</a><button className="tkMini on" type="button" disabled={busy===student.id} onClick={()=>void remove(student)}>إخراج</button></div>
      <WeekChips student={student}/>
    </div>)}</div>:<Empty>لا يوجد طلاب في المتابعة المركزة. تضيفهم من شاشة التقييم بزر «＋ متابعة» بجانب اسم الطالب.</Empty>}
    <div className="tkActions" style={{marginTop:'calc(var(--u)*8)'}}><button className="tkBtn green" type="button" onClick={()=>go('assess')}>تقييم طلاب المتابعة</button></div>
    <p className="tkMeta">نتائج {home.week.label} لكل مادة. هذه القائمة خاصة بالمعلم ولا تظهر للطلاب ولا لأولياء الأمور.</p>
  </div>;
}
function TodayPage({home,back,go}:{home:TeacherHome;back:()=>void;go:Go}){
  const byStudent=new Map<string,TeacherHome['todayAssessments']>();
  for(const entry of home.todayAssessments){if(!byStudent.has(entry.studentId))byStudent.set(entry.studentId,[]);byStudent.get(entry.studentId)!.push(entry)}
  const assessed=home.students.filter(student=>byStudent.has(student.id)),waiting=home.students.length-assessed.length;
  return <div className="tkPage">
    <PageHead title="تقييمات اليوم" subtitle={`${home.today.weekdayLabel} ${formatDay(home.today.date,false)} · قُيّم ${assessed.length} من ${home.students.length}`} icon={CARD_ICON.assessment} onBack={back}/>
    {assessed.length?<div className="tkList">{assessed.map(student=><div className="tkStudent" key={student.id}>
      <div className="tkStudentTop"><span className="tkNumber num">{student.number}</span><b>{student.name}</b></div>
      <div className="tkWeekChips">{byStudent.get(student.id)!.map(entry=><span key={entry.subjectKey} className={`tkWeekChip ${entry.result}`}>{SUBJECT_SHORT[entry.subjectKey]}: {RESULT_LABEL[entry.result]}</span>)}</div>
    </div>)}</div>:<Empty>لم يُسجَّل أي تقييم اليوم بعد.</Empty>}
    <div className="tkActions" style={{marginTop:'calc(var(--u)*8)'}}><button className="tkBtn green" type="button" onClick={()=>go('assess')}>{waiting?`بدء التقييم (${waiting} لم يُقيَّموا اليوم)`:'فتح التقييم'}</button></div>
    <p className="tkMeta">يُحسب الطالب مرة واحدة حتى لو قُيّم في أكثر من مادة.</p>
  </div>;
}
function MessagesPage({home,back}:{home:TeacherHome;back:()=>void}){
  return <div className="tkPage">
    <PageHead title="رسائل جديدة" subtitle="رسائل أولياء الأمور خلال آخر 7 أيام" onBack={back}/>
    {home.messages.length?<div className="tkList">{home.messages.map(message=><a className="tkRow" key={message.id} href={`/teacher/student/${message.studentId}`}><span className="tkGrow"><b>{message.name}</b><small>{message.summary}</small><small>{formatStamp(message.createdAt)}</small></span><IconChevron/></a>)}</div>:<Empty>لا توجد رسائل خلال آخر 7 أيام.</Empty>}
    <div className="tkActions" style={{marginTop:'calc(var(--u)*8)'}}><a className="tkBtn ghost" href="/teacher/messages">كل الرسائل</a></div>
    <p className="tkMeta">تُكتب الرسالة من ملف الطالب. لا يوجد في النظام بريد وارد من ولي الأمر، لذلك يُعرض هنا ما سُجّل من رسائل خلال الأسبوع.</p>
  </div>;
}

/* ---------- more ---------- */
function MorePage({home,environment,back,go,onSignedOut}:{home:TeacherHome;environment:string;back:()=>void;go:Go;onSignedOut:()=>void}){
  const run=home.automation.today;
  const signOut=async()=>{try{await post('logout')}finally{onSignedOut()}};
  const links:[string,string,string][]=[['/teacher/students','ملفات الطلاب والتواصل','الملاحظات، الرسائل، السلوك، ملف كل طالب'],['/teacher/messages','الرسائل','رسائل أولياء الأمور'],['/teacher/followup','يحتاجون متابعة','الطلاب الذين يحتاجون متابعة وأسبابها'],['/teacher/announcements','الإعلانات','إنشاء ومراجعة إعلانات الفصل'],['/teacher/library','الكتب والمكتبة','الكتب، أوراق العمل، الخطط العلاجية، ملف الإنجاز'],['/teacher/settings','الإعدادات','بيانات الفصل والمواد']];
  return <div className="tkPage">
    <PageHead title="المزيد" subtitle={`${home.teacher.name} · ${home.teacher.school}`} onBack={back}/>
    <div className="tkList">
      <button className="tkRow" type="button" onClick={()=>go('assess/quran')}><img src={subjectIcon('quran')} alt="" aria-hidden="true"/><span className="tkGrow"><b>متابعة حفظ القرآن الكريم</b><small>تقييم الحفظ الأسبوعي للصف</small></span><IconChevron/></button>
      {links.map(([href,title,subtitle])=><a className="tkRow" key={href} href={href}><span className="tkGrow"><b>{title}</b><small>{subtitle}</small></span><IconChevron/></a>)}
    </div>
    <section className="tkBox" style={{marginTop:'calc(var(--u)*8)'}}>
      <div className="tkBoxHead"><div><b>حالة الأتمتة</b><small>{environment==='staging'?'نسخة Staging — بياناتها منفصلة عن الموقع الأساسي':'الموقع الأساسي'}</small></div></div>
      <dl className="tkFacts">
        <Fact label="الخطة">{home.plan.published?`منشورة — ${planStamp(home.plan)}`:'قيد النشر'}</Fact>
        <Fact label="واجبات اليوم">{home.homework.items.length?`${home.homework.items.length} منشورة`:home.today.schoolDay?'لا يوجد وفق التوزيع':'إجازة'}</Fact>
        <Fact label="تشغيل اليوم">{run?`${SOURCE_LABEL[run.firstSource]||run.firstSource} — ${formatStamp(run.firstRunAt)}`:'لم يُسجَّل بعد'}</Fact>
        <Fact label="الجدولة">{home.automation.schedule.weekly}؛ {home.automation.schedule.daily}</Fact>
      </dl>
    </section>
    <div className="tkActions" style={{marginTop:'calc(var(--u)*8)'}}><button className="tkBtn ghost" type="button" onClick={()=>void signOut()}>تسجيل الخروج</button></div>
  </div>;
}
