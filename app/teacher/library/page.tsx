"use client";

import Link from "next/link";
import { useTaallamt } from "@/lib/store";

const subjectIcon = (name: string) => name.includes("لغتي") ? "✏️" : name.includes("قرآن") ? "📖" : "🕌";

export default function TeacherLibraryPage() {
  const { resources, subjects, terms } = useTaallamt();
  const activeTerm = terms.find((term) => term.active) ?? terms[0];
  const activeSubjects = subjects
    .filter((subject) => subject.enabled && subject.termId === activeTerm?.id)
    .sort((a, b) => a.order - b.order);
  const published = resources.filter((resource) => resource.publishedToGuardian);

  return (
    <main className="shell teacher-home-shell">
      <header className="teacher-header">
        <div className="teacher-brand-block">
          <div className="brand-mark">📚</div>
          <div><h1>المكتبة</h1><p>إدارة المحتوى التعليمي المنشور لولي الأمر</p><span>لوحة المعلم · الصف الثاني / 4</span></div>
        </div>
        <Link className="shak-header-link" href="/teacher/shakabumbo" aria-label="اسأل شكابمبو"><img src="/shakabumbo.jpg" alt="شكابمبو" /><span>اسأل شكابمبو</span></Link>
      </header>

      <section className="ui-section first-ui-section">
        <div className="section-title-row"><div><h2>ملخص المكتبة</h2><p>الأرقام ناتجة من الموارد الموجودة حاليًا في النظام.</p></div></div>
        <div className="square-grid indicator-grid">
          <article className="square-card indicator-card"><div className="square-icon green">📄</div><b>{resources.length}</b><span>كل الموارد</span></article>
          <article className="square-card indicator-card"><div className="square-icon orange">✓</div><b>{published.length}</b><span>منشور لولي الأمر</span></article>
          <article className="square-card indicator-card"><div className="square-icon green">📚</div><b>{activeSubjects.length}</b><span>مواد مفعلة</span></article>
          <article className="square-card indicator-card"><div className="square-icon orange">—</div><b className="text-value">PDF</b><span>الرفع المباشر غير مفعّل بعد</span></article>
        </div>
      </section>

      <section className="ui-section">
        <div className="section-title-row"><div><h2>إدارة المحتوى</h2><p>استخدم الوظائف الموجودة فعليًا في «تعلّمت».</p></div></div>
        <div className="square-grid tools-grid">
          <Link className="square-card tool-card" href="/teacher/resources"><div className="square-icon green">➕</div><h3>أوراق العمل والاختبارات</h3><p>إنشاء الموارد التعليمية الحالية ونشر المناسب منها.</p><span className="open-label">فتح</span></Link>
          <Link className="square-card tool-card" href="/teacher/spelling-handwriting"><div className="square-icon orange">✍️</div><h3>الإملاء والخط</h3><p>محتوى الإملاء والخط المرتبط بمادة لغتي.</p><span className="open-label">فتح</span></Link>
          {activeSubjects.map((subject, index) => <Link className="square-card tool-card" href={`/teacher/subject/${subject.id}`} key={subject.id}><div className={`square-icon ${index % 2 ? "orange" : "green"}`}>{subjectIcon(subject.name)}</div><h3>{subject.name}</h3><p>العودة إلى مساحة عمل المادة.</p><span className="open-label">فتح المادة</span></Link>)}
        </div>
      </section>

      <section className="ui-section">
        <div className="section-title-row"><div><h2>المنشور لولي الأمر</h2><p>ولي الأمر يرى فقط ما تم نشره له من الموارد الحالية.</p></div><span className="soft-chip">{published.length}</span></div>
        {published.length ? <div className="square-grid library-grid">{published.map((resource) => {
          const subject = activeSubjects.find((item) => item.id === resource.subjectId);
          return <article className="square-card library-card" key={resource.id}><div className="square-icon orange">📄</div><h3>{resource.title}</h3><p>{subject?.name ?? "مادة تعليمية"}{resource.week ? ` · الأسبوع ${resource.week}` : ""}</p><span className="open-label">منشور</span></article>;
        })}</div> : <div className="empty-state"><span>📚</span><b>لا توجد مواد منشورة حاليًا</b><p>عند نشر مورد من أوراق العمل أو الاختبارات سيظهر هنا تلقائيًا.</p></div>}
      </section>

      <div className="notice warn section">رفع ملفات PDF مستقلة من الجوال إلى المكتبة ليس مفعّلًا حاليًا؛ هذه الصفحة لا تدّعي وجود رفع ملفات قبل ربط التخزين الفعلي.</div>

      <footer className="site-credit">برمجة سلطان الصاعدي</footer>
      <nav className="bottom-nav teacher-bottom-nav" aria-label="التنقل الرئيسي">
        <Link className="bottom-nav-item" href="/"><span>⌂</span><b>الرئيسية</b></Link>
        <Link className="bottom-nav-item" href="/teacher/students"><span>👥</span><b>الطلاب</b></Link>
        <Link className="bottom-nav-item active" href="/teacher/library"><span>📚</span><b>المكتبة</b></Link>
        <Link className="bottom-nav-item" href="/teacher/shakabumbo"><span>🤖</span><b>شكابمبو</b></Link>
      </nav>
    </main>
  );
}
