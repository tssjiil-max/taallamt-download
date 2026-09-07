import { subjects, terms } from "@/lib/sample-data";

export default function SettingsPage() {
  return (
    <main className="shell">
      <header className="topbar">
        <div className="brand"><div className="logo">⚙️</div><div><h1>إدارة الفصل</h1><p>كل شيء قابل للتغيير من هنا</p></div></div>
      </header>

      <section className="two">
        <div className="card">
          <div className="section-head"><h2>الفصول الدراسية</h2><button className="btn no-print">+ فصل جديد</button></div>
          <div className="list">
            {terms.map((term) => (
              <div className="row" key={term.id}>
                <div><h4>{term.name}</h4><small>{term.academicYear}</small></div>
                <span className={term.active ? "badge" : "badge warn"}>{term.active ? "الحالي" : "غير نشط"}</span>
              </div>
            ))}
          </div>
        </div>

        <div className="card">
          <div className="section-head"><h2>المواد</h2><button className="btn no-print">+ إضافة مادة</button></div>
          <div className="list">
            {subjects.map((subject) => (
              <div className="row" key={subject.id}>
                <div><h4>{subject.name}</h4><small>الترتيب {subject.order}</small></div>
                <div className="mini-actions no-print"><button className="btn secondary">تعديل</button><button className="btn secondary">إيقاف</button></div>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section className="section">
        <div className="card">
          <h3>قاعدة النظام</h3>
          <p>المواد والمهارات والطلاب مرتبطة بالفصل الدراسي. عند الفصل الثاني تستطيع إنشاء فصل جديد، اختيار المواد المطلوبة وإبقاء تاريخ الفصل الأول محفوظًا.</p>
        </div>
      </section>
    </main>
  );
}
