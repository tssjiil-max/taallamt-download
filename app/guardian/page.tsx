"use client";
import Link from "next/link";
import { FormEvent, useEffect, useState } from "react";
import {
  guardianLogin,
  guardianMe,
  guardianSearch,
  guardianSendMessage,
  type GuardianSearchStudent,
} from "@/lib/guardian-api";
import { academicWeek, plansForWeek } from "@/lib/schedule";
import { AppInstallPanel } from "@/components/AppInstallPanel";
import { NotificationPanel } from "@/components/NotificationPanel";
import type {
  LearningResource,
  MasteryLevel,
  Message,
  Skill,
  SkillAssessment,
  SpecialFollowUp,
  Subject,
  Term,
  ValueStar,
  ValueTarget,
  WeeklyPlan,
} from "@/lib/types";
import "./guardian-polish.css";
const labels: Record<MasteryLevel, string> = {
    mastered: "أتقن",
    partial: "يحتاج تدريب",
    needs_training: "يحتاج تدريب",
  },
  order = ["لغتي", "القرآن الكريم", "الدراسات الإسلامية"],
  icons = "/guardian-icons/";
const subjectIcon = (n: string) =>
  n.includes("لغتي")
    ? icons + "lughati.svg"
    : n.includes("قرآن")
      ? icons + "quran.svg"
      : icons + "islamic.svg";
const shortName = (name: string) => {
  const p = name.trim().split(/\s+/).filter(Boolean);
  return p.length <= 3 ? p.join(" ") : [p[0], p[1], p[p.length - 1]].join(" ");
};
type Profile = {
  preferredName?: string;
  photoDataUrl?: string;
  learningDifficulties?: string;
};
type Bundle = {
  student: {
    id: string;
    name: string;
    className: string;
    subjectLevels: Record<string, MasteryLevel>;
  };
  profile: Profile | null;
  activeTerm: Term | null;
  subjects: Subject[];
  weeklyPlans: WeeklyPlan[];
  skills: Skill[];
  assessments: SkillAssessment[];
  resources: Array<Omit<LearningResource, "answerGuide">>;
  values: ValueTarget[];
  valueStars: ValueStar[];
  followUp: SpecialFollowUp | null;
  messages: Message[];
};
function errText(e: unknown) {
  const p = (e as { payload?: { error?: string } })?.payload;
  if (p?.error === "ACCESS_DISABLED") return "هذا الطالب غير نشط حاليًا.";
  return "تعذر فتح صفحة الطالب الآن.";
}
function GuardianHeader() {
  return (
    <header className="guardian-brand-header">
      <div>
        <span>متابعة ولي الأمر</span>
        <h1>تعلّمت</h1>
        <p>معًا نصنع مستقبلهم</p>
      </div>
      <div className="guardian-shak-visual" aria-hidden="true">
        <img src="/shakabumbo-guardian.webp" alt="" />
      </div>
    </header>
  );
}
function GuardianMeta() {
  const [date, setDate] = useState(""),
    [count, setCount] = useState(0);
  useEffect(() => {
    setDate(
      new Intl.DateTimeFormat("ar-SA", {
        timeZone: "Asia/Riyadh",
        weekday: "short",
        day: "numeric",
        month: "short",
      }).format(new Date()),
    );
    fetch("/api/guardian/announcements", { cache: "no-store" })
      .then(async (r) => (r.ok ? r.json() : null))
      .then(
        (d) =>
          Array.isArray(d?.announcements) && setCount(d.announcements.length),
      )
      .catch(() => {});
  }, []);
  return (
    <div className="guardian-meta-row">
      <span>{date || "اليوم"}</span>
      <Link href="/guardian/announcements">
        <i aria-hidden="true" />
        الإعلانات <b>{count}</b>
      </Link>
    </div>
  );
}
export default function GuardianPage() {
  const [bundle, setBundle] = useState<Bundle | null>(null),
    [ready, setReady] = useState(false),
    [search, setSearch] = useState(""),
    [matches, setMatches] = useState<GuardianSearchStudent[]>([]),
    [selected, setSelected] = useState(""),
    [error, setError] = useState(""),
    [busy, setBusy] = useState(false),
    [message, setMessage] = useState(""),
    [notice, setNotice] = useState(""),
    [contactOpen, setContactOpen] = useState(false),
    [homeBehavior,setHomeBehavior]=useState("الالتزام بالتعليمات"),
    [homeLevel,setHomeLevel]=useState("جيد ✓");
  const refresh = async () => {
    const b = await guardianMe<Bundle>();
    setBundle(b);
    return b;
  };
  useEffect(() => {
    guardianMe<Bundle>()
      .then(setBundle)
      .catch(() => {})
      .finally(() => setReady(true));
  }, []);
  useEffect(() => {
    if (bundle || search.trim().length < 2) {
      setMatches([]);
      return;
    }
    const t = setTimeout(
      () =>
        guardianSearch(search.trim())
          .then((r) => setMatches(r.students))
          .catch(() => setMatches([])),
      250,
    );
    return () => clearTimeout(t);
  }, [search, bundle]);
  useEffect(() => {
    if (!notice) return;
    const t = setTimeout(() => setNotice(""), 3500);
    return () => clearTimeout(t);
  }, [notice]);
  async function login(e: FormEvent) {
    e.preventDefault();
    if (!selected) return;
    setBusy(true);
    setError("");
    try {
      await guardianLogin(selected);
      await refresh();
    } catch (x) {
      setError(errText(x));
    } finally {
      setBusy(false);
    }
  }
  async function send(e: FormEvent) {
    e.preventDefault();
    if (!message.trim()) return;
    setBusy(true);
    try {
      await guardianSendMessage(message.trim());
      setMessage("");
      await refresh();
      setNotice("تم إرسال طلب التواصل للمعلم");
      setContactOpen(false);
    } catch {
      setNotice("لم تُرسل الرسالة، ولن يعاد إرسالها تلقائيًا.");
    } finally {
      setBusy(false);
    }
  }
  async function sendHomeBehavior(){
    setBusy(true);
    try{await guardianSendMessage(`تقييم المنزل: ${homeBehavior} — ${homeLevel}`);await refresh();setNotice("تم إرسال تقييم المنزل للمعلم");}
    catch{setNotice("لم يُرسل التقييم، ولن يعاد إرساله تلقائيًا.");}
    finally{setBusy(false)}
  }
  if (!ready)
    return (
      <main className="shell">
        <div className="empty-state">جاري فتح بوابة ولي الأمر…</div>
      </main>
    );
  if (!bundle)
    return (
      <main className="shell guardian-shell">
        <GuardianHeader />
      <GuardianMeta />
        <section className="ui-section">
          <h2>دخول ولي الأمر</h2>
          <form className="card stack" onSubmit={login}>
            <input
              className="field"
              value={search}
              onChange={(e) => {
                setSearch(e.target.value);
                setSelected("");
              }}
              placeholder="اسم الطالب"
            />
            {matches.map((m) => (
              <button
                type="button"
                className={`row guardian-pick ${selected === m.id ? "selected" : ""}`}
                key={m.id}
                onClick={() => setSelected(m.id)}
              >
                <span>{m.name}</span>
                <small>{m.className}</small>
              </button>
            ))}
            {error && <div className="notice warn">{error}</div>}
            <button className="btn" disabled={busy || !selected}>فتح صفحة الطالب</button>
          </form>
        </section>
      </main>
    );
  const s = bundle.student,
    p = bundle.profile,
    subjects = bundle.subjects
      .filter((x) => x.enabled !== false && order.includes(x.name))
      .sort((a, b) => order.indexOf(a.name) - order.indexOf(b.name)),
    week = academicWeek(),
    weekly = plansForWeek(bundle.weeklyPlans, week),
    teacherMessages = bundle.messages.filter((x) => x.author === "teacher"),
    needs = bundle.assessments.filter((x) => x.level === "needs_training"),
    stars = bundle.valueStars.length,
    awards = Math.floor(stars / 30),
    progress = stars % 30,
    displayName = shortName(p?.preferredName || s.name),
    updates = [
      ...bundle.assessments.map((a) => ({
        id: a.id,
        at: a.assessedAt,
        title: "تقييم",
        detail: labels[a.level],
      })),
      ...teacherMessages.map((m) => ({
        id: m.id,
        at: m.createdAt,
        title: "رسالة المعلم",
        detail: m.body,
      })),
      ...bundle.valueStars.map((v) => ({
        id: v.id,
        at: v.awardedAt,
        title: "نجمة",
        detail: "سلوك إيجابي",
      })),
    ]
      .sort((a, b) => b.at.localeCompare(a.at))
      .slice(0, 3);
  const lughati = subjects.find((x) => x.name === "لغتي"),
    spellingLevel = lughati ? s.subjectLevels[lughati.id] : undefined;
  return (
    <main className="shell guardian-shell guardian-dashboard">
      <GuardianHeader />
      <AppInstallPanel compact />
      <section className="guardian-hero">
        <Link href="/guardian/profile" className="student-main-card">
          <div className="student-main-photo">
            {p?.photoDataUrl ? (
              <img src={p.photoDataUrl} alt="صورة الطالب" />
            ) : (
              <img src="/shakabumbo-guardian.webp" alt="إضافة صورة الطالب" />
            )}
            {!p?.photoDataUrl && (
              <span className="photo-add-mark">إضافة صورة</span>
            )}
          </div>
          <div className="student-main-copy">
            <h1>{displayName}</h1>
            <p>{s.className}</p>
            <small>ملف الطالب وإعداداته</small>
          </div>
          <span className="student-card-arrow" aria-hidden="true">
            ‹
          </span>
        </Link>
      </section>
        <GuardianMeta />
      {notice && (
        <div className="guardian-toast" role="status">
          {notice}
        </div>
      )}
      <section className="ui-section rating-section">
        <div className="section-title-row">
          <div>
            <h2>التقييم العام</h2>
            <p>نجوم الطالب التي منحها المعلم</p>
          </div>
          <div className="rating-counters">
            <span>
              <b>{stars}</b> نجمة
            </span>
            <span>
              <b>{awards}</b> جائزة
            </span>
          </div>
        </div>
        <div className="thirty-stars">
          {Array.from({ length: 30 }, (_, i) => (
            <span className={i < progress ? "earned" : ""} key={i}>
              ★
            </span>
          ))}
        </div>
      </section>
      <section className="ui-section">
        <div className="section-title-row">
          <div>
            <h2>المواد</h2>
            <p>آخر تقييم مسجل</p>
          </div>
        </div>
        <div className="guardian-four-grid">
          {subjects.slice(0, 1).map((x) => (
            <a href="#weekly" className="guardian-big-choice" key={x.id}>
              <img src={subjectIcon(x.name)} alt="" />
              <h3>{x.name}</h3>
              <p>
                {s.subjectLevels[x.id]
                  ? labels[s.subjectLevels[x.id]]
                  : "لم يقيّم"}
              </p>
            </a>
          ))}
          <a href="#weekly" className="guardian-big-choice spelling-tile">
              <img src={icons + "message.svg"} alt="" />
            <h3>الإملاء والخط</h3>
            <p>{spellingLevel ? labels[spellingLevel] : "لم يقيّم"}</p>
          </a>
          {subjects.slice(1).map((x) => (
            <a href="#weekly" className="guardian-big-choice" key={x.id}>
              <img src={subjectIcon(x.name)} alt="" />
              <h3>{x.name}</h3>
              <p>
                {s.subjectLevels[x.id]
                  ? labels[s.subjectLevels[x.id]]
                  : "لم يقيّم"}
              </p>
            </a>
          ))}
          <a className="guardian-big-choice library-tile" href="#library">
            <img src={icons + "library.svg"} alt="" />
            <h3>المكتبة</h3>
            <p>
              {bundle.resources.length
                ? `${bundle.resources.length} مادة`
                : "لا توجد ملفات"}
            </p>
          </a>
        </div>
      </section>
      <section className="ui-section" id="weekly">
        <div className="section-title-row">
          <div>
            <h2>هذا الأسبوع</h2>
          </div>
          <span className="soft-chip">الأسبوع {week}</span>
        </div>
        <div className="week-compact-list">
          {weekly.map((w) => (
            <div className="week-compact-row" key={w.id}>
              <b>
                {subjects.find((x) => x.id === w.subjectId)?.name || "المادة"}
              </b>
              <p>{w.title}</p>
            </div>
          ))}
          {!weekly.length && (
            <div className="empty-state compact-empty">لا توجد خطة منشورة.</div>
          )}
        </div>
      </section>
      <section className="ui-section" id="follow">
        <div className="section-title-row">
          <div>
            <h2>يحتاج متابعتك</h2>
          </div>
        </div>
        {needs.length || p?.learningDifficulties || bundle.followUp ? (
          <div className="attention-card">
            {needs.length > 0 && (
              <p>توجد {needs.length} مهارات تحتاج تدريبًا.</p>
            )}
            {p?.learningDifficulties && <p>توجد ملاحظة مسجلة في ملف الطالب.</p>}
            {bundle.followUp?.goal && (
              <p>
                <b>الهدف الحالي:</b> {bundle.followUp.goal}
              </p>
            )}
          </div>
        ) : (
          <div className="empty-state compact-empty">
            لا توجد متابعة مطلوبة حاليًا.
          </div>
        )}
      </section>
      <section className="ui-section">
        <div className="section-title-row">
          <div>
            <h2>آخر النشاطات</h2>
          </div>
        </div>
        {updates.length ? (
          <div className="guardian-news-strip">
            {updates.map((u) => (
              <article key={`${u.id}-${u.at}`}>
                <b>{u.title}</b>
                <span>{u.detail}</span>
              </article>
            ))}
          </div>
        ) : (
          <div className="empty-state compact-empty">
            لا توجد تحديثات حديثة.
          </div>
        )}
      </section>
      <section className="ui-section contact-section">
        <NotificationPanel role="guardian" studentId={s.id} />
      </section>
      <section className="ui-section contact-section">
        <div className="section-title-row"><div><h2>السلوك خارج المدرسة</h2><p>قيّم سلوك ابنك في المنزل فقط</p></div></div>
        <div className="guardian-home-behavior"><select className="field" value={homeBehavior} onChange={e=>setHomeBehavior(e.target.value)}><option>الالتزام بالتعليمات</option><option>احترام الآخرين</option><option>تحمل المسؤولية</option><option>النظافة والترتيب</option><option>الصدق والأمانة</option></select><div className="segmented">{["متميز ⭐","جيد ✓","يحتاج متابعة !"].map(level=><button type="button" className={homeLevel===level?"active":""} onClick={()=>setHomeLevel(level)} key={level}>{level}</button>)}</div><button className="btn" disabled={busy} onClick={()=>void sendHomeBehavior()}>إرسال تقييم المنزل</button></div>
      </section>
      <section className="ui-section contact-section">
        <button
          type="button"
          className="guardian-contact-trigger"
          onClick={() => setContactOpen((v) => !v)}
        >
          <img src={icons + "message.svg"} alt="" />
          <span>
            <b>طلب تواصل مع المعلم</b>
            <small>
              {contactOpen ? "إغلاق النموذج" : "اضغط لكتابة الرسالة"}
            </small>
          </span>
        </button>
        {contactOpen && (
          <div className="contact-drawer card">
            <div className="contact-drawer-head">
              <h3>طلب تواصل مع المعلم</h3>
              <button type="button" onClick={() => setContactOpen(false)}>
                إغلاق
              </button>
            </div>
            {bundle.messages.slice(-3).map((m) => (
              <div className="message-mini" key={m.id}>
                <b>{m.author === "teacher" ? "المعلم" : "ولي الأمر"}</b>
                <p>{m.body}</p>
              </div>
            ))}
            <form className="stack" onSubmit={send}>
              <input
                className="field"
                value={message}
                onChange={(e) => setMessage(e.target.value)}
                placeholder="اكتب طلب التواصل أو رسالتك"
              />
              <button className="btn" disabled={busy}>
                إرسال الطلب
              </button>
            </form>
          </div>
        )}
      </section>
      <section className="ui-section" id="library">
        <div className="section-title-row">
          <div>
            <h2>المكتبة</h2>
            <p>للقراءة والتحميل</p>
          </div>
        </div>
        <div className="square-grid">
        {bundle.resources.length ? (
          <>
            {bundle.resources.map((r) => (
              <Link
                className="square-card"
                href={`/guardian/resources/${r.id}`}
                key={r.id}
              >
                <img className="edu-icon" src={icons + "library.svg"} alt="" />
                <h3>{r.title}</h3>
                <p>{r.instructions}</p>
              </Link>
            ))}
          </>
        ) : (
          null
        )}
        </div>
      </section>
      <section className="ui-section"><Link className="guardian-contact-trigger" href="/student"><img src={icons+"trophy.svg"} alt=""/><span><b>ملف إنجاز الطالب</b><small>الأعمال والنجوم والإنجازات المعتمدة</small></span></Link></section>
      <section className="ui-section follow-hub">
        <div className="section-title-row">
          <div>
            <h2>الخطة والمتابعة</h2>
            <p>الخطة العلاجية للطالب</p>
          </div>
        </div>
        {bundle.followUp?.goal ? (
          <div className="card">
            <h3>{bundle.followUp.goal}</h3>
            {bundle.followUp.plan?.length ? (
              <ul>
                {bundle.followUp.plan.map((x) => (
                  <li key={x}>{x}</li>
                ))}
              </ul>
            ) : null}
          </div>
        ) : (
          <div className="empty-state compact-empty">
            لا توجد خطة علاجية منشورة حاليًا.
          </div>
        )}
      </section>
      <footer className="site-credit">برمجة سلطان الصاعدي</footer>
      <nav className="bottom-nav guardian-bottom-nav">
        <Link className="bottom-nav-item active" href="/guardian">
          <b>الرئيسية</b>
        </Link>
        <a className="bottom-nav-item" href="#library">
          <b>المكتبة</b>
        </a>
        <a className="bottom-nav-item" href="#follow">
          <b>المتابعة</b>
        </a>
      </nav>
    </main>
  );
}
