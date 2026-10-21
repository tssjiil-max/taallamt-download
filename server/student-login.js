import {randomBytes,randomInt,scrypt as scryptCallback} from 'node:crypto';
import {promisify} from 'node:util';
import {adminDb,previewWriteGuard} from './firebase-admin.js';
import {WORKSPACE_ID} from './class-roster.js';
import {ROSTER,rosterStudent} from './roster.js';
import {AccessError,accessFailure,requireTeacher,sameOrigin,header} from './access.js';
import {authRoot,digest,equal,studentCookie,studentSession,sessionToken,STUDENT_SESSION_SECONDS} from './student-session.js';
const scrypt=promisify(scryptCallback),WINDOW=15*60*1000;
export const normalizePin=value=>String(value??'').normalize('NFKC').replace(/[٠-٩]/g,d=>'٠١٢٣٤٥٦٧٨٩'.indexOf(d)).replace(/[۰-۹]/g,d=>'۰۱۲۳۴۵۶۷۸۹'.indexOf(d));
const fail=(code,status)=>{throw new AccessError(code,status)};
const cred=id=>adminDb().doc(`${authRoot()}/studentLoginCredentials/${id}`);
async function attempt(req,id){
 const db=adminDb(),ip=header(req,'x-real-ip')||header(req,'x-forwarded-for').split(',')[0]||'unknown';
 const refs=[db.doc(`${authRoot()}/studentLoginAttempts/${digest(`ip:${ip}`)}`),db.doc(`${authRoot()}/studentLoginAttempts/${digest(`student:${id}`)}`)];
 await db.runTransaction(async tx=>{const snaps=await Promise.all(refs.map(r=>tx.get(r)));const rows=snaps.map(s=>(s.exists?s.data().attempts||[]:[]).filter(t=>t>Date.now()-WINDOW));if(rows.some((r,i)=>r.length>=(i===0?30:8)))fail('STUDENT_LOGIN_LOCKED',429);rows.forEach((r,i)=>tx.set(refs[i],{attempts:[...r,Date.now()]}))});
}
// A complete recursive, restorable copy is finalized before credential mutations are allowed.
async function backup(existingId){
 const db=adminDb();
 if(existingId&&!/^[a-f0-9]{32}$/.test(String(existingId)))fail('BACKUP_INVALID',400);
 const id=existingId||randomBytes(16).toString('hex'),target=db.doc(`studentLoginBackups/${WORKSPACE_ID}/snapshots/${id}`);
 let state;
 if(existingId){const snap=await target.get();if(!snap.exists||snap.data().workspaceId!==WORKSPACE_ID)fail('BACKUP_INVALID',400);state=snap.data();if(state.complete)return {backupId:id,count:state.count,complete:true}}
 else{
  const root=db.doc(authRoot()),snapshot=await root.get(),collections=await root.listCollections();
  state={workspaceId:WORKSPACE_ID,complete:false,count:snapshot.exists?1:0,createdAt:Date.now(),queue:collections.map(c=>({path:c.path,after:''}))};
  const batch=db.batch();if(snapshot.exists)batch.set(target.collection('documents').doc(digest(root.path)),{path:root.path,data:snapshot.data()});batch.set(target,state);await batch.commit();
 }
 const queue=[...state.queue];
 if(queue.length){
  const task=queue.shift(),all=(await db.collection(task.path).get()).docs.sort((a,b)=>(a.id<b.id?-1:a.id>b.id?1:0)),docs=all.filter(d=>d.id>task.after).slice(0,20);
  const children=await Promise.all(docs.map(d=>d.ref.listCollections()));
  const batch=db.batch();for(const doc of docs)batch.set(target.collection('documents').doc(digest(doc.ref.path)),{path:doc.ref.path,data:doc.data()});
  for(const list of children)for(const c of list)queue.push({path:c.path,after:''});
  if(docs.length===20)queue.unshift({path:task.path,after:docs[docs.length-1].id});
  state={...state,count:state.count+docs.length,queue,complete:queue.length===0};
  if(state.count>10000)fail('BACKUP_TOO_LARGE',503);batch.set(target,state);await batch.commit();
 }else{state={...state,complete:true};await target.set(state)}
 return {backupId:id,count:state.count,complete:state.complete};
}
async function verifiedBackup(id){if(!/^[a-f0-9]{32}$/.test(String(id||'')))fail('RESTORABLE_BACKUP_REQUIRED',409);const s=await adminDb().doc(`studentLoginBackups/${WORKSPACE_ID}/snapshots/${id}`).get();if(!s.exists||!s.data().complete||s.data().workspaceId!==WORKSPACE_ID||Date.now()-s.data().createdAt>24*60*60*1000)fail('RESTORABLE_BACKUP_REQUIRED',409)}
export default async function handler(req,res){
 res.setHeader('Cache-Control','private, no-store');res.setHeader('Referrer-Policy','no-referrer');
 try{
  if(req.method==='GET'){
   if(req.query?.loginView==='manage'){requireTeacher(req);const students=await Promise.all(ROSTER.map(async s=>{const c=await cred(s.id).get(),v=c.exists?c.data():{};return {id:s.id,name:s.name,active:Boolean(v.active),lastLoginAt:v.lastLoginAt||null}}));return res.status(200).json({ok:true,students})}
   const session=await studentSession(req);return res.status(200).json({ok:true,session,students:ROSTER.map(({id,name})=>({id,name}))});
  }
  if(req.method!=='POST')return res.status(405).json({ok:false,error:'METHOD_NOT_ALLOWED'});
  if(!sameOrigin(req))fail('ORIGIN_INVALID',403);
  const body=typeof req.body==='string'?JSON.parse(req.body):req.body||{},action=String(body.action||'login');
  if(action==='logout'){const token=sessionToken(req);if(/^[A-Za-z0-9_-]{43}$/.test(token))await adminDb().doc(`${authRoot()}/studentLoginSessions/${digest(token)}`).set({revoked:true},{merge:true});res.setHeader('Set-Cookie',studentCookie(req,'',0));return res.status(200).json({ok:true})}
  if(['backup','issue','revoke'].includes(action)){
   requireTeacher(req,{write:true});previewWriteGuard();
   if(action==='backup')return res.status(200).json({ok:true,...await backup(body.backupId)});
   if(!rosterStudent(body.studentId))fail('STUDENT_NOT_FOUND',404);
   await verifiedBackup(body.backupId);
   const ref=cred(body.studentId),pin=String(randomInt(0,1000000)).padStart(6,'0'),salt=randomBytes(16).toString('hex'),hash=(await scrypt(pin,salt,32,{N:16384,r:8,p:1})).toString('hex');
   await adminDb().runTransaction(async tx=>{const before=await tx.get(ref);if(action==='issue'&&before.exists&&before.data().active&&!body.reset)fail('PIN_ALREADY_ACTIVE',409);tx.set(adminDb().doc(`${authRoot()}/studentLoginAudit/${randomBytes(16).toString('hex')}`),{studentId:body.studentId,action,backupId:body.backupId,before:before.exists?before.data():null,at:Date.now()});tx.set(ref,{studentId:body.studentId,active:action==='issue',salt,hash,revision:randomBytes(16).toString('hex'),updatedAt:Date.now()})});
   return res.status(200).json({ok:true,studentId:body.studentId,...(action==='issue'?{pin}:{})});
  }
  if(action!=='login')fail('ACTION_INVALID',400);
  const id=String(body.studentId||''),pin=normalizePin(body.pin);
  if(!rosterStudent(id)||!/^\d{6}$/.test(pin))fail('STUDENT_CODE_INVALID',401);
  await attempt(req,id);
  const c=await cred(id).get(),v=c.exists?c.data():{},hash=(await scrypt(pin,v.salt||'unconfigured-student',32,{N:16384,r:8,p:1})).toString('hex');
  if(!v.active||!equal(hash,v.hash||''))fail('STUDENT_CODE_INVALID',401);
  const token=randomBytes(32).toString('base64url'),expiresAt=Date.now()+STUDENT_SESSION_SECONDS*1000;
  await adminDb().runTransaction(async tx=>{const current=await tx.get(cred(id));if(!current.exists||!current.data().active||current.data().revision!==v.revision)fail('STUDENT_CODE_INVALID',401);tx.set(adminDb().doc(`${authRoot()}/studentLoginSessions/${digest(token)}`),{studentId:id,revision:v.revision,expiresAt,createdAt:Date.now()});tx.set(cred(id),{lastLoginAt:Date.now()},{merge:true})});
  res.setHeader('Set-Cookie',studentCookie(req,token));return res.status(200).json({ok:true,studentId:id,expiresAt});
 }catch(error){if(accessFailure(res,error))return;console.error('student-login',error?.code||'INTERNAL_ERROR');return res.status(500).json({ok:false,error:'STUDENT_LOGIN_UNAVAILABLE'})}
}
