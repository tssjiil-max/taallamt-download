export interface EvidenceRef {
  id: string;
  title: string;
  sourceType: 'assessment' | 'weekly_plan' | 'homework' | 'file' | 'remediation' | 'communication' | 'achievement';
  sourceId: string;
  occurredAt: string;
}

export interface TeacherPortfolioProjection {
  weeklyPlans: EvidenceRef[];
  assessments: EvidenceRef[];
  interventions: EvidenceRef[];
  communications: EvidenceRef[];
  files: EvidenceRef[];
}

export interface StudentPortfolioProjection {
  learningEvidence: EvidenceRef[];
  achievements: EvidenceRef[];
  remediationProgress: EvidenceRef[];
  files: EvidenceRef[];
}

// ملفات الإنجاز إسقاطات من النشاط الحقيقي، وليست نماذج إدخال مكررة.
