"use client";

import Link from "next/link";
import { DateBar } from "@/components/DateBar";
import { NotificationPanel } from "@/components/NotificationPanel";
import { useTaallamt } from "@/lib/store";

export default function TeacherHome() {
  const { students, subjects, terms, followUps, resources, valueStars } = useTaallamt();
  const activeTerm = terms.find((term) => term.active) ?? terms[0];
  const activeStudents = students.filter((student) => student.active);
  const activeSubjects = subjects.filter((subject) => subject.enabled && subject.termId === activeTerm?.id);
  const specialCount = Object.keys(followUps).length;

  return (
    <main className="shell">
      <header className="topbar"><div className="brand"><div className="logo">🎓</div><div><h1>تعلّمت</h1><p>لوحة المعلم — الصف الثاني/4</p></div></div>{activeTerm && <span className="pill">{activeTerm.name} · {activeTerm.academicYear}</span>}</header>
      <DateBar />
      <NotificationPanel role="teacher" />

      <section className="hero section"><div><h2>مرحبًا أ. سلطان</h2><p>كل ما تحتاجه للفصل في مكان واحد: خطة الأسبوع، تقييم المهارات، الإملاء والخط، القيم، الأوراق والاختبارات، ومتابعة ولي الأمر.</p></div><div className="hero-stats"><div className="stat"><b>{activeStudents.length}</b><span>طالب</span></div><div className="stat"><b>{activeSubjects.length}</b><span>مواد</span></div><div className="stat"><b>{specialCount}</b><span>متابعة خاصة</span></div><div className="stat"><b>{resources.length}</b><span>أوراق واختبارات</span></div></div></section>

      <section className="section"><div className="section-head"><h2>العمل اليومي</h2></div><div className="grid">
        <Link className="card" href="/teacher/assessment"><div className="icon">✅</div><h3>سجل متابعة المهارات</h3><p>تقييم الطالب على المهارات الفعلية: متقن، أتقن البعض، يحتاج تدريب.</p></Link>
        <Link className="card" href="/teacher/schedule"><div className="icon amber">🗓️</div><h3>الخطة والنشر الآلي</h3><p>خطة أسبوعية السبت وإعلان يومي تلقائي عن محتوى الغد.</p></Link>
        <Link className="card" href="/teacher/spelling-handwriting"><div className="icon green">✍️</div><h3>الإملاء والخط</h3><p>توزيع الكتيب أسبوعًا بأسبوع، مهارة الإملاء ومعايير الخط والدرجة.</p></Link>
        <Link className="card" href="/teacher/values"><div className="icon amber">🌟</div><h3>نجوم القيم</h3><p>مسابقة قيم الوحدة: نجوم، بطل القيمة، نجم الأسبوع والجائزة.</p></Link>
        <Link className="card" href="/teacher/resources"><div className="icon green">📝</div><h3>أوراق العمل والاختبارات</h3><p>إنشاء ورقة عمل، تدريب مهارات، اختبار نصفي أو نهائي ثم طباعته أو إرساله.</p></Link>
        <Link className="card" href="/teacher/students"><div className="icon">👥</div><h3>الطلاب والمتابعة</h3><p>سجل الطالب، الخطة العلاجية، المتابعة الخاصة والتواصل.</p></Link>
      </div></section>

      <section className="section"><div className="section-head"><h2>التخطيط والإدارة</h2></div><div className="grid">
        <Link className="card" href="/teacher/distribution"><div className="icon">📅</div><h3>التوزيع الأسبوعي</h3><p>القرآن والدراسات الإسلامية ولغتي أسبوعًا بأسبوع.</p></Link>
        <Link className="card" href="/teacher/settings"><div className="icon green">⚙️</div><h3>إدارة الفصل والمواد</h3><p>الفصول والمواد والفصول الدراسية قابلة للتعديل دون تغيير الكود.</p></Link>
        <Link className="card" href="/teacher/data-exchange"><div className="icon green">🔄</div><h3>نقل وتبادل البيانات</h3><p>تصدير واستيراد ونسخ احتياطي وتجهيز بيانات نور ومدرستي.</p></Link>
        <Link className="card" href="/teacher/portfolio"><div className="icon green">📁</div><h3>ملف إنجاز المعلم</h3><p>يتجمع من أعمال الفصل المسجلة ويطبع أو يشارك.</p></Link>
        <Link className="card" href="/teacher/backend"><div className="icon green">🔐</div><h3>الربط الآمن وولي الأمر</h3><p>فحص Firestore، حماية دخول المعلم، مزامنة البيانات، وتفعيل رموز أولياء الأمور.</p></Link>
        <Link className="card shak-card" href="/teacher/shakabumbo"><img className="shak-thumb" src="/shakabumbo.jpg" alt="شكابمبو" /><div><h3>شكابمبو</h3><p>مساعد صفي للقراءة والتسميع والتصحيح باستخدام محادثة ChatGPT.</p></div></Link>
        <Link className="card" href="/guardian"><div className="icon amber">🏠</div><h3>معاينة ولي الأمر</h3><p>شاهد بالضبط ما سيظهر لولي الأمر قبل النشر النهائي.</p></Link>
      </div></section>

      <section className="section"><div className="section-head"><h2>مؤشرات سريعة</h2></div><div className="two"><div className="card"><h3>نجوم القيم المسجلة</h3><b style={{ fontSize: 28 }}>{valueStars.length}</b><p>كل نجمة مرتبطة بطالب وقيمة وتاريخ.</p></div><div className="card"><h3>خصوصية ولي الأمر</h3><p>النسخة النهائية تربط الجلسة بابن واحد فقط، مع حد جهازين وإشعارات حقيقية.</p></div></div></section>
      <footer className="site-credit">برمجة سلطان الصاعدي</footer>
    </main>
  );
}
