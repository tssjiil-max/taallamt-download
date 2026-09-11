export interface AccessContext { workspaceId:string; role:'teacher'|'student'; studentId?:string }

export function canReadStudent(ctx:AccessContext,targetStudentId:string){
 return ctx.role==='teacher'||(ctx.role==='student'&&ctx.studentId===targetStudentId);
}
export function canWriteAssessment(ctx:AccessContext){return ctx.role==='teacher'}
export function canWriteStars(ctx:AccessContext){return ctx.role==='teacher'}
export function canReadGuardianContact(ctx:AccessContext){return ctx.role==='teacher'}

// واجهة الطالب لا تكشف بيانات التواصل ولا تستطيع تعديل التقييم أو النجوم.
