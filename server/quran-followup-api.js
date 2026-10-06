import {createHmac,timingSafeEqual} from 'node:crypto';
import {adminDb} from '../server/firebase-admin.js';
import {WORKSPACE_ID} from '../server/class-roster.js';
import {QURAN_FOLLOWUP_WEEKS,QURAN_TRACKING_STUDENT_IDS,QURAN_TRACKING_CLASS_ID,QURAN_FOLLOWUP_ROSTER} from '../server/quran-followup-curriculum.js';

const root=`workspaces/${WORKSPACE_ID}`;
const statuses=new Set(['MASTERED','NEEDS_REPEAT','NOT_MASTERED']);
const now=()=>new Date().toISOString();
const jsonBody=req=>typeof req.body==='string'?JSON.parse(req.body||'{}'):(req.body||{});
function fail(res,status,error){return res.status(status).json({ok:false,error})}
function safeEq(a,b){const aa=Buffer.from(String(a)),bb=Buffer.from(String(b));return aa.length===bb.length&&timingSafeEqual(aa,bb)}
function teacherCookie(pin,expires){const payload=Buffer.from(JSON.stringify({exp:expires,env:'preview'})).toString('base64url');const sig=createHmac('sha256',pin).update(payload).digest('base64url');return `${payload}.${sig}`}
function validTeacherCookie(cookie,pin){try{const [payload,sig]=String(cookie||'').split('.');if(!payload||!sig)return false;const expected=createHmac('sha256',pin).update(payload).digest('base64url');if(!safeEq(sig,expected))return false;const data=JSON.parse(Buffer.from(payload,'base64url').toString());return data.env==='preview'&&data.exp>Date.now()}catch{return false}}
function header(req,name){const value=req.headers?.[name]||req.headers?.[name.toLowerCase()];return Array.isArray(value)?value[0]:String(value||'')}
function sameOrigin(req){const origin=header(req,'origin');if(!origin)return false;try{const expected=`${header(req,'x-forwarded-proto')||'https'}://${header(req,'x-forwarded-host')||header(req,'host')}`;return new URL(origin).origin===expected}catch{return false}}
function readCookie(req,name){return header(req,'cookie').split(';').map(x=>x.trim()).find(x=>x.startsWith(`${name}=`))?.slice(name.length+1)||''}
async function verifyGuardian(studentId,invite){if(typeof invite!=='string'||invite.length<20) return false;const snap=await adminDb().doc(`${root}/studentProfiles/${studentId}`).get();return snap.exists&&safeEq(String(snap.data()?.guardianInviteToken||''),invite)}
function teacherAuthorized(req){const pin=process.env.QURAN_TEACHER_PIN;if(!pin||process.env.VERCEL_ENV==='production')return false;return validTeacherCookie(readCookie(req,'quran_teacher_session'),pin)}
async function recordsForStudents(ids){const db=adminDb(),out={};await Promise.all(ids.map(async id=>{const snap=await db.collection(`${root}/quranFollowups`).where('studentId','==',id).get();out[id]=snap.docs.map(d=>({id:d.id,...d.data()})).sort((a,b)=>a.week-b.week)}));return out}
export function quranFollowupResponse(studentId,records){
 const map=new Map(records.map(x=>[Number(x.week),x]));
 const weeks=QURAN_FOLLOWUP_WEEKS.map(item=>({...item,...(map.has(item.week)?{status:map.get(item.week).status,updatedAt:map.get(item.week).updatedAt}:{status:null})}));
 const counts={MASTERED:0,NEEDS_REPEAT:0,NOT_MASTERED:0};for(const item of records)if(statuses.has(item.status))counts[item.status]++;
 return {studentId,classId:QURAN_TRACKING_CLASS_ID,term:'1448-f1',weeks,counts};
}
export async function quranFollowupHandler(req,res){
 try{
  res.setHeader('Cache-Control','private, no-store, max-age=0');
  const action=String(req.query?.action||req.body?.action||'');
  if(action==='quran-teacher-login'){
   if(req.method!=='POST')return fail(res,405,'METHOD_NOT_ALLOWED');
   if(process.env.VERCEL_ENV==='production'||process.env.VERCEL_ENV!=='preview')return fail(res,403,'PREVIEW_ONLY');
   const pin=process.env.QURAN_TEACHER_PIN;if(!pin)return fail(res,503,'TEACHER_GATE_NOT_CONFIGURED');
   if(!sameOrigin(req))return fail(res,403,'ORIGIN_INVALID');const body=jsonBody(req);if(!safeEq(String(body.pin||''),pin))return fail(res,401,'TEACHER_PIN_INVALID');
   const expires=Date.now()+8*60*60*1000;res.setHeader('Set-Cookie',`quran_teacher_session=${teacherCookie(pin,expires)}; Path=/api/learning-automation; HttpOnly; Secure; SameSite=Strict; Max-Age=28800`);return res.status(200).json({ok:true,expiresAt:new Date(expires).toISOString()});
  }
  if(action==='quran-teacher-logout'){
   res.setHeader('Set-Cookie','quran_teacher_session=; Path=/api/learning-automation; HttpOnly; Secure; SameSite=Strict; Max-Age=0');return res.status(200).json({ok:true});
  }
  if(action==='quran-teacher-roster'){
   if(req.method!=='GET')return fail(res,405,'METHOD_NOT_ALLOWED');if(!teacherAuthorized(req))return fail(res,401,'TEACHER_AUTH_REQUIRED');
   const records=await recordsForStudents(QURAN_TRACKING_STUDENT_IDS);return res.status(200).json({ok:true,classId:QURAN_TRACKING_CLASS_ID,students:QURAN_FOLLOWUP_ROSTER,records,weeks:QURAN_FOLLOWUP_WEEKS});
  }
  if(req.method==='GET'){
   const studentId=String(req.query?.studentId||'');if(!QURAN_TRACKING_STUDENT_IDS.includes(studentId))return fail(res,404,'STUDENT_NOT_FOUND');
   if(!await verifyGuardian(studentId,String(req.query?.inviteToken||'')))return fail(res,403,'GUARDIAN_ACCESS_REQUIRED');
   const db=adminDb(),snap=await db.collection(`${root}/quranFollowups`).where('studentId','==',studentId).get();
   return res.status(200).json({ok:true,student:QURAN_FOLLOWUP_ROSTER.find(x=>x.id===studentId),...quranFollowupResponse(studentId,snap.docs.map(d=>({id:d.id,...d.data()})))});
  }
  if(req.method!=='POST')return fail(res,405,'METHOD_NOT_ALLOWED');
  if(process.env.VERCEL_ENV==='production'||process.env.VERCEL_ENV!=='preview')return fail(res,403,'PREVIEW_ONLY');
  if(!sameOrigin(req))return fail(res,403,'ORIGIN_INVALID');
  if(!teacherAuthorized(req))return fail(res,401,'TEACHER_AUTH_REQUIRED');
  const body=jsonBody(req),week=Number(body.week),item=QURAN_FOLLOWUP_WEEKS.find(x=>x.week===week);if(!item)return fail(res,400,'WEEK_INVALID');
  if(item.kind==='exam')return fail(res,400,'WEEK_HAS_NO_MEMORIZATION_ASSESSMENT');
  if(!Array.isArray(body.entries)||body.entries.length!==30)return fail(res,400,'ROSTER_COUNT_INVALID');
  const byId=new Map(body.entries.map(x=>[String(x.studentId||''),x.status]));if(byId.size!==30||QURAN_TRACKING_STUDENT_IDS.some(id=>!byId.has(id))||[...byId.values()].some(status=>!statuses.has(status)))return fail(res,400,'ENTRIES_INVALID');
  const db=adminDb(),batch=db.batch(),timestamp=now(),updatedBy='quran-teacher-preview';
  for(const studentId of QURAN_TRACKING_STUDENT_IDS){const id=`1448-f1_${QURAN_TRACKING_CLASS_ID}_w${String(week).padStart(2,'0')}_${studentId}`;batch.set(db.doc(`${root}/quranFollowups/${id}`),{studentId,classId:QURAN_TRACKING_CLASS_ID,term:'1448-f1',week,surah:item.surah,description:item.description||'',status:byId.get(studentId),updatedAt:timestamp,updatedBy},{merge:true})}
  await batch.commit();return res.status(200).json({ok:true,saved:true,week,surah:item.surah,count:30,updatedAt:timestamp});
 }catch(error){const message=error instanceof Error?error.message:String(error);console.error('quran-followup',message);return fail(res,500,'QURAN_FOLLOWUP_FAILED')}
}
