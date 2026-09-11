import React from 'react';
import {createRoot} from 'react-dom/client';
import {isFirebaseConfigured} from './adapters/firebase/client';
import './ui.css';
type View='teacher'|'student';
const teacherModules=['التقويم الشامل','الطلاب','المتابعة المركزة','المواد والمهارات','الخطة الأسبوعية','الواجبات','الخطط العلاجية','السلوك الصفي','النجوم والإنجازات','ملف الطالب','ملف إنجاز المعلم','الملفات','التواصل والإحالات','الإعدادات'];
const studentModules=['الرئيسية','الخطة الأسبوعية','الواجبات','المواد','متابعتي','النجوم والإنجازات','ملف إنجازي'];
function App(){const [view,setView]=React.useState<View>('teacher');const configured=isFirebaseConfigured();return <main className="app" dir="rtl"><header><strong>تعلّمت</strong><nav><button onClick={()=>setView('teacher')}>المعلم</button><button onClick={()=>setView('student')}>الطالب</button></nav></header>{!configured&&<p role="status">وضع المعاينة الوظيفية — Firebase غير مهيأ في هذه البيئة.</p>}{view==='teacher'?<Teacher/>:<Student/>}</main>}
function Teacher(){return <section><h1>صفحة المعلم</h1><p>الصف الثاني / 4</p><nav aria-label="وحدات المعلم">{teacherModules.map(x=><button key={x}>{x}</button>)}</nav></section>}
function Student(){return <section><h1>صفحة الطالب</h1><p>البيانات الحقيقية تظهر بعد ربط جلسة الطالب.</p><p aria-label="النجوم">النجوم: 0 / 30</p><nav aria-label="وحدات الطالب">{studentModules.map(x=><button key={x}>{x}</button>)}</nav></section>}
createRoot(document.getElementById('root')!).render(<React.StrictMode><App/></React.StrictMode>);
