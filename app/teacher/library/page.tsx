"use client";

import Link from "next/link";
import { useTaallamt } from "@/lib/store";

export default function TeacherLibraryPage() {
  const { resources, subjects, terms } = useTaallamt();
  const activeTerm = terms.find(t=>t.active) ?? terms[0];
  const activeSubjects = subjects.filter(s=>s.enabled && s.termId===activeTerm?.id);
  const published = resources.filter(r=>r.publishedToGuardian);
  return <main className="shell">
    <header className="topbar"><div className="brand"><div className="logo">📚</div><div><h1>المكتبة</h1><p>المعلم يدير المحتوى، وولي الأمر يعرض ويحمّل المنشور له فقط</p></div></div><Link className="button ghost" href="/">الرئيسية</Link></header>
    <section className="hero"><div><h2>مكتبة الفصل</h2><p>الكتيبات، أوراق العمل، المراجعات، الاختبارات، الإملاء والخط والملفات العامة في مكان واحد.</p></div><div className="hero-stats"><div className="stat"><b>{resources.length}</b><span>ملف/مورد</span></div><div className="stat"><b>{published.length}</b><span>منشور</span></div><div className="stat"><b>{activeSubjects.length}</b><span>مواد</span></div></div></section>
    <section className="section"><div className="section-head"><div><h2>إدارة المكتبة</h2><p>هذه الصفحة هي مركز التحكم. رفع PDF فعليًا وربطه بـFirebase Storage هو المرحلة التالية؛ لا نعرض لولي الأمر ملفًا غير منشور.</p></div></div><div className="grid">
      <Link className="card" href="/teacher/resources"><div className="icon">➕</div><h3>إضافة محتوى تعليمي</h3><p>أنشئ أوراق العمل والاختبارات الحالية وانشر المناسب.</p></Link>
      <Link className="card" href="/teacher/spelling-handwriting"><div className="icon">✍️</div><h3>الإملاء والخط</h3><p>إدارة محتوى الإملاء والخط تمهيدًا لإضافة الكتيب PDF.</p></Link>
    </div></section>
    <section className="section"><div className="section-head"><h2>المنشور لولي الأمر</h2></div>{published.length ? <div className="grid">{published.map(r=><article className="card" key={r.id}><div className="icon">📄</div><h3>{r.title}</h3><p>{activeSubjects.find(s=>s.id===r.subjectId)?.name ?? "عام"}{r.week ? ` · الأسبوع ${r.week}` : ""}</p><span className="pill">منشور</span></article>)}</div> : <div className="card"><h3>لا توجد ملفات منشورة بعد</h3><p>لن يظهر شيء لولي الأمر حتى تختار أنت نشره.</p></div>}</section>
  </main>;
}
