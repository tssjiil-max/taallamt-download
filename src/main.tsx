import React from 'react';
import {createRoot} from 'react-dom/client';
import './ui.css';

const RAW='https://raw.githubusercontent.com/tssjiil-max/taallamt-download/build/taallamt-flex-v1/public';
const icon=(p:string)=>`${RAW}/${p}`;
const I=({src,alt=''}:{src:string;alt?:string})=><img className="svgIcon" src={icon(src)} alt={alt}/>;
const studentName=()=>{try{const p=JSON.parse(localStorage.getItem('studentProfile')||'{}');return p.name||localStorage.getItem('studentName')||'اسم الطالب'}catch{return localStorage.getItem('studentName')||'اسم الطالب'}};
const go=(p:string)=>{history.pushState({},'',p);location.reload()};
function App(){return location.pathname.startsWith('/student')?<Student/>:<Teacher/>}

function Teacher(){return <main className="screen teacher" dir="rtl">
  <header className="tHero"><div className="tIdentity"><button className="roundUser" onClick={()=>go('/student')} aria-label="صفحة الطالب">●</button><div><b>أ. سلطان الصاعدي</b><span>مدرسة عمرو بن أوس الثقفي</span><span>الصف: الثاني / 4</span></div></div><div className="logo"><strong>تعلّمت</strong><small>معًا نصنع جيلاً أفضل</small><em>برمجة: سلطان الصاعدي</em></div></header>
  <div className="tMeta"><span>1 سبتمبر 2026 م　▣</span><span>4 ربيع الأول 1448 هـ　▣</span><b>🌱 كل خطوة في التعليم ... تصنع فرقًا كبيرًا</b></div>
  <section className="tStats"><Stat c="blue" sym="✉" t="رسائل جديدة" n="3"/><Stat c="red" sym="!" t="يحتاجون متابعة" n="6"/><Stat c="gold" sym="★" t="تم تقييم اليوم" n="24"/><Stat c="green" sym="●●●" t="عدد الطلاب" n="30"/></section>
  <section className="now"><div className="nowTop"><h2>◷ حصتي الآن</h2><div><span>10:00 - 10:45</span><b>الحصة 3</b></div></div><div className="lessonText"><h3>♜ الدراسات الإسلامية</h3><p>الوحدة الثانية: أخلاق المسلم</p><p>الدرس: بر الوالدين</p><p><b>المهارات:</b> يبين صور بر الوالدين – يستنتج أثر البر في حياة المسلم</p></div><button onClick={()=>alert('تم بدء الحصة')}>▶ ابدأ الحصة</button></section>
  <section className="tQuick"><Quick src="student-icons/quran.svg" t="المناهج" s="الوحدات والدروس"/><Quick src="teacher-icons/students.svg" t="الطلاب" s="إدارة بيانات الطلاب"/><Quick src="teacher-icons/assessment.svg" t="التقييم الشامل" s="أكاديمي وسلوك"/><Quick src="student-icons/communication.svg" t="التواصل" s="رسائل أولياء الأمور"/></section>
  <section className="tGrid"><Box title="▥ تقدم المنهج"><Progress t="لغتي" p={32}/><Progress t="القرآن الكريم" p={25}/><Progress t="الدراسات الإسلامية" p={28}/><Progress t="الإملاء والخط" p={30}/></Box><Box title="◎ متابعة اليوم"><Line n="6" t="يحتاجون متابعة"/><Line n="18" t="ممتازون اليوم"/><Line n="4" t="لم يتم تقييمهم"/><Line n="2" t="ملاحظات سلوكية"/></Box><Box title="☑ مهامي اليوم"><p>□ إدخال تقييم لغتي - الوحدة 2　‹</p><p>□ مراجعة خطط علاجية (3 طلاب)　‹</p><p>□ إرسال واجبات الدراسات　‹</p></Box><Box title="◀ الإعلانات"><p>🔴 اجتماع أولياء الأمور يوم الأحد</p><small>2026 - 09 - 05</small></Box></section>
  <TeacherNav/>
</main>}

function Student(){const name=studentName();return <main className="screen student" dir="rtl">
 <header className="sHero"><div className="welcome"><div className="studentAvatar">👦🏻</div><b>مرحبًا {name} ☀</b><span>الصف الثاني / 4</span></div><div className="heroMascot"><img src={icon('shakabumbo-guardian.webp')} /><small>أنت رائع<br/>كل يوم<br/>خطوة للأمام ♥</small></div><div className="sLogo"><strong>تعلّمت</strong><small>معًا نصنع جيلاً أفضل</small></div></header>
 <section className="profileCard"><h2>♟ ملف الطالب</h2><div className="profileMain"><div className="bigAvatar">👦🏻<i>✎</i></div><div className="quote">أتعلم<br/>وأصنع مستقبلي<br/>المشرق! ☀</div><div className="pname"><b>{name}</b><span>الصف الثاني / 4</span></div></div><div className="profileSide"><div className="starToday"><b>★ نجمي اليوم</b><strong>12 / 30</strong><i><u/></i></div><div className="chips"><div><b>♥ هواياتي</b><span>القراءة　 الرسم</span></div><div><b>🏆 إنجازاتي</b><span>قارئ مميز　 متعاون</span></div></div></div></section>
 <section className="subjects"><Subject src="student-icons/writing.svg" t="الإملاء والخط" p={90}/><Subject src="student-icons/library-reading.svg" t="لغتي" p={92}/><Subject src="student-icons/quran.svg" t="الدراسات الإسلامية" p={88}/><Subject src="student-icons/quran.svg" t="القرآن الكريم" p={95}/></section>
 <section className="studentGrid"><Box title="▣ جدولي اليوم"><Schedule c="g" src="student-icons/quran.svg" t="القرآن الكريم" time="8:00 - 8:40"/><Schedule c="b" src="student-icons/library-reading.svg" t="لغتي" time="8:50 - 9:30"/><Schedule c="y" src="student-icons/quran.svg" t="الدراسات الإسلامية" time="10:00 - 10:40"/><Schedule c="p" src="student-icons/writing.svg" t="الإملاء والخط" time="11:00 - 11:40"/></Box><Box title="▣ مهامي اليوم"><Task src="student-icons/quran.svg" t="مراجعة سورة الكوثر" s="القرآن الكريم"/><Task src="student-icons/library-reading.svg" t="حل تدريبات الدرس الثالث" s="لغتي"/><Task src="student-icons/writing.svg" t="كتابة كلمات الإملاء" s="الإملاء والخط"/><Task src="student-icons/quran.svg" t="مذاكرة درس آداب الطعام" s="الدراسات الإسلامية"/></Box></section>
 <section className="rewards"><div className="champ"><img src={icon('shakabumbo-guardian.webp')}/><b>نجومي ★</b></div><div className="stars"><b>★ اجمع 30 نجمة لتحصل على مكافأتك!</b><div>{Array.from({length:30},(_,i)=><span className={i<12?'on':''} key={i}>☆<small>{i+1}</small></span>)}</div></div><div className="reward"><b>🎁</b><span>مكافأة قادمة</span><strong>0 / 30</strong></div></section>
 <StudentNav/>
 </main>}
function Stat({c,sym,t,n}:{c:string;sym:string;t:string;n:string}){return <article className={c}><i>{sym}</i><b>{t}</b><strong>{n}</strong></article>}
function Quick({src,t,s}:{src:string;t:string;s:string}){return <button onClick={()=>alert(t)}><I src={src}/><b>{t}</b><span>{s}</span></button>}
function Box({title,children}:{title:string;children:React.ReactNode}){return <section className="box"><h3>{title}</h3>{children}</section>}
function Progress({t,p}:{t:string;p:number}){return <div className="prog"><b>{t}</b><span>{p}%</span><i><u style={{width:p+'%'}}/></i></div>}
function Line({n,t}:{n:string;t:string}){return <div className="line"><b>{t}</b><span>{n}</span></div>}
function Subject({src,t,p}:{src:string;t:string;p:number}){return <button onClick={()=>alert(t)}><I src={src}/><b>{t}</b><strong>{p}%</strong><i><u style={{width:p+'%'}}/></i></button>}
function Schedule({c,src,t,time}:{c:string;src:string;t:string;time:string}){return <div className={'schedule '+c}><I src={src}/><b>{t}</b><span>{time}</span></div>}
function Task({src,t,s}:{src:string;t:string;s:string}){const [done,setDone]=React.useState(false);return <button className="task" onClick={()=>setDone(!done)}><i>{done?'✓':''}</i><I src={src}/><b>{t}</b><small>{s}</small></button>}
function TeacherNav(){return <nav className="nav"><button className="active">⌂<b>الرئيسية</b></button><button onClick={()=>go('/student')}>♟♟<b>الطلاب</b></button><button className="mascotNav" onClick={()=>go('/student')}><img src={icon('shakabumbo-guardian.webp')}/><b>شكابمبو</b></button><button>▮<b>الكتب</b></button><button>•••<b>المزيد</b></button></nav>}
function StudentNav(){return <nav className="nav sNav"><button className="active">⌂<b>الرئيسية</b></button><button>▮<b>المواد</b></button><button className="mascotNav"><img src={icon('shakabumbo-guardian.webp')}/><b>شكابمبو</b></button><button>▮<b>الكتب</b></button><button>•••<b>المزيد</b></button></nav>}
createRoot(document.getElementById('root')!).render(<App/>);
