import {
  ComprehensiveAssessment,
  MONTHLY_STAR_CAP,
  PortfolioEvent,
  REMEDIATION_TRIGGER_COUNT,
  RemediationPlan,
} from './domain';

export interface AssessmentHistoryItem {
  studentId: string;
  targetId: string;
  result: 'mastered' | 'needs_practice' | 'not_mastered';
  sessionDate: string;
}

export interface AssessmentEffects {
  studentViewUpdated: boolean;
  portfolioEvents: PortfolioEvent[];
  remediationPlans: RemediationPlan[];
  starsEarned: number;
}

export function deriveAssessmentEffects(
  assessment: ComprehensiveAssessment,
  history: AssessmentHistoryItem[],
  currentMonthlyStars: number,
): AssessmentEffects {
  const portfolioEvents: PortfolioEvent[] = [];
  const remediationPlans: RemediationPlan[] = [];
  let starCandidates = 0;

  for (const item of assessment.academic) {
    if (item.result === 'mastered') {
      starCandidates += 1;
      portfolioEvents.push({
        id: `${assessment.id}:${item.targetId}:mastery`,
        studentId: assessment.studentId,
        type: 'mastery',
        occurredAt: assessment.enteredAt,
        sourceId: assessment.id,
        summary: `إتقان: ${item.targetId}`,
      });
    }

    if (item.result === 'not_mastered') {
      const priorFailures = history.filter(
        h => h.studentId === assessment.studentId && h.targetId === item.targetId && h.result === 'not_mastered',
      ).length;
      if (priorFailures + 1 >= REMEDIATION_TRIGGER_COUNT) {
        remediationPlans.push({
          id: `remediation:${assessment.studentId}:${item.targetId}`,
          studentId: assessment.studentId,
          targetId: item.targetId,
          trigger: 'three_not_mastered',
          status: 'active',
          startedAt: assessment.enteredAt,
        });
        portfolioEvents.push({
          id: `${assessment.id}:${item.targetId}:remediation`,
          studentId: assessment.studentId,
          type: 'remediation_started',
          occurredAt: assessment.enteredAt,
          sourceId: assessment.id,
          summary: `بدء خطة علاجية: ${item.targetId}`,
        });
      }
    }
  }

  for (const behavior of assessment.behavior) {
    if (behavior.tone === 'positive') {
      starCandidates += 1;
      portfolioEvents.push({
        id: `${assessment.id}:behavior:${behavior.code}`,
        studentId: assessment.studentId,
        type: 'positive_behavior',
        occurredAt: assessment.enteredAt,
        sourceId: assessment.id,
        summary: behavior.label,
      });
    }
  }

  return {
    studentViewUpdated: true,
    portfolioEvents,
    remediationPlans,
    starsEarned: Math.max(0, Math.min(starCandidates, MONTHLY_STAR_CAP - currentMonthlyStars)),
  };
}

// قاعدة أمان: عدم وجود ComprehensiveAssessment للحصة يعني "غير مقيم" فقط؛
// لا ينشئ النظام نتيجة عدم إتقان ولا خطة علاجية من تلقاء نفسه.
