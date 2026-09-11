import { deriveAssessmentEffects } from '../core/assessment-engine';
import { ComprehensiveAssessment } from '../core/domain';
import { LearningRepository } from '../core/ports';

export interface RewardRepository {
  getMonthlyStars(studentId: string, month: string): Promise<number>;
  addStars(studentId: string, month: string, amount: number): Promise<void>;
}

export interface SaveAssessmentDeps {
  learning: LearningRepository;
  rewards: RewardRepository;
}

export async function saveComprehensiveAssessment(
  assessment: ComprehensiveAssessment,
  deps: SaveAssessmentDeps,
) {
  const history = await deps.learning.listStudentAssessments(assessment.studentId);
  const month = assessment.sessionDate.slice(0, 7);
  const currentStars = await deps.rewards.getMonthlyStars(assessment.studentId, month);

  const effects = deriveAssessmentEffects(
    assessment,
    history.flatMap(a => a.academic.map(i => ({
      studentId: a.studentId,
      targetId: i.targetId,
      result: i.result,
      sessionDate: a.sessionDate,
    }))),
    currentStars,
  );

  // الحدث الأصلي يُحفظ مرة واحدة، وكل ما بعده آثار مشتقة منه.
  await deps.learning.saveAssessment(assessment);

  for (const plan of effects.remediationPlans) {
    await deps.learning.saveRemediation(plan);
  }
  if (effects.portfolioEvents.length) {
    await deps.learning.appendPortfolio(effects.portfolioEvents);
  }
  if (effects.starsEarned > 0) {
    await deps.rewards.addStars(assessment.studentId, month, effects.starsEarned);
  }

  return effects;
}
