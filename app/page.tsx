"use client";

import Link from "next/link";
import { DateBar } from "@/components/DateBar";
import { NotificationPanel } from "@/components/NotificationPanel";
import { academicWeek } from "@/lib/schedule";
import { useTaallamt } from "@/lib/store";

type Activity = { id: string; title: string; detail: string; at: string; icon: string };

const subjectOrder = ["لغتي", "القرآن الكريم", "الدراسات الإسلامية"];
const subjectIcon = (name: string) => name.includes("لغتي") ? "✏️" : name.includes("قرآن") ? "📖" : "🕌";

function shortDate(value: string) {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "";
  return new Intl.DateTimeFormat("ar-SA", { day: "numeric", month: "short" }).format(date);
}

export default function TeacherHome() {
  const store = useTaallamt();
  const activeTerm = store.terms.find((term) => term.active) ?? store.terms[0];
  const activeStudents = store.students.filter((student) => student.active);
  const week = academicWeek();
  const activeSubjects = store.subjects
    .filter((subject) => subject.enabled && subject.termId === activeTerm?.id && subjectOrder.includes(subject.name))
    .sort((a, b) => subjectOrder.indexOf(a.name) - subjectOrder.indexOf(b.name));

  const guardianMessages = store.messages.filter((message) => message.author === "guardian").length;
  const needsReview = Object.values(store.followUps).filter((followUp) => followUp.status === "needs_review").length;
  const alertsCount = guardianMessages + needsReview;

  const starGroups = new Map<string, number>();
  for (const star of store.valueStars) {
    const key = `${star.studentId}:${star.valueId}`;
    starGroups.set(key, (starGroups.get(key) ?? 0) + 1);
  }
  const awardsCount = [...starGroups.values()].filter((count) => count >= 8).length;

  const activities: Activity[] = [
    ...store.assessments.map((assessment) => {
      const student = store.students.find((item) => item.id === assessment.studentId);
      const skill = store.skills.find((item) => item.id === assessment.skillId);
      const subject = skill ? store.subjects.find((item) => item.id === skill.subjectId) : undefined;
      return {
        id: assessment.id,
        title: student ? `تم تقييم ${student.name}` : "تم تسجيل تقييم",
        detail: [subject?.name, skill?.category].filter(Boolean).join(" · ") || "تقييم مهارة",
        at: assessment.assessedAt,
        icon: "✅",
      };
    }),
    ...store.valueStars.map((star) => {
      const student = store.students.find((item) => item.id === star.studentId);
      const value = store.values.find((item) => item.id === star.valueId);
      return {
        id: star.id,
        title: student ? `تم تحديث سلوك ${student.name}` : "تم تحديث السلوك",
        detail: value?.title ?? "نجمة سلوك إيجابي",
        at: star.awardedAt,
        icon: "⭐",
      };
    }),
    ...store.messages.filter((message) => message.author === "guardian").map((message) => {
      const student = store.students.find((item) => item.id === message.studentId);
      return {
        id: message.id,
        title: student ? `رسالة من ولي أمر ${student.name}` : "رسالة من ولي أمر",
        detail: message.body,
        at: message.createdAt,
        icon: "💬",
      };
    }),
    ...store.resources.map((resource) => ({
      id: resource.id,
      title: resource.publishedToGuardian ? `تم نشر ${resource.title}` : `تم إنشاء ${resource.title}`,
      detail: store.subjects.find((item) => item.id === resource.subjectId)?.name ?? "مورد تعليمي",
      at: resource.createdAt,
      icon: "📝",
    })),
  ].filter((item) => item.at).sort((a, b) => b.at.localeCompare(a.at)).slice(0, 6);

  return (
    <main className="shell teacher-home-shell">
      <header className="teacher-header">
        <div className="teacher-brand-block">
          <div className="brand-mark">ت</div>
          <div>
            <h1>تعلّمت</h1>
            <p>لوحة المعلم · أ. سلطان الصاعدي</p>
            <span>الصف الثاني / 4</span>
          </div>
        </div>
        <Link className="shak-header-link" href="/teacher/shakabumbo" aria-label="اسأل شكابمبو">
          <img src="/shakabumbo.jpg" alt="شكابمبو" />
          <span>اسأل شكابمبو</span>
        </Link>
      </header>

      <DateBar />

      <section className="ui-section first-ui-section">
        <div className="section-title-row"><div><h2>المؤشرات</h2><p>بيانات فعلية من النظام</p></div></div>
        <div className="square-grid indicator-grid">
          <Link className="square-card indicator-card" href="/teacher/students"><div className="square-icon green">👥</div><b>{activeStudents.length}</b><span>طلاب الفصل</span></Link>
          <Link className="square-card indicator-card" href="/teacher/values"><div className="square-icon orange">⭐</div><b>{store.valueStars.length}</b><span>السلوك</span></Link>
          <article className="square-card indicator-card"><div className="square-icon green">🔔</div><b>{alertsCount}</b><span>التنبيهات</span></article>
          <Link className="square-card indicator-card" href="/teacher/values"><div className="square-icon orange">🏆</div><b>{awardsCount}</b><span>الجوائز</span></Link>
        </div>
      </section>

      <section className="ui-section">
        <div className="section-title-row"><div><h2>المواد</h2><p>كل مادة في مكانها</p></div><span className="soft-chip">الأسبوع {week}</span></div>
        <div className="square-grid subject-card-grid">
          {activeSubjects.map((subject, index) => {
            const plan = store.weeklyPlans.find((item) => item.termId === activeTerm?.id && item.subjectId === subject.id && item.week === week);
            return <Link className="square-card subject-square-card" key={subject.id} href={`/teacher/subject/${subject.id}`}>
              <div className={`square-icon ${index % 2 === 0 ? "green" : "orange"}`}>{subjectIcon(subject.name)}</div>
              <h3>{subject.name}</h3>
              <p>{plan?.title ?? "لا توجد خطة لهذا الأسبوع"}</p>
            </Link>;
          })}
        </div>
      </section>

      <section className="ui-section">
        <div className="section-title-row"><div><h2>إجراءات سريعة</h2><p>أهم ما تستخدمه أثناء اليوم الدراسي</p></div></div>
        <div className="square-grid quick-grid">
          <Link className="square-card quick-card" href="/teacher/values"><div className="square-icon green">🌟</div><h3>السلوك</h3><p>القيم والنجوم الحالية</p></Link>
          <Link className="square-card quick-card" href="/teacher/assessment"><div className="square-icon orange">✅</div><h3>التقييم</h3><p>تقييم المهارات للطلاب</p></Link>
          <Link className="square-card quick-card" href="/teacher/students"><div className="square-icon orange">💬</div><h3>رسائل أولياء الأمور</h3><p>{guardianMessages ? `${guardianMessages} رسالة محفوظة` : "لا توجد رسائل"}</p></Link>
          <Link className="square-card quick-card" href="/teacher/resources"><div className="square-icon green">📝</div><h3>مهام صفية</h3><p>أوراق وتدريبات داخل الفصل</p></Link>
        </div>
      </section>

      <section className="ui-section">
        <div className="section-title-row"><div><h2>آخر النشاطات</h2><p>تظهر فقط من السجلات الموجودة</p></div></div>
        {activities.length ? <div className="activity-grid">{activities.map((activity) => <article className="activity-card" key={`${activity.id}-${activity.at}`}><div className="activity-icon">{activity.icon}</div><div><h3>{activity.title}</h3><p>{activity.detail}</p><small>{shortDate(activity.at)}</small></div></article>)}</div> : <div className="empty-state"><span>🌱</span><b>لا توجد نشاطات حديثة</b><p>ستظهر هنا التقييمات والرسائل والسلوك والمواد عند تسجيلها.</p></div>}
      </section>

      <section className="ui-section">
        <div className="section-title-row"><div><h2>أدوات المعلم</h2><p>الوظائف الموجودة في تعلّمت</p></div></div>
        <div className="square-grid tools-grid">
          <Link className="square-card tool-card" href="/teacher/library"><div className="square-icon green">📚</div><h3>المكتبة</h3><p>إدارة المحتوى المنشور</p></Link>
          <Link className="square-card tool-card" href="/teacher/portfolio"><div className="square-icon orange">📁</div><h3>ملف الإنجاز</h3><p>أعمالك وأدلتك المهنية</p></Link>
          <Link className="square-card tool-card" href="/teacher/announcements"><div className="square-icon orange">📢</div><h3>الإعلانات</h3><p>حدث أو تنبيه عام</p></Link>
          <Link className="square-card tool-card" href="/teacher/reports"><div className="square-icon green">📊</div><h3>التقارير</h3><p>السجلات والطباعة</p></Link>
        </div>
      </section>

      <details className="utility-panel">
        <summary>الإشعارات على الجهاز</summary>
        <NotificationPanel role="teacher" />
      </details>

      <details className="utility-panel">
        <summary>الإدارة والإعدادات</summary>
        <div className="square-grid tools-grid panel-grid">
          <Link className="square-card tool-card" href="/teacher/distribution"><div className="square-icon green">🗓️</div><h3>التوزيع الأسبوعي</h3></Link>
          <Link className="square-card tool-card" href="/teacher/settings"><div className="square-icon orange">⚙️</div><h3>إدارة الفصل</h3></Link>
          <Link className="square-card tool-card" href="/teacher/data-exchange"><div className="square-icon green">🔄</div><h3>البيانات</h3></Link>
          <Link className="square-card tool-card" href="/teacher/backend"><div className="square-icon orange">🔐</div><h3>الربط الخلفي</h3></Link>
        </div>
      </details>

      <footer className="site-credit">برمجة سلطان الصاعدي</footer>

      <nav className="bottom-nav teacher-bottom-nav" aria-label="التنقل الرئيسي">
        <Link className="bottom-nav-item active" href="/"><span>⌂</span><b>الرئيسية</b></Link>
        <Link className="bottom-nav-item" href="/teacher/students"><span>👥</span><b>الطلاب</b></Link>
        <Link className="bottom-nav-item" href="/teacher/library"><span>📚</span><b>المكتبة</b></Link>
        <Link className="bottom-nav-item" href="/teacher/shakabumbo"><span>🤖</span><b>شكابمبو</b></Link>
      </nav>
    </main>
  );
}
