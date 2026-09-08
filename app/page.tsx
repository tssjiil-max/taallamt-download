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
      <NotificationPanel role="teacher" />

      <section className="section">
        <div className="section-head"><div><h2>المواد</h2><p>ابدأ بالمادة؛ بداخلها الخطة والمهارات والطلاب والتقييم والتدريب.</p></div></div>
        <div className="grid">
          {activeSubjects.map((subject) => <Link className="card" key={subject.id} href={`/teacher/subject/${subject.id}`}><div className="icon">{subjectIcon(subject.name)}</div><h3>{subject.name}</h3><p>الأسبوع الحالي · المهارات · {activeStudents.length} طالبًا · التقييم والمتابعة</p></Link>)}
        </div>
      </section>

      <section className="section"><div className="section-head"><h2>عمل المعلم</h2></div><div className="grid">
        <Link className="card" href="/teacher/students"><div className="icon">👥</div><h3>الطلاب</h3><p>السجل والمتابعة العامة لكل طالب.</p></Link>
        <Link className="card shak-card" href="/teacher/shakabumbo"><img className="shak-thumb" src="/shakabumbo.jpg" alt="شكابمبو" /><div><h3>شكابمبو</h3><p>مساعد صفي للقراءة والتسميع والتصحيح والإملاء.</p></div></Link>
        <Link className="card" href="/teacher/library"><div className="icon green">📚</div><h3>المكتبة</h3><p>أنت تدير الكتيبات وأوراق العمل والملفات، وولي الأمر يحمّل المنشور فقط.</p></Link>
        <Link className="card" href="/teacher/portfolio"><div className="icon amber">📁</div><h3>ملف إنجاز المعلم</h3><p>ملف مهني يتكوّن من بياناتك وأعمالك وأدلتك داخل النظام.</p></Link>
        <Link className="card" href="/guardian"><div className="icon">🏠</div><h3>بوابة ولي الأمر</h3><p>معاينة ما يصل لولي الأمر ومتابعة التواصل.</p></Link>
        <Link className="card" href="/teacher/reports"><div className="icon">📊</div><h3>التقارير والطباعة</h3><p>ملخصات الفصل وسجلات الطلاب والمخرجات القابلة للطباعة.</p></Link>
      </div></section>

      <section className="section"><div className="section-head"><h2>الإدارة</h2></div><div className="grid">
        <Link className="card" href="/teacher/distribution"><div className="icon">🗓️</div><h3>التوزيع الأسبوعي</h3><p>إدارة توزيع المواد على أسابيع الفصل.</p></Link>
        <Link className="card" href="/teacher/settings"><div className="icon">⚙️</div><h3>إدارة الفصل والمواد</h3><p>الطلاب والمواد والفصل الدراسي والإعدادات.</p></Link>
        <Link className="card" href="/teacher/data-exchange"><div className="icon">🔄</div><h3>البيانات والنسخ الاحتياطي</h3><p>تصدير واستيراد ونسخ احتياطي.</p></Link>
        <Link className="card" href="/teacher/backend"><div className="icon">🔐</div><h3>الربط الخلفي</h3><p>Firestore والحماية وتفعيل وصول أولياء الأمور.</p></Link>
      </div></section>
      <footer className="site-credit">برمجة سلطان الصاعدي</footer>
    </main>
  );
}
