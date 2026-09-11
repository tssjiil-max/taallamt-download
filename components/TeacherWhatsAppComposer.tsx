"use client";

import { useEffect, useMemo, useState } from "react";
import { academicWeek, plansForWeek } from "@/lib/schedule";
import { skillsNeedingTraining } from "@/lib/assessment";
import {
  getGuardianShareAccess,
  getTeacherStudentContacts,
  saveTeacherStudentContact,
  setGuardianAccessCode,
  type GuardianContact,
} from "@/lib/teacher-api";
import { useTaallamt } from "@/lib/store";

type WhatsAppType =
  | "student_page"
  | "summons"
  | "skill_followup"
  | "behavior"
  | "praise"
  | "homework"
  | "general";

const types: Array<{ id: WhatsAppType; label: string; hint: string }> = [
  { id: "student_page", label: "إرسال صفحة الطالب", hint: "رابط مباشر بدون رقم سري لمتابعة الأسرة" },
  { id: "summons", label: "استدعاء ولي الأمر", hint: "تنبيه مختصر مع رابط صفحة الطالب" },
  { id: "skill_followup", label: "متابعة مهارة", hint: "يتكوّن من آخر تقييمات الطالب" },
  { id: "behavior", label: "متابعة سلوكية", hint: "رسالة تربوية مختصرة ومحايدة" },
  { id: "praise", label: "إشادة وتحفيز", hint: "رسالة إيجابية حسب النجوم والتقدم" },
  { id: "homework", label: "واجب / تذكير", hint: "مبني على خطة الأسبوع الحالية" },
  { id: "general", label: "رسالة عامة", hint: "نص جاهز قابل للتعديل قبل الإرسال" },
];

function internalAccessCode() {
  return String(Math.floor(100000 + Math.random() * 900000));
}

function normalizeSaudiPhone(value: string) {
  let digits = value.replace(/\D/g, "");
  if (digits.startsWith("00966")) digits = digits.slice(2);
  if (digits.startsWith("05") && digits.length === 10) digits = `966${digits.slice(1)}`;
  else if (digits.startsWith("5") && digits.length === 9) digits = `966${digits}`;
  return digits;
}

export function TeacherWhatsAppComposer() {
  const store = useTaallamt();
  const students = useMemo(() => store.students.filter((student) => student.active), [store.students]);
  const [contacts, setContacts] = useState<GuardianContact[]>([]);
  const [studentId, setStudentId] = useState("");
  const [type, setType] = useState<WhatsAppType | "">("");
  const [guardianName, setGuardianName] = useState("");
  const [guardianPhone, setGuardianPhone] = useState("");
  const [message, setMessage] = useState("");
  const [busy, setBusy] = useState(false);
  const [notice, setNotice] = useState("");

  useEffect(() => {
    getTeacherStudentContacts()
      .then((result) => setContacts(result.contacts))
      .catch(() => setContacts([]));
  }, []);

  useEffect(() => {
    if (typeof window === "undefined") return;
    const params = new URLSearchParams(window.location.search);
    const requestedStudent = params.get("student") ?? "";
    if (requestedStudent && students.some((student) => student.id === requestedStudent)) setStudentId(requestedStudent);
  }, [students]);

  useEffect(() => {
    const contact = contacts.find((item) => item.studentId === studentId);
    setGuardianName(contact?.guardianName ?? "");
    setGuardianPhone(contact?.guardianPhone ?? "");
    setType("");
    setMessage("");
    setNotice("");
  }, [studentId, contacts]);

  const selectedStudent = students.find((student) => student.id === studentId);

  async function saveContact() {
    if (!selectedStudent) {
      setNotice("اختر الطالب أولًا.");
      return false;
    }
    const phone = normalizeSaudiPhone(guardianPhone);
    if (!phone || phone.length < 9) {
      setNotice("أدخل رقم جوال ولي الأمر أولًا.");
      return false;
    }
    try {
      const result = await saveTeacherStudentContact(
        selectedStudent.id,
        guardianName.trim(),
        phone,
        selectedStudent.name,
        selectedStudent.className,
      );
      setGuardianPhone(result.contact.guardianPhone);
      setContacts((current) => [
        ...current.filter((item) => item.studentId !== selectedStudent.id),
        result.contact,
      ]);
      return true;
    } catch (error) {
      const info = error as { status?: number };
      setNotice(info.status === 401 ? "انتهت جلسة المعلم. سجّل الدخول ثم أعد المحاولة." : "تعذر حفظ بيانات ولي الأمر الآن.");
      return false;
    }
  }

  async function ensureStudentPageUrl() {
    if (!selectedStudent) return "";
    let token = "";
    try {
      const current = await getGuardianShareAccess(selectedStudent.id);
      if (current.enabled && current.shareToken) token = current.shareToken;
    } catch {
      // If the Firestore student record has not been bootstrapped yet, POST below creates it safely.
    }
    if (!token) {
      const created = await setGuardianAccessCode(
        selectedStudent.id,
        internalAccessCode(),
        { name: selectedStudent.name, className: selectedStudent.className },
      );
      token = created.shareToken;
    }
    return `${window.location.origin}/guardian?student=${encodeURIComponent(selectedStudent.id)}&token=${encodeURIComponent(token)}`;
  }

  async function compose(requestedType?: WhatsAppType) {
    if (!selectedStudent) {
      setNotice("اختر الطالب أولًا.");
      return "";
    }
    const chosenType = requestedType ?? type;
    if (!chosenType) {
      setNotice("اختر نوع الرسالة.");
      return "";
    }
    setBusy(true);
    setNotice("");
    try {
      const pageUrl = await ensureStudentPageUrl();
      const salutation = guardianName.trim()
        ? `الأستاذ/ة ${guardianName.trim()}،`
        : `ولي أمر الطالب ${selectedStudent.name}،`;
      const sign = "المعلم: سلطان الصاعدي\nمدرسة عمرو بن أوس الثقفي";
      const activeSkills = store.skills.filter((skill) => skill.active && skill.termId === store.activeTermId);
      const needs = skillsNeedingTraining(activeSkills, store.assessments, selectedStudent.id, store.activeTermId);
      const stars = store.valueStars.filter((star) => star.studentId === selectedStudent.id).length;
      const week = academicWeek();
      const weekly = plansForWeek(store.weeklyPlans, week);
      const subjectIds = new Set(store.subjects.filter((subject) => subject.enabled && subject.termId === store.activeTermId).map((subject) => subject.id));
      const studentPlans = weekly.filter((plan) => subjectIds.has(plan.subjectId)).slice(0, 3);
      const latestBehavior = store.behaviorEvaluations
        .filter((item) => item.studentId === selectedStudent.id && item.evaluatedBy === "teacher")
        .at(-1);

      let text = "";
      if (chosenType === "student_page") {
        text = `${salutation}\nنأمل متابعة صفحة الطالب ${selectedStudent.name} في «تعلّمت». ستجدون فيها آخر التقييمات والمهارات والنجوم والمتابعة التعليمية.\n\nالرابط المباشر — لا يحتاج رقمًا سريًا:\n${pageUrl}\n\n${sign}`;
      } else if (chosenType === "summons") {
        text = `${salutation}\nنرغب في التواصل معكم بخصوص متابعة الطالب ${selectedStudent.name}. يوجد استدعاء/تنسيق مع ولي الأمر، ونأمل الاطلاع على صفحة الطالب قبل التواصل مع المدرسة.\n\nصفحة الطالب:\n${pageUrl}\n\n${sign}`;
      } else if (chosenType === "skill_followup") {
        const skillsText = needs.length
          ? needs.slice(0, 3).map((skill) => `• ${skill.title}`).join("\n")
          : "لا توجد حاليًا مهارات مصنفة «يحتاج تدريب» في آخر تقييم.";
        text = `${salutation}\nهذه متابعة مختصرة لمستوى الطالب ${selectedStudent.name}.\n${needs.length ? "المهارات التي تحتاج تدريبًا حاليًا:" : "الحالة الحالية:"}\n${skillsText}\n\nيمكنكم متابعة التحديثات والتدريبات من صفحة الطالب:\n${pageUrl}\n\n${sign}`;
      } else if (chosenType === "behavior") {
        const level = latestBehavior?.level === "excellent" ? "متميز" : latestBehavior?.level === "needs_follow_up" ? "يحتاج متابعة" : latestBehavior ? "جيد" : "لا يوجد تقييم سلوكي حديث";
        text = `${salutation}\nمتابعة تربوية للطالب ${selectedStudent.name}: مستوى السلوك المسجل حاليًا «${level}». نأمل تعزيز السلوك الإيجابي في المنزل ومتابعة أي تحديثات من صفحة الطالب.\n\n${pageUrl}\n\n${sign}`;
      } else if (chosenType === "praise") {
        text = `${salutation}\nيسعدنا إشادتكم بتقدم الطالب ${selectedStudent.name} وتشجيعه على الاستمرار. رصيده الحالي في «تعلّمت» هو ${stars} نجمة. دعمكم وتشجيعكم يصنع فرقًا كبيرًا. ⭐\n\nتابعوا إنجازاته من هنا:\n${pageUrl}\n\n${sign}`;
      } else if (chosenType === "homework") {
        const planText = studentPlans.length
          ? studentPlans.map((plan) => `• ${plan.title}`).join("\n")
          : "يرجى مراجعة صفحة الطالب للاطلاع على خطة هذا الأسبوع.";
        text = `${salutation}\nتذكير بمتابعة الطالب ${selectedStudent.name} لهذا الأسبوع:\n${planText}\n\nصفحة الطالب والمتابعة:\n${pageUrl}\n\n${sign}`;
      } else {
        text = `${salutation}\nنأمل متابعة الطالب ${selectedStudent.name}. يمكنكم الاطلاع على آخر التقييمات والمتابعة من صفحة الطالب:\n${pageUrl}\n\n${sign}`;
      }
      setMessage(text);
      setNotice("تم تجهيز الرسالة حسب حالة الطالب. راجعها ثم افتح واتساب.");
      return text;
    } catch (error) {
      const info = error as { status?: number };
      setNotice(info.status === 401 ? "انتهت جلسة المعلم. سجّل الدخول ثم أعد تجهيز الرسالة." : "تعذر تجهيز رابط صفحة الطالب الآن. لم يتم فتح واتساب.");
      return "";
    } finally {
      setBusy(false);
    }
  }

  function chooseType(nextType: WhatsAppType) {
    setType(nextType);
    setMessage("");
    setNotice("");
    void compose(nextType);
  }

  async function openWhatsApp() {
    if (!selectedStudent) {
      setNotice("اختر الطالب أولًا.");
      return;
    }
    if (!type) {
      setNotice("اختر نوع الرسالة أولًا.");
      return;
    }
    setBusy(true);
    const contactSaved = await saveContact();
    if (!contactSaved) {
      setBusy(false);
      return;
    }
    let text = message.trim();
    if (!text) text = await compose(type);
    if (!text) {
      setBusy(false);
      return;
    }
    const phone = normalizeSaudiPhone(guardianPhone);
    if (!phone) {
      setNotice("رقم ولي الأمر غير صالح.");
      setBusy(false);
      return;
    }
    const href = `https://wa.me/${phone}?text=${encodeURIComponent(text)}`;
    window.open(href, "_blank", "noopener,noreferrer");
    setNotice("تم فتح واتساب بالرسالة الجاهزة. الإرسال النهائي يتم منك بعد المراجعة.");
    setBusy(false);
  }

  return (
    <section className="section no-print" id="whatsapp">
      <div className="section-head">
        <div>
          <h2>الرسائل والتواصل مع ولي الأمر</h2>
          <p>اختر الطالب أولًا، ثم اختر نوع الإرسال المناسب.</p>
        </div>
        <span className="badge">واتساب</span>
      </div>
      <div className="card stack whatsapp-composer">
        <label className="stack">1. اختر الطالب
          <select className="field" value={studentId} onChange={(event) => setStudentId(event.target.value)}>
            <option value="">اختر اسم الطالب</option>
            {students.map((student) => <option value={student.id} key={student.id}>{student.name}</option>)}
          </select>
        </label>

        {!selectedStudent && <div className="notice">اختر اسم الطالب لتظهر خيارات الإرسال.</div>}

        {selectedStudent && <>
          <div className="student-contact-summary">
            <div><b>{selectedStudent.name}</b><span>{selectedStudent.className}</span></div>
            <small>{guardianPhone ? `جوال ولي الأمر محفوظ: ${guardianPhone}` : "لم يُحفظ جوال ولي الأمر بعد"}</small>
          </div>

          <div className="stack whatsapp-type-step">
            <b>2. ماذا تريد أن ترسل؟</b>
            <div className="whatsapp-message-options">
              {types.map((item) => (
                <button
                  className={type === item.id ? "active" : ""}
                  type="button"
                  key={item.id}
                  disabled={busy}
                  onClick={() => chooseType(item.id)}
                >
                  <strong>{item.label}</strong>
                  <small>{item.hint}</small>
                </button>
              ))}
            </div>
          </div>

          <div className="two guardian-contact-fields">
            <label className="stack">اسم ولي الأمر
              <input className="field" value={guardianName} onChange={(event) => setGuardianName(event.target.value)} placeholder="اختياري" />
            </label>
            <label className="stack">جوال ولي الأمر
              <input className="field" inputMode="tel" value={guardianPhone} onChange={(event) => setGuardianPhone(event.target.value)} placeholder="05xxxxxxxx" />
            </label>
          </div>

          {message && <label className="stack whatsapp-preview">3. راجع الرسالة قبل الإرسال
            <textarea className="field textarea" rows={9} value={message} onChange={(event) => setMessage(event.target.value)} />
          </label>}

          <div className="whatsapp-composer-actions">
            {type && <button className="btn secondary" type="button" disabled={busy} onClick={() => void compose(type)}>{busy ? "جاري التجهيز…" : "إعادة تجهيز النص"}</button>}
            <button className="btn" type="button" disabled={busy || !type} onClick={() => void openWhatsApp()}>فتح واتساب</button>
          </div>
        </>}

        {notice && <div className="notice" role="status">{notice}</div>}
        <small>الإرسال النهائي لا يتم تلقائيًا؛ يفتح واتساب بعد تجهيز الرسالة لتراجعها أنت أولًا. رابط صفحة الطالب مباشر ومخصص له ولا يحتاج رقمًا سريًا.</small>
      </div>
    </section>
  );
}
