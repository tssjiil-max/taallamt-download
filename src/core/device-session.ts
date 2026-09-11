export interface DeviceSession {id:string;workspaceId:string;studentId:string;deviceLabel?:string;createdAt:string;lastSeenAt:string;revokedAt?:string}
export function activeDeviceSessions(items:DeviceSession[]){return items.filter(x=>!x.revokedAt)}
export function revokeDevice(session:DeviceSession,now:string):DeviceSession{return {...session,revokedAt:now}}
// عدة أجهزة للطالب/الأسرة تقرأ الحساب نفسه ولا تنشئ نسخة بيانات منفصلة.
