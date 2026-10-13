import {pilotRequested,StudentLearningPilot,StudentAnnouncementsPilot,usePilotAnnouncements} from './learning-pilot';
// Student / guardian pages in the mandatory reference design: header, weekly plan, assessment, homework, stars and the
// bottom bar (الرئيسية — الفصول — النجوم — حسابي). Every card and its detail page read the same server payload.
import React from 'react';
import boy from './assets/boy.webp';
import gift from './assets/gift.webp';
import {
  api,asApiError,BottomNav,Card,CardsSkeleton,CARD_ICON,Chat,ChatMessage,Check,countLabel,Cta,Empty,Fact,Failure,fileSize,formatDay,formatStamp,greeting,gregorianDate,gregorianRange,Header,hijriDate,hijriRange,IconChevron,IconFolder,IconGear,IconHeart,IconMessage,IconSpark,IconStar,IconTarget,IconTrophy,riyadhClock,
  Loading,NavBook,NavHome,NavHomeLine,NavStar,NavUser,PageHead,Pill,Plan,PlanDates,PlanSubject,planStamp,Result,RESULT_LABEL,Screen,SHAK,SubjectImg,SubjectKey,subjectIcon,SUBJECT_LABEL,
  useHashRoute,useNow,usePolling,useRemote,useToast
} from './kit';

type Homework={id:string;displayTitle?:string;subjectKey:string;subjectLabel:string;title:string;lesson:string;segment:string;skill:string;page:number|null;exercise:string;task:string;kind:string;source:string;publishedAt:string;publishedDate:string;dueDate:string;status:string;done:boolean;completedAt:string;confirmedBy:string;teacherApprovedAt:string};
type AssessmentItem={subjectKey:SubjectKey;label:string;short:string;week:number;skill:string;lesson:string;holiday?:boolean;status:Result|null;updatedAt:string};
type QuranWeek={week:number;surah:string;title:string;description:string;range:string;kind:string;status:Result|null;updatedAt:string};
type Home={
  role:'teacher'|'guardian';
  student:{id:string;name:string;firstName:string;number:number;classLabel:string;classShort:string;school:string;termLabel:string;photo:string;hobbies:string[]};
  today:{date:string;weekday:number;weekdayLabel:string;schoolDay:boolean};
  week:{number:number;label:string;termWeeks:number;range:{start:string;end:string}};
  plan:Plan;
  assessment:{week:number;items:AssessmentItem[];history:{subjectKey:SubjectKey;label:string;week:number|null;skill:string;lesson:string;status:Result;updatedAt:string}[]};
  homework:{today:Homework[];pending:Homework[];countToday:number;doneToday:number;doneRecent:number};
  stars:{count:number;goal:number;log:{id:string;stars:number;label:string;createdAt:string}[]};
  quran:{currentWeek:number;current:QuranWeek|null;counts:Record<Result,number>;assessedWeeks:number;pastWeeks:number;totalWeeks:number;upcoming:QuranWeek[];weeks:QuranWeek[]};
  notes:{id:string;reason:string;summary:string;createdAt:string}[];
  announcements:{id:string;title:string;body:string;date:string;updatedAt:string;hasImage:boolean}[];
  teacherName:string;
  messages:{total:number;unread:number;canSend:boolean};
};

const query=new URLSearchParams(location.search);
const STUDENT_ID=query.get('studentId')||'';
const INVITE=query.get('invite')||query.get('inviteToken')||'';
const accessQuery=`studentId=${encodeURIComponent(STUDENT_ID)}${INVITE?`&invite=${encodeURIComponent(INVITE)}`:''}${pilotRequested?'&pilot=1':''}`;

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
  const announcements=usePilotAnnouncements();
  const home=useRemote<Home>(STUDENT_ID?`home:${STUDENT_ID}`:null,()=>api<Home>(`/api/student-state?view=home&${accessQuery}`));
  const [busy,setBusy]=React.useState<string>('');
  // Moving between pages picks up what changed on the other site, without reloading on every tap.
  const refreshIfOlder=home.refreshIfOlder;
  React.useEffect(()=>refreshIfOlder(20000),[route,refreshIfOlder]);

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

  const tab=route==='achievements'?'file':route==='chat'?'chat':route==='settings'?'settings':route==='announcements'?'announcements':'home';
  const nav=<BottomNav label="تنقل الطالب" variant={pilotRequested?"stu pilot":"stu"} active={tab} items={[
    {key:'home',label:'الرئيسية',icon:<FillHome/>,onClick:()=>go('')},
    {key:'file',label:'ملف الإنجاز',icon:<FillFolder/>,onClick:()=>go('achievements')},
    {key:'chat',label:'الرسائل',icon:<FillChat/>,badge:home.data?.messages.unread||0,onClick:()=>go('chat')},
    ...(pilotRequested?[{key:'announcements',label:'الإعلانات',icon:<IconMessage/>,badge:announcements.data?.unread||0,onClick:()=>go('announcements')}]:[]),
    {key:'settings',label:'الإعدادات',icon:<FillGear/>,onClick:()=>go('settings')}
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
  }else if(pilotRequested&&route==='learning')body=<StudentLearningPilot back={back}/>;
  else if(pilotRequested&&route==='announcements')body=<StudentAnnouncementsPilot back={back} resource={announcements}/>;
  else if(route==='plan')body=<PlanPage home={data} back={back} go={go}/>;
  else if(route==='assessment')body=<AssessmentPage home={data} back={back} go={go}/>;
  else if(route==='homework')body=<HomeworkPage home={data} back={back} toggle={toggleHomework} busy={busy}/>;
  else if(route.startsWith('subject/'))body=<SubjectPage home={data} subjectKey={route.slice(8) as SubjectKey} back={back} toggle={toggleHomework} busy={busy}/>;
  else if(route==='stars')body=<StarsPage home={data} back={back}/>;
  else if(route==='weeks')body=<WeeksPage home={data} back={back} go={go}/>;
  else if(route.startsWith('week/'))body=<WeekPage home={data} week={Number(route.slice(5))} back={back}/>;
  else if(route==='me')body=<AccountPage home={data} back={back} go={go} reload={()=>void home.reload(true)} toast={showToast}/>;
  else if(route==='hobbies')body=<HobbiesPage home={data} back={back} reload={()=>void home.reload(true)} toast={showToast}/>;
  else if(route==='goals')body=<GoalsPage home={data} back={back}/>;
  else if(route==='achievements')body=<AchievementsPage home={data} back={back}/>;
  else if(route==='skills')body=<SkillsPage home={data} back={back}/>;
  else if(route==='quran')body=<QuranPage home={data} back={back} go={go}/>;
  else if(route==='quran-log')body=<QuranLogPage home={data} back={back}/>;
  else if(route==='chat')body=<ChatPage home={data} back={back} reload={()=>void home.reload(true)}/>;
  else if(route==='files')body=<FilesPage back={back}/>;
  else if(route==='settings')body=<SettingsPage home={data} back={back} go={go} reload={()=>void home.reload(true)} toast={showToast}/>;
  else body=<HomeScreen home={data} go={go} reload={()=>void home.reload(true)} toast={showToast}/>;

  return <Screen nav={nav}>{body}{toast}</Screen>;
}

type Go=(route:string)=>void;
type HomeTab='homework'|'plan'|'assessment'|'stars';
const SV=(props:React.SVGProps<SVGSVGElement>)=><svg viewBox="0 0 24 24" aria-hidden="true" {...props}/>;
const line={fill:'none',stroke:'currentColor',strokeWidth:1.9,strokeLinecap:'round' as const,strokeLinejoin:'round' as const};
const UserIcon=()=><SV {...line} strokeWidth={2}><circle cx="12" cy="8" r="4"/><path d="M4.5 20.5c.6-4 3.6-6 7.5-6s6.9 2 7.5 6"/></SV>;
const TabPlan=()=><SV {...line}><rect x="3.5" y="5" width="17" height="15" rx="3"/><path d="M3.5 10h17M8 3v4M16 3v4"/><path d="M8 14h.01M12 14h.01M16 14h.01M8 17h.01M12 17h.01" strokeWidth={2.6}/></SV>;
const TabHomework=()=><SV {...line}><path d="M6.5 3.5h7l4.5 4.5v12a1.5 1.5 0 0 1-1.5 1.5h-10A1.5 1.5 0 0 1 5 20V5a1.5 1.5 0 0 1 1.5-1.5Z"/><path d="M13.5 3.5V8H18M8.5 12.5h7M8.5 16h7"/></SV>;
const TabAssess=()=><SV {...line}><path d="M5 20V12M12 20V5M19 20v-9"/><path d="M3 20.5h18"/></SV>;
const TabStar=({on}:{on:boolean})=><SV fill={on?'#ffd45a':'#f5b21e'} stroke={on?'#fff':'#e39b0b'} strokeWidth={1.4} strokeLinejoin="round"><path d="m12 3.3 2.6 5.3 5.9.9-4.3 4.1 1 5.8-5.2-2.7-5.2 2.7 1-5.8L3.5 9.5l5.9-.9Z"/></SV>;
const FillHome=()=><SV fill="currentColor"><path d="M12.9 2.9a1.4 1.4 0 0 0-1.8 0L3.2 9.8c-.4.4-.7.9-.7 1.5v8.2c0 1.1.9 2 2 2h4.2c.5 0 .9-.4.9-.9v-4.3c0-.6.4-1 1-1h2c.6 0 1 .4 1 1v4.3c0 .5.4.9.9.9h4.2c1.1 0 2-.9 2-2v-8.2c0-.6-.3-1.1-.7-1.5Z"/></SV>;
const FillFolder=()=><SV fill="currentColor"><path d="M3 7.5A2.5 2.5 0 0 1 5.5 5H9l2 2.2h7.5A2.5 2.5 0 0 1 21 9.7v8.8a2.5 2.5 0 0 1-2.5 2.5h-13A2.5 2.5 0 0 1 3 18.5Z"/></SV>;
const FillChat=()=><SV fill="currentColor"><path d="M12 3C6.8 3 3 6.4 3 10.8c0 2.4 1.2 4.5 3.1 5.9L5.5 20.5l3.8-1.9c.9.2 1.7.3 2.7.3 5.2 0 9-3.4 9-7.8S17.2 3 12 3Z"/><path d="M8.5 11h.01M12 11h.01M15.5 11h.01" stroke="#fff" strokeWidth={2.4} strokeLinecap="round"/></SV>;
const FillGear=()=><SV fill="currentColor"><path d="M10.5 2.5h3l.6 2.5c.5.2 1 .5 1.5.8l2.4-.8 1.5 2.6-1.9 1.7c.1.5.1 1 0 1.5l1.9 1.7-1.5 2.6-2.4-.8c-.5.3-1 .6-1.5.8l-.6 2.5h-3l-.6-2.5c-.5-.2-1-.5-1.5-.8l-2.4.8-1.5-2.6 1.9-1.7a5 5 0 0 1 0-1.5L4.6 7.6 6.1 5l2.4.8c.5-.3 1-.6 1.5-.8Z"/><circle cx="12" cy="10" r="2.6" fill="#fff"/></SV>;
const ChevronBack=()=><SV {...line} strokeWidth={2.6}><path d="M15 5 8 12l7 7"/></SV>;
// This week's homework, newest need first: what is still open and due soonest leads, finished work follows.
function weekHomework(home:Home){
  const seen=new Set<string>(),list:Homework[]=[];
  for(const item of [...home.homework.today,...home.homework.pending])if(!seen.has(item.id)){seen.add(item.id);list.push(item)}
  return list.sort((a,b)=>Number(a.done)-Number(b.done)||String(a.dueDate||'9999').localeCompare(String(b.dueDate||'9999')));
}
const gradeLine=(student:Home['student'])=>{const [grade,section]=String(student.classShort||'').split('/').map(part=>part.trim());return grade?`الصف ${grade} الابتدائي${section?` / ${section}`:''}`:student.classLabel};
function HomeScreen({home,go,reload,toast}:{home:Home;go:Go;reload:()=>void;toast:(text:string,bad?:boolean)=>void}){
  const [tab,setTab]=React.useState<HomeTab>('homework');
  const {plan,assessment,stars,student}=home,photo=usePhotoPicker(reload,toast);
  const list=weekHomework(home);
  const percent=Math.max(0,Math.min(100,Math.round(stars.count/Math.max(1,stars.goal)*100)));
  return <>
    <section className="tkMe" aria-label="ملف الطالب">
      <div className="tkMeText"><b>{student.name}</b><span>{gradeLine(student)}</span><span>{student.school}</span>
        <button className="tkMeStars" type="button" onClick={()=>setTab('stars')} aria-label={`${stars.count} نجمة`}><img src={SHAK.star} alt="" aria-hidden="true"/><b className="num">{stars.count}</b><span>نجمة</span></button></div>
      <button className={`tkMePhoto ${student.photo?'custom':''}`} type="button" onClick={photo.open} disabled={photo.busy} aria-label="تغيير صورتي"><img src={student.photo||SHAK.logo} alt=""/></button>
      {photo.field}
    </section>
    <div className="tkTabs" role="tablist" aria-label="أقسام الصفحة الرئيسية">
      {([['plan','الخطة الأسبوعية',<TabPlan key="i"/>],['homework','الواجبات',<TabHomework key="i"/>],['assessment','التقييم',<TabAssess key="i"/>],['stars','النجوم',<TabStar key="i" on={tab==='stars'}/>]] as [HomeTab,string,React.ReactNode][]).map(([key,label,icon])=>
        <button key={key} type="button" role="tab" id={`tab-${key}`} aria-selected={tab===key} aria-controls="tkTabBody" className={`tkTab ${tab===key?'on':''}`} onClick={()=>setTab(key)}>{icon}<b>{label}</b></button>)}
    </div>
    <section id="tkTabBody" role="tabpanel" aria-labelledby={`tab-${tab}`}>
      {tab==='homework'&&<>
        <div className="tkHwList">
          {list.map(item=><button key={item.id} type="button" className={`tkHw ${item.done?'done':''}`} onClick={()=>go('homework')} aria-label={`${item.subjectLabel}: ${item.displayTitle||item.title} — ${item.done?'مكتمل':'لم يبدأ'}`}>
            <span className="tkHwIcon"><SubjectImg subject={item.subjectKey} size={52}/></span>
            <span className="tkHwMain"><b>{item.subjectLabel}</b><span>{item.displayTitle||item.title}</span>{item.dueDate&&<small>التسليم: {formatDay(item.dueDate)}</small>}</span>
            <span className={`tkHwState ${item.done?'done':'fresh'}`}><i aria-hidden="true">{item.done?<SV fill="none" stroke="#fff" strokeWidth={3.4} strokeLinecap="round" strokeLinejoin="round"><path d="m5 12.5 4.5 4.5L19 7"/></SV>:<SV fill="none" stroke="#fff" strokeWidth={3.4} strokeLinecap="round"><path d="M12 5v14M5 12h14"/></SV>}</i>{item.done?'مكتمل':'لم يبدأ'}</span>
          </button>)}
          {!list.length&&<p className="tkPanelEmpty">{home.today.schoolDay?'لا توجد واجبات هذا الأسبوع.':'لا يوجد واجب اليوم — إجازة.'}</p>}
        </div>
      </>}
      {tab==='plan'&&<>
        <p className="tkPanelDates"><span>{hijriRange(plan.range)}</span><span>{gregorianRange(plan.range)}</span></p>
        <div className="tkHwList">
          {plan.holiday?<p className="tkPanelEmpty">إجازة هذا الأسبوع — لا توجد دروس جديدة.</p>
          :!plan.published&&!plan.fromDistribution?<p className="tkPanelEmpty">خطة هذا الأسبوع قيد النشر، وستظهر هنا تلقائيًا.</p>
          :plan.items.map(item=><button key={item.subjectKey} type="button" className="tkHw slim" onClick={()=>go(`subject/${item.subjectKey}`)} aria-label={`${item.label}: ${item.summary}`}>
            <span className="tkHwIcon"><SubjectImg subject={item.subjectKey} size={48}/></span>
            <span className="tkHwMain"><b>{item.label}</b><span>{item.summary||'—'}</span></span><ChevronBack/></button>)}
        </div>
        <button className="tkPanelCta" type="button" onClick={()=>go('plan')}>عرض الخطة كاملة بالتاريخين</button>
      </>}
      {tab==='assessment'&&<>
        <div className="tkHwList">
          {assessment.items.map(item=><button key={item.subjectKey} type="button" className="tkHw slim" onClick={()=>go('assessment')} aria-label={`${item.label}: ${item.status?RESULT_LABEL[item.status]:'لم يُقيّم بعد'}`}>
            <span className="tkHwIcon"><SubjectImg subject={item.subjectKey} size={48}/></span>
            <span className="tkHwMain"><b>{item.label}</b><span>{item.skill||'—'}</span></span><Pill status={item.status}/></button>)}
        </div>
        <button className="tkPanelCta" type="button" onClick={()=>go('assessment')}>عرض التقييم كاملًا</button>
      </>}
      {tab==='stars'&&<>
        <div className="tkStarBox"><img src={SHAK.trophy} alt="" aria-hidden="true"/><div><p><b className="num">{stars.count}</b> من <span className="num">{stars.goal}</span> نجمة</p>
          <div className="tkGoldBar" role="progressbar" aria-valuemin={0} aria-valuemax={stars.goal} aria-valuenow={stars.count} aria-label="تقدم النجوم"><i style={{width:`${percent}%`}}/></div>
          <small>المكافأة القادمة عند <span className="num">{stars.goal}</span> نجمة</small></div></div>
        <div className="tkHwList">
          {stars.log.slice(0,8).map(row=><div key={row.id} className="tkStarRow"><img src={SHAK.star} alt="" aria-hidden="true"/><div><b>{row.label}</b><small>{formatStamp(row.createdAt)}</small></div><b className="tkStarPlus num">{row.stars>0?'+':''}{row.stars}</b></div>)}
          {!stars.log.length&&<p className="tkPanelEmpty">لا توجد نجوم مسجلة بعد.</p>}
        </div>
      </>}
    </section>
    <button className="tkAskCard" type="button" onClick={()=>go(pilotRequested?'learning':'chat')}>
      <span className="tkAskPic"><img src={SHAK.logo} alt="" aria-hidden="true"/></span>
      <span className="tkAskText"><b>{pilotRequested?'شكابمبو':'مساعدي الذكي'}</b><small>{pilotRequested?'تعلّم، تدرّب، وأكمل من حيث توقفت':'اشرح لي الواجب أو ساعدني في الحل'}</small></span><ChevronBack/>
    </button>
    {!pilotRequested&&home.announcements?.length>0&&<section id="tkNotices" className="tkAlert info" aria-label="إعلانات الفصل" style={{margin:'calc(var(--u)*10) calc(var(--u)*12) 0'}}>
      <b>📣 إعلانات الفصل</b>
      {home.announcements.map(item=><div key={item.id} style={{marginTop:'calc(var(--u)*7)'}}>
        {item.hasImage&&<img src={`/api/student-state?view=announcement-image&id=${encodeURIComponent(item.id)}&${accessQuery}`} alt="صورة الإعلان" style={{display:'block',width:'100%',maxHeight:'calc(var(--u)*260)',objectFit:'contain',borderRadius:'calc(var(--u)*12)',marginBottom:'calc(var(--u)*7)',background:'#f6f8fb'}}/>}
        <strong>{item.title}</strong>
        {item.body&&<p style={{margin:'3px 0 0'}}>{item.body}</p>}
        {item.date&&<small className="num">{item.date}</small>}
      </div>)}
    </section>}
    <button className="tkRowBtn out" type="button" onClick={()=>{const fn=(window as any).taallamtInstallPage;if(typeof fn==='function')void fn();else alert('من قائمة المتصفح اختر إضافة إلى الشاشة الرئيسية')}}><span className="tkRowIcon" aria-hidden="true"><IconSpark/></span><span className="tkGrow"><b>حفظ الصفحة على الجوال</b><small>أضف صفحة الطالب إلى الشاشة الرئيسية بنفس الرابط</small></span><IconChevron/></button>
  </>;
}

function PlanPage({home,back,go}:{home:Home;back:()=>void;go:Go}){
  const plan=home.plan;
  return <div className="tkPage">
    <PageHead title="الخطة الأسبوعية" subtitle={`${home.week.label} · بالتاريخ الهجري والميلادي`} icon={CARD_ICON.plan} onBack={back}/>
    <PlanDates plan={plan}/>
    {!plan.items.length&&<Empty>لم تُضف دروس لهذا الأسبوع بعد.</Empty>}
    {plan.items.map(item=><PlanSubject key={item.subjectKey} item={item} start={plan.range.start}/>)}
    <p className="tkMeta">{plan.items.length?planStamp(plan):'الخطة غير مكتملة — بانتظار إضافة الدروس'}</p>
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
    <PageHead title={SUBJECT_LABEL[subjectKey]||planItem.label} subtitle={`الأسبوع ${home.plan.week}`} icon={subjectIcon(subjectKey)} onBack={back}/>
    <h2 className="tkH">خطة الأسبوع</h2>
    <PlanDates plan={home.plan} compact/>
    {home.plan.published||home.plan.holiday?<PlanSubject item={planItem} start={home.plan.range.start}/>:<Empty>خطة هذا الأسبوع قيد النشر.</Empty>}
    <h2 className="tkH">تقييم مهارة الأسبوع</h2>
    <div className="tkRow"><div className="tkGrow"><b>{assessment?.skill||planItem.skill||'—'}</b>{assessment?.status&&assessment.updatedAt&&<small>{formatStamp(assessment.updatedAt)}</small>}</div><Pill status={assessment?.status||null}/></div>
    <h2 className="tkH">واجبات المادة</h2>
    {homework.length?homework.map(item=><HomeworkBox key={item.id} item={item} toggle={toggle} busy={busy}/>):<Empty>لا يوجد واجب حالي في هذه المادة.</Empty>}
  </div>;
}

function StarsPage({home,back}:{home:Home;back:()=>void}){
  const {count,goal,log}=home.stars,left=Math.max(0,goal-count),percent=Math.max(0,Math.min(100,Math.round(count/Math.max(1,goal)*100)));
  return <div className="tkPage">
    <PageHead title="النجوم" subtitle="إنجازاتك وتحفيزك هذا الشهر" icon={CARD_ICON.stars} onBack={back}/>
    <section className="tkBox purple">
      <div className="tkBigStars"><img src={CARD_ICON.stars} alt="" aria-hidden="true"/><div><b className="num">{count}</b> <span>من <span className="num">{goal}</span> نجمة</span><p className="tkMeta" style={{textAlign:'right',margin:0}}>{left?`بقي ${left} للوصول إلى المكافأة القادمة`:'وصلت إلى المكافأة — أحسنت!'}</p></div></div>
      <div className="tkStarsMeter"><div className="tkBar" role="progressbar" aria-valuemin={0} aria-valuemax={goal} aria-valuenow={count} aria-label="تقدم النجوم"><i style={{width:`${percent}%`}}/></div>
        <p><span>التقدم: <span className="num">{percent}%</span></span><span>المكافأة القادمة عند <span className="num">{goal}</span> نجمة</span></p></div>
      <div className="tkStarGrid" aria-hidden="true">{Array.from({length:goal},(_,index)=><i key={index} className={index<count?'on':''}><IconStar/></i>)}</div>
    </section>
    <section className="tkTrophy" aria-label="شكابمبو يحمل كأس النجوم">
      <img src={SHAK.trophy} alt="شكابمبو واقفًا يحمل كأسًا ذهبيًا" loading="lazy" width={570} height={760}/>
      <b>{left?`واصل يا ${home.student.firstName}!`:`مبارك يا ${home.student.firstName}!`}</b>
      <span>{left?`اجمع ${left} ${left===1?'نجمة':left===2?'نجمتين':left<=10?'نجوم':'نجمة'} لتصل إلى الكأس.`:'جمعت نجوم الشهر كلها.'}</span>
    </section>
    <h2 className="tkH">سجل النجوم</h2>
    {log.length?<div className="tkList">{log.map(entry=><div className="tkRow" key={entry.id}><div className="tkGrow"><b>{entry.label}</b><small>{formatStamp(entry.createdAt)}</small></div><span className={`tkDelta num ${entry.stars<0?'minus':''}`}>{entry.stars>0?`+${entry.stars}`:entry.stars}</span></div>)}</div>:<Empty>لم تُسجَّل نجوم هذا الشهر بعد. النجوم يمنحها المعلم.</Empty>}
  </div>;
}

/* ---------- conversation with the teacher ---------- */
type Thread={messages:ChatMessage[];unread:number;canSend:boolean;teacherName:string;maxLength:number};
function ChatPage({home,back,reload}:{home:Home;back:()=>void;reload:()=>void}){
  const remote=useRemote<Thread>(`chat:${STUDENT_ID}`,()=>api<Thread>(`/api/student-state?view=messages&${accessQuery}`));
  usePolling(remote.reload,20000);
  const thread=remote.data,unread=thread?.unread||0,canSend=Boolean(thread?.canSend);
  // Opening the conversation marks the teacher's messages as read (only with the guardian's own link).
  React.useEffect(()=>{
    if(!unread||!canSend)return;
    void api('/api/student-state',{method:'POST',body:{studentId:STUDENT_ID,action:'messages_read',invite:INVITE}}).then(()=>{void remote.reload(true);reload()}).catch(()=>undefined);
  },[unread,canSend]);// eslint-disable-line react-hooks/exhaustive-deps
  const send=async(text:string,clientId:string)=>{
    await api('/api/student-state',{method:'POST',body:{studentId:STUDENT_ID,action:'message_send',invite:INVITE,text,clientId}});
    await new Promise(resolve=>window.setTimeout(resolve,800+Math.floor(Math.random()*1001)));
    await remote.reload(true);
  };
  return <div className="tkPage">
    <PageHead title="التواصل مع المعلم" subtitle={`${home.teacherName} · ${home.student.name}`} onBack={back}/>
    {remote.error&&!thread?<Failure error={remote.error} role="student" onRetry={()=>void remote.reload()}/>:!thread?<Loading/>
      :<Chat messages={thread.messages} canSend={thread.canSend} otherLabel={home.teacherName} send={send} maxLength={thread.maxLength}
        blockedNote="أنت تعاين صفحة الطالب بجلسة المعلم دون رابط ولي الأمر، لذلك تُعرض المحادثة للقراءة فقط. للرد افتح «الرسائل» من صفحة المعلم."/>}
    <p className="tkMeta">تصل رسالتك إلى معلم الصف فقط، ولا يراها أحد من الطلاب أو أولياء الأمور الآخرين.</p>
  </div>;
}
/* ---------- files the teacher shared with this student ---------- */
type SharedFile={id:string;title:string;name:string;category:string;size:number;createdAt:string;note:string};
const FILE_KIND:Record<string,string>={books:'كتاب أو دليل',worksheets:'ورقة عمل',remediation:'خطة علاجية',weekly:'خطة أسبوعية',assessments:'نموذج تقييم',spelling:'الإملاء والخط',general:'ملف تعليمي'};
function FilesPage({back}:{back:()=>void}){
  const remote=useRemote<{files:SharedFile[]}>(`files:${STUDENT_ID}`,()=>api(`/api/library-files?role=student&${accessQuery}`));
  const files=(remote.data?.files||[]).filter(file=>file.category!=='teacher-portfolio');
  return <div className="tkPage">
    <PageHead title="ملفاتي من المعلم" subtitle="الكتب وأوراق العمل التي شاركها المعلم" onBack={back}/>
    {remote.error?<Failure error={remote.error} role="student" onRetry={()=>void remote.reload()}/>:!remote.data?<Loading/>
      :files.length?<section className="tkLibSec sky">{files.map(file=><div className="tkFile" key={file.id}><div><b>{file.title}</b><small>{FILE_KIND[file.category]||'ملف'} · {fileSize(file.size)} · {formatDay(file.createdAt,false)}</small>{file.note&&<small>{file.note}</small>}</div>
        <a className="tkAct primary" href={`/api/library-files?action=download&id=${encodeURIComponent(file.id)}&role=student&${accessQuery}`}>تنزيل</a></div>)}</section>
      :<Empty>لم يشارك المعلم ملفات معك بعد.</Empty>}
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
    <PageHead title={`الأسبوع ${week}`} subtitle={home.student.termLabel} icon={CARD_ICON.plan} onBack={back}/>
    {remote.error?<Failure error={remote.error} role="student" onRetry={()=>void remote.reload()}/>:!remote.data?<Loading/>:<>
      <PlanDates plan={remote.data.plan}/>
      {remote.data.plan.items.map(item=><PlanSubject key={item.subjectKey} item={item} start={remote.data!.plan.range.start} action={(()=>{const result=results.find(entry=>entry.subjectKey===item.subjectKey);return result?<Pill status={result.status}/>:undefined})()}/>)}
      <p className="tkMeta">{planStamp(remote.data.plan)}</p></>}
  </div>;
}

/* ---------- student profile (حسابي) ---------- */
type Skill={subjectKey:SubjectKey;label:string;week:number|null;skill:string;status:Result};
// Every assessed skill, newest first; the current week comes from the same list the assessment card shows.
function assessedSkills(home:Home):Skill[]{
  const current=home.assessment.items.filter(item=>item.status).map(item=>({subjectKey:item.subjectKey,label:item.label,week:item.week,skill:item.skill,status:item.status as Result}));
  const older=home.assessment.history.filter(entry=>!current.some(item=>item.subjectKey===entry.subjectKey&&item.week===entry.week));
  return [...current,...older];
}
const HOBBY_OPTIONS=['القراءة','الرسم','التلوين','كرة القدم','السباحة','ركوب الدراجة','القصص','الحفظ','الألعاب التركيبية','الأشغال اليدوية','التقنية والروبوت','الزراعة','الجري','التصوير','الألعاب الذهنية'];
const saveProfile=(body:Record<string,unknown>)=>api('/api/student-state',{method:'POST',body:{studentId:STUDENT_ID,action:'student_profile',invite:INVITE,...(pilotRequested&&STUDENT_ID==='__shakabumbo_demo__'?{pilot:true,demoSession:query.get('demoSession')}:{}),...body}});
// The chosen picture is cropped to a small square in the browser before it is saved.
function squarePhoto(file:File):Promise<string>{
  return new Promise((resolve,reject)=>{
    const url=URL.createObjectURL(file),image=new Image();
    image.onload=()=>{
      const size=256,canvas=document.createElement('canvas'),side=Math.min(image.naturalWidth,image.naturalHeight);
      canvas.width=size;canvas.height=size;
      const context=canvas.getContext('2d');URL.revokeObjectURL(url);
      if(!context||!side){reject(new Error('PHOTO_INVALID'));return}
      context.drawImage(image,(image.naturalWidth-side)/2,(image.naturalHeight-side)/2,side,side,0,0,size,size);
      resolve(canvas.toDataURL('image/jpeg',.82));
    };
    image.onerror=()=>{URL.revokeObjectURL(url);reject(new Error('PHOTO_INVALID'))};
    image.src=url;
  });
}
// Saves a picture chosen from the device as the student's own picture.
function usePhotoPicker(reload:()=>void,toast:(text:string,bad?:boolean)=>void){
  const input=React.useRef<HTMLInputElement>(null),[busy,setBusy]=React.useState(false);
  const fail=(caught:unknown)=>{const error=asApiError(caught);toast(error.code==='PHOTO_INVALID'||error.code==='PHOTO_TOO_LARGE'?'تعذر استخدام هذه الصورة. اختر صورة أخرى.':error.kind==='offline'?'تعذر الاتصال — لم تُحفظ الصورة.':'تعذر حفظ الصورة.',true)};
  const onChange=async(event:React.ChangeEvent<HTMLInputElement>)=>{
    const file=event.target.files?.[0];event.target.value='';if(!file||busy)return;setBusy(true);
    try{await saveProfile({photoDataUrl:await squarePhoto(file)});toast('حُفظت صورتك');reload()}catch(caught){fail(caught)}finally{setBusy(false)}
  };
  const remove=async()=>{if(busy)return;setBusy(true);try{await saveProfile({removePhoto:true});toast('عادت صورة شكابمبو');reload()}catch(caught){fail(caught)}finally{setBusy(false)}};
  const field=<input ref={input} type="file" accept="image/*" hidden onChange={event=>void onChange(event)} aria-label="اختيار صورة"/>;
  return {busy,open:()=>input.current?.click(),remove,field};
}
// The student's header: picture, name, class, school, today's dates and the four profile tiles.
function ProfileCard({home,go,reload,toast,top=false}:{home:Home;go:Go;reload:()=>void;toast:(text:string,bad?:boolean)=>void;top?:boolean}){
  const student=home.student,now=useNow(),photo=usePhotoPicker(reload,toast);
  const skills=assessedSkills(home),mastered=skills.filter(item=>item.status==='mastered').length,goals=skills.filter(item=>item.status!=='mastered');
  const tiles:[string,string,React.ReactNode,string,string][]=[
    ['hobbies','هواياتي',<IconHeart/>,student.hobbies.length?student.hobbies.slice(0,2).join(' · '):'أضف هواياتك','green'],
    ['goals','أهدافي',<IconTarget/>,goals.length?countLabel(goals.length,'مهارة أتدرب عليها','مهارتان أتدرب عليهما','مهارات أتدرب عليها','مهارة أتدرب عليها'):'حافظ على مستواك','blue'],
    ['achievements','إنجازاتي',<IconTrophy/>,`${home.stars.count} نجمة · ${mastered} مهارة`,'gold'],
    ['skills','مهاراتي',<IconSpark/>,skills.length?countLabel(skills.length,'مهارة مقيّمة','مهارتان مقيّمتان','مهارات مقيّمة','مهارة مقيّمة'):'لم تُقيّم بعد','purple']
  ];
  return <section className={`tkProfile ${top?'top':''}`} aria-label="ملف الطالب">
    <button className="tkGear" type="button" onClick={()=>go('settings')} aria-label="الإعدادات"><IconGear/></button>
    <div className="tkProfileTop">
      <button className={`tkPhoto ${student.photo?'custom':''}`} type="button" onClick={photo.open} disabled={photo.busy} aria-label="تغيير صورتي">
        <img src={student.photo||SHAK.sourati} alt={student.photo?'صورتي':'شكابمبو — صورتي'}/>{student.photo&&<span>صورتي</span>}
      </button>
      {photo.field}
      <dl className="tkProfileText">
        <div><dt>اسم الطالب:</dt><dd>{student.name}</dd></div>
        <div><dt>الصف:</dt><dd>{student.classShort}</dd></div>
        <p>{student.school}</p>
      </dl>
    </div>
    <p className="tkProfileDate"><span dir="rtl">{hijriDate(now)}</span><i aria-hidden="true">•</i><span dir="rtl">{gregorianDate(now)}</span><i aria-hidden="true">•</i><span dir="rtl">{riyadhClock(now)}</span></p>
    <div className="tkProfileTiles">{tiles.map(([route,label,icon,preview,tone])=><button key={route} type="button" className={`tkProfileTile ${tone}`} onClick={()=>go(route)}><b>{icon}{label}</b><small>{preview}</small></button>)}</div>
  </section>;
}
function AccountPage({home,back,go,reload,toast}:{home:Home;back:()=>void;go:Go;reload:()=>void;toast:(text:string,bad?:boolean)=>void}){
  const student=home.student;
  return <div className="tkPage">
    <PageHead title="حسابي" subtitle="ملفي التعريفي" onBack={back}/>
    <ProfileCard home={home} go={go} reload={reload} toast={toast}/>
    <div className="tkList">
      <button className="tkRow" type="button" onClick={()=>go('settings')}><span className="tkRowIcon" aria-hidden="true"><IconGear/></span><span className="tkGrow"><b>الإعدادات</b><small>صورتي وهواياتي</small></span><IconChevron/></button>
      <button className="tkRow" type="button" onClick={()=>go('chat')}><span className="tkRowIcon" aria-hidden="true"><IconMessage/></span><span className="tkGrow"><b>التواصل مع المعلم</b><small>{home.messages.unread?countLabel(home.messages.unread,'رسالة جديدة','رسالتان جديدتان','رسائل جديدة','رسالة جديدة'):'رسائلك مع المعلم'}</small></span>{home.messages.unread>0&&<span className="tkUnread num">{home.messages.unread}</span>}<IconChevron/></button>
      <button className="tkRow" type="button" onClick={()=>go('files')}><span className="tkRowIcon green" aria-hidden="true"><IconFolder/></span><span className="tkGrow"><b>ملفاتي من المعلم</b><small>الكتب وأوراق العمل المشاركة معك</small></span><IconChevron/></button>
      <button className="tkRow" type="button" onClick={()=>go('quran')}><img src={subjectIcon('quran')} alt="" aria-hidden="true"/><span className="tkGrow"><b>متابعة حفظ القرآن الكريم</b><small>الأسبوع الحالي وسجل الحفظ</small></span><IconChevron/></button>
      <button className="tkRow" type="button" onClick={()=>go('assessment')}><img src={CARD_ICON.assessment} alt="" aria-hidden="true"/><span className="tkGrow"><b>تقييماتي وملاحظات المعلم</b><small>{home.notes.length?countLabel(home.notes.length,'ملاحظة واحدة','ملاحظتان','ملاحظات','ملاحظة'):'لا توجد ملاحظات'}</small></span><IconChevron/></button>
      <button className="tkRow" type="button" onClick={()=>go('weeks')}><img src={CARD_ICON.plan} alt="" aria-hidden="true"/><span className="tkGrow"><b>خطط الأسابيع السابقة</b><small>{student.termLabel}</small></span><IconChevron/></button>
    </div>
    <p className="tkMeta">{home.role==='teacher'?'أنت تعاين صفحة الطالب بجلسة المعلم.':'هذه الصفحة خاصة بالطالب وولي أمره، وتُفتح من رابط الطالب فقط.'}</p>
  </div>;
}
function SettingsPage({home,back,go,reload,toast}:{home:Home;back:()=>void;go:Go;reload:()=>void;toast:(text:string,bad?:boolean)=>void}){
  const student=home.student,photo=usePhotoPicker(reload,toast);
  return <div className="tkPage">
    <PageHead title="الإعدادات" subtitle={student.name} onBack={back}/>
    <h2 className="tkH">صورتي</h2>
    <section className="tkBox"><div className="tkSettingsPhoto">
      <span className={`tkPhoto ${student.photo?'custom':''}`}><img src={student.photo||SHAK.sourati} alt={student.photo?'صورتي':'شكابمبو — صورتي'}/></span>
      <div className="tkActions">
        <button className="tkBtn" type="button" disabled={photo.busy} onClick={photo.open}>{photo.busy?'جارٍ الحفظ…':'تغيير الصورة'}</button>
        {student.photo&&<button className="tkBtn ghost" type="button" disabled={photo.busy} onClick={()=>void photo.remove()}>إزالة صورتي</button>}
      </div>
      {photo.field}
    </div>
    <p className="tkMeta" style={{textAlign:'right'}}>{student.photo?'تظهر صورتك في رأس صفحتك وعند معلمك فقط.':'الصورة الحالية هي شكابمبو. اختر صورة من الجهاز لتظهر في رأس صفحتك.'}</p></section>
    <h2 className="tkH">ملفي</h2>
    <div className="tkList">
      <button className="tkRow" type="button" onClick={()=>go('me')}><span className="tkRowIcon" aria-hidden="true"><UserIcon/></span><span className="tkGrow"><b>حسابي</b><small>بياناتي وإدارة ملفي</small></span></button>
      <button className="tkRow" type="button" onClick={()=>go('hobbies')}><span className="tkRowIcon green" aria-hidden="true"><IconHeart/></span><span className="tkGrow"><b>هواياتي</b><small>{student.hobbies.length?student.hobbies.join(' · '):'لم تختر هواياتك بعد'}</small></span><IconChevron/></button>
      <div className="tkRow"><span className="tkGrow"><b>الاسم والصف والمدرسة</b><small>{student.name} · {student.classShort} · {student.school}</small><small>يعدّلها المعلم فقط.</small></span></div>
    </div>
    <p className="tkMeta">{home.role==='teacher'?'أنت تعاين صفحة الطالب بجلسة المعلم.':'هذه الصفحة تُفتح من رابط الطالب الخاص. لا تشارك الرابط مع غير ولي الأمر.'}</p>
  </div>;
}
function HobbiesPage({home,back,reload,toast}:{home:Home;back:()=>void;reload:()=>void;toast:(text:string,bad?:boolean)=>void}){
  const [chosen,setChosen]=React.useState<string[]>(home.student.hobbies),[busy,setBusy]=React.useState(false);
  const options=[...new Set([...HOBBY_OPTIONS,...home.student.hobbies])];
  const toggle=(hobby:string)=>setChosen(current=>current.includes(hobby)?current.filter(item=>item!==hobby):current.length>=12?current:[...current,hobby]);
  const save=async()=>{
    setBusy(true);
    try{await saveProfile({hobbies:chosen});toast('حُفظت هواياتك');reload();back()}
    catch(caught){toast(asApiError(caught).kind==='offline'?'تعذر الاتصال — لم تُحفظ الهوايات.':'تعذر حفظ الهوايات.',true)}finally{setBusy(false)}
  };
  return <div className="tkPage">
    <PageHead title="هواياتي" subtitle="اختر هواياتك، ويمكن اختيار أكثر من هواية" onBack={back}/>
    <div className="tkHobbies" role="group" aria-label="الهوايات">{options.map(hobby=><button key={hobby} type="button" className={`tkChip ${chosen.includes(hobby)?'on':''}`} aria-pressed={chosen.includes(hobby)} onClick={()=>toggle(hobby)}>{hobby}</button>)}</div>
    <div className="tkActions" style={{marginTop:'calc(var(--u)*10)'}}><button className="tkBtn wide green" type="button" disabled={busy} onClick={()=>void save()}>{busy?'جارٍ الحفظ…':'حفظ هواياتي'}</button></div>
  </div>;
}
function SkillRow({item}:{item:Skill}){
  return <div className="tkRow"><img src={subjectIcon(item.subjectKey)} alt="" aria-hidden="true"/><div className="tkGrow"><b>{item.skill||item.label}</b><small>{item.label}{item.week?` · الأسبوع ${item.week}`:''}</small></div><Pill status={item.status}/></div>;
}
function GoalsPage({home,back}:{home:Home;back:()=>void}){
  const goals=assessedSkills(home).filter(item=>item.status!=='mastered'),pending=home.homework.pending.length+home.homework.today.filter(item=>!item.done).length;
  return <div className="tkPage">
    <PageHead title="أهدافي" subtitle="ما أتدرّب عليه الآن" onBack={back}/>
    <h2 className="tkH">مهارات أتدرب عليها<small>{goals.length}</small></h2>
    {goals.length?<div className="tkList">{goals.map((item,index)=><SkillRow key={`${item.subjectKey}-${item.week}-${index}`} item={item}/>)}</div>:<Empty>لا توجد مهارة تحتاج تدريبًا الآن — حافظ على مستواك.</Empty>}
    <h2 className="tkH">واجباتي</h2>
    <div className="tkRow"><img src={CARD_ICON.homework} alt="" aria-hidden="true"/><div className="tkGrow"><b>{pending?countLabel(pending,'واجب واحد لم يُنجز','واجبان لم يُنجزا','واجبات لم تُنجز','واجبًا لم يُنجز'):'أنجزت كل واجباتي'}</b><small>أنجز واجباتي في وقتها</small></div></div>
    <div className="tkRow" style={{marginTop:'calc(var(--u)*5)'}}><img src={CARD_ICON.stars} alt="" aria-hidden="true"/><div className="tkGrow"><b>{Math.max(0,home.stars.goal-home.stars.count)} نجمة للوصول إلى المكافأة</b><small>رصيدي {home.stars.count} من {home.stars.goal}</small></div></div>
    <p className="tkMeta">الأهداف تُستخرج من تقييم المعلم وواجباتك، وتتغير تلقائيًا.</p>
  </div>;
}
function AchievementsPage({home,back}:{home:Home;back:()=>void}){
  const skills=assessedSkills(home),mastered=skills.filter(item=>item.status==='mastered');
  const tiles:[string,number,string][]=[['نجمة هذا الشهر',home.stars.count,'purple'],['مهارة أتقنتها',mastered.length,'green'],['أسبوع حفظ متقن',home.quran.counts.mastered,'blue'],['واجب أنجزته هذا الأسبوع',home.homework.doneRecent,'gold']];
  return <div className="tkPage">
    <PageHead title="إنجازاتي" subtitle="ما حققته حتى الآن" onBack={back}/>
    <div className="tkAchieve">{tiles.map(([label,value,tone])=><div key={label} className={tone}><b className="num">{value}</b><span>{label}</span></div>)}</div>
    <h2 className="tkH">مهارات أتقنتها<small>{mastered.length}</small></h2>
    {mastered.length?<div className="tkList">{mastered.map((item,index)=><SkillRow key={`${item.subjectKey}-${item.week}-${index}`} item={item}/>)}</div>:<Empty>ستظهر هنا المهارات التي يسجّل المعلم إتقانك لها.</Empty>}
  </div>;
}
function SkillsPage({home,back}:{home:Home;back:()=>void}){
  const skills=assessedSkills(home),waiting=home.assessment.items.filter(item=>!item.status&&!item.holiday&&item.skill);
  return <div className="tkPage">
    <PageHead title="مهاراتي" subtitle="المهارات التي قيّمها المعلم" onBack={back}/>
    {skills.length?<div className="tkList">{skills.map((item,index)=><SkillRow key={`${item.subjectKey}-${item.week}-${index}`} item={item}/>)}</div>:<Empty>لم يقيّم المعلم مهاراتك بعد.</Empty>}
    {waiting.length>0&&<><h2 className="tkH">مهارات هذا الأسبوع<small>لم تُقيّم بعد</small></h2><div className="tkList">{waiting.map(item=><div className="tkRow" key={item.subjectKey}><img src={subjectIcon(item.subjectKey)} alt="" aria-hidden="true"/><div className="tkGrow"><b>{item.skill}</b><small>{item.label}</small></div><Pill status={null}/></div>)}</div></>}
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
