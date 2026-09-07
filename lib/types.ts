export type MasteryLevel = "mastered" | "partial" | "needs_training";

export type Term = {
  id: string;
  name: string;
  academicYear: string;
  active: boolean;
};

export type Subject = {
  id: string;
  termId: string;
  name: string;
  enabled: boolean;
  order: number;
};

export type Student = {
  id: string;
  name: string;
  className: string;
  active: boolean;
  guardianDeviceLimit: number;
  guardianDevices: number;
  specialFollowUp: boolean;
};

export type Skill = {
  id: string;
  subjectId: string;
  termId: string;
  title: string;
  mastery?: MasteryLevel;
};

export type SpecialFollowUp = {
  studentId: string;
  category: "health" | "learning" | "behavior" | "family" | "other";
  guardianStatement: string;
  schoolImpact: string;
  goal: string;
  plan: string[];
  status: "improving" | "stable" | "needs_review";
  nextReviewAt?: string;
};
