// Teacher pages in the same identity as the student pages. The teacher's usual work is one screen: the quick assessment
// ("أتقن بقية الطلاب" + individual results for the focused follow-up list). Plan and homework publish themselves.
import React from 'react';
import gift from './assets/gift.webp';
import {
  api,ApiError,asApiError,BottomNav,Card,CardsSkeleton,CARD_ICON,Chat,ChatMessage,Cta,Empty,Fact,Failure,fileSize,formatDay,formatStamp,gregorianDate,gregorianRange,hijriDate,hijriRange,IconAlert,IconBookLogo,IconCalendar,IconChevron,IconFolder,IconMessage,IconSpark,IconSprout,IconStar,IconUserFilled,Loading,NavBook,NavHome,NavHomeLine,
  NavMore,NavPeople,newRequestId,PageHead,Plan,PlanDates,PlanItem,PlanSubject,planStamp,Result,RESULTS,RESULT_LABEL,Screen,SHAK,studentsLabel,SubjectImg,SubjectKey,subjectIcon,SUBJECT_LABEL,SUBJECT_ORDER,SUBJECT_SHORT,
  useHashRoute,useNow,usePolling,useRemote,useToast
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
  const tab=route==='students'||route.startsWith('student/')?'students':route==='more'?'more':route==='library'?'library':route==='assistant'?'assistant':'home';
  const nav=<BottomNav label="تنقل المعلم" active={tab} items={[
    {key:'home',label:'الرئيسية',icon:<NavHomeLine/>,activeIcon:<NavHome/>,onClick:()=>go('')},
    {key:'students',label:'الطلاب',icon:<NavPeople/>,onClick:()=>go('students')},
    {key:'assistant',label:'شكابمبو',icon:<img src={SHAK.logo} alt="" aria-hidden="true"/>,onClick:()=>go('assistant')},
    {key:'library',label:'الكتب',icon:<NavBook/>,onClick:()=>go('library')},
    {key:'more',label:'المزيد',icon:<NavMore/>,onClick:()=>go('more')}
  ]}/>;
  const [assistLog,setAssistLog]=React.useState<AssistEntry[]>([]);
  const data=home.data;
  const header=<TeacherTop home={data} go={go}/>;

  let body:React.ReactNode;
  if(!data)body=<>{header}{home.error?<Failure error={home.error} role="teacher" onRetry={()=>void home.reload()}/>:<CardsSkeleton/>}</>;
  else if(route==='plan')body=<PlanPage home={data} back={back} refresh={refresh} toast={showToast}/>;
  else if(route==='assess'||route.startsWith('assess/'))body=<AssessPage home={data} subjectKey={(route.slice(7)||firstOpenSubject(data)) as SubjectKey} back={back} go={go} refresh={refresh} toast={showToast}/>;
  else if(route==='homework')body=<HomeworkPage home={data} back={back} refresh={refresh} toast={showToast}/>;
  else if(route==='stars')body=<StarsPage home={data} back={back} go={go} refresh={refresh} toast={showToast} setHome={home.setData}/>;
  else if(route==='students')body=<StudentsPage home={data} back={back} go={go}/>;
  else if(route.startsWith('student/'))body=<StudentFilePage home={data} studentId={route.split('/')[1]||''} section={route.split('/')[2]||''} back={back} go={go} refresh={refresh} toast={showToast} setHome={home.setData}/>;
  else if(route.startsWith('chat/'))body=<TeacherChatPage home={data} studentId={route.slice(5)} back={back} refresh={refresh}/>;
  else if(route==='library')body=<LibraryPage home={data} back={back} go={go} toast={showToast}/>;
  else if(route==='assistant')body=<AssistantPage home={data} back={back} log={assistLog} setLog={setAssistLog}/>;
  else if(route==='more')body=<MorePage home={data} environment={environment} back={back} go={go} onSignedOut={onSignedOut}/>;
  else if(route==='followup')body=<FollowupPage home={data} back={back} go={go} refresh={refresh} toast={showToast}/>;
  else if(route==='today')body=<TodayPage home={data} back={back} go={go}/>;
  else if(route==='messages')body=<MessagesPage home={data} back={back} go={go}/>;
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
    <Card tone="plan" title="الخطة الأسبوعية" subtitle={plan.holiday?'إجازة هذا الأسبوع':plan.published?`خطة ${home.week.label} منشورة للطلاب`:'خطة الأسبوع قيد النشر'} dates={[hijriRange(plan.range),gregorianRange(plan.range)]} onOpen={()=>go('plan')}>
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
          {first?<button className="tkHwRow" type="button" onClick={()=>go('homework')}><SubjectImg subject={first.subjectKey} size={34}/><span className="tkHwText"><b>{first.displayTitle||first.title}</b><small>{first.subjectLabel}</small></span><span className="tkHwRing num" aria-label={`أنجز ${first.done} من ${first.assigned}`}>{first.done}/{first.assigned}</span></button>
          :<div className="tkHwRow" role="note"><SubjectImg subject="arabic" size={34}/><span className="tkHwText"><b>{home.today.schoolDay?'لا يوجد واجب منشور اليوم':'اليوم إجازة'}</b><small>تُنشر الواجبات تلقائيًا أيام الدراسة</small></span></div>}
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
    <PageHead title="الخطة الأسبوعية" subtitle={`${plan?`الأسبوع ${plan.week}`:home.week.label} · بالتاريخ الهجري والميلادي`} icon={CARD_ICON.plan} onBack={back}/>
    <select className="tkSelect" value={week} onChange={event=>{setWeek(Number(event.target.value));setEditing(null)}} aria-label="الأسبوع" style={{marginBottom:'calc(var(--u)*6)'}}>
      {Array.from({length:current},(_,index)=>current-index).map(value=><option key={value} value={value}>الأسبوع {value}{value===current?' — الحالي':''}</option>)}
    </select>
    {remote.error&&!plan?<Failure error={remote.error} role="teacher" onRetry={()=>void remote.reload()}/>:!plan?<Loading/>:<>
      <PlanDates plan={plan}/>
      {plan.items.map(item=><PlanSubject key={item.subjectKey} item={item} start={plan.range.start} action={plan.published&&!item.holiday?<button className="tkMini" type="button" onClick={()=>setEditing(item)}>تعديل</button>:undefined}/>)}
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

/* ---------- one student = one pastel card with a large name ---------- */
// The colour only tells neighbouring rows apart (sky, green, gold, purple in turn); it never stands for a level.
function StudentCard({index,number,name,focused=false,meta,children}:{index:number;number:number;name:string;focused?:boolean;meta?:React.ReactNode;children?:React.ReactNode}){
  return <article className={`tkSt c${index%4}`} data-focus={focused?'1':'0'}>
    <div className="tkStHead"><span className="tkStNum num">{number}</span><b className="tkStName">{name}</b></div>
    {(focused||meta)&&<div className="tkStMeta">{focused&&<span className="tkBadge focus">المتابعة المركزة</span>}{meta}</div>}
    {children}
  </article>;
}
const resultBadge=(result:Result|null|undefined,prefix='')=><span className={`tkBadge ${result||''}`}>{prefix}{result?RESULT_LABEL[result]:'لم يُقيّم بعد'}</span>;
function TriButtons({name,value,onPick}:{name:string;value:Result|null|undefined;onPick:(result:Result)=>void}){
  return <div className="tkTri" role="group" aria-label={`تقييم ${name}`}>{RESULTS.map(result=><button key={result} type="button" className={`${result} ${value===result?'on':''}`} aria-pressed={value===result} onClick={()=>onPick(result)}>{RESULT_LABEL[result]}</button>)}</div>;
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
  const [busy,setBusy]=React.useState(false),[open,setOpen]=React.useState(''),[subjectOnly,setSubjectOnly]=React.useState(false),[saved,setSaved]=React.useState(false),[confirmAll,setConfirmAll]=React.useState(false);
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
    if(busy||!view)return;setBusy(true);setConfirmAll(false);
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
          <p className="tkScope">النطاق: {view.scope.label} · {view.scope.weekLabel} · الطلاب الذين لم يُقيَّموا بعد فقط. طلاب المتابعة المركزة مستثنون، ولا تتغير أي نتيجة سُجّلت سابقًا.</p>
          <div className="tkBulkRow">
            <button className="tkBtn ghost" type="button" disabled={busy||view.counts.pending===0} onClick={()=>setConfirmAll(!confirmAll)} aria-expanded={confirmAll}>أتقن الكل مع المتابعة المركزة ({view.counts.pending})</button>
            <button className="tkBtn ghost" type="button" disabled={busy||!view.lastBulk} onClick={()=>void undo()}>تراجع عن آخر عملية{view.lastBulk?` (${view.lastBulk.count})`:''}</button>
          </div>
          {confirmAll&&<div className="tkConfirm" role="alertdialog" aria-label="تأكيد أتقن الكل">
            <span>سيُسجَّل «أتقن» في {view.scope.label} — {view.scope.weekLabel} لـ {studentsLabel(view.counts.pending)} لم يُقيَّموا بعد، ومنهم {view.counts.focusedPending} من المتابعة المركزة. النتائج المسجلة سابقًا تبقى كما هي.</span>
            <div className="tkActions"><button className="tkBtn green" type="button" disabled={busy} onClick={()=>void bulk('all')}>تأكيد</button><button className="tkBtn ghost" type="button" onClick={()=>setConfirmAll(false)}>إلغاء</button></div>
          </div>}
        </div>}
        {saved&&<p className="tkSaved">يُحفظ كل تغيير تلقائيًا ويظهر في صفحة الطالب.</p>}
      </section>
      <h2 className="tkH">المتابعة المركزة<small>{studentsLabel(focused.length)} · تقييم فردي</small></h2>
      <div className="tkSeg" role="group" aria-label="نطاق قائمة المتابعة المركزة"><button type="button" className={!subjectOnly?'on':''} onClick={()=>setSubjectOnly(false)}>القائمة لكل المواد</button><button type="button" className={subjectOnly?'on':''} onClick={()=>setSubjectOnly(true)}>لهذه المادة فقط</button></div>
      {focused.length?<div className="tkList">{focused.map((student,index)=><StudentCard key={student.id} index={index} number={student.number} name={student.name} focused meta={view.scope.assessable?resultBadge(student.result):undefined}>
        {view.scope.assessable&&<TriButtons name={student.name} value={student.result} onPick={result=>void setResult(student,result)}/>}
        <div className="tkStActions"><button className="tkAct" type="button" onClick={()=>go(`student/${student.id}`)}>ملف الطالب</button><button className="tkAct warn" type="button" onClick={()=>void setFocus(student,false)} aria-label={`إخراج ${student.name} من المتابعة المركزة`}>إخراج من المتابعة</button></div>
      </StudentCard>)}</div>:<Empty>لا يوجد طلاب في المتابعة المركزة. اضغط «＋ متابعة مركزة» في بطاقة أي طالب لإضافته.</Empty>}
      <h2 className="tkH">بقية الطلاب<small>{studentsLabel(rest.length)}</small></h2>
      <div className="tkList">{rest.map((student,index)=><StudentCard key={student.id} index={index} number={student.number} name={student.name} meta={view.scope.assessable?resultBadge(student.result):undefined}>
        {open===student.id&&view.scope.assessable&&<TriButtons name={student.name} value={student.result} onPick={result=>void setResult(student,result)}/>}
        <div className="tkStActions">
          {view.scope.assessable&&<button className="tkAct primary" type="button" onClick={()=>setOpen(open===student.id?'':student.id)} aria-expanded={open===student.id} aria-label={`تعديل تقييم ${student.name}`}>{open===student.id?'إغلاق التقييم':'تقييم'}</button>}
          <button className="tkAct" type="button" onClick={()=>go(`student/${student.id}`)}>ملف الطالب</button>
          <button className="tkAct warn" type="button" onClick={()=>void setFocus(student,true)} aria-label={`إضافة ${student.name} إلى المتابعة المركزة`}>＋ متابعة مركزة</button>
        </div>
      </StudentCard>)}</div>
      <p className="tkMeta">اضغط «تقييم» لتسجيل نتيجة طالب أو تصحيحها. الضغط على النتيجة المختارة نفسها يعيدها إلى «لم يُقيّم بعد». قائمة المتابعة المركزة لا تظهر للطلاب ولا لأولياء الأمور.</p>
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
      {open===item.id&&<div className="tkList" style={{marginTop:'calc(var(--u)*6)'}}>{[...item.students].sort((a,b)=>Number(b.status==='done')-Number(a.status==='done')).map((student,index)=><StudentCard key={student.id} index={index} number={names.get(student.id)?.number||0} name={names.get(student.id)?.name||student.id}
        meta={<span className={`tkBadge ${student.status==='done'?'mastered':''}`}>{student.status==='done'?`أقرّ بالإنجاز${student.completedAt?` — ${formatStamp(student.completedAt)}`:''}`:student.status==='submitted'?'أرسل إجابة':'لم يُنجز بعد'}</span>}>
        {student.status==='done'&&<div className="tkStActions"><button className={`tkAct ${student.approved?'green':''}`} type="button" onClick={()=>void approve(item,student)}>{student.approved?'معتمد ✓ — إلغاء الاعتماد':'اعتماد الإنجاز'}</button></div>}</StudentCard>)}</div>}
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
function useStars(toast:(text:string,bad?:boolean)=>void,refresh:()=>void,setHome:React.Dispatch<React.SetStateAction<TeacherHome|null>>){
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
  return {busy,adjust};
}
function StarButtons({student,goal,busy,adjust}:{student:ClassStudent;goal:number;busy:string;adjust:(student:ClassStudent,delta:1|-1)=>void}){
  return <div className="tkStarBtns"><button type="button" disabled={busy===student.id||student.stars<=0} onClick={()=>adjust(student,-1)} aria-label={`خصم نجمة من ${student.name}`}>−</button><b className="num">{student.stars}</b><button type="button" disabled={busy===student.id||student.stars>=goal} onClick={()=>adjust(student,1)} aria-label={`منح نجمة لـ ${student.name}`}>+</button><span>من <span className="num">{goal}</span> نجمة</span></div>;
}
function StarsPage({home,back,go,refresh,toast,setHome}:{home:TeacherHome;back:()=>void;go:Go;refresh:()=>void;toast:(text:string,bad?:boolean)=>void;setHome:React.Dispatch<React.SetStateAction<TeacherHome|null>>}){
  const stars=useStars(toast,refresh,setHome);
  return <div className="tkPage">
    <PageHead title="النجوم" subtitle={`${home.stars.total} نجمة هذا الشهر · ${home.stars.withStars} من ${home.students.length} طالبًا`} icon={CARD_ICON.stars} onBack={back}/>
    <div className="tkList">{home.students.map((student,index)=><StudentCard key={student.id} index={index} number={student.number} name={student.name} focused={student.focused}>
      <div className="tkStActions"><StarButtons student={student} goal={home.stars.goal} busy={stars.busy} adjust={(target,delta)=>void stars.adjust(target,delta)}/><button className="tkAct" type="button" onClick={()=>go(`student/${student.id}`)}>ملف الطالب</button></div>
    </StudentCard>)}</div>
    <p className="tkMeta">النجوم يمنحها المعلم فقط، وتظهر فورًا في رصيد الطالب وسجله.</p>
  </div>;
}

/* ---------- students ---------- */
function StudentsPage({home,back,go}:{home:TeacherHome;back:()=>void;go:Go}){
  const [search,setSearch]=React.useState('');
  const list=home.students.filter(student=>student.name.includes(search.trim()));
  return <div className="tkPage">
    <PageHead title="الطلاب" subtitle={`الصف ${home.teacher.classShort} · ${studentsLabel(home.students.length)}`} onBack={back}/>
    <label className="tkField"><input type="search" value={search} onChange={event=>setSearch(event.target.value)} placeholder="ابحث عن طالب…" aria-label="بحث"/></label>
    <div className="tkList">{list.map((student,index)=><StudentCard key={student.id} index={index} number={student.number} name={student.name} focused={student.focused}
      meta={<><span className="tkBadge"><span className="num">{student.stars}</span> ★ نجمة</span>{student.assessedToday&&<span className="tkBadge mastered">قُيّم اليوم</span>}</>}>
      <div className="tkStActions"><button className="tkAct primary" type="button" onClick={()=>go(`student/${student.id}`)} aria-label={`فتح ملف ${student.name}`}>ملف الطالب</button><button className="tkAct green" type="button" onClick={()=>go(`student/${student.id}/assess`)} aria-label={`تقييم ${student.name}`}>تقييم</button></div>
    </StudentCard>)}</div>
    {!list.length&&<Empty>لا يوجد طالب بهذا الاسم.</Empty>}
  </div>;
}

/* ---------- one student's file: assessment, focus, stars, guardian contact ---------- */
function StudentFilePage({home,studentId,section,back,go,refresh,toast,setHome}:{home:TeacherHome;studentId:string;section:string;back:()=>void;go:Go;refresh:()=>void;toast:(text:string,bad?:boolean)=>void;setHome:React.Dispatch<React.SetStateAction<TeacherHome|null>>}){
  const student=home.students.find(entry=>entry.id===studentId),stars=useStars(toast,refresh,setHome);
  const [busy,setBusy]=React.useState(false),assessRef=React.useRef<HTMLHeadingElement>(null);
  React.useEffect(()=>{if(section==='assess')assessRef.current?.scrollIntoView({block:'start'})},[section,studentId]);
  if(!student)return <div className="tkPage"><PageHead title="ملف الطالب" onBack={back}/><Empty>هذا الطالب غير موجود في قائمة الصف.</Empty></div>;
  const patch=(update:(entry:ClassStudent)=>ClassStudent)=>setHome(current=>current?{...current,students:current.students.map(entry=>entry.id===student.id?update(entry):entry)}:current);
  const assess=async(item:Progress,result:Result)=>{
    const previous=student.week?.[item.subjectKey]||null,next=previous===result?null:result;
    patch(entry=>({...entry,week:{...entry.week,[item.subjectKey]:next}}));
    try{await post('assess_one',{subjectKey:item.subjectKey,week:item.week,studentId:student.id,result:next});toast(next?`سُجّل «${RESULT_LABEL[next]}» في ${item.label}`:`أُلغي تقييم ${item.label}`);refresh()}
    catch(caught){patch(entry=>({...entry,week:{...entry.week,[item.subjectKey]:previous}}));toast(`تعذر الحفظ (${asApiError(caught).code}).`,true)}
  };
  const toggleFocus=async()=>{
    if(busy)return;setBusy(true);const focused=!student.focused;
    try{await post('focus_set',{studentId:student.id,focused});patch(entry=>({...entry,focused}));toast(focused?`أُضيف ${student.name} إلى المتابعة المركزة`:`أُخرج ${student.name} من المتابعة المركزة`);refresh()}
    catch(caught){toast(`تعذر الحفظ (${asApiError(caught).code}).`,true)}finally{setBusy(false)}
  };
  const link=async()=>{
    const result=await api<{inviteToken:string}>('/api/student-state',{method:'POST',body:{studentId:student.id,action:'access_share'}});
    return `${location.origin}/student?studentId=${encodeURIComponent(student.id)}&invite=${encodeURIComponent(result.inviteToken)}`;
  };
  const act=async(mode:'open'|'share')=>{
    if(busy)return;setBusy(true);
    try{
      const url=await link();
      if(mode==='open'){location.assign(url);return}
      const share=(navigator as Navigator&{share?:(data:{title:string;text:string;url:string})=>Promise<void>}).share;
      if(share){try{await share.call(navigator,{title:'تعلّمت',text:`صفحة الطالب ${student.name}`,url})}catch{/* dismissed */}}
      else{await navigator.clipboard.writeText(url);toast('نُسخ رابط ولي الأمر')}
    }catch(caught){toast(`تعذر تجهيز رابط الطالب (${asApiError(caught).code}).`,true)}finally{setBusy(false)}
  };
  return <div className="tkPage">
    <PageHead title="ملف الطالب" subtitle={`الصف ${home.teacher.classShort} · ${home.week.label}`} onBack={back}/>
    <StudentCard index={home.students.indexOf(student)} number={student.number} name={student.name} focused={student.focused}
      meta={<><span className="tkBadge"><span className="num">{student.stars}</span> ★ نجمة</span>{student.assessedToday&&<span className="tkBadge mastered">قُيّم اليوم</span>}</>}/>
    <h2 className="tkH" ref={assessRef}>تقييم مهارات الأسبوع<small>يُحفظ فورًا ويظهر للطالب</small></h2>
    {home.assessment.items.map(item=><section className="tkBox green" key={item.subjectKey}>
      <div className="tkBoxHead"><img src={subjectIcon(item.subjectKey)} alt="" aria-hidden="true"/><div><b>{item.label}</b><small>{item.skill||item.lesson||'—'}</small></div>{item.assessable&&resultBadge(student.week?.[item.subjectKey])}</div>
      {item.assessable?<div className="tkSt" style={{padding:0,border:0,boxShadow:'none',background:'none'}}><TriButtons name={`${student.name} في ${item.label}`} value={student.week?.[item.subjectKey]} onPick={result=>void assess(item,result)}/></div>:<div className="tkAlert info" style={{marginTop:0}}>{item.reason||'لا يوجد تقييم لهذه المادة هذا الأسبوع.'}</div>}
    </section>)}
    <h2 className="tkH">المتابعة والنجوم</h2>
    <section className="tkBox">
      <div className="tkStActions"><button className={`tkAct ${student.focused?'warn':''}`} type="button" disabled={busy} onClick={()=>void toggleFocus()}>{student.focused?'إخراج من المتابعة المركزة':'＋ إضافة إلى المتابعة المركزة'}</button></div>
      <div className="tkStActions" style={{marginTop:'calc(var(--u)*7)'}}><StarButtons student={student} goal={home.stars.goal} busy={stars.busy} adjust={(target,delta)=>void stars.adjust(target,delta)}/></div>
      <p className="tkMeta" style={{textAlign:'right'}}>المتابعة المركزة وصف خاص بالمعلم، لا يظهر للطالب ولا لولي أمره.</p>
    </section>
    <h2 className="tkH">التواصل وصفحة الطالب</h2>
    <div className="tkStActions">
      <button className="tkAct primary" type="button" onClick={()=>go(`chat/${student.id}`)}>محادثة ولي الأمر</button>
      <button className="tkAct" type="button" disabled={busy} onClick={()=>void act('open')}>معاينة صفحة الطالب</button>
      <button className="tkAct" type="button" disabled={busy} onClick={()=>void act('share')}>مشاركة رابط ولي الأمر</button>
    </div>
    <a className="tkRowBtn" href={`/teacher/student/${student.id}`}><span className="tkRowIcon" aria-hidden="true"><IconFolder/></span><span className="tkGrow"><b>السجل التفصيلي</b><small>الملاحظات، السلوك، الخطط العلاجية والواجب الفردي</small></span><IconChevron/></a>
  </div>;
}

/* ---------- summary pages ---------- */
function WeekBadges({student}:{student:ClassStudent}){
  return <div className="tkStMeta">{SUBJECT_ORDER.map(key=><span key={key} className={`tkBadge ${student.week?.[key]||''}`}>{SUBJECT_SHORT[key]}: {student.week?.[key]?RESULT_LABEL[student.week[key] as Result]:'لم يُقيّم'}</span>)}</div>;
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
    {focused.length?<div className="tkList">{focused.map((student,index)=><StudentCard key={student.id} index={index} number={student.number} name={student.name} focused>
      <WeekBadges student={student}/>
      <div className="tkStActions"><button className="tkAct green" type="button" onClick={()=>go(`student/${student.id}/assess`)} aria-label={`تقييم ${student.name}`}>تقييم</button><button className="tkAct" type="button" onClick={()=>go(`student/${student.id}`)} aria-label={`فتح ملف ${student.name}`}>ملف الطالب</button><button className="tkAct warn" type="button" disabled={busy===student.id} onClick={()=>void remove(student)}>إخراج من المتابعة</button></div>
    </StudentCard>)}</div>:<Empty>لا يوجد طلاب في المتابعة المركزة. تضيفهم من شاشة التقييم أو من ملف الطالب.</Empty>}
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
    {assessed.length?<div className="tkList">{assessed.map((student,index)=><StudentCard key={student.id} index={index} number={student.number} name={student.name} focused={student.focused}
      meta={<>{byStudent.get(student.id)!.map(entry=><span key={entry.subjectKey} className={`tkBadge ${entry.result}`}>{SUBJECT_SHORT[entry.subjectKey]}: {RESULT_LABEL[entry.result]}</span>)}</>}>
      <div className="tkStActions"><button className="tkAct green" type="button" onClick={()=>go(`student/${student.id}/assess`)} aria-label={`تعديل تقييم ${student.name}`}>تعديل التقييم</button><button className="tkAct" type="button" onClick={()=>go(`student/${student.id}`)} aria-label={`فتح ملف ${student.name}`}>ملف الطالب</button></div>
    </StudentCard>)}</div>:<Empty>لم يُسجَّل أي تقييم اليوم بعد.</Empty>}
    <div className="tkActions" style={{marginTop:'calc(var(--u)*8)'}}><button className="tkBtn green" type="button" onClick={()=>go('assess')}>{waiting?`بدء التقييم (${waiting} لم يُقيَّموا اليوم)`:'فتح التقييم'}</button></div>
    <p className="tkMeta">يُحسب الطالب مرة واحدة حتى لو قُيّم في أكثر من مادة.</p>
  </div>;
}

/* ---------- messages: inbox and conversation with one guardian ---------- */
type InboxThread={studentId:string;name:string;number:number;count:number;unread:number;last:{from:'guardian'|'teacher';text:string;createdAt:string};lastIncomingAt:string};
function MessagesPage({home,back,go}:{home:TeacherHome;back:()=>void;go:Go}){
  const remote=useRemote<{threads:InboxThread[];unread:number}>('inbox',()=>api(`${AUTOMATION}?action=messages_inbox`));
  usePolling(remote.reload,30000);
  const [recent,setRecent]=React.useState(true),[pick,setPick]=React.useState('');
  const cutoff=new Date(Date.now()-7*86400000).toISOString(),threads=remote.data?.threads||[];
  // «آخر 7 أيام» only filters what is shown. Unread conversations are always shown, and nothing is deleted.
  const list=threads.filter(thread=>!recent||thread.unread>0||thread.last.createdAt>=cutoff),hidden=threads.length-list.length;
  return <div className="tkPage">
    <PageHead title="الرسائل" subtitle={remote.data?(remote.data.unread?`${remote.data.unread} رسالة جديدة من أولياء الأمور`:'لا توجد رسائل جديدة'):'رسائل أولياء الأمور'} onBack={back}/>
    <div className="tkSeg" role="group" aria-label="فترة العرض"><button type="button" className={recent?'on':''} onClick={()=>setRecent(true)}>آخر 7 أيام</button><button type="button" className={!recent?'on':''} onClick={()=>setRecent(false)}>كل المحادثات</button></div>
    {remote.error&&!remote.data?<Failure error={remote.error} role="teacher" onRetry={()=>void remote.reload()}/>:!remote.data?<Loading/>
      :list.length?<div className="tkList">{list.map((thread,index)=><StudentCard key={thread.studentId} index={index} number={thread.number} name={thread.name}
        meta={<>{thread.unread>0&&<span className="tkBadge new">{thread.unread===1?'رسالة جديدة':`${thread.unread} رسائل جديدة`}</span>}<span className="tkBadge">{formatStamp(thread.last.createdAt)}</span></>}>
        <p className="tkStLine"><b>{thread.last.from==='guardian'?'ولي الأمر: ':'أنت: '}</b>{thread.last.text}</p>
        <div className="tkStActions"><button className="tkAct primary" type="button" onClick={()=>go(`chat/${thread.studentId}`)} aria-label={`فتح محادثة ${thread.name}`}>فتح المحادثة</button></div>
      </StudentCard>)}</div>
      :<Empty>{threads.length?'لا توجد محادثات خلال آخر 7 أيام.':'لم تصل رسائل من أولياء الأمور بعد.'}</Empty>}
    {recent&&hidden>0&&<p className="tkMeta">توجد {hidden} محادثة أقدم. اختر «كل المحادثات» لعرضها.</p>}
    <h2 className="tkH">رسالة إلى ولي أمر</h2>
    <div className="tkActions"><select className="tkSelect" value={pick} onChange={event=>setPick(event.target.value)} aria-label="الطالب"><option value="">اختر الطالب…</option>{home.students.map(student=><option key={student.id} value={student.id}>{student.number}. {student.name}</option>)}</select></div>
    <div className="tkActions" style={{marginTop:'calc(var(--u)*6)'}}><button className="tkBtn" type="button" disabled={!pick} onClick={()=>go(`chat/${pick}`)}>فتح المحادثة</button></div>
    <a className="tkRowBtn" href="/teacher/messages"><span className="tkRowIcon" aria-hidden="true"><IconFolder/></span><span className="tkGrow"><b>الملاحظات المسجلة سابقًا</b><small>ملاحظات المعلم ورسائله المحفوظة في ملفات الطلاب</small></span><IconChevron/></a>
    <p className="tkMeta">الرسائل محفوظة في قاعدة بيانات المنصة ولا تُحذف بمرور الوقت. كل ولي أمر يرى محادثة ابنه فقط.</p>
  </div>;
}
type TeacherThread={messages:ChatMessage[];unread:number;maxLength:number};
function TeacherChatPage({home,studentId,back,refresh}:{home:TeacherHome;studentId:string;back:()=>void;refresh:()=>void}){
  const student=home.students.find(entry=>entry.id===studentId);
  const remote=useRemote<TeacherThread>(student?`thread:${studentId}`:null,()=>api<TeacherThread>(`${AUTOMATION}?action=messages_thread&studentId=${encodeURIComponent(studentId)}`));
  usePolling(remote.reload,20000);
  const unread=remote.data?.unread||0;
  React.useEffect(()=>{
    if(!unread)return;
    void post('messages_mark_read',{studentId}).then(()=>{void remote.reload(true);refresh()}).catch(()=>undefined);
  },[unread,studentId]);// eslint-disable-line react-hooks/exhaustive-deps
  if(!student)return <div className="tkPage"><PageHead title="المحادثة" onBack={back}/><Empty>هذا الطالب غير موجود في قائمة الصف.</Empty></div>;
  const send=async(text:string,clientId:string)=>{await post('message_reply',{studentId,text,clientId});await remote.reload(true)};
  return <div className="tkPage">
    <PageHead title={student.name} subtitle="محادثة ولي الأمر" onBack={back}/>
    {remote.error&&!remote.data?<Failure error={remote.error} role="teacher" onRetry={()=>void remote.reload()}/>:!remote.data?<Loading/>
      :<Chat messages={remote.data.messages} canSend otherLabel="ولي الأمر" send={send} maxLength={remote.data.maxLength}/>}
    <p className="tkMeta">يصل ردّك إلى صفحة هذا الطالب فقط، ويظهر لولي أمره في «التواصل مع المعلم».</p>
  </div>;
}

/* ---------- library ---------- */
type LibraryFile={id:string;title:string;name:string;mimeType:string;category:string;visibility:'public'|'private'|'teacher';targetStudentIds?:string[];size:number;note:string;approvedForAI:boolean;createdAt:string};
const LIBRARY_SECTIONS:[string,string,string,string][]=[['books','الكتب والأدلة','كتب المواد والأدلة المعتمدة','sky'],['worksheets','أوراق العمل','أوراق تدريب حسب المادة والمهارة','green'],['remediation','الخطط العلاجية','خطط للمهارات التي تحتاج تدريبًا','gold'],['weekly','الخطط الأسبوعية','ملفات مرتبطة بالتوزيع وجدول الحصص','purple'],['assessments','نماذج التقييم','نماذج واختبارات قصيرة','sky'],['spelling','الإملاء والخط','تدريبات النسخ والإملاء','green'],['general','مواد تعليمية جاهزة للطباعة','ملفات عامة','gold']];
const FILE_TYPES='.pdf,.jpg,.jpeg,.png,.webp,.txt,.doc,.docx';
const MIME_BY_EXT:Record<string,string>={pdf:'application/pdf',jpg:'image/jpeg',jpeg:'image/jpeg',png:'image/png',webp:'image/webp',txt:'text/plain',doc:'application/msword',docx:'application/vnd.openxmlformats-officedocument.wordprocessingml.document'};
const readBase64=(file:File)=>new Promise<string>((resolve,reject)=>{const reader=new FileReader();reader.onload=()=>resolve(String(reader.result||'').replace(/^data:[^;]*;base64,/,''));reader.onerror=()=>reject(new Error('FILE_READ_FAILED'));reader.readAsDataURL(file)});
function sharingLabel(file:LibraryFile,home:TeacherHome){
  if(file.visibility==='public')return 'لجميع الطلاب';
  if(file.visibility==='teacher')return 'للمعلم فقط';
  const ids=file.targetStudentIds||[];
  return ids.length===1?`لطالب واحد: ${home.students.find(student=>student.id===ids[0])?.name||''}`:`لمجموعة: ${studentsLabel(ids.length)}`;
}
function LibraryPage({home,back,go,toast}:{home:TeacherHome;back:()=>void;go:Go;toast:(text:string,bad?:boolean)=>void}){
  const remote=useRemote<{files:LibraryFile[]}>('library',()=>api('/api/library-files?role=teacher'));
  const [uploading,setUploading]=React.useState(false);
  const files=remote.data?.files||[];
  return <div className="tkPage">
    <PageHead title="الكتب والمكتبة" subtitle="مكتبة المعلم التعليمية" icon={SHAK.logo} onBack={back}/>
    <div className="tkLibTop">
      <button className="tkBtn" type="button" onClick={()=>setUploading(!uploading)} aria-expanded={uploading}>{uploading?'إغلاق الرفع':'＋ رفع ملف'}</button>
      <a className="tkBtn purple" href="/teacher/library?section=portfolio">ملف إنجاز المعلم</a>
    </div>
    {uploading&&<LibraryUpload home={home} onDone={()=>{setUploading(false);void remote.reload(true);toast('رُفع الملف وحُفظ في المكتبة')}} toast={toast}/>}
    <p className="tkScope" style={{marginBottom:'calc(var(--u)*6)'}}>كل ملف تحدد مشاركته عند الرفع: لجميع الطلاب، لطالب أو مجموعة، أو للمعلم فقط.</p>
    {remote.error&&!remote.data?<Failure error={remote.error} role="teacher" onRetry={()=>void remote.reload()}/>:!remote.data?<Loading/>:LIBRARY_SECTIONS.map(([key,title,subtitle,tone])=>{
      const list=files.filter(file=>file.category===key);
      return <section className={`tkLibSec ${tone}`} key={key} aria-label={title}>
        <header><span aria-hidden="true">{key==='books'?<NavBook/>:key==='weekly'?<IconCalendar/>:<IconFolder/>}</span><div><b>{title}</b><small>{subtitle}</small></div><span className="tkBadge">{list.length?`${list.length} ملف`:'فارغ'}</span></header>
        {list.map(file=><div className="tkFile" key={file.id}><div><b>{file.title}</b><small>{sharingLabel(file,home)} · {fileSize(file.size)} · {formatDay(file.createdAt,false)}{file.approvedForAI?' · معتمد للمساعد':''}</small>{file.note&&<small>{file.note}</small>}</div>
          <a className="tkAct primary" href={`/api/library-files?action=download&id=${encodeURIComponent(file.id)}&role=teacher`} aria-label={`فتح أو تنزيل ${file.title}`}>فتح / تنزيل</a></div>)}
        {key==='weekly'&&<button className="tkRowBtn" type="button" onClick={()=>go('plan')}><span className="tkGrow"><b>خطة الأسبوع المنشورة</b><small>تُنشر تلقائيًا من توزيع المنهج</small></span><IconChevron/></button>}
        {key==='remediation'&&<a className="tkRowBtn" href="/teacher/library?section=remediation"><span className="tkGrow"><b>اقتراحات الخطط العلاجية</b><small>مبنية على نتائج التقييم</small></span><IconChevron/></a>}
      </section>;
    })}
  </div>;
}
function LibraryUpload({home,onDone,toast}:{home:TeacherHome;onDone:()=>void;toast:(text:string,bad?:boolean)=>void}){
  const [title,setTitle]=React.useState(''),[category,setCategory]=React.useState('worksheets'),[visibility,setVisibility]=React.useState<'public'|'private'|'teacher'>('teacher');
  const [targets,setTargets]=React.useState<string[]>([]),[file,setFile]=React.useState<File|null>(null),[forAssistant,setForAssistant]=React.useState(false),[busy,setBusy]=React.useState(false);
  const extension=(file?.name.split('.').pop()||'').toLowerCase(),mimeType=file?(file.type||MIME_BY_EXT[extension]||''):'';
  const tooLarge=Boolean(file&&file.size>3_000_000),ready=Boolean(title.trim()&&file&&!tooLarge&&(visibility!=='private'||targets.length));
  const upload=async()=>{
    if(!file||busy||!ready)return;setBusy(true);
    try{
      await api('/api/library-files',{method:'POST',body:{title:title.trim(),name:file.name,mimeType,category,visibility,targetStudentIds:visibility==='private'?targets:[],approvedForAI:forAssistant&&mimeType==='text/plain',base64:await readBase64(file)}});
      onDone();
    }catch(caught){
      const error=asApiError(caught);
      toast(error.code==='FILE_TYPE_NOT_ALLOWED'?'نوع الملف غير مسموح. المسموح: PDF، صور، نص، Word.':error.code==='FILE_TOO_LARGE'||error.status===413?'حجم الملف أكبر من 3 ميجابايت.':error.kind==='offline'?'تعذر الاتصال — لم يُرفع الملف.':`تعذر رفع الملف (${error.code}).`,true);
    }finally{setBusy(false)}
  };
  return <section className="tkBox blue">
    <div className="tkBoxHead"><div><b>رفع ملف إلى المكتبة</b><small>PDF أو صورة أو نص أو Word — حتى 3 ميجابايت</small></div></div>
    <label className="tkField">عنوان الملف<input value={title} onChange={event=>setTitle(event.target.value)} placeholder="مثال: ورقة عمل اللام الشمسية"/></label>
    <label className="tkField">القسم<select className="tkSelect" value={category} onChange={event=>setCategory(event.target.value)}>{LIBRARY_SECTIONS.map(([key,label])=><option key={key} value={key}>{label}</option>)}</select></label>
    <label className="tkField">الملف<input type="file" accept={FILE_TYPES} onChange={event=>setFile(event.target.files?.[0]||null)}/></label>
    {tooLarge&&<div className="tkAlert" style={{marginTop:0,marginBottom:'calc(var(--u)*7)'}}>حجم الملف أكبر من 3 ميجابايت.</div>}
    <div className="tkField" style={{marginBottom:'calc(var(--u)*4)'}}>المشاركة</div>
    <div className="tkSeg three" role="group" aria-label="المشاركة">{([['public','جميع الطلاب'],['private','طالب أو مجموعة'],['teacher','المعلم فقط']] as const).map(([key,label])=><button key={key} type="button" className={visibility===key?'on':''} aria-pressed={visibility===key} onClick={()=>setVisibility(key)}>{label}</button>)}</div>
    {visibility==='private'&&<div className="tkChecks" role="group" aria-label="الطلاب">{home.students.map(student=><label key={student.id}><input type="checkbox" checked={targets.includes(student.id)} onChange={event=>setTargets(current=>event.target.checked?[...current,student.id]:current.filter(id=>id!==student.id))}/>{student.name}</label>)}</div>}
    {mimeType==='text/plain'&&<label className="tkCheckLine"><input type="checkbox" checked={forAssistant} onChange={event=>setForAssistant(event.target.checked)}/>اسمح لمساعد المعلم «شكابمبو» بالاعتماد على نص هذا الملف</label>}
    <button className="tkBtn wide" type="button" disabled={busy||!ready} onClick={()=>void upload()}>{busy?'جارٍ الرفع…':'رفع الملف'}</button>
  </section>;
}

/* ---------- «شكابمبو — مساعد المعلم» ---------- */
type ProviderKey='openai'|'gemini';
type AssistFacts={subjectKey:SubjectKey;label:string;holiday:boolean;unit:string;lesson:string;skill:string;page:number|null;pageNote:string};
type AssistStatus={
  provider:ProviderKey|'';providers:Record<ProviderKey,{label:string;note:string;configured:boolean;model:string;keyEnv:string}>;
  usage:{used:number;limit:number};tasks:{key:string;label:string}[];maxLength:number;books:{indexed:boolean;note:string};
  context:{grade:string;term:string;week:number;currentWeek:number;termWeeks:number;subjects:AssistFacts[]};
};
type AssistSource={grade:string;week:number;label:string;unit:string;lesson:string;skill:string;page:number|null;pageNote:string;holiday:boolean;files:string[]};
type AssistEntry={id:string;task:string;question:string;answer:string;provider:string;model:string;truncated:boolean;source:AssistSource};
function assistFailure(error:ApiError){
  const detail=error.data?.detail?` (${error.data.detail})`:'';
  if(error.code==='REQUEST_STOPPED')return 'أُوقف التوليد.';
  if(error.code==='ASSISTANT_NOT_CONFIGURED')return `غير مفعّل: لم يُضبط مفتاح الربط ${error.data?.keyEnv||''} في إعدادات الخادم.`;
  if(error.code==='ASSISTANT_DAILY_LIMIT')return `بلغت حد الاستخدام اليومي (${error.data?.limit||''} طلبًا). يتجدد غدًا.`;
  if(error.code==='ASSISTANT_TIMEOUT')return 'انتهت المهلة قبل وصول الإجابة. حاول مرة أخرى.';
  if(error.code==='ASSISTANT_KEY_REJECTED')return `رفض المزوّد مفتاح الربط${detail}. يراجعه مسؤول الموقع في إعدادات الخادم.`;
  if(error.code==='ASSISTANT_PROVIDER_LIMIT')return `المزوّد يرفض الطلبات الآن لتجاوز حد الاستخدام لديه${detail}.`;
  if(error.code==='ASSISTANT_REQUEST_REJECTED')return `رفض المزوّد الطلب${detail}.`;
  if(error.code==='ASSISTANT_BLOCKED')return 'حجب المزوّد هذا الطلب.';
  if(error.code==='ASSISTANT_EMPTY_ANSWER')return 'لم يُرجع المزوّد إجابة.';
  if(error.code==='QUESTION_TOO_LONG')return 'النص أطول من الحد المسموح.';
  if(error.code==='TEXT_REQUIRED')return 'اكتب سؤالك أولًا.';
  if(error.kind==='offline')return 'تعذر الاتصال بالخادم.';
  if(error.kind==='unauthorized')return 'انتهت جلسة المعلم. سجّل الدخول من جديد.';
  return `تعذر الحصول على إجابة (${error.code})${detail}.`;
}
function AssistantPage({home,back,log,setLog}:{home:TeacherHome;back:()=>void;log:AssistEntry[];setLog:React.Dispatch<React.SetStateAction<AssistEntry[]>>}){
  const [week,setWeek]=React.useState<number|null>(null),[subjectKey,setSubjectKey]=React.useState<SubjectKey>('arabic');
  const remote=useRemote<AssistStatus>(`assistant:${week??'current'}`,()=>api<AssistStatus>(`${AUTOMATION}?action=assistant_status${week?`&week=${week}`:''}`));
  const [chosen,setChosen]=React.useState<ProviderKey|''>(''),[question,setQuestion]=React.useState(''),[working,setWorking]=React.useState(''),[problem,setProblem]=React.useState('');
  const abort=React.useRef<AbortController|null>(null),input=React.useRef<HTMLTextAreaElement>(null);
  React.useEffect(()=>()=>abort.current?.abort(),[]);
  const status=remote.data,provider=(chosen||status?.provider||'') as ProviderKey|'';
  const info=provider&&status?status.providers[provider]:null,facts=status?.context.subjects.find(item=>item.subjectKey===subjectKey)||null;
  const pick=async(key:ProviderKey)=>{
    setChosen(key);setProblem('');
    try{await post('assistant_provider',{provider:key})}catch(caught){setProblem(`تعذر حفظ اختيار المزوّد (${asApiError(caught).code}).`)}
  };
  const ask=async(task:string)=>{
    if(working||!provider||!info?.configured||!status)return;
    const text=question.trim();
    if(task==='general'&&!text){setProblem('اكتب سؤالك في الخانة ثم اضغط «اسأل سؤالًا عامًا».');input.current?.focus();return}
    setWorking(task);setProblem('');abort.current=new AbortController();
    try{
      const result=await api<AssistEntry&{usage:{used:number;limit:number}}>(AUTOMATION,{method:'POST',signal:abort.current.signal,body:{action:'assistant_ask',provider,task,subjectKey,week:status.context.week,question:text}});
      setLog(current=>[{id:newRequestId(),task,question:text,answer:result.answer,provider:result.provider,model:result.model,truncated:result.truncated,source:result.source},...current].slice(0,20));
      setQuestion('');remote.setData(current=>current?{...current,usage:result.usage}:current);
    }catch(caught){setProblem(assistFailure(asApiError(caught)));void remote.reload(true)}
    finally{setWorking('');abort.current=null}
  };
  const copy=async(text:string)=>{try{await navigator.clipboard.writeText(text)}catch{/* clipboard unavailable */}};
  const taskLabel=(key:string)=>status?.tasks.find(task=>task.key===key)?.label||key;
  return <div className="tkPage">
    <PageHead title="شكابمبو — مساعد المعلم" subtitle={`${home.teacher.classLabel} · يعتمد على توزيع المنهج وخطة الأسبوع`} onBack={back}/>
    <div className="tkAssistHead"><img src={SHAK.logo} alt="شكابمبو" width={306} height={320}/><div><b>مساعدك في التحضير والشرح</b><small>إجاباته مقترحات تراجعها أنت. لا ينشر واجبًا ولا يعدّل تقييمًا ولا يرسل رسالة.</small></div></div>
    {remote.error&&!status?<Failure error={remote.error} role="teacher" onRetry={()=>void remote.reload()}/>:!status?<Loading/>:<>
      <h2 className="tkH">المزوّد<small>يُرسل الطلب إلى المزوّد المختار فقط</small></h2>
      <div className="tkProviders" role="radiogroup" aria-label="مزوّد الذكاء الاصطناعي">{(['openai','gemini'] as ProviderKey[]).map(key=>{const item=status.providers[key];return <button key={key} type="button" role="radio" aria-checked={provider===key} className={`tkProvider ${provider===key?'on':''}`} onClick={()=>void pick(key)}>
        <b>{item.label}</b><small>{item.note}</small><i className={item.configured?'ok':''}>{item.configured?'مفعّل':'غير مفعّل'}</i></button>})}</div>
      {!provider&&<div className="tkAlert info" style={{marginTop:0}}>اختر المزوّد الذي تريد سؤاله.</div>}
      {info&&!info.configured&&<div className="tkAlert" role="alert" style={{marginTop:0}}>{info.label} غير مفعّل: لم يُضبط مفتاح الربط <span className="num">{info.keyEnv}</span> في إعدادات الخادم. يضبطه مسؤول الموقع، ولا يُكتب المفتاح في هذه الصفحة. اشتراك ChatGPT أو Gemini الشخصي لا يكفي؛ يلزم مفتاح API من المزوّد.</div>}
      <h2 className="tkH">السياق من بيانات النظام<small>{status.context.grade}</small></h2>
      <div className="tkPair">
        <label className="tkField" style={{marginBottom:0}}>المادة<select className="tkSelect" value={subjectKey} onChange={event=>setSubjectKey(event.target.value as SubjectKey)}>{SUBJECT_ORDER.map(key=><option key={key} value={key}>{SUBJECT_LABEL[key]}</option>)}</select></label>
        <label className="tkField" style={{marginBottom:0}}>الأسبوع<select className="tkSelect" value={status.context.week} onChange={event=>setWeek(Number(event.target.value))}>{Array.from({length:status.context.termWeeks},(_,index)=>index+1).map(value=><option key={value} value={value}>الأسبوع {value}{value===status.context.currentWeek?' — الحالي':''}</option>)}</select></label>
      </div>
      {facts&&<section className="tkBox green"><dl className="tkFacts">
        {facts.holiday?<Fact label="الأسبوع">إجازة — لا يوجد درس جديد</Fact>:<>
          {facts.unit&&<Fact label={facts.subjectKey==='quran'?'السورة':'الوحدة'}>{facts.unit}</Fact>}
          <Fact label={facts.subjectKey==='quran'?'المطلوب':'الدرس'}>{facts.lesson||'غير مسجل'}</Fact>
          <Fact label="المهارة">{facts.skill||'غير مسجلة'}</Fact>
          <Fact label="الصفحة">{facts.page?<><span className="num">{facts.page}</span> — {facts.pageNote}</>:'غير متوفرة في ملفات المنهج'}</Fact></>}
      </dl></section>}
      <label className="tkField">سؤالك أو توضيح إضافي (اختياري مع الأزرار)<textarea ref={input} value={question} maxLength={status.maxLength} onChange={event=>setQuestion(event.target.value)} placeholder="مثال: ركّز على الطلاب الذين يخلطون بين التنوين والنون"/></label>
      <div className="tkQuick" role="group" aria-label="إجراءات سريعة">{status.tasks.map(task=><button key={task.key} type="button" disabled={Boolean(working)||!info?.configured} onClick={()=>void ask(task.key)}>{task.label}</button>)}</div>
      {working&&<div className="tkWorking" role="status"><span>جارٍ توليد الإجابة: {taskLabel(working)}…</span><button className="tkBtn ghost" type="button" onClick={()=>abort.current?.abort()}>إيقاف</button></div>}
      {problem&&<div className="tkAlert" role="alert" style={{marginTop:0,marginBottom:'calc(var(--u)*6)'}}>{problem}</div>}
      {log.map(entry=><article className="tkAnswer" key={entry.id}>
        <h3>{taskLabel(entry.task)}</h3>
        {entry.question&&<p className="tkAsk">{entry.question}</p>}
        <div className="tkText">{entry.answer}</div>
        {entry.truncated&&<div className="tkAlert info" style={{marginTop:0}}>توقفت الإجابة عند حد الطول.</div>}
        <div className="tkSrc"><b>اعتمد على بيانات النظام: </b>{entry.source.label} · الأسبوع {entry.source.week}{entry.source.holiday?' · إجازة':<>{entry.source.lesson?` · الدرس: ${entry.source.lesson}`:''}{entry.source.skill?` · المهارة: ${entry.source.skill}`:''}{entry.source.page?` · الصفحة ${entry.source.page} (${entry.source.pageNote})`:' · رقم الصفحة غير متوفر'}</>}{entry.source.files.length>0&&` · ملفات المكتبة: ${entry.source.files.join('، ')}`}</div>
        <footer><span>{entry.provider==='openai'?'OpenAI':'Google Gemini'} · <span className="num">{entry.model}</span> · مقترح للمعلم</span><button className="tkMini" type="button" onClick={()=>void copy(entry.answer)}>نسخ</button></footer>
      </article>)}
      {!log.length&&!working&&<Empty>اختر إجراءً سريعًا أو اكتب سؤالك. تبقى إجابات هذه الجلسة هنا حتى تغلق الصفحة.</Empty>}
      <p className="tkMeta">الاستخدام اليوم: <span className="num">{status.usage.used}/{status.usage.limit}</span> طلبًا. لا تُرسل أسماء الطلاب ولا تقييماتهم إلى المزوّد. {status.books.note}</p>
    </>}
  </div>;
}

/* ---------- more ---------- */
function MorePage({home,environment,back,go,onSignedOut}:{home:TeacherHome;environment:string;back:()=>void;go:Go;onSignedOut:()=>void}){
  const run=home.automation.today;
  const signOut=async()=>{try{await post('logout')}finally{onSignedOut()}};
  const links:[string,string,string][]=[['/teacher/students','ملفات الطلاب والتواصل','الملاحظات، الرسائل، السلوك، ملف كل طالب'],['/teacher/followup','يحتاجون متابعة','الطلاب الذين يحتاجون متابعة وأسبابها'],['/teacher/announcements','الإعلانات','إنشاء ومراجعة إعلانات الفصل'],['/teacher/settings','الإعدادات','بيانات الفصل والمواد']];
  return <div className="tkPage">
    <PageHead title="المزيد" subtitle={`${home.teacher.name} · ${home.teacher.school}`} onBack={back}/>
    <div className="tkList">
      <button className="tkRow" type="button" onClick={()=>go('messages')}><span className="tkRowIcon" aria-hidden="true"><IconMessage/></span><span className="tkGrow"><b>الرسائل</b><small>محادثات أولياء الأمور</small></span>{home.summary.messages>0&&<span className="tkUnread num">{home.summary.messages}</span>}<IconChevron/></button>
      <button className="tkRow" type="button" onClick={()=>go('library')}><span className="tkRowIcon green" aria-hidden="true"><IconFolder/></span><span className="tkGrow"><b>الكتب والمكتبة</b><small>الكتب، أوراق العمل، الخطط العلاجية، ملف الإنجاز</small></span><IconChevron/></button>
      <button className="tkRow" type="button" onClick={()=>go('assistant')}><img src={SHAK.logo} alt="" aria-hidden="true"/><span className="tkGrow"><b>شكابمبو — مساعد المعلم</b><small>شرح الدرس، أنشطة، تدريبات وأسئلة تقييم</small></span><IconChevron/></button>
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
