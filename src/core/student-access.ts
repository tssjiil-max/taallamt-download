export interface StudentAccessGrant {id:string;workspaceId:string;studentId:string;tokenHash:string;createdAt:string;revokedAt?:string}
export function grantIsActive(grant:StudentAccessGrant){return !grant.revokedAt}
export function canAccessStudent(grant:StudentAccessGrant,workspaceId:string,studentId:string){return grantIsActive(grant)&&grant.workspaceId===workspaceId&&grant.studentId===studentId}
// لا يوضع رقم ولي الأمر أو بيانات حساسة داخل رابط الطالب. التخزين يكون لبصمة الرمز فقط.
