import React from 'react';
import {createRoot} from 'react-dom/client';
import './ui.css';

const RAW='https://raw.githubusercontent.com/tssjiil-max/taallamt-download/build/taallamt-flex-v1/public';
const asset=(p:string)=>`${RAW}/${p}`;

const studentName=()=>{try{const p=JSON.parse(localStorage.getItem('studentProfile')||'{}');return p.name||localStorage.getItem('studentName')||'أحمد'}catch{return localStorage.getItem('studentName')||'أحمد'}};
const go=(p:string)=>{history.pushState({},'',p);location.reload()};
const scrollToId=(id:string)=>document.getElementById(id)?.scrollIntoView({behavior:'smooth',block:'start'});

type IconName='home'|'people'|'books'|'more'|'message'|'alert'|'star'|'clock'|'calendar'|'sprout'|'play'|'curriculum'|'assessment'|'chat'|'chart'|'target'|'tasks'|'megaphone'|'user'|'edit'|'heart'|'trophy'|'gift'|'check'|'chevron';
function UiIcon({name,size=24,className=''}:{name:IconName;size?:number;className?:string}){
  const common={width:size,height:size,viewBox:'0 0 24 24',fill:'none',stroke:'currentColor',strokeWidth:1.9,strokeLinecap:'round' as const,strokeLinejoin:'round' as const,'aria-hidden':true,className:`uiIcon ${className}`};
  switch(name){
    case 'home': return <svg {...common}><path d="M3 10.8 12 3l9 7.8"/><path d="M5.5 9.5V21h13V9.5"/><path d="M9.5 21v-6h5v6"/></svg>;
    case 'people': return <svg {...common}><circle cx="9" cy="8" r="3"/><circle cx="16.5" cy="9" r="2.5"/><path d="M3.5 20c.5-4 2.7-6 5.5-6s5 2 5.5 6"/><path d="M14 15c3.5-.7 5.8 1.1 6.5 4.5"/></svg>;
    case 'books': return <svg {...common}><path d="M4 5.5c3.2-.8 5.8.1 8 2v12c-2.2-1.9-4.8-2.8-8-2z"/><path d="M20 5.5c-3.2-.8-5.8.1-8 2v12c2.2-1.9 4.8-2.8 8-2z"/></svg>;
    case 'more': return <svg {...common}><circle cx="5" cy="12" r="1.5" fill="currentColor" stroke="none"/><circle cx="12" cy="12" r="1.5" fill="currentColor" stroke="none"/><circle cx="19" cy="12" r="1.5" fill="currentColor" stroke="none"/></svg>;
    case 'message': return <svg {...common}><rect x="3" y="5" width="18" height="14" rx="2"/><path d="m4 7 8 6 8-6"/></svg>;
    case 'alert': return <svg {...common}><circle cx="12" cy="12" r="9" fill="currentColor" stroke="none" opacity=".13"/><path d="M12 7v6"/><path d="M12 17h.01"/></svg>;
    case 'star': return <svg {...common} fill="currentColor" stroke="currentColor"><path d="m12 2.8 2.75 5.6 6.18.9-4.47 4.35 1.06 6.15L12 16.9l-5.52 2.9 1.06-6.15L3.07 9.3l6.18-.9z"/></svg>;
    case 'clock': return <svg {...common}><circle cx="12" cy="12" r="9"/><path d="M12 7v5l3.2 2"/></svg>;
    case 'calendar': return <svg {...common}><rect x="3" y="5" width="18" height="16" rx="2"/><path d="M8 3v4M16 3v4M3 10h18"/></svg>;
    case 'sprout': return <svg {...common}><path d="M12 21v-9"/><path d="M12 13c-5 0-7-3-7-7 4 0 7 2 7 7Z"/><path d="M12 11c0-5 3-7 7-7 0 4-2 7-7 7Z"/></svg>;
    case 'play': return <svg {...common} fill="currentColor" stroke="none"><path d="m8 5 11 7-11 7z"/></svg>;
    case 'curriculum': return <svg {...common}><path d="M4 5c3.1-.8 5.8.1 8 2v12c-2.2-1.9-4.9-2.8-8-2z"/><path d="M20 5c-3.1-.8-5.8.1-8 2v12c2.2-1.9 4.9-2.8 8-2z"/></svg>;
    case 'assessment': return <svg {...common}><rect x="5" y="4" width="14" height="17" rx="2"/><path d="M9 3h6v4H9z"/><path d="m8.5 13 2 2 4.5-5"/></svg>;
    case 'chat': return <svg {...common}><path d="M4 5h16v11H9l-5 4z"/><path d="M8 9h8M8 12h5"/></svg>;
    case 'chart': return <svg {...common}><path d="M4 20V10h4v10M10 20V5h4v15M16 20v-7h4v7"/></svg>;
    case 'target': return <svg {...common}><circle cx="12" cy="12" r="8"/><circle cx="12" cy="12" r="4"/><path d="m13 11 7-7M16 4h4v4"/></svg>;
    case 'tasks': return <svg {...common}><rect x="5" y="4" width="14" height="17" rx="2"/><path d="M9 3h6v4H9z"/><path d="m8 12 1.5 1.5L12 11M8 17l1.5 1.5L12 16M14 12h2M14 17h2"/></svg>;
    case 'megaphone': return <svg {...common}><path d="m3 11 13-5v12L3 13z"/><path d="M16 9c2 0 4 1.3 4 3s-2 3-4 3"/><path d="m6 14 2 6h3l-2-7"/></svg>;
    case 'user': return <svg {...common}><circle cx="12" cy="8" r="4"/><path d="M4.5 21c.8-5 3.5-7 7.5-7s6.7 2 7.5 7"/></svg>;
    case 'edit': return <svg {...common}><path d="m4 20 4.2-1 10-10-3.2-3.2-10 10z"/><path d="m13.8 7 3.2 3.2"/></svg>;
    case 'heart': return <svg {...common} fill="currentColor" stroke="none"><path d="M12 21s-8-4.7-8-11a4.5 4.5 0 0 1 8-2.8A4.5 4.5 0 0 1 20 10c0 6.3-8 11-8 11Z"/></svg>;
    case 'trophy': return <svg {...common}><path d="M8 4h8v5c0 4-1.8 6-4 6s-4-2-4-6z"/><path d="M8 6H4v2c0 3 2 4 4 4M16 6h4v2c0 3-2 4-4 4M12 15v4M8 21h8"/></svg>;
    case 'gift': return <svg {...common}><rect x="3" y="9" width="18" height="12" rx="1"/><path d="M12 9v12M3 13h18M12 9H8.5A2.5 2.5 0 1 1 11 6.5Zm0 0h3.5A2.5 2.5 0 1 0 13 6.5Z"/></svg>;
    case 'check': return <svg {...common}><path d="m5 12 4 4 10-10"/></svg>;
    case 'chevron': return <svg {...common}><path d="m14 6-6 6 6 6"/></svg>;
  }
}

function Brand({student=false}:{student?:boolean}){return <div className={`brand ${student?'brandStudent':''}`}>
  <div className="brandLine"><UiIcon name="books" size={38}/><strong>تعلّمت</strong><span className="brandSpark">✦</span></div>
  <small>معًا نصنع جيلاً أفضل</small>
</div>}

function BoyAvatar({small=false}:{small?:boolean}){return <div className={`boyAvatar ${small?'small':''}`} aria-label="صورة الطالب">
  <span className="boyHair"/><span className="boyFace"><i className="eye e1"/><i className="eye e2"/><i className="smile"/></span><span className="boyNeck"/><span className="boyShirt"/>
</div>}

function SubjectIcon({kind}:{kind:'quran'|'islamic'|'lughati'|'writing'}){
 const map={quran:'guardian-icons/quran.svg',islamic:'guardian-icons/islamic.svg',lughati:'guardian-icons/lughati.svg',writing:'subject-icons/handwriting.svg'} as const;
 return <img className={`subjectIcon ${kind}`} src={asset(map[kind])} alt="" aria-hidden="true"/>;
}

function Mascot({className=''}:{className?:string}){return <img className={`mascot ${className}`} src={asset('teacher-icons/shakabumbo-logo.svg')} alt="شكابمبو"/>}

function App(){return location.pathname.startsWith('/student')?<Student/>:<Teacher/>}

function Teacher(){
 const subjects=[
  {k:'lughati' as const,t:'لغتي',p:32},
  {k:'quran' as const,t:'القرآن الكريم',p:25},
  {k:'islamic' as const,t:'الدراسات الإسلامية',p:28},
  {k:'writing' as const,t:'الإملاء والخط',p:30},
 ];
 return <main className="screen teacher" dir="rtl">
  <header className="tHero">
    <div className="mosqueSky" aria-hidden="true"><span className="minaret m1"/><span className="dome d1"/><span className="minaret m2"/><span className="dome d2"/><span className="minaret m3"/><span className="dome d3"/></div>
    <div className="teacherTop">
      <div className="teacherIdentity"><button className="teacherAvatar" onClick={()=>go('/student')} aria-label="صفحة الطالب"><UiIcon name="user" size={28}/></button><div><b>أ. سلطان الصاعدي</b><span>مدرسة عمرو بن أوس الثقفي</span><span>الصف: الثاني / 4</span></div></div>
      <Brand/>
    </div>
    <span className="teacherCredit">برمجة: سلطان الصاعدي</span>
    <div className="teacherMeta">
      <div className="metaPill"><UiIcon name="calendar" size={16}/>1 سبتمبر 2026 م</div>
      <div className="metaPill"><UiIcon name="calendar" size={16}/>4 ربيع الأول 1448 هـ</div>
      <div className="metaPill metaQuote"><UiIcon name="sprout" size={19}/>كل خطوة في التعليم ... تصنع فرقًا كبيرًا</div>
    </div>
  </header>

  <section className="tStats" aria-label="ملخص اليوم">
    <TeacherStat tone="blue" icon="message" title="رسائل جديدة" value="3"/>
    <TeacherStat tone="red" icon="alert" title="يحتاجون متابعة" value="6"/>
    <TeacherStat tone="gold" icon="star" title="تم تقييم اليوم" value="24"/>
    <TeacherStat tone="green" icon="people" title="عدد الطلاب" value="30"/>
  </section>

  <section className="nowCard">
    <div className="nowHeading"><h2><UiIcon name="clock" size={27}/>حصتي الآن</h2><div className="timePills"><span>10:00 - 10:45</span><b>الحصة 3</b></div></div>
    <div className="nowBody">
      <button className="startLesson" onClick={()=>alert('تم بدء الحصة')}><UiIcon name="play" size={23}/>ابدأ الحصة</button>
      <div className="lessonDetails"><h3><SubjectIcon kind="islamic"/>الدراسات الإسلامية</h3><p>الوحدة الثانية: أخلاق المسلم</p><p>الدرس: بر الوالدين</p><p><b>المهارات:</b> يبين صور بر الوالدين – يستنتج أثر البر في حياة المسلم</p></div>
    </div>
  </section>

  <section className="tQuick" id="teacher-actions">
    <Quick icon="curriculum" title="المناهج" subtitle="الوحدات والدروس" onClick={()=>alert('المناهج')}/>
    <Quick icon="people" title="الطلاب" subtitle="إدارة بيانات الطلاب" onClick={()=>go('/student')}/>
    <Quick icon="assessment" title="التقييم الشامل" subtitle="أكاديمي وسلوك" onClick={()=>alert('التقييم الشامل')}/>
    <Quick icon="chat" title="التواصل" subtitle="رسائل أولياء الأمور" onClick={()=>alert('التواصل')}/>
  </section>

  <section className="teacherPanels">
    <Panel title="تقدم المنهج" icon="chart" action="عرض الكل">
      <div className="overallProgress"><div className="ring"><span>28%</span><small>من الفصل الأول</small></div><div className="courseList">{subjects.map(s=><CourseProgress key={s.t} {...s}/>)}</div></div>
    </Panel>
    <Panel title="متابعة اليوم" icon="target" action="عرض الكل">
      <StatusLine tone="red" label="يحتاجون متابعة" value="6"/>
      <StatusLine tone="green" label="ممتازون اليوم" value="18"/>
      <StatusLine tone="gold" label="لم يتم تقييمهم" value="4"/>
      <StatusLine tone="gray" label="ملاحظات سلوكية" value="2"/>
    </Panel>
    <Panel title="مهامي اليوم" icon="tasks" action="عرض الكل">
      <ChecklistItem text="إدخال تقييم لغتي - الوحدة 2"/><ChecklistItem text="مراجعة خطط علاجية (3 طلاب)"/><ChecklistItem text="إرسال واجبات الدراسات"/>
    </Panel>
    <Panel title="الإعلانات" icon="megaphone" action="عرض الكل">
      <div className="announcement"><span className="announcementDot"/><div><b>اجتماع أولياء الأمور يوم الأحد</b><small>2026 - 09 - 05</small></div></div>
    </Panel>
  </section>
  <TeacherNav/>
 </main>
}

function Student(){
 const name=studentName();
 const first=name.split(' ')[0]||'أحمد';
 return <main className="screen student" dir="rtl">
  <header className="sHero">
    <div className="studentLeaves" aria-hidden="true"/>
    <div className="studentWelcome"><BoyAvatar small/><div><b>مرحبًا {first}</b><span>الصف الثاني / 4</span></div></div>
    <div className="studentMascotWrap"><div className="mascotBubble">أنت رائع<br/>كل يوم<br/>خطوة للأمام</div><Mascot className="heroMascot"/></div>
    <Brand student/>
  </header>

  <section className="studentProfile">
    <h2><UiIcon name="user" size={24}/>ملف الطالب</h2>
    <div className="studentProfileMain">
      <div className="profileIdentity"><div className="profileAvatarWrap"><BoyAvatar/><button aria-label="تعديل"><UiIcon name="edit" size={16}/></button></div><div className="profileText"><div className="profileQuote">أتعلم<br/>وأصنع مستقبلي<br/>المشرق!</div><b>{first}</b><span>الصف الثاني / 4</span></div></div>
      <div className="profileWidgets">
        <div className="starToday"><div className="starIcon"><UiIcon name="star" size={43}/></div><div><b>نجمي اليوم</b><strong>12 / 30</strong><div className="miniBar"><i style={{width:'40%'}}/></div></div></div>
        <div className="miniCards"><div><b><UiIcon name="heart" size={17}/>هواياتي</b><span>القراءة　 الرسم</span></div><div><b><UiIcon name="trophy" size={17}/>إنجازاتي</b><span>قارئ مميز　 متعاون</span></div></div>
      </div>
    </div>
  </section>

  <section className="subjects" id="subjects">
    <StudentSubject kind="writing" title="الإملاء والخط" value={90}/>
    <StudentSubject kind="lughati" title="لغتي" value={92}/>
    <StudentSubject kind="islamic" title="الدراسات الإسلامية" value={88}/>
    <StudentSubject kind="quran" title="القرآن الكريم" value={95}/>
  </section>

  <section className="studentDay">
    <DayPanel title="جدولي اليوم" icon="calendar">
      <Schedule tone="green" kind="quran" title="القرآن الكريم" time="8:00 - 8:40"/>
      <Schedule tone="blue" kind="lughati" title="لغتي" time="8:50 - 9:30"/>
      <Schedule tone="gold" kind="islamic" title="الدراسات الإسلامية" time="10:00 - 10:40"/>
      <Schedule tone="purple" kind="writing" title="الإملاء والخط" time="11:00 - 11:40"/>
    </DayPanel>
    <DayPanel title="مهامي اليوم" icon="tasks">
      <Task kind="quran" title="مراجعة سورة الكوثر" subtitle="القرآن الكريم"/>
      <Task kind="lughati" title="حل تدريبات الدرس الثالث" subtitle="لغتي"/>
      <Task kind="writing" title="كتابة كلمات الإملاء" subtitle="الإملاء والخط"/>
      <Task kind="islamic" title="مذاكرة درس آداب الطعام" subtitle="الدراسات الإسلامية"/>
    </DayPanel>
  </section>

  <section className="rewards">
    <div className="rewardMascot"><img src={asset('shakabumbo-guardian.webp')} alt="شكابمبو يحمل الكأس"/><b>نجومي <UiIcon name="star" size={18}/></b></div>
    <div className="rewardStars"><b><UiIcon name="star" size={17}/>اجمع 30 نجمة لتحصل على مكافأتك!</b><div className="starGrid">{Array.from({length:30},(_,i)=><span className={i<12?'on':''} key={i}><UiIcon name="star" size={18}/><small>{i+1}</small></span>)}</div></div>
    <div className="nextReward"><UiIcon name="gift" size={46}/><span>مكافأة قادمة</span><strong>0 / 30</strong></div>
  </section>
  <StudentNav/>
 </main>
}

function TeacherStat({tone,icon,title,value}:{tone:string;icon:IconName;title:string;value:string}){return <article className={`teacherStat ${tone}`}><UiIcon name={icon} size={32}/><b>{title}</b><strong>{value}</strong></article>}
function Quick({icon,title,subtitle,onClick}:{icon:IconName;title:string;subtitle:string;onClick:()=>void}){return <button onClick={onClick}><UiIcon name={icon} size={35}/><b>{title}</b><span>{subtitle}</span></button>}
function Panel({title,icon,action,children}:{title:string;icon:IconName;action:string;children:React.ReactNode}){return <section className="panel"><header><h3><UiIcon name={icon} size={22}/>{title}</h3><button>{action}</button></header>{children}</section>}
function CourseProgress({k,t,p}:{k:'quran'|'islamic'|'lughati'|'writing';t:string;p:number}){return <div className="courseProgress"><SubjectIcon kind={k}/><div><b>{t}</b><div className="courseBar"><i style={{width:p+'%'}}/></div></div><span>{p}%</span></div>}
function StatusLine({tone,label,value}:{tone:string;label:string;value:string}){return <div className="statusLine"><span className={`statusDot ${tone}`}/><b>{label}</b><strong>{value}</strong></div>}
function ChecklistItem({text}:{text:string}){return <button className="checkItem"><span className="checkBox"/><b>{text}</b><UiIcon name="chevron" size={18}/></button>}

function StudentSubject({kind,title,value}:{kind:'quran'|'islamic'|'lughati'|'writing';title:string;value:number}){return <button className={`studentSubject ${kind}`} onClick={()=>alert(title)}><SubjectIcon kind={kind}/><b>{title}</b><strong>{value}%</strong><div className="subjectBar"><i style={{width:value+'%'}}/></div></button>}
function DayPanel({title,icon,children}:{title:string;icon:IconName;children:React.ReactNode}){return <section className="dayPanel"><h3><UiIcon name={icon} size={21}/>{title}</h3>{children}</section>}
function Schedule({tone,kind,title,time}:{tone:string;kind:'quran'|'islamic'|'lughati'|'writing';title:string;time:string}){return <div className={`scheduleItem ${tone}`}><span className="scheduleDot"/><div className="scheduleText"><b>{title}</b><span>{time}</span></div><SubjectIcon kind={kind}/></div>}
function Task({kind,title,subtitle}:{kind:'quran'|'islamic'|'lughati'|'writing';title:string;subtitle:string}){const [done,setDone]=React.useState(false);return <button className={`taskItem ${done?'done':''}`} onClick={()=>setDone(!done)}><span className="taskCircle">{done&&<UiIcon name="check" size={14}/>}</span><div className="taskText"><b>{title}</b><span>{subtitle}</span></div><SubjectIcon kind={kind}/></button>}

function TeacherNav(){return <nav className="bottomNav teacherNav"><button className="active" onClick={()=>scrollTo({top:0,behavior:'smooth'})}><UiIcon name="home" size={28}/><b>الرئيسية</b></button><button onClick={()=>go('/student')}><UiIcon name="people" size={29}/><b>الطلاب</b></button><button className="mascotNav" onClick={()=>go('/student')}><span><Mascot/></span><b>شكابمبو</b></button><button onClick={()=>scrollToId('teacher-actions')}><UiIcon name="books" size={29}/><b>الكتب</b></button><button onClick={()=>alert('المزيد')}><UiIcon name="more" size={29}/><b>المزيد</b></button></nav>}
function StudentNav(){return <nav className="bottomNav studentNav"><button className="active" onClick={()=>scrollTo({top:0,behavior:'smooth'})}><UiIcon name="home" size={28}/><b>الرئيسية</b></button><button onClick={()=>scrollToId('subjects')}><UiIcon name="books" size={29}/><b>المواد</b></button><button className="mascotNav" onClick={()=>scrollTo({top:0,behavior:'smooth'})}><span><Mascot/></span><b>شكابمبو</b></button><button onClick={()=>scrollToId('subjects')}><UiIcon name="books" size={29}/><b>الكتب</b></button><button onClick={()=>alert('المزيد')}><UiIcon name="more" size={29}/><b>المزيد</b></button></nav>}

createRoot(document.getElementById('root')!).render(<App/>);
