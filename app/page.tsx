import Link from "next/link";
import { students, subjects, terms } from "@/lib/sample-data";

export default function TeacherHome() {
  const activeTerm = terms.find((term) => term.active)!;
  const activeStudents = students.filter((student) => student.active);
  const activeSubjects = subjects.filter((subject) => subject.enabled && subject.termId === activeTerm.id);
  const specialCount = activeStudents.filter((student) => student.specialFollowUp).length;

  return (
    <main className="shell">
      <header className="topbar">
        <div className="brand">
          <div className="logo">🎓</div>
          <div>
            <h1>تعلّمت</h1>
            <p>لوحة المعلم — الإدارة والمتابعة والتحفيز</p>
          </div>
        </div>
        <span className="pill">{activeTerm.name} · {activeTerm.academicYear}</span>
      </header>

      <section className="hero">
        <div>
          <h2>مرحبًا أ. سلطان</h2>
          <p>
            هذه هي الواجهة الأساسية للمعلم. كل الطلاب والمواد والمهارات قابلة للإضافة والتعديل والأرشفة،
            بحيث ينتقل النظام للفصل القادم بدون إعادة بناء.
          </p>
        </div>
        <div className="hero-stats">
          <div className="stat"><b>{activeStudents.length}</b><span>طالب حالي</span></div>
          <div className="stat"><b>{activeSubjects.length}</b><span>مواد مفعلة</span></div>
          <div className="stat"><b>{specialCount}</b><span>متابعة خاصة</span></div>
          <div className="stat"><b>2</b><span>أقصى أجهزة ولي الأمر</span></div>
        </div>
      </section>

      <section className="grid">
        <Link className="card" href="/teacher/students">
          <div className="icon">👥</div>
          <h3>الطلاب والمتابعة</h3>
          <p>إضافة وأرشفة الطلاب، التقييم، المهارات، الخطط العلاجية وسجل الطالب.</p>
        </Link>
        <Link className="card" href="/teacher/settings">
          <div className="icon green">⚙️</div>
          <h3>إدارة الفصل والمواد</h3>
          <p>تغيير الفصل الدراسي، إضافة مادة أو إيقافها وترتيبها بدون تعديل الكود.</p>
        </Link>
        <Link className="card" href="/guardian">
          <div className="icon amber">🏠</div>
          <h3>معاينة بوابة ولي الأمر</h3>
          <p>متابعة الطالب، الخطة العلاجية، التواصل والطباعة على جهازين.</p>
        </Link>
        <Link className="card" href="/teacher/portfolio">
          <div className="icon green">📁</div>
          <h3>ملف إنجاز المعلم</h3>
          <p>يتجمع تلقائيًا طوال الفصل، ثم يطبع أو يشارك كرابط أو PDF.</p>
        </Link>
        <Link className="card" href="/teacher/students/s1">
          <div className="icon red">🩺</div>
          <h3>المتابعة الخاصة</h3>
          <p>ملف مستقل للحالة الصحية أو التعليمية أو السلوكية مع أهداف ومراجعات.</p>
        </Link>
        <div className="card">
          <div className="icon">📚</div>
          <h3>المهارات والتوزيع</h3>
          <p>الهيكلة جاهزة لربط كل مهارة بالمادة والفصل والتوزيع الأسبوعي المعتمد.</p>
        </div>
      </section>

      <section className="section">
        <div className="section-head"><h2>تنبيهات تحتاج انتباهك</h2></div>
        <div className="list">
          <div className="row">
            <div className="row-main"><div className="avatar">📖</div><div><h4>مهارات تحتاج تدريب</h4><small>سيتم تجميع الطلاب حسب المهارة لتسهيل الخطة العلاجية الجماعية.</small></div></div>
            <span className="badge warn">متابعة</span>
          </div>
          <div className="row">
            <div className="row-main"><div className="avatar">🔒</div><div><h4>أجهزة ولي الأمر</h4><small>الحد الافتراضي جهازان لكل طالب مع إمكانية إلغاء جهاز من لوحة المعلم.</small></div></div>
            <span className="badge">مضبوط</span>
          </div>
        </div>
      </section>
    </main>
  );
}
