"use client";

import Link from "next/link";
import { ChangeEvent, FormEvent, useEffect, useState } from "react";
import { UiIcon } from "@/components/UiIcon";
import {
  guardianLogin,
  guardianMe,
  guardianPortfolioDelete,
  guardianPortfolioItems,
  guardianPortfolioUpload,
  guardianRequestContact,
  guardianSearch,
  guardianSendHomeBehavior,
  guardianSendMessage,
  type GuardianPortfolioItem,
  type GuardianSearchStudent,
} from "@/lib/guardian-api";
import { academicWeek, plansForWeek } from "@/lib/schedule";
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

const schoolName = "مدرسة عمرو بن أوس الثقفي";
const subjectOrder = ["لغتي", "القرآن الكريم", "الدراسات الإسلامية"];
const levelLabel: Record<MasteryLevel, string> = {
  mastered: "أتقن",
  partial: "أتقن البعض",
  needs_training: "يحتاج تدريب",
};

type StudentTab = "home" | "follow" | "homework" | "subjects" | "more";
type Profile = {
  preferredName?: string;
  photoDataUrl?: string;
  interests?: string;
  strengths?: string;
  learningDifficulties?: string;
  helpfulNotes?: string;
};
type CommunicationAccess = { status: "closed" | "pending" | "approved" | "rejected"; reason?: string };
type Bundle = {
  student: { id: string; name: string; className: string; subjectLevels: Record<string, MasteryLevel> };
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
  communicationAccess?: CommunicationAccess;
};
type SubjectCard = {
  id: string;
  name: string;
  icon: string;
  levelKey?: MasteryLevel;
  level: string;
};

function shortName(name: string) {
  const parts = name.trim().split(/\s+/).filter(Boolean);
  return parts.length <= 3 ? parts.join(" ") : [parts[0], parts[1], parts.at(-1)].join(" ");
}

function subjectIcon(name: string) {
  if (name.includes("لغتي")) return "/subject-icons/lughati.svg";
  if (name.includes("قرآن")) return "/subject-icons/quran.svg";
  if (name.includes("إملاء") || name.includes("خط")) return "/subject-icons/handwriting.svg";
  return "/subject-icons/islamic.svg";
}

function errorText(error: unknown) {
  const code = (error as { payload?: { error?: string } })?.payload?.error;
  if (code === "ACCESS_DISABLED") return "هذا الطالب غير نشط حاليًا.";
  return "تعذر فتح صفحة الطالب الآن.";
}

function formatUpdate(value?: string) {
  if (!value) return "لا يوجد تحديث";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "آخر تحديث محفوظ";
  return new Intl.DateTimeFormat("ar-SA", { timeZone: "Asia/Riyadh", day: "numeric", month: "short" }).format(date);
}

function resizeImage(file: File) {
  return new Promise<string>((resolve, reject) => {
    const reader = new FileReader();
    reader.onerror = () => reject(new Error("READ_FAILED"));
    reader.onload = () => {
      const image = new Image();
      image.onerror = () => reject(new Error("IMAGE_FAILED"));
      image.onload = () => {
        const max = 1400;
        const ratio = Math.min(1, max / Math.max(image.width, image.height));
        const canvas = document.createElement("canvas");
        canvas.width = Math.max(1, Math.round(image.width * ratio));
        canvas.height = Math.max(1, Math.round(image.height * ratio));
        const ctx = canvas.getContext("2d");
        if (!ctx) return reject(new Error("CANVAS_FAILED"));
        ctx.drawImage(image, 0, 0, canvas.width, canvas.height);
        const data = canvas.toDataURL("image/jpeg", 0.72);
        if (data.length > 700_000) return reject(new Error("TOO_LARGE"));
        resolve(data);
      };
      image.src = String(reader.result);
    };
    reader.readAsDataURL(file);
  });
}

export default function GuardianPage() {
  const [bundle, setBundle] = useState<Bundle | null>(null);
  const [ready, setReady] = useState(false);
  const [tab, setTab] = useState<StudentTab>("home");
  const [search, setSearch] = useState("");
  const [matches, setMatches] = useState<GuardianSearchStudent[]>([]);
  const [selected, setSelected] = useState("");
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  const [notice, setNotice] = useState("");
  const [homeBehavior, setHomeBehavior] = useState("الالتزام بالتعليمات");
  const [homeLevel, setHomeLevel] = useState<"متميز ⭐" | "جيد ✓" | "يحتاج متابعة !">("متميز ⭐");
  const [contactReason, setContactReason] = useState("");
  const [message, setMessage] = useState("");
  const [portfolioItems, setPortfolioItems] = useState<GuardianPortfolioItem[]>([]);
  const [portfolioTitle, setPortfolioTitle] = useState("");
  const [portfolioFile, setPortfolioFile] = useState<File | null>(null);

  const refresh = async () => {
    const next = await guardianMe<Bundle>();
    setBundle(next);
    return next;
  };
  const refreshPortfolio = async () => {
    const response = await guardianPortfolioItems();
    setPortfolioItems(response.items);
  };

  useEffect(() => {
    guardianMe<Bundle>()
      .then((data) => { setBundle(data); return guardianPortfolioItems(); })
      .then((response) => response && setPortfolioItems(response.items))
      .catch(() => {})
      .finally(() => setReady(true));
  }, []);

  useEffect(() => {
    const sync = () => {
      const hash = window.location.hash.replace("#", "") as StudentTab;
      if (["home", "follow", "homework", "subjects", "more"].includes(hash)) setTab(hash);
      else setTab("home");
      window.scrollTo({ top: 0, behavior: "smooth" });
    };
    sync();
    window.addEventListener("hashchange", sync);
    return () => window.removeEventListener("hashchange", sync);
  }, []);

  useEffect(() => {
    if (bundle || search.trim().length < 2) { setMatches([]); return; }
    const timer = setTimeout(() => guardianSearch(search.trim()).then((r) => setMatches(r.students)).catch(() => setMatches([])), 250);
    return () => clearTimeout(timer);
  }, [bundle, search]);

  useEffect(() => {
    if (!notice) return;
    const timer = setTimeout(() => setNotice(""), 4200);
    return () => clearTimeout(timer);
  }, [notice]);

  async function login(event: FormEvent) {
    event.preventDefault();
    if (!selected) return;
    setBusy(true); setError("");
    try { await guardianLogin(selected); await refresh(); await refreshPortfolio(); }
    catch (x) { setError(errorText(x)); }
    finally { setBusy(false); }
  }

  async function sendHomeEvaluation() {
    setBusy(true);
    try { await guardianSendHomeBehavior(homeBehavior, homeLevel); setNotice("تم حفظ تقييم ولي الأمر وإرساله للمعلم."); }
    catch { setNotice("تعذر إرسال تقييم المنزل الآن."); }
    finally { setBusy(false); }
  }

  async function requestContact(event: FormEvent) {
    event.preventDefault(); setBusy(true);
    try { await guardianRequestContact(contactReason.trim()); setContactReason(""); await refresh(); setNotice("تم إرسال طلب التواصل للمعلم."); }
    catch { setNotice("تعذر إرسال طلب التواصل الآن."); }
    finally { setBusy(false); }
  }

  async function sendMessage(event: FormEvent) {
    event.preventDefault();
    if (!message.trim()) return;
    setBusy(true);
    try { await guardianSendMessage(message.trim()); setMessage(""); await refresh(); setNotice("تم إرسال الرسالة للمعلم."); }
    catch { setNotice("تعذر إرسال الرسالة الآن."); }
    finally { setBusy(false); }
  }

  async function uploadPortfolio(event: FormEvent) {
    event.preventDefault();
    if (!portfolioFile) return;
    setBusy(true);
    try {
      let dataUrl = "";
      if (portfolioFile.type.startsWith("image/")) dataUrl = await resizeImage(portfolioFile);
      else if (portfolioFile.type === "application/pdf") {
        if (portfolioFile.size > 500_000) throw new Error("TOO_LARGE");
        dataUrl = await new Promise<string>((resolve, reject) => {
          const reader = new FileReader();
          reader.onerror = () => reject(new Error("READ_FAILED"));
          reader.onload = () => resolve(String(reader.result));
          reader.readAsDataURL(portfolioFile);
        });
      } else throw new Error("TYPE");
      await guardianPortfolioUpload({ title: portfolioTitle.trim() || portfolioFile.name.replace(/\.[^.]+$/, ""), fileName: portfolioFile.name, mimeType: portfolioFile.type, dataUrl });
      setPortfolioTitle(""); setPortfolioFile(null);
      const input = document.getElementById("sp-portfolio-file") as HTMLInputElement | null;
      if (input) input.value = "";
      await refreshPortfolio(); setNotice("تمت إضافة العمل إلى ملف الإنجاز.");
    } catch (x) {
      setNotice((x as Error)?.message === "TOO_LARGE" ? "الملف كبير. استخدم صورة أو PDF أصغر من 500 كيلوبايت." : "تعذر رفع العمل. استخدم صورة أو PDF صغيرًا.");
    } finally { setBusy(false); }
  }

  async function removePortfolio(id: string) {
    setBusy(true);
    try { await guardianPortfolioDelete(id); await refreshPortfolio(); setNotice("تم حذف العمل من ملف الإنجاز."); }
    catch { setNotice("تعذر حذف العمل الآن."); }
    finally { setBusy(false); }
  }

  if (!ready) return <main className="sp-loading">جاري فتح صفحة الطالب…</main>;
  if (!bundle) {
    return (
      <main className="sp-login">
        <section>
          <img src="/shakabumbo-guardian.webp" alt="شكابمبو" />
          <h1>صفحة الطالب</h1>
          <p>اختر اسم الطالب لفتح صفحته.</p>
          <form onSubmit={login}>
            <input value={search} onChange={(e) => { setSearch(e.target.value); setSelected(""); }} placeholder="اسم الطالب" />
            <div className="sp-login-results">{matches.map((item) => <button type="button" key={item.id} className={selected === item.id ? "active" : ""} onClick={() => setSelected(item.id)}><b>{item.name}</b><span>{item.className}</span></button>)}</div>
            {error ? <div className="sp-notice warn">{error}</div> : null}
            <button className="sp-primary" disabled={busy || !selected}>{busy ? "جاري الفتح…" : "فتح صفحة الطالب"}</button>
          </form>
        </section>
      </main>
    );
  }

  const student = bundle.student;
  const profile = bundle.profile;
  const displayName = shortName(profile?.preferredName || student.name);
  const week = academicWeek();
  const weekly = plansForWeek(bundle.weeklyPlans, week);
  const subjects = bundle.subjects.filter((x) => x.enabled !== false && subjectOrder.includes(x.name)).sort((a, b) => subjectOrder.indexOf(a.name) - subjectOrder.indexOf(b.name));
  const subjectCards: SubjectCard[] = subjects.map((subject) => ({ id: subject.id, name: subject.name, icon: subjectIcon(subject.name), levelKey: student.subjectLevels[subject.id], level: student.subjectLevels[subject.id] ? levelLabel[student.subjectLevels[subject.id]] : "لم يقيّم" }));
  const lughati = subjects.find((x) => x.name.includes("لغتي"));
  subjectCards.push({ id: "spelling", name: "الإملاء والخط", icon: subjectIcon("الإملاء والخط"), levelKey: lughati ? student.subjectLevels[lughati.id] : undefined, level: lughati && student.subjectLevels[lughati.id] ? levelLabel[student.subjectLevels[lughati.id]] : "لم يقيّم" });

  const latestAssessments = [...bundle.assessments].sort((a, b) => b.assessedAt.localeCompare(a.assessedAt));
  const recentAssessments = latestAssessments.slice(0, 6);
  const allLevels = Object.values(student.subjectLevels);
  const studentStatus = allLevels.includes("needs_training") ? "يحتاج تدريب" : allLevels.includes("partial") ? "أتقن البعض" : allLevels.length && allLevels.every((x) => x === "mastered") ? "متميز" : "قيد المتابعة";
  const latestDates = [...bundle.assessments.map((x) => x.assessedAt), ...bundle.valueStars.map((x) => x.awardedAt), ...bundle.messages.map((x) => x.createdAt)].filter(Boolean).sort();
  const lastUpdate = formatUpdate(latestDates.at(-1));
  const stars = bundle.valueStars.length;
  const visibleFollowUp = bundle.followUp;
  const communicationStatus = bundle.communicationAccess?.status ?? "closed";
  const profileFacts = [profile?.interests && { label: "اهتماماته", value: profile.interests }, profile?.strengths && { label: "نقاط القوة", value: profile.strengths }, profile?.helpfulNotes && { label: "ما يساعده", value: profile.helpfulNotes }, profile?.learningDifficulties && { label: "يحتاج دعمًا في", value: profile.learningDifficulties }].filter(Boolean) as Array<{ label: string; value: string }>;

  const homeworkBlock = (
    <section className="sp-card sp-homework">
      <div className="sp-section-head"><div><UiIcon name="check" /><span><h2>واجباتي اليومية</h2><p>المهام المنشورة من المعلم للأسبوع الحالي</p></span></div>{weekly.length ? <button onClick={() => { location.hash = "homework"; }} type="button">عرض الكل</button> : null}</div>
      {weekly.length ? <div className="sp-homework-list">{weekly.slice(0, tab === "home" ? 3 : weekly.length).map((item) => <article key={item.id}><span className="sp-task-dot" /><div><b>{subjects.find((s) => s.id === item.subjectId)?.name || "المادة"}</b><p>{item.title}</p></div><small>منشور</small></article>)}</div> : <div className="sp-empty">لا توجد واجبات جديدة حاليًا.</div>}
      {weekly.length && tab === "home" ? <button className="sp-primary sp-start" type="button" onClick={() => { location.hash = "homework"; }}>ابدأ الآن</button> : null}
    </section>
  );

  const subjectsBlock = (
    <section className="sp-card sp-subjects">
      <div className="sp-section-head"><div><UiIcon name="book" /><span><h2>المواد الدراسية</h2><p>حسب تقييم المعلم</p></span></div></div>
      <div className="sp-subject-grid">{subjectCards.map((subject) => <article key={subject.id}><img src={subject.icon} alt="" /><b>{subject.name}</b><span data-level={subject.levelKey || "none"}>{subject.level}</span></article>)}</div>
    </section>
  );

  const followBlock = (
    <section className="sp-card sp-follow">
      <div className="sp-section-head"><div><UiIcon name="report" /><span><h2>المتابعة</h2><p>آخر ما سجله المعلم للطالب</p></span></div></div>
      {recentAssessments.length ? <div className="sp-assessment-list">{recentAssessments.map((assessment) => { const skill = bundle.skills.find((x) => x.id === assessment.skillId); return <article key={assessment.id}><div><b>{skill?.title || "مهارة"}</b><small>{skill?.category || "تقييم"}</small></div><span data-level={assessment.level}>{levelLabel[assessment.level]}</span></article>; })}</div> : <div className="sp-empty">لا توجد تقييمات مسجلة حتى الآن.</div>}
      {visibleFollowUp?.goal ? <div className="sp-public-follow"><b>متابعة منشورة من المعلم</b><p>{visibleFollowUp.goal}</p></div> : null}
    </section>
  );

  return (
    <main className="sp-page">
      {notice ? <div className="sp-toast" role="status">{notice}</div> : null}

      {tab === "home" ? (
        <>
          <header className="sp-student-hero">
            <div className="sp-photo">{profile?.photoDataUrl ? <img src={profile.photoDataUrl} alt="صورة الطالب" /> : <UiIcon name="student" />}</div>
            <div className="sp-identity"><h1>{displayName}</h1><p><UiIcon name="book" />{student.className}</p><p><UiIcon name="library" />{schoolName}</p></div>
            <div className="sp-mascot"><img src="/student-icons/achievement-trophy.svg" alt="شكابمبو يحمل الكأس" /><span>دائمًا نحو الأفضل</span></div>
            <div className="sp-hero-meta"><div><UiIcon name="users" /><span>الفصل</span><b>{student.className}</b></div><div><UiIcon name="calendar" /><span>آخر تحديث من المعلم</span><b>{lastUpdate}</b></div><div><UiIcon name="star" /><span>حالة الطالب</span><b>{studentStatus}</b></div></div>
          </header>

          <section className="sp-card sp-values-summary"><UiIcon name="star" /><div><b>السلوك والقيم</b><span>{stars ? `${stars} نجوم مسجلة من المعلم` : "لا يوجد تقييم قيم مسجل بعد"}</span></div><strong>{stars ? "متميز" : "قيد المتابعة"}</strong></section>
          {homeworkBlock}
          {subjectsBlock}
          <section className="sp-two-cards">
            <button type="button" className="sp-card sp-quick" onClick={() => { location.hash = "follow"; }}><UiIcon name="report" /><div><b>متابعتي</b><span>{recentAssessments.length ? `${recentAssessments.length} تحديثات حديثة` : "لا توجد ملاحظات حاليًا"}</span></div><i>‹</i></button>
            <div className="sp-card sp-achievement"><img src="/student-icons/achievement-trophy.svg" alt="" /><div><b>إنجازاتي</b><span>{stars ? `${stars} نجمة مسجلة` : "ابدأ إنجازك الأول"}</span><div className="sp-stars">{Array.from({ length: 5 }, (_, i) => <span className={i < Math.min(stars, 5) ? "earned" : ""} key={i}>★</span>)}</div></div></div>
          </section>
        </>
      ) : null}

      {tab === "homework" ? <><header className="sp-tab-title"><UiIcon name="check" /><div><h1>الواجبات</h1><p>المهام المنشورة من المعلم</p></div></header>{homeworkBlock}</> : null}
      {tab === "subjects" ? <><header className="sp-tab-title"><UiIcon name="book" /><div><h1>المواد</h1><p>التقييم الدراسي الشامل</p></div></header>{subjectsBlock}</> : null}
      {tab === "follow" ? <><header className="sp-tab-title"><UiIcon name="report" /><div><h1>المتابعة</h1><p>المعلومات المنشورة لولي الأمر فقط</p></div></header>{followBlock}</> : null}

      {tab === "more" ? (
        <>
          <header className="sp-tab-title"><UiIcon name="more" /><div><h1>المزيد</h1><p>إعدادات الطالب والتواصل والأدوات الإضافية</p></div></header>
          <section className="sp-card sp-more-links">
            <Link href="/guardian/profile"><UiIcon name="settings" /><div><b>معلومات وإعدادات الطالب</b><span>الصورة والاسم المفضل والمعلومات المساندة</span></div><i>‹</i></Link>
            <a href="#sp-contact" onClick={(e) => { e.preventDefault(); document.getElementById("sp-contact")?.scrollIntoView({ behavior: "smooth" }); }}><UiIcon name="message" /><div><b>إرسال رسالة للمعلم</b><span>بحسب صلاحية التواصل الحالية</span></div><i>‹</i></a>
            <a href="#sp-home-eval" onClick={(e) => { e.preventDefault(); document.getElementById("sp-home-eval")?.scrollIntoView({ behavior: "smooth" }); }}><UiIcon name="star" /><div><b>تقييم الطالب في المنزل</b><span>تقييم ولي الأمر يصل للمعلم</span></div><i>‹</i></a>
          </section>

          <section className="sp-card sp-library"><div className="sp-section-head"><div><UiIcon name="library" /><span><h2>المكتبة</h2><p>المواد التي نشرها المعلم للطالب</p></span></div></div><div className="sp-library-grid">{bundle.resources.map((resource) => <Link href={`/guardian/resources/${resource.id}`} key={resource.id}><UiIcon name="book" /><div><b>{resource.title}</b><span>{resource.instructions || "مادة تعليمية"}</span></div></Link>)}{!bundle.resources.length ? <div className="sp-empty">لا توجد ملفات منشورة حاليًا.</div> : null}</div></section>

          <section className="sp-card sp-portfolio"><div className="sp-section-head"><div><UiIcon name="star" /><span><h2>ملف الإنجاز</h2><p>أعمال الطالب وشواهده</p></span></div></div><form className="sp-upload" onSubmit={uploadPortfolio}><input value={portfolioTitle} onChange={(e) => setPortfolioTitle(e.target.value)} maxLength={80} placeholder="اسم العمل — اختياري" /><label htmlFor="sp-portfolio-file"><UiIcon name="layers" /><span>{portfolioFile ? portfolioFile.name : "اختيار صورة أو PDF"}</span></label><input id="sp-portfolio-file" hidden type="file" accept="image/*,application/pdf" onChange={(e: ChangeEvent<HTMLInputElement>) => setPortfolioFile(e.target.files?.[0] ?? null)} /><button type="submit" disabled={busy || !portfolioFile}>إضافة إلى ملف الإنجاز</button></form><div className="sp-work-grid">{portfolioItems.map((item) => <article key={item.id}>{item.mimeType.startsWith("image/") ? <img src={item.dataUrl} alt={item.title} /> : <div className="sp-pdf">PDF</div>}<div><b>{item.title}</b><small>{new Date(item.createdAt).toLocaleDateString("ar-SA")}</small></div><div><a href={item.dataUrl} download={item.fileName}>فتح</a><button type="button" disabled={busy} onClick={() => void removePortfolio(item.id)}>حذف</button></div></article>)}{!portfolioItems.length ? <div className="sp-empty">لا توجد أعمال مضافة حتى الآن.</div> : null}</div></section>

          {profileFacts.length ? <section className="sp-card sp-facts"><h2>معلومات الطالب</h2><div>{profileFacts.map((fact) => <article key={fact.label}><b>{fact.label}</b><p>{fact.value}</p></article>)}</div></section> : null}

          <section className="sp-card sp-home-eval" id="sp-home-eval"><div className="sp-section-head"><div><UiIcon name="star" /><span><h2>تقييم الطالب في المنزل</h2><p>خاص بولي الأمر</p></span></div></div><select value={homeBehavior} onChange={(e) => setHomeBehavior(e.target.value)}><option>الالتزام بالتعليمات</option><option>احترام الآخرين</option><option>تحمل المسؤولية</option><option>النظافة والترتيب</option><option>الصدق والأمانة</option></select><div className="sp-choice-row"><button type="button" className={homeLevel === "متميز ⭐" ? "active" : ""} onClick={() => setHomeLevel("متميز ⭐")}>متميز</button><button type="button" className={homeLevel === "جيد ✓" ? "active" : ""} onClick={() => setHomeLevel("جيد ✓")}>جيد</button><button type="button" className={homeLevel === "يحتاج متابعة !" ? "active" : ""} onClick={() => setHomeLevel("يحتاج متابعة !")}>يحتاج متابعة</button></div><button className="sp-primary" type="button" disabled={busy} onClick={() => void sendHomeEvaluation()}>إرسال تقييم المنزل</button></section>

          <section className="sp-card sp-contact" id="sp-contact"><div className="sp-section-head"><div><UiIcon name="message" /><span><h2>التواصل مع المعلم</h2><p>رسائل مرتبطة بملف الطالب</p></span></div></div>{communicationStatus === "approved" ? <form onSubmit={sendMessage}><input value={message} onChange={(e) => setMessage(e.target.value)} placeholder="اكتب رسالتك للمعلم" /><button disabled={busy || !message.trim()}>إرسال</button></form> : communicationStatus === "pending" ? <div className="sp-empty">طلب التواصل قيد المراجعة.</div> : <form onSubmit={requestContact}><input value={contactReason} onChange={(e) => setContactReason(e.target.value)} placeholder="سبب التواصل — اختياري" /><button disabled={busy}>طلب فتح التواصل</button></form>}{bundle.messages.length ? <div className="sp-message-list">{bundle.messages.slice(-4).reverse().map((item) => <article key={item.id}><b>{item.author === "teacher" ? "المعلم" : "ولي الأمر"}</b><p>{item.body}</p></article>)}</div> : null}</section>
        </>
      ) : null}

      <footer className="sp-credit">برمجة سلطان الصاعدي</footer>
    </main>
  );
}
