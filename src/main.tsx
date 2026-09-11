import React from 'react';
import { createRoot } from 'react-dom/client';
import './ui.css';

type View = 'teacher' | 'student';

function App() {
  const [view,setView]=React.useState<View>('teacher');
  return <main className="app">
    <header><div><strong>تعلّمت</strong><small>النواة التعليمية الجديدة</small></div><nav><button onClick={()=>setView('teacher')}>المعلم</button><button onClick={()=>setView('student')}>الطالب</button></nav></header>
    {view==='teacher'?<Teacher/>:<Student/>}
  </main>;
}

function Teacher(){return <section>
  <h1>لوحة المعلم</h1><p>الصف الثاني / 4</p>
  <div className="hero"><h2>التقويم الشامل</h2><p>مركز التقييم اليومي الأكاديمي والسلوكي.</p><button>بدء تقييم اليوم</button></div>
  <div className="grid">{['الطلاب','المتابعة المركزة','الخطة الأسبوعية','الواجبات','الخطط العلاجية','ملف الإنجاز','التواصل والإحالات','المواد والمهارات'].map(x=><article key={x}>{x}</article>)}</div>
</section>}

function Student(){return <section>
  <h1>صفحة الطالب</h1><div className="hero"><h2>شكابومبو</h2><p>رفيق التعلم والتحفيز</p><div className="stars">⭐ 0 / 30</div></div>
  <div className="grid">{['متابعتي اليوم','الخطة الأسبوعية','واجباتي','موادي','إنجازاتي','ملف إنجازي'].map(x=><article key={x}>{x}</article>)}</div>
</section>}

createRoot(document.getElementById('root')!).render(<React.StrictMode><App/></React.StrictMode>);
