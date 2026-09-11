import { ComprehensiveAssessment, PortfolioEvent, RemediationPlan } from './domain';

export interface StudentProjection {
  studentId: string;
  latestAssessments: ComprehensiveAssessment[];
  activeRemediation: RemediationPlan[];
  portfolio: PortfolioEvent[];
  monthlyStars: number;
  focusedFollowup: boolean;
}

export function shouldBeFocused(
  studentId: string,
  assessments: ComprehensiveAssessment[],
  activeRemediation: RemediationPlan[],
): boolean {
  if (activeRemediation.some(p => p.studentId === studentId && p.status === 'active')) return true;

  const recent = assessments
    .filter(a => a.studentId === studentId)
    .sort((a, b) => b.sessionDate.localeCompare(a.sessionDate))
    .slice(0, 5);

  return recent.some(a => a.academic.some(i => i.result === 'not_mastered'));
}

// صفحة الطالب وواجهة المعلم تقرآن من نفس الإسقاط؛ لا توجد نسخة بيانات ثانية لولي الأمر.
export function projectStudent(input: Omit<StudentProjection, 'focusedFollowup'>): StudentProjection {
  return {
    ...input,
    focusedFollowup: shouldBeFocused(input.studentId, input.latestAssessments, input.activeRemediation),
  };
}
