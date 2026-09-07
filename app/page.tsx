"use client";

import Link from "next/link";
import { DateBar } from "@/components/DateBar";
import { NotificationPanel } from "@/components/NotificationPanel";
import { useTaallamt } from "@/lib/store";

export default function TeacherHome() {
  const { students, subjects, terms, followUps } = useTaallamt();
  const activeTerm = terms.find((term) => term.active) ?? terms[0];
  const activeStudents = students.filter((student) => student.active);
  const activeSubjects = subjects.filter((subject) => subject.enabled && subject.termId === activeTerm?.id);
  const specialCount = Object.keys(followUps).length;

  return (
    <main className="shell">
      <header className="topbar"><div className="brand"><div className="logo">🎓</div><div><h1>تعلّمت</h1><p>لوحة المعلم — الإدارة والمتابعة والتحفيز</p></div></div>{activeTerm && <span className="pill">{activeTerm.name} · {activeTerm.academicYear}</span>}</header>
      <DateBar />
      <NotificationPanel role="teacher" />
      <section className="hero section"><div><h2>مرحبًا أ. سلطان</h2><p>إدارة الفصل من مكان واحد. الطلاب والمواد والفصول قابلة للإضافة والتعديل والأرشفة، مع بقاء السجل السابق محفوظًا.</p></div><div className="hero-stats"><div className="stat"><b>{activeStudents.length}</b><span>طالب حالي</span></div><div className="stat"><b>{activeSubjects.length}</b><span>مواد مفعلة</span></div><div className="stat"><b>{specialCount}</b><span>متابعة خاصة</span></div><div className="stat"><b>2</b><span>أقصى أجهزة ولي الأمر</span></div></div></section>
      <section className="grid">
        <Link className="card" href="/teacher/students"><div className="icon">👥</div><h3>الطلاب والمتابعة</h3><p>إضافة وأرشفة الطلاب، التقييم، المهارات، الخطط العلاجية وسجل الطالب.</p></Link>
        <Link className="card" href="/teacher/distribution"><div className="icon">📅</div><h3>التوزيع الأسبوعي</h3><p>توزيع القرآن والدراسات الإسلامية ولغتي أسبوعًا بأسبوع مع إمكانية التعديل.</p></Link>
        <Link className="card" href="/teacher/schedule"><div className="icon amber">🗓️</div><h3>الخطة والنشر الآلي</h3><p>خطة أسبوعية تظهر السبت لولي الأمر، وإعلان يومي تلقائي عن محتوى الغد.</p></Link>
        <Link className="card" href="/teacher/settings"><div className="icon green">⚙️</div><h3>إدارة الفصل والمواد</h3><p>إنشاء فصل جديد وإضافة أو تعديل أو إيقاف المواد دون تغيير الكود.</p></Link>
        <Link className="card" href="/guardian"><div className="icon amber">🏠</div><h3>بوابة ولي الأمر</h3><p>متابعة وتواصل وخطة علاجية وطباعة، مع حد جهازين لكل طالب.</p></Link>
        <Link className="card" href="/student"><div className="icon green">🧒</div><h3>صفحة الطالب</h3><p>واجهة مستقلة للطالب للمهام والتقدم والتحفيز، وليست مدمجة مع ولي الأمر.</p></Link>
        <Link className="card" href="/teacher/portfolio"><div className="icon green">📁</div><h3>ملف إنجاز المعلم</h3><p>يتجمع من العمل المسجل، ثم يطبع أو يشارك بصورة منظمة.</p></Link>
        <Link className="card shak-card" href="/teacher/shakabumbo"><img className="shak-thumb" src="/shakabumbo.jpg" alt="شكابمبو" /><div><h3>شكابمبو</h3><p>مساعد صفي لاختيار طالب، القراءة والتسميع والتصحيح باستخدام محادثة ChatGPT Plus حاليًا.</p></div></Link>
      </section>
      <section className="section"><div className="section-head"><h2>تنبيهات تحتاج انتباهك</h2></div><div className="list"><div className="row"><div className="row-main"><div className="avatar">📖</div><div><h4>التقييم والخطط</h4><small>أي طالب يحتاج تدريبًا يمكن تحويل تقييمه إلى متابعة وخطة علاجية قابلة للطباعة.</small></div></div><span className="badge warn">متابعة</span></div><div className="row"><div className="row-main"><div className="avatar">🔒</div><div><h4>خصوصية ولي الأمر</h4><small>النموذج النهائي سيربط كل جلسة بولي الأمر بابنه فقط؛ وضع المعاينة الحالي مخصص للبناء والاختبار.</small></div></div><span className="badge">مخطط</span></div></div></section>
    </main>
  );
}
