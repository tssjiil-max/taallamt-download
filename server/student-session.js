import {createHash,timingSafeEqual} from 'node:crypto';
import {adminDb} from './firebase-admin.js';
import {WORKSPACE_ID} from './class-roster.js';
export const STUDENT_COOKIE='taallamt_student';
export const STUDENT_SESSION_SECONDS=180*24*60*60;
export const digest=value=>createHash('sha256').update(String(value)).digest('hex');
export const equal=(a,b)=>{const x=Buffer.from(String(a)),y=Buffer.from(String(b));return x.length===y.length&&timingSafeEqual(x,y)};
export const authRoot=()=>`workspaces/${WORKSPACE_ID}`;
export function studentCookie(req,value,maxAge=STUDENT_SESSION_SECONDS){return `${STUDENT_COOKIE}=${value}; Path=/api; HttpOnly; Secure; SameSite=Lax; Max-Age=${maxAge}`}
export function sessionToken(req){return String(req.headers?.cookie||'').split(';').map(x=>x.trim()).find(x=>x.startsWith(`${STUDENT_COOKIE}=`))?.slice(STUDENT_COOKIE.length+1)||''}
export async function studentSession(req){
 const token=sessionToken(req);if(!/^[A-Za-z0-9_-]{43}$/.test(token))return null;
 const snap=await adminDb().doc(`${authRoot()}/studentLoginSessions/${digest(token)}`).get();
 if(!snap.exists)return null;const session=snap.data();
 if(session.revoked||Number(session.expiresAt)<=Date.now()||!/^s2-4-\d{2}$/.test(session.studentId))return null;
 const credential=await adminDb().doc(`${authRoot()}/studentLoginCredentials/${session.studentId}`).get();
 if(!credential.exists||!credential.data().active||credential.data().revision!==session.revision)return null;
 return {studentId:session.studentId,expiresAt:session.expiresAt};
}
