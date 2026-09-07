"use client";

import { createContext, useContext, useEffect, useMemo, useState } from "react";
import { initialData } from "./sample-data";
import type { FollowUpCategory, LearningResource, MasteryLevel, ResourceKind, SkillAssessment, SpecialFollowUp, TaallamtData, ValueTarget } from "./types";

const STORAGE_KEY = "taallamt-flex-v1";

type NewResource = {
  subjectId: string;
  kind: ResourceKind;
  title: string;
  week?: number;
  instructions: string;
  items: string[];
  answerGuide: string[];
  audienceStudentIds: string[];
  publishedToGuardian: boolean;
};

type StoreValue = TaallamtData & {
  ready: boolean;
  activeTermId?: string;
  addStudent: (name: string) => void;
  archiveStudent: (id: string) => void;
  restoreStudent: (id: string) => void;
  deleteStudent: (id: string) => void;
  setMastery: (studentId: string, subjectId: string, level: MasteryLevel) => void;
  setSkillAssessment: (studentId: string, skillId: string, level: MasteryLevel, note?: string) => void;
  addLearningResource: (resource: NewResource) => string;
  awardValueStar: (studentId: string, valueId: string, reason?: string) => void;
  removeValueStar: (studentId: string, valueId: string) => void;
  addValueTarget: (value: Omit<ValueTarget, "id" | "termId" | "active" | "source">) => void;
  toggleValueTarget: (valueId: string) => void;
  setGuardianDevices: (studentId: string, count: number) => void;
  addTerm: (name: string, academicYear: string) => void;
  activateTerm: (id: string) => void;
  addSubject: (name: string) => void;
  renameSubject: (id: string, name: string) => void;
  toggleSubject: (id: string) => void;
  deleteSubject: (id: string) => void;
  updateWeeklyPlan: (subjectId: string, week: number, title: string) => void;
  saveGuardianStatement: (studentId: string, category: FollowUpCategory, statement: string) => void;
  saveFollowUp: (followUp: SpecialFollowUp) => void;
  sendMessage: (studentId: string, author: "teacher" | "guardian", body: string) => void;
  resetLocalData: () => void;
};

const StoreContext = createContext<StoreValue | null>(null);

export function TaallamtProvider({ children }: { children: React.ReactNode }) {
  const [data, setData] = useState<TaallamtData>(initialData);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEY);
      if (saved) {
        const parsed = JSON.parse(saved) as Partial<TaallamtData>;
        setData({
          ...initialData,
          ...parsed,
          skills: parsed.skills ?? initialData.skills,
          assessments: parsed.assessments ?? initialData.assessments,
          resources: parsed.resources ?? initialData.resources,
          values: parsed.values ?? initialData.values,
          valueStars: parsed.valueStars ?? initialData.valueStars,
          spellingPractices: parsed.spellingPractices ?? initialData.spellingPractices,
        });
      }
    } catch {}
    setReady(true);
  }, []);

  useEffect(() => { if (ready) localStorage.setItem(STORAGE_KEY, JSON.stringify(data)); }, [data, ready]);
  const activeTermId = data.terms.find((term) => term.active)?.id;
  const uid = (prefix: string) => `${prefix}-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`;

  const value = useMemo<StoreValue>(() => ({
    ...data, ready, activeTermId,
    addStudent(name) {
      const clean = name.trim(); if (!clean) return;
      setData((d) => ({ ...d, students: [...d.students, { id: uid("student"), name: clean, className: "ثاني/4", active: true, guardianDeviceLimit: 2, guardianDevices: 0, specialFollowUp: false, subjectLevels: {} }] }));
    },
    archiveStudent(id) { setData((d) => ({ ...d, students: d.students.map((s) => s.id === id ? { ...s, active: false } : s) })); },
    restoreStudent(id) { setData((d) => ({ ...d, students: d.students.map((s) => s.id === id ? { ...s, active: true } : s) })); },
    deleteStudent(id) {
      setData((d) => ({
        ...d,
        students: d.students.filter((s) => s.id !== id),
        assessments: d.assessments.filter((a) => a.studentId !== id),
        resources: d.resources.map((resource) => ({ ...resource, audienceStudentIds: resource.audienceStudentIds.filter((studentId) => studentId !== id) })),
        valueStars: d.valueStars.filter((star) => star.studentId !== id),
        messages: d.messages.filter((m) => m.studentId !== id),
        followUps: Object.fromEntries(Object.entries(d.followUps).filter(([key]) => key !== id)),
      }));
    },
    setMastery(studentId, subjectId, level) { setData((d) => ({ ...d, students: d.students.map((s) => s.id === studentId ? { ...s, subjectLevels: { ...s.subjectLevels, [subjectId]: level } } : s) })); },
    setSkillAssessment(studentId, skillId, level, note) {
      const assessment: SkillAssessment = { id: uid("assessment"), studentId, skillId, level, assessedAt: new Date().toISOString(), note: note?.trim() || undefined };
      setData((d) => ({ ...d, assessments: [...d.assessments, assessment] }));
    },
    addLearningResource(resource) {
      const id = uid("resource");
      const entry: LearningResource = {
        id,
        termId: activeTermId ?? "term-1",
        subjectId: resource.subjectId,
        kind: resource.kind,
        title: resource.title,
        week: resource.week,
        createdAt: new Date().toISOString(),
        instructions: resource.instructions,
        items: resource.items,
        answerGuide: resource.answerGuide,
        audienceStudentIds: resource.audienceStudentIds,
        publishedToGuardian: resource.publishedToGuardian,
      };
      setData((d) => ({ ...d, resources: [entry, ...d.resources] }));
      return id;
    },
    awardValueStar(studentId, valueId, reason) {
      setData((d) => ({ ...d, valueStars: [...d.valueStars, { id: uid("star"), studentId, valueId, awardedAt: new Date().toISOString(), reason: reason?.trim() || undefined }] }));
    },
    removeValueStar(studentId, valueId) {
      setData((d) => {
        const index = [...d.valueStars].reverse().findIndex((star) => star.studentId === studentId && star.valueId === valueId);
        if (index < 0) return d;
        const actual = d.valueStars.length - 1 - index;
        return { ...d, valueStars: d.valueStars.filter((_, i) => i !== actual) };
      });
    },
    addValueTarget(input) {
      if (!activeTermId || !input.title.trim()) return;
      const entry: ValueTarget = { ...input, id: uid("value"), termId: activeTermId, title: input.title.trim(), studentText: input.studentText.trim(), homeSuggestion: input.homeSuggestion.trim(), active: true, source: "teacher" };
      setData((d) => ({ ...d, values: [...d.values, entry] }));
    },
    toggleValueTarget(valueId) { setData((d) => ({ ...d, values: d.values.map((item) => item.id === valueId ? { ...item, active: !item.active } : item) })); },
    setGuardianDevices(studentId, count) { setData((d) => ({ ...d, students: d.students.map((s) => s.id === studentId ? { ...s, guardianDevices: Math.max(0, Math.min(s.guardianDeviceLimit, count)) } : s) })); },
    addTerm(name, academicYear) {
      if (!name.trim()) return;
      setData((d) => ({ ...d, terms: [...d.terms, { id: uid("term"), name: name.trim(), academicYear: academicYear.trim() || "1448هـ", active: false }] }));
    },
    activateTerm(id) { setData((d) => ({ ...d, terms: d.terms.map((t) => ({ ...t, active: t.id === id })) })); },
    addSubject(name) {
      if (!name.trim() || !activeTermId) return;
      setData((d) => ({ ...d, subjects: [...d.subjects, { id: uid("subject"), termId: activeTermId, name: name.trim(), enabled: true, order: d.subjects.filter((s) => s.termId === activeTermId).length + 1 }] }));
    },
    renameSubject(id, name) { if (name.trim()) setData((d) => ({ ...d, subjects: d.subjects.map((s) => s.id === id ? { ...s, name: name.trim() } : s) })); },
    toggleSubject(id) { setData((d) => ({ ...d, subjects: d.subjects.map((s) => s.id === id ? { ...s, enabled: !s.enabled } : s) })); },
    deleteSubject(id) {
      setData((d) => {
        const removedSkillIds = new Set(d.skills.filter((skill) => skill.subjectId === id).map((skill) => skill.id));
        return {
          ...d,
          subjects: d.subjects.filter((s) => s.id !== id),
          weeklyPlans: d.weeklyPlans.filter((p) => p.subjectId !== id),
          skills: d.skills.filter((skill) => skill.subjectId !== id),
          assessments: d.assessments.filter((assessment) => !removedSkillIds.has(assessment.skillId)),
          resources: d.resources.filter((resource) => resource.subjectId !== id),
          students: d.students.map((s) => { const levels = { ...s.subjectLevels }; delete levels[id]; return { ...s, subjectLevels: levels }; }),
        };
      });
    },
    updateWeeklyPlan(subjectId, week, title) {
      if (!activeTermId) return;
      setData((d) => {
        const existing = d.weeklyPlans.find((p) => p.termId === activeTermId && p.subjectId === subjectId && p.week === week);
        if (existing) return { ...d, weeklyPlans: d.weeklyPlans.map((p) => p.id === existing.id ? { ...p, title } : p) };
        return { ...d, weeklyPlans: [...d.weeklyPlans, { id: uid("plan"), termId: activeTermId, subjectId, week, title }] };
      });
    },
    saveGuardianStatement(studentId, category, statement) {
      const current = data.followUps[studentId];
      const next: SpecialFollowUp = current ?? { studentId, category, guardianStatement: "", schoolImpact: "", goal: "", plan: [], status: "needs_review", guardianVisible: true };
      const updated = { ...next, category, guardianStatement: statement, guardianVisible: true };
      setData((d) => ({ ...d, followUps: { ...d.followUps, [studentId]: updated }, students: d.students.map((s) => s.id === studentId ? { ...s, specialFollowUp: true } : s) }));
    },
    saveFollowUp(followUp) { setData((d) => ({ ...d, followUps: { ...d.followUps, [followUp.studentId]: followUp }, students: d.students.map((s) => s.id === followUp.studentId ? { ...s, specialFollowUp: true } : s) })); },
    sendMessage(studentId, author, body) {
      if (!body.trim()) return;
      setData((d) => ({ ...d, messages: [...d.messages, { id: uid("msg"), studentId, author, body: body.trim(), createdAt: new Date().toISOString() }] }));
    },
    resetLocalData() { setData(initialData); localStorage.removeItem(STORAGE_KEY); },
  }), [data, ready, activeTermId]);

  return <StoreContext.Provider value={value}>{children}</StoreContext.Provider>;
}

export function useTaallamt() {
  const value = useContext(StoreContext);
  if (!value) throw new Error("useTaallamt must be used inside TaallamtProvider");
  return value;
}
