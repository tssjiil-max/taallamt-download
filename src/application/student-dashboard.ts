import { ComprehensiveAssessment, PortfolioEvent, RemediationPlan } from '../core/domain';
import { projectStudent } from '../core/student-projection';

export interface StudentDashboardInput {
  studentId: string;
  assessments: ComprehensiveAssessment[];
  remediation: RemediationPlan[];
  portfolio: PortfolioEvent[];
  monthlyStars: number;
}

export function buildStudentDashboard(input: StudentDashboardInput) {
  const projection = projectStudent({
    studentId: input.studentId,
    latestAssessments: input.assessments,
    activeRemediation: input.remediation.filter(p => p.status === 'active'),
    portfolio: input.portfolio,
    monthlyStars: input.monthlyStars,
  });

  return {
    studentId: projection.studentId,
    stars: { current: Math.min(projection.monthlyStars, 30), max: 30 },
    focusedFollowup: projection.focusedFollowup,
    latestResults: projection.latestAssessments.slice(0, 10),
    activeRemediation: projection.activeRemediation,
    achievements: projection.portfolio.filter(e =>
      ['mastery', 'improvement', 'remediation_improved', 'remediation_resolved', 'achievement', 'positive_behavior'].includes(e.type),
    ),
  };
}
