// مخطط Firestore فقط. لا يحتوي مفاتيح أو بيانات حساسة.
// جميع المسارات تحت workspaceId لعزل الفصول/المعلمين مستقبلًا.
export const paths = {
 workspace:(workspaceId:string)=>`workspaces/${workspaceId}`,
 students:(workspaceId:string)=>`workspaces/${workspaceId}/students`,
 curriculum:(workspaceId:string)=>`workspaces/${workspaceId}/curriculumTargets`,
 sessions:(workspaceId:string)=>`workspaces/${workspaceId}/classSessions`,
 assessments:(workspaceId:string)=>`workspaces/${workspaceId}/assessments`,
 remediation:(workspaceId:string)=>`workspaces/${workspaceId}/remediationPlans`,
 portfolio:(workspaceId:string)=>`workspaces/${workspaceId}/portfolioEvents`,
 rewards:(workspaceId:string)=>`workspaces/${workspaceId}/rewardLedgers`,
 rewardEvents:(workspaceId:string)=>`workspaces/${workspaceId}/rewardEvents`,
 timetable:(workspaceId:string)=>`workspaces/${workspaceId}/timetable`,
 weeklyPlan:(workspaceId:string)=>`workspaces/${workspaceId}/weeklyPlans`,
 homework:(workspaceId:string)=>`workspaces/${workspaceId}/homework`,
 homeworkEvidence:(workspaceId:string)=>`workspaces/${workspaceId}/homeworkEvidence`,
 communications:(workspaceId:string)=>`workspaces/${workspaceId}/communications`,
 referrals:(workspaceId:string)=>`workspaces/${workspaceId}/referrals`,
 devices:(workspaceId:string)=>`workspaces/${workspaceId}/devices`,
 files:(workspaceId:string)=>`workspaces/${workspaceId}/files`,
 accessGrants:(workspaceId:string)=>`workspaces/${workspaceId}/accessGrants`,
} as const;
export interface WorkspaceScope{workspaceId:string;classId:string}
