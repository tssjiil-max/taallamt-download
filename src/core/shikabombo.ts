export interface ShikabomboContext {
  studentFirstName?: string;
  curriculumText: string;
  subject: string;
  learningTarget: string;
  mode: 'read' | 'explain' | 'encourage' | 'practice';
}

export interface ShikabomboAIProvider {
  respond(context: ShikabomboContext): Promise<string>;
}

export const SHIKABOMBO_POLICY = {
  mayReadApprovedCurriculum: true,
  mayExplainApprovedCurriculum: true,
  mayEncourage: true,
  mayCreateSafePractice: true,
  mayChangeAssessment: false,
  mayChangeStars: false,
  mayCreateOrResolveRemediation: false,
  mayExposeGuardianContact: false,
  mayFreeChatOutsideLearningContext: false,
} as const;

// المزود قابل للتبديل (OpenAI / Gemini / غيرهما) دون تغيير النواة.
