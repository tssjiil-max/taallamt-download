"use client";

import { createContext, useContext, useEffect, useMemo, useState } from "react";
import { initialData } from "./sample-data";
import type { FollowUpCategory, MasteryLevel, SkillAssessment, SpecialFollowUp, TaallamtData } from "./types";

const STORAGE_KEY = "taallamt-flex-v1";

type StoreValue = TaallamtData & {
  ready: boolean;
  activeTermId?: string;
  addStudent: (name: string) => void;
  archiveStudent: (id: string) => void;
  restoreStudent: (id: string) => void;
  deleteStudent: (id: string) => void;
  setMastery: (studentId: string, subjectId: string, level: MasteryLevel) => void;
  setSkillAssessment: (studentId: string, skillId: string, level: MasteryLevel, note?: string) => void;
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
        messages: d.messages.filter((m) => m.studentId !== id),
        followUps: Object.fromEntries(Object.entries(d.followUps).filter(([key]) => key !== id)),
      }));
    },
    setMastery(studentId, subjectId, level) { setData((d) => ({ ...d, students: d.students.map((s) => s.id === studentId ? { ...s, subjectLevels: { ...s.subjectLevels, [subjectId]: level } } : s) })); },
    setSkillAssessment(studentId, skillId, level, note) {
      const assessment: SkillAssessment = {
        id: uid("assessment"),
        studentId,
        skillId,
        level,
        assessedAt: new Date().toISOString(),
        note: note?.trim() || undefined,
      };
      setData((d) => ({ ...d, assessments: [...d.assessments, assessment] }));
    },
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
