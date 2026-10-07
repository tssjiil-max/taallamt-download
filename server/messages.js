// Guardian ↔ teacher conversation, one thread per student, stored in the shared database (never in the browser).
// The sender is never taken from the request body: the caller passes the role it has already proven —
// 'guardian' for the holder of that student's invite link, 'teacher' for the signed teacher session.
import {adminDb} from './firebase-admin.js';
import {CLASS_ID} from './class-roster.js';
import {riyadhDateString} from './learning-content.js';
import {workspaceRoot} from './plan.js';
import {ROSTER,rosterStudent,SCHOOL_ID,TEACHER_NAME} from './roster.js';

export const MESSAGE_MAX_LENGTH=1000;
export const MESSAGE_DAILY_LIMIT=40;
export const TEACHER_ID=`teacher:${CLASS_ID}`;
const THREAD_LIMIT=300;
const collection=db=>db.collection(`${workspaceRoot()}/messages`);
const rows=snap=>snap.docs.map(doc=>({id:doc.id,...doc.data()}));
const byTime=(a,b)=>String(a.createdAt||'').localeCompare(String(b.createdAt||''))||String(a.id).localeCompare(String(b.id));
const cleanText=value=>String(value??'').replace(/\r\n?/g,'\n').replace(/[\u0000-\u0008\u000B\u000C\u000E-\u001F\u007F]/g,'').replace(/\n{3,}/g,'\n\n').trim();
function cleanClientId(value){
  const id=String(value||'');
  if(!/^[A-Za-z0-9_-]{8,48}$/.test(id))throw new Error('CLIENT_ID_INVALID');
  return id;
}
const otherSide=role=>role==='teacher'?'guardian':'teacher';
const readField=role=>role==='teacher'?'readByTeacherAt':'readByGuardianAt';
// What either side may see of a message: the text, who wrote it, when, and whether the other side has read it.
function view(row,viewer){
  const mine=row.from===viewer;
  return {id:row.id,from:row.from,mine,text:String(row.text||''),createdAt:String(row.createdAt||''),readAt:mine?String(row[readField(otherSide(viewer))]||''):'',unread:!mine&&!row[readField(viewer)]};
}
async function threadRows(db,studentId){
  return rows(await collection(db).where('studentId','==',studentId).get()).sort(byTime);
}

export async function readThread(studentId,viewer){
  if(!rosterStudent(studentId))throw new Error('STUDENT_NOT_FOUND');
  const list=(await threadRows(adminDb(),studentId)).slice(-THREAD_LIMIT).map(row=>view(row,viewer));
  return {studentId,messages:list,unread:list.filter(item=>item.unread).length,teacherName:TEACHER_NAME,maxLength:MESSAGE_MAX_LENGTH};
}

// `clientId` is chosen once per written message by the sender's page; sending it again (retry after a lost
// connection, double tap) returns the stored message instead of creating a second one.
export async function sendMessage(studentId,from,body,date=new Date()){
  const student=rosterStudent(studentId);if(!student)throw new Error('STUDENT_NOT_FOUND');
  if(from!=='guardian'&&from!=='teacher')throw new Error('SENDER_INVALID');
  const text=cleanText(body?.text);
  if(!text)throw new Error('TEXT_REQUIRED');
  if(text.length>MESSAGE_MAX_LENGTH)throw new Error('MESSAGE_TOO_LONG');
  const clientId=cleanClientId(body?.clientId),db=adminDb(),id=`msg_${student.id}_${from==='teacher'?'t':'g'}_${clientId}`,ref=collection(db).doc(id);
  const existing=await ref.get();
  if(existing.exists)return {saved:true,duplicate:true,message:view({id,...existing.data()},from)};
  const today=riyadhDateString(date),sentToday=(await threadRows(db,student.id)).filter(row=>row.from===from&&riyadhDateString(new Date(row.createdAt))===today).length;
  if(sentToday>=MESSAGE_DAILY_LIMIT)throw new Error('MESSAGE_LIMIT_REACHED');
  const createdAt=date.toISOString();
  const record={id,studentId:student.id,classId:CLASS_ID,schoolId:SCHOOL_ID,teacherId:TEACHER_ID,from,text,clientId,createdAt,readByTeacherAt:from==='teacher'?createdAt:'',readByGuardianAt:from==='guardian'?createdAt:''};
  const created=await db.runTransaction(async tx=>{const snap=await tx.get(ref);if(snap.exists)return false;tx.set(ref,record);return true});
  if(!created){const stored=await ref.get();return {saved:true,duplicate:true,message:view({id,...stored.data()},from)}}
  return {saved:true,duplicate:false,message:view(record,from)};
}

// Opening a thread marks the other side's messages as read for the viewer only.
export async function markThreadRead(studentId,viewer,date=new Date()){
  if(!rosterStudent(studentId))throw new Error('STUDENT_NOT_FOUND');
  const db=adminDb(),field=readField(viewer),unread=(await threadRows(db,studentId)).filter(row=>row.from!==viewer&&!row[field]);
  if(!unread.length)return {saved:true,marked:0};
  const batch=db.batch(),timestamp=date.toISOString();
  for(const row of unread.slice(0,400))batch.set(collection(db).doc(row.id),{[field]:timestamp},{merge:true});
  await batch.commit();
  return {saved:true,marked:Math.min(unread.length,400)};
}

// Teacher inbox: one line per student who has a conversation. Old messages are never deleted; "last 7 days" is a
// filter in the page only.
export async function teacherInbox(){
  const all=rows(await collection(adminDb()).get()).filter(row=>rosterStudent(row.studentId)).sort(byTime),threads=new Map();
  for(const row of all){
    const student=rosterStudent(row.studentId),thread=threads.get(student.id)||{studentId:student.id,name:student.name,number:student.number,count:0,unread:0,last:null,lastIncomingAt:''};
    thread.count+=1;
    if(row.from==='guardian'){thread.lastIncomingAt=String(row.createdAt||'');if(!row.readByTeacherAt)thread.unread+=1}
    thread.last={from:row.from,text:String(row.text||'').slice(0,160),createdAt:String(row.createdAt||'')};
    threads.set(student.id,thread);
  }
  const list=[...threads.values()].sort((a,b)=>String(b.last.createdAt).localeCompare(String(a.last.createdAt)));
  return {ok:true,threads:list,unread:list.reduce((sum,item)=>sum+item.unread,0),students:ROSTER.length};
}
// The «رسائل جديدة» number: incoming guardian messages the teacher has not opened yet.
export async function unreadForTeacher(db=adminDb()){
  return rows(await collection(db).where('from','==','guardian').get()).filter(row=>!row.readByTeacherAt&&rosterStudent(row.studentId)).length;
}
export async function guardianSummary(db,studentId){
  const list=await threadRows(db,studentId);
  return {total:list.length,unread:list.filter(row=>row.from==='teacher'&&!row.readByGuardianAt).length};
}
