// Access control for the teacher tools and the per-student pages.
// - Teacher: signs in once with the teacher code, then carries an HttpOnly signed session cookie.
// - Student / guardian: can only read (and mark homework for) the one student whose invite token they hold.
// Nothing here opens teacher tools to the public: without a valid session every teacher action answers 401.
import {createHash,createHmac,scryptSync,timingSafeEqual} from 'node:crypto';
import {adminDb} from './firebase-admin.js';
import {WORKSPACE_ID,IS_PRODUCTION} from './class-roster.js';

export const TEACHER_COOKIE='taallamt_teacher';
const SESSION_SECONDS=30*24*60*60;
const LOCK_WINDOW_MS=15*60*1000;
const LOCK_AFTER=8;
const MIN_CODE_LENGTH=8;

// Staging-only fallback so the teacher gate works on a Preview deployment that has no TEACHER_ACCESS_CODE yet.
// Only a salted scrypt digest of a random 60-bit code is stored here; the code itself is never committed.
// Production never uses this fallback: there the gate needs TEACHER_ACCESS_CODE in the environment.
const STAGING_CODE={salt:'007ee1a3d377d5555087c132b1485ed1',hash:'ed122906bc558fd7a72bca98d9cba2e314e29651c61ef55f903bfa84e80f2e90'};

const sha=value=>createHash('sha256').update(String(value)).digest('hex');
export function safeEqual(a,b){const aa=Buffer.from(String(a)),bb=Buffer.from(String(b));return aa.length===bb.length&&timingSafeEqual(aa,bb)}
const ARABIC_DIGITS='٠١٢٣٤٥٦٧٨٩',PERSIAN_DIGITS='۰۱۲۳۴۵۶۷۸۹';
export function normalizeCode(value){
  return String(value??'').normalize('NFKC')
    .replace(/[٠-٩]/g,d=>String(ARABIC_DIGITS.indexOf(d))).replace(/[۰-۹]/g,d=>String(PERSIAN_DIGITS.indexOf(d)))
    .replace(/[\s\-_.]/g,'').toUpperCase();
}
// The generated staging code uses an alphabet without I, L, O, U, so look-alike characters can be folded safely.
const foldLookalikes=value=>value.replace(/O/g,'0').replace(/[IL]/g,'1');

function sessionSecret(){
  return process.env.TAALLAMT_SESSION_SECRET||process.env.FIREBASE_PRIVATE_KEY||process.env.FIREBASE_SERVICE_ACCOUNT_JSON||process.env.FIREBASE_SERVICE_ACCOUNT_B64||'';
}
export function teacherGate(){
  if(!sessionSecret())return {configured:false,reason:'SESSION_SECRET_MISSING'};
  const envCode=String(process.env.TEACHER_ACCESS_CODE||'').trim();
  // A short code would be guessable; it is refused rather than accepted as a weak gate.
  if(envCode&&normalizeCode(envCode).length<MIN_CODE_LENGTH)return {configured:false,reason:'TEACHER_CODE_TOO_SHORT'};
  if(envCode)return {configured:true,source:'environment',fingerprint:sha(`env:${envCode}`),check:code=>safeEqual(sha(normalizeCode(code)),sha(normalizeCode(envCode)))};
  if(!IS_PRODUCTION)return {configured:true,source:'staging',fingerprint:sha(`staging:${STAGING_CODE.hash}`),check:code=>{
    const candidate=foldLookalikes(normalizeCode(code));if(candidate.length<8||candidate.length>64)return false;
    return safeEqual(scryptSync(candidate,STAGING_CODE.salt,32,{N:16384,r:8,p:1}).toString('hex'),STAGING_CODE.hash);
  }};
  return {configured:false,reason:'TEACHER_CODE_MISSING'};
}

const signingKey=gate=>createHmac('sha256',sessionSecret()).update(`teacher-session|${WORKSPACE_ID}|${gate.fingerprint}`).digest();
function signSession(gate,expires){const payload=`v1.${expires}`;return `${payload}.${createHmac('sha256',signingKey(gate)).update(payload).digest('base64url')}`}
function validSession(token,gate){
  const parts=String(token||'').split('.');if(parts.length!==3||parts[0]!=='v1')return false;
  const expires=Number(parts[1]);if(!Number.isFinite(expires)||expires<Date.now())return false;
  return safeEqual(signSession(gate,expires),token);
}

export function header(req,name){const value=req.headers?.[name]??req.headers?.[name.toLowerCase()];return Array.isArray(value)?String(value[0]||''):String(value||'')}
function readCookie(req,name){return header(req,'cookie').split(';').map(part=>part.trim()).find(part=>part.startsWith(`${name}=`))?.slice(name.length+1)||''}
const requestHost=req=>header(req,'x-forwarded-host')||header(req,'host');
const isLocalHost=req=>/^(localhost|127\.0\.0\.1)(:\d+)?$/.test(requestHost(req));
// Cookie-authenticated writes must come from our own pages (browsers always send Origin on cross-site POSTs).
export function sameOrigin(req){const origin=header(req,'origin');if(!origin)return false;try{return new URL(origin).host===requestHost(req)}catch{return false}}
function cookieHeader(req,value,maxAge){return `${TEACHER_COOKIE}=${value}; Path=/api; HttpOnly; SameSite=Lax; Max-Age=${maxAge}${isLocalHost(req)?'':'; Secure'}`}

export function isTeacher(req){const gate=teacherGate();return gate.configured&&validSession(readCookie(req,TEACHER_COOKIE),gate)}
export class AccessError extends Error{constructor(code,status){super(code);this.code=code;this.status=status}}
export function requireTeacher(req,{write=false}={}){
  const gate=teacherGate();
  if(!gate.configured)throw new AccessError('TEACHER_GATE_NOT_CONFIGURED',503);
  if(!validSession(readCookie(req,TEACHER_COOKIE),gate))throw new AccessError('TEACHER_AUTH_REQUIRED',401);
  if(write&&!sameOrigin(req))throw new AccessError('ORIGIN_INVALID',403);
  return true;
}

export function validInviteShape(value){return typeof value==='string'&&value.length>=20&&value.length<=200}
export function inviteMatches(profile,invite){const stored=String(profile?.guardianInviteToken||'');return validInviteShape(invite)&&Boolean(stored)&&safeEqual(stored,invite)}
export function inviteFrom(req,body){return String(req.query?.inviteToken||req.query?.invite||body?.inviteToken||body?.invite||header(req,'x-student-invite')||'').trim()}
// Returns 'teacher' or 'guardian'. A guardian link only ever opens the one student it was issued for.
export async function requireStudentAccess(req,studentId,body,{write=false}={}){
  if(isTeacher(req)){
    if(write&&!sameOrigin(req))throw new AccessError('ORIGIN_INVALID',403);
    return 'teacher';
  }
  const invite=inviteFrom(req,body);
  if(!validInviteShape(invite))throw new AccessError('STUDENT_ACCESS_REQUIRED',401);
  const snap=await adminDb().doc(`workspaces/${WORKSPACE_ID}/studentProfiles/${studentId}`).get();
  if(!inviteMatches(snap.exists?snap.data():null,invite))throw new AccessError('STUDENT_ACCESS_DENIED',403);
  return 'guardian';
}

// Lockout is counted per client address, inside a transaction, and the attempt is recorded before the code is checked,
// so parallel guesses cannot slip past the limit and one client cannot lock the teacher out from another network.
const clientKey=req=>createHash('sha256').update(header(req,'x-real-ip')||header(req,'x-forwarded-for').split(',')[0].trim()||'unknown').digest('hex').slice(0,24);
const lockRef=req=>adminDb().doc(`workspaces/${WORKSPACE_ID}/teacherGateAttempts/${clientKey(req)}`);
async function registerAttempt(req){
  const ref=lockRef(req),now=Date.now();
  return adminDb().runTransaction(async tx=>{
    const snap=await tx.get(ref),recent=(snap.exists&&Array.isArray(snap.data()?.attempts)?snap.data().attempts:[]).filter(time=>Number(time)>now-LOCK_WINDOW_MS);
    if(recent.length>=LOCK_AFTER)return {locked:true,left:0};
    tx.set(ref,{attempts:[...recent,now],updatedAt:new Date(now).toISOString()});
    return {locked:false,left:LOCK_AFTER-recent.length-1};
  });
}

export function sessionStatus(req){
  const gate=teacherGate();
  return {ok:true,teacher:gate.configured&&validSession(readCookie(req,TEACHER_COOKIE),gate),gateConfigured:gate.configured,gateSource:gate.configured?gate.source:null,gateReason:gate.configured?null:gate.reason,environment:IS_PRODUCTION?'production':'staging'};
}
export async function teacherLogin(req,res,body){
  const gate=teacherGate();
  if(!gate.configured)throw new AccessError('TEACHER_GATE_NOT_CONFIGURED',503);
  if(!sameOrigin(req))throw new AccessError('ORIGIN_INVALID',403);
  const code=String(body?.code??body?.pin??'');
  if(!code.trim())throw new AccessError('TEACHER_CODE_REQUIRED',400);
  const attempt=await registerAttempt(req);
  if(attempt.locked)throw new AccessError('TEACHER_LOGIN_LOCKED',429);
  if(!gate.check(code)){const error=new AccessError('TEACHER_CODE_INVALID',401);error.attemptsLeft=attempt.left;throw error}
  await lockRef(req).set({attempts:[],updatedAt:new Date().toISOString()});
  const expires=Date.now()+SESSION_SECONDS*1000;
  res.setHeader('Set-Cookie',cookieHeader(req,signSession(gate,expires),SESSION_SECONDS));
  return {ok:true,teacher:true,expiresAt:new Date(expires).toISOString()};
}
export function teacherLogout(req,res){res.setHeader('Set-Cookie',cookieHeader(req,'',0));return {ok:true,teacher:false}}

export function accessFailure(res,error){
  if(!(error instanceof AccessError))return false;
  res.status(error.status).json({ok:false,error:error.code,...(error.attemptsLeft!==undefined?{attemptsLeft:error.attemptsLeft}:{})});
  return true;
}
