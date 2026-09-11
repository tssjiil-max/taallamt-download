export interface AccessContext {workspaceId:string;role:'teacher'|'student';studentId?:string}
export interface ScopedResource {workspaceId:string;studentId?:string}
export function sameWorkspace(ctx:AccessContext,target:ScopedResource){return Boolean(ctx.workspaceId)&&ctx.workspaceId===target.workspaceId}
export function canReadStudent(ctx:AccessContext,targetStudentId:string,targetWorkspaceId=ctx.workspaceId){return sameWorkspace(ctx,{workspaceId:targetWorkspaceId})&&(ctx.role==='teacher'||(ctx.role==='student'&&ctx.studentId===targetStudentId))}
export function canWriteAssessment(ctx:AccessContext,targetWorkspaceId=ctx.workspaceId){return ctx.role==='teacher'&&sameWorkspace(ctx,{workspaceId:targetWorkspaceId})}
export function canWriteStars(ctx:AccessContext,targetWorkspaceId=ctx.workspaceId){return ctx.role==='teacher'&&sameWorkspace(ctx,{workspaceId:targetWorkspaceId})}
export function canReadGuardianContact(ctx:AccessContext,targetWorkspaceId=ctx.workspaceId){return ctx.role==='teacher'&&sameWorkspace(ctx,{workspaceId:targetWorkspaceId})}
// واجهة الطالب لا تكشف بيانات التواصل ولا تستطيع تعديل التقييم أو النجوم، ولا يمكن عبور workspace آخر.
