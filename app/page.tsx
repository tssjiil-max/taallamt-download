"use client";

import Link from "next/link";
import { DateBar } from "@/components/DateBar";
import { NotificationPanel } from "@/components/NotificationPanel";
import { useTaallamt } from "@/lib/store";

const subjectIcon = (name: string) => name.includes("قرآن") ? "📖" : name.includes("إسلام") ? "🕌" : "✏️";

export default function TeacherHome() {
  const { students, subjects, terms } = useTaallamt();
  const activeTerm = terms.find((term) => term.active) ?? terms[0];
  const activeStudents = students.filter((student) => student.active);
  const activeSubjects = subjects.filter((subject) => subject.enabled && subject.termId === activeTerm?.id).sort((a,b)=>a.order-b.order);

  return (
    <main className="shell">
      <header className="topbar"><div className="brand"><div className="logo">🎓</div><div><h1>تعلّمت</h1><p>لوحة المعلم — الصف الثاني/4</p></div></div>{activeTerm && <span className="pill">{activeTerm.name} · {activeTerm.academicYear}</span>}</header>
      <DateBar />

      <section className="section subject-first-section">
        <div className="section-head"><div><h2>المواد</h2><p>كل عمل المادة من هنا: الدرس، المهارات، أسماء الطلاب، التقييم، التدريب والملفات.</p></div></div>
        <div className="grid home-subject-grid">
          {activeSubjects.map((subject) => <Link className="card subject-home-card" key={subject.id} href={`/teacher/subject/${subject.id}`}><div className="icon">{subjectIcon(subject.name)}</div><h3>{subject.name}</h3><p>{activeStudents.length} طالبًا · تقييم ومهارات وخطة المادة</p><span className="open-label">فتح المادة ←</span></Link>)}
        </div>
      </section>

      <section className="section"><div className="section-head"><h2>أدوات عامة</h2></div><div className="grid home-tools-grid">
        <Link className="card compact-card" href="/teacher/students"><div className="icon">👥</div><h3>الطلاب</h3><p>المتابعة العامة للطالب خارج مادة محددة.</p></Link>
        <Link className="card compact-card" href="/teacher/announcements"><div className="icon amber">📢</div><h3>الإعلانات</h3><p>حدث أو تنبيه عام لجميع أولياء الأمور.</p></Link>
        <Link className="card compact-card shak-card" href="/teacher/shakabumbo"><img className="shak-thumb" src="/shakabumbo.jpg" alt="شكابمبو" /><div><h3>شكابمبو</h3><p>المساعد الصفي.</p></div></Link>
        <Link className="card compact-card" href="/teacher/library"><div className="icon green">📚</div><h3>المكتبة</h3><p>رفع ونشر ملفات التحميل.</p></Link>
        <Link className="card compact-card" href="/teacher/portfolio"><div className="icon amber">📁</div><h3>ملف الإنجاز</h3><p>أعمالك وأدلتك المهنية.</p></Link>
        <Link className="card compact-card" href="/guardian"><div className="icon">🏠</div><h3>ولي الأمر</h3><p>معاينة البوابة والتواصل.</p></Link>
      </div></section>

      <details className="section collapsible-panel">
        <summary>🔔 الإشعارات والتنبيهات</summary>
        <NotificationPanel role="teacher" />
      </details>

      <details className="section collapsible-panel">
        <summary>⚙️ الإدارة والتقارير</summary>
        <div className="grid home-tools-grid">
          <Link className="card compact-card" href="/teacher/reports"><div className="icon">📊</div><h3>التقارير والطباعة</h3><p>السجلات والملخصات.</p></Link>
          <Link className="card compact-card" href="/teacher/distribution"><div className="icon">🗓️</div><h3>التوزيع الأسبوعي</h3><p>إدارة أسابيع المواد.</p></Link>
          <Link className="card compact-card" href="/teacher/settings"><div className="icon">⚙️</div><h3>إدارة الفصل</h3><p>الطلاب والمواد والفصل.</p></Link>
          <Link className="card compact-card" href="/teacher/data-exchange"><div className="icon">🔄</div><h3>البيانات</h3><p>النسخ الاحتياطي والاستيراد.</p></Link>
          <Link className="card compact-card" href="/teacher/backend"><div className="icon">🔐</div><h3>الربط الخلفي</h3><p>Firestore ووصول ولي الأمر.</p></Link>
        </div>
      </details>

      <footer className="site-credit">برمجة سلطان الصاعدي</footer>
    </main>
  );
}
