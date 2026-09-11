import type { EvidenceRef, TeacherPortfolioProjection } from './portfolio';
export interface TeacherEvidenceInput {weeklyPlans:EvidenceRef[];assessments:EvidenceRef[];interventions:EvidenceRef[];communications:EvidenceRef[];files:EvidenceRef[]}
export function buildTeacherPortfolio(input:TeacherEvidenceInput):TeacherPortfolioProjection{return {weeklyPlans:input.weeklyPlans,assessments:input.assessments,interventions:input.interventions,communications:input.communications,files:input.files}}
// ملف إنجاز المعلم إسقاط تلقائي للأعمال المنفذة، وليس نموذج إدخال مكرر.
