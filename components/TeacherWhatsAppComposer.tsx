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
  const [type, setType] = useState<WhatsAppType>("student_page");
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
    const requestedType = params.get("type") as WhatsAppType | null;
    if (requestedStudent && students.some((student) => student.id === requestedStudent)) setStudentId(requestedStudent);
    if (requestedType && types.some((item) => item.id === requestedType)) setType(requestedType);
  }, [students]);

  useEffect(() => {
    const contact = contacts.find((item) => item.studentId === studentId);
    setGuardianName(contact?.guardianName ?? "");
    setGuardianPhone(contact?.guardianPhone ?? "");
    setMessage("");
    setNotice("");
  }, [studentId, contacts]);

  useEffect(() => {
    setMessage("");
    setNotice("");
  }, [type]);

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
      const result = await saveTeacherStudentContact(selectedStudent.id, guardianName.trim(), phone);
      setGuardianPhone(result.contact.guardianPhone);
      setContacts((current) => [
        ...current.filter((item) => item.studentId !== selectedStudent.id),
        result.contact,
      ]);
      return true;
    } catch {
      setNotice("تعذر حفظ بيانات ولي الأمر الآن.");
      return false;
    }
  }

  async function ensureStudentPageUrl() {
    if (!selectedStudent) return "";
    const current = await getGuardianShareAccess(selectedStudent.id);
    let token = current.shareToken;
    if (!current.enabled || !token) {
      const created = await setGuardianAccessCode(selectedStudent.id, internalAccessCode());
      token = created.shareToken;
    }
    return `${window.location.origin}/guardian?student=${encodeURIComponent(selectedStudent.id)}&token=${encodeURIComponent(token)}`;
  }

  async function compose() {
    if (!selectedStudent) {
      setNotice("اختر الطالب أولًا.");
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
      if (type === "student_page") {
        text = `${salutation}\nنأمل متابعة صفحة الطالب ${selectedStudent.name} في «تعلّمت». ستجدون فيها آخر التقييمات والمهارات والنجوم والمتابعة التعليمية.\n\nالرابط المباشر — لا يحتاج رقمًا سريًا:\n${pageUrl}\n\n${sign}`;
      } else if (type === "summons") {
        text = `${salutation}\nنرغب في التواصل معكم بخصوص متابعة الطالب ${selectedStudent.name}. يوجد استدعاء/تنسيق مع ولي الأمر، ونأمل الاطلاع على صفحة الطالب قبل التواصل مع المدرسة.\n\nصفحة الطالب:\n${pageUrl}\n\n${sign}`;
      } else if (type === "skill_followup") {
        const skillsText = needs.length
          ? needs.slice(0, 3).map((skill) => `• ${skill.title}`).join("\n")
          : "لا توجد حاليًا مهارات مصنفة «يحتاج تدريب» في آخر تقييم.";
        text = `${salutation}\nهذه متابعة مختصرة لمستوى الطالب ${selectedStudent.name}.\n${needs.length ? "المهارات التي تحتاج تدريبًا حاليًا:" : "الحالة الحالية:"}\n${skillsText}\n\nيمكنكم متابعة التحديثات والتدريبات من صفحة الطالب:\n${pageUrl}\n\n${sign}`;
      } else if (type === "behavior") {
        const level = latestBehavior?.level === "excellent" ? "متميز" : latestBehavior?.level === "needs_follow_up" ? "يحتاج متابعة" : latestBehavior ? "جيد" : "لا يوجد تقييم سلوكي حديث";
        text = `${salutation}\nمتابعة تربوية للطالب ${selectedStudent.name}: مستوى السلوك المسجل حاليًا «${level}». نأمل تعزيز السلوك الإيجابي في المنزل ومتابعة أي تحديثات من صفحة الطالب.\n\n${pageUrl}\n\n${sign}`;
      } else if (type === "praise") {
        text = `${salutation}\nيسعدنا إشادتكم بتقدم الطالب ${selectedStudent.name} وتشجيعه على الاستمرار. رصيده الحالي في «تعلّمت» هو ${stars} نجمة. دعمكم وتشجيعكم يصنع فرقًا كبيرًا. ⭐\n\nتابعوا إنجازاته من هنا:\n${pageUrl}\n\n${sign}`;
      } else if (type === "homework") {
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
    } catch {
      setNotice("تعذر تجهيز رابط صفحة الطالب الآن. لم يتم فتح واتساب.");
      return "";
    } finally {
      setBusy(false);
    }
  }

  async function openWhatsApp() {
    if (!selectedStudent) {
      setNotice("اختر الطالب أولًا.");
      return;
    }
    setBusy(true);
    const contactSaved = await saveContact();
    if (!contactSaved) {
      setBusy(false);
      return;
    }
    let text = message.trim();
    if (!text) text = await compose();
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
          <h2>رسائل واتساب لولي الأمر</h2>
          <p>اختر الطالب ونوع الرسالة؛ يجهّز النظام النص والرابط ثم تراجعه قبل الإرسال.</p>
        </div>
        <span className="badge">واتساب</span>
      </div>
      <div className="card stack whatsapp-composer">
        <div className="two">
          <label className="stack">الطالب
            <select className="field" value={studentId} onChange={(event) => setStudentId(event.target.value)}>
              <option value="">اختر الطالب</option>
              {students.map((student) => <option value={student.id} key={student.id}>{student.name}</option>)}
            </select>
          </label>
          <label className="stack">نوع الرسالة
            <select className="field" value={type} onChange={(event) => setType(event.target.value as WhatsAppType)}>
              {types.map((item) => <option value={item.id} key={item.id}>{item.label}</option>)}
            </select>
          </label>
        </div>
        <small>{types.find((item) => item.id === type)?.hint}</small>
        <div className="two">
          <label className="stack">اسم ولي الأمر
            <input className="field" value={guardianName} onChange={(event) => setGuardianName(event.target.value)} placeholder="مثال: محمد أحمد" />
          </label>
          <label className="stack">جوال ولي الأمر
            <input className="field" inputMode="tel" value={guardianPhone} onChange={(event) => setGuardianPhone(event.target.value)} placeholder="05xxxxxxxx" />
          </label>
        </div>
        <div className="mini-actions">
          <button className="btn secondary" type="button" disabled={busy || !selectedStudent} onClick={() => void compose()}>{busy ? "جاري التجهيز…" : "تجهيز الرسالة"}</button>
          <button className="btn" type="button" disabled={busy || !selectedStudent} onClick={() => void openWhatsApp()}>فتح واتساب</button>
        </div>
        {message && <label className="stack">معاينة الرسالة
          <textarea className="field textarea" rows={9} value={message} onChange={(event) => setMessage(event.target.value)} />
        </label>}
        {notice && <div className="notice" role="status">{notice}</div>}
        <small>رابط صفحة الطالب مباشر ومخصص للطالب، ولا يحتاج ولي الأمر إلى إدخال رقم سري. رقم الجوال واسم ولي الأمر يُحفظان لاستخدامهما لاحقًا.</small>
      </div>
    </section>
  );
}
