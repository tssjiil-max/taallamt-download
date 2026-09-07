export type MasteryLevel = "mastered" | "partial" | "needs_training";
export type FollowUpCategory = "health" | "learning" | "behavior" | "family" | "other";

export type Term = { id: string; name: string; academicYear: string; active: boolean };
export type Subject = { id: string; termId: string; name: string; enabled: boolean; order: number };

export type Student = {
  id: string;
  name: string;
  className: string;
  active: boolean;
  guardianDeviceLimit: number;
  guardianDevices: number;
  specialFollowUp: boolean;
  subjectLevels: Record<string, MasteryLevel>;
};

export type WeeklyPlan = {
  id: string;
  termId: string;
  subjectId: string;
  week: number;
  title: string;
};

export type Skill = {
  id: string;
  termId: string;
  subjectId: string;
  week: number;
  category: string;
  title: string;
  active: boolean;
  source: "curriculum" | "register" | "teacher";
};

export type SkillAssessment = {
  id: string;
  studentId: string;
  skillId: string;
  level: MasteryLevel;
  assessedAt: string;
  note?: string;
};

export type SpecialFollowUp = {
  studentId: string;
  category: FollowUpCategory;
  guardianStatement: string;
  schoolImpact: string;
  goal: string;
  plan: string[];
  status: "improving" | "stable" | "needs_review";
  nextReviewAt?: string;
  guardianVisible?: boolean;
};

export type Message = {
  id: string;
  studentId: string;
  author: "teacher" | "guardian";
  body: string;
  createdAt: string;
};

export type TaallamtData = {
  terms: Term[];
  subjects: Subject[];
  students: Student[];
  weeklyPlans: WeeklyPlan[];
  skills: Skill[];
  assessments: SkillAssessment[];
  followUps: Record<string, SpecialFollowUp>;
  messages: Message[];
};
