// Teacher read models and exceptional edits for the new teacher pages. Called only from api/learning-automation.js
// after the teacher session has been verified there.
import {adminDb,previewWriteGuard} from './firebase-admin.js';
import {CLASS_ID} from './class-roster.js';
import {riyadhDateString,weekNumberForDate,TERM_WEEKS} from './learning-content.js';
import {SUBJECTS,SUBJECT_KEYS,buildPlan,clampWeek,nextSchoolDay,planDocId,planWeekForDate,readWeekPlan,subjectKeyOf,todayInfo,weekKeyFor,weekRange,workspaceRoot} from './plan.js';
import {assessBulk,assessOne,assessUndo,assessView,assessedToday,isFocused,readProfiles,readWeekData,setFocus,weekProgress,weekResultsByStudent} from './quick-assess.js';
import {homeworkDisplayTitle,homeworkStatus,homeworkSubjectLabel} from './student-home.js';
import {assistantStatus,saveProvider} from './assistant.js';
import {markThreadRead,readThread,sendMessage,teacherInbox,unreadForTeacher} from './messages.js';
import {guardianAssistantSettings,guardianAssistantThreadState,markTeacherReplied,saveGuardianAssistantSettings} from './guardian-assistant.js';
import {CLASS_LABEL,CLASS_SHORT,ROSTER,rosterStudent,SCHOOL_ID,SCHOOL_NAME,TEACHER_FIRST_NAME,TEACHER_NAME,TERM_ID,TERM_LABEL} from './roster.js';

const rows=snap=>snap.docs.map(doc=>({id:doc.id,...doc.data()}));
const localDay=value=>{if(!value)return '';const date=new Date(value);return Number.isNaN(date.getTime())?'':riyadhDateString(date)};
const clampStars=value=>Math.max(0,Math.min(30,Number(value)||0));
const text=(value,max)=>String(value??'').trim().slice(0,max);

export const AUTOMATION_SCHEDULE={
  timezone:'Asia/Riyadh',
  weekly:'السبت 08:00 — نشر خطة الأسبوع الذي يبدأ الأحد',
  daily:'الأحد–الخميس 05:00 — نشر واجبات اليوم',
  catchup:'استدراك تلقائي عند أول فتح لصفحة المعلم أو الطالب إذا فات التشغيل المجدول'
};

async function homeworkForDate(db,localDate){
  const base=workspaceRoot(),snap=await db.collection(`${base}/homework`).where('scheduledDate','==',localDate).get();
  const list=rows(snap).filter(item=>item.status!=='cancelled').sort((a,b)=>String(a.assignedAt||'').localeCompare(String(b.assignedAt||'')));
  const evidence=await Promise.all(list.map(item=>db.collection(`${base}/homeworkEvidence`).where('homeworkId','==',item.id).get()));
  return list.map((item,index)=>{
    const byStudent=new Map(rows(evidence[index]).map(row=>[row.studentId,row])),subjectKey=item.subjectKey||subjectKeyOf(item.subject)||'';
    const students=ROSTER.filter(student=>byStudent.has(student.id)).map(student=>{const row=byStudent.get(student.id),status=homeworkStatus(row);return {id:student.id,status,completedAt:String(row.completedAt||''),confirmedBy:status==='done'?String(row.confirmedBy||'guardian'):'',approved:Boolean(row.teacherApprovedAt)}});
    return {
      id:item.id,subjectKey,subjectLabel:homeworkSubjectLabel(item,subjectKey),title:String(item.title||'واجب'),displayTitle:homeworkDisplayTitle(item),
      lesson:String(item.lesson||''),segment:String(item.segment||''),skill:String(item.skill||''),page:Number(item.page)||null,exercise:String(item.exercise||item.assignmentType||''),
      task:String(item.task||item.instructions||''),kind:item.kind==='training'?'training':'homework',source:String(item.source||'teacher'),
      publishedAt:String(item.publishedAt||item.assignedAt||''),publishedDate:String(item.scheduledDate||''),dueDate:String(item.dueDate||''),edited:Boolean(item.editedByTeacherAt),
      assigned:students.length,done:students.filter(student=>student.status==='done').length,approved:students.filter(student=>student.approved).length,students
    };
  });
}

export async function teacherHome(date=new Date()){
  const db=adminDb(),base=workspaceRoot(),today=todayInfo(date),week=weekNumberForDate(date),month=date.toISOString().slice(0,7);
  const profiles=await readProfiles(db);
  const [plan,weekData,homework,ledgers,run,unreadMessages]=await Promise.all([
    readWeekPlan(db,planWeekForDate(date)),
    readWeekData(db,date),
    homeworkForDate(db,today.date),
    db.collection(`${base}/rewardLedgers`).where('month','==',month).get(),
    db.doc(`${base}/automationRuns/${today.date}`).get(),
    unreadForTeacher(db)
  ]);
  const progress=weekProgress(weekData,profiles,date),weekResults=weekResultsByStudent(weekData,date),todayResults=assessedToday(weekData,date),assessedIds=new Set(todayResults.studentIds);
  const starsBy=new Map(rows(ledgers).map(item=>[item.studentId,clampStars(item.stars)]));
  const students=ROSTER.map(student=>({id:student.id,number:student.number,name:student.name,focused:isFocused(profiles.get(student.id),''),stars:starsBy.get(student.id)||0,week:weekResults.get(student.id),assessedToday:assessedIds.has(student.id)}));
  const totalStars=students.reduce((sum,student)=>sum+student.stars,0);
  const runData=run.exists?run.data():null;
  return {
    ok:true,generatedAt:date.toISOString(),
    teacher:{name:TEACHER_NAME,firstName:TEACHER_FIRST_NAME,school:SCHOOL_NAME,schoolId:SCHOOL_ID,classId:CLASS_ID,classLabel:CLASS_LABEL,classShort:CLASS_SHORT,termId:TERM_ID,termLabel:TERM_LABEL},
    today,week:{number:week,key:weekKeyFor(week),label:`الأسبوع ${week}`,termWeeks:TERM_WEEKS,range:weekRange(week)},
    summary:{students:students.length,focused:students.filter(student=>student.focused).length,assessedToday:assessedIds.size,messages:unreadMessages},
    todayAssessments:todayResults.entries.map(entry=>({...entry,label:SUBJECTS[entry.subjectKey].label})),
    plan,
    assessment:{week,items:progress,focusedCount:students.filter(student=>student.focused).length},
    homework:{date:today.date,items:homework,assignedTotal:homework.reduce((sum,item)=>sum+item.assigned,0),doneTotal:homework.reduce((sum,item)=>sum+item.done,0)},
    stars:{month,goal:30,total:totalStars,withStars:students.filter(student=>student.stars>0).length,top:Math.max(0,...students.map(student=>student.stars))},
    students,
    automation:{schedule:AUTOMATION_SCHEDULE,today:runData?{firstRunAt:runData.firstRunAt||'',firstSource:runData.firstSource||'',lastRunAt:runData.lastRunAt||'',lastSource:runData.lastSource||'',runs:Number(runData.runs)||0,homeworkCreated:Number(runData.homeworkCreated)||0,gaps:Array.isArray(runData.gaps)?runData.gaps:[]}:null}
  };
}

export async function teacherRead(action,query={},date=new Date()){
  if(action==='teacher_home')return teacherHome(date);
  if(action==='announcements'){
    const snap=await adminDb().collection(`${workspaceRoot()}/announcements`).get();
    const items=snap.docs.map(doc=>{const data=doc.data();const {imageDataUrl,...safe}=data;return {id:doc.id,...safe,hasImage:Boolean(imageDataUrl)}}).sort((a,b)=>String(b.updatedAt||b.date||'').localeCompare(String(a.updatedAt||a.date||'')));
    return {ok:true,items};
  }
  if(action==='assess_view')return assessView(query,date);
  if(action==='plan_week'){
    const current=planWeekForDate(date),week=clampWeek(query.week||current),plan=await readWeekPlan(adminDb(),week);
    return {ok:true,currentWeek:current,plan:plan.published?plan:{...buildPlan(week,[]),fromDistribution:true}};
  }
  if(action==='messages_inbox'){
    const [inbox,assistant]=await Promise.all([teacherInbox(),guardianAssistantSettings()]);
    const threads=await Promise.all(inbox.threads.map(async thread=>({...thread,...await guardianAssistantThreadState(thread.studentId)})));
    return {...inbox,threads,assistant};
  }
  if(action==='messages_thread'){
    const studentId=String(query.studentId||'');
    const [thread,assistantState]=await Promise.all([readThread(studentId,'teacher'),guardianAssistantThreadState(studentId)]);
    return {ok:true,...thread,assistantState};
  }
  if(action==='assistant_status')return assistantStatus(query,date);
  if(action==='homework_day'){
    const day=/^\d{4}-\d{2}-\d{2}$/.test(String(query.date||''))?String(query.date):riyadhDateString(date);
    return {ok:true,date:day,items:await homeworkForDate(adminDb(),day)};
  }
  return null;
}

// Exceptional edit of one subject in a published weekly plan. Stored beside the automatic content, so the automation
// keeps running and the edit reaches the students through the same plan record.
async function planEdit(body){
  const week=clampWeek(body.week),subjectKey=String(body.subjectKey||'');
  if(!SUBJECT_KEYS.includes(subjectKey))throw new Error('SUBJECT_INVALID');
  const db=adminDb(),ref=db.doc(`${workspaceRoot()}/weeklyPlans/${planDocId(week,subjectKey)}`),snap=await ref.get();
  if(!snap.exists)throw new Error('PLAN_NOT_FOUND');
  const timestamp=new Date().toISOString();
  if(body.clear){await ref.set({override:null,updatedAt:timestamp},{merge:true});return {saved:true,cleared:true}}
  const override={lesson:text(body.lesson,160),skill:text(body.skill,200),unit:text(body.unit,120),note:text(body.note,400),editedAt:timestamp};
  if(!override.lesson&&!override.skill&&!override.unit&&!override.note)throw new Error('TEXT_REQUIRED');
  await ref.set({override,updatedAt:timestamp},{merge:true});
  return {saved:true,override};
}

// Exceptional homework for the whole class. `requestId` makes a repeated request a no-op instead of a duplicate.
async function homeworkSend(body,date=new Date()){
  const title=text(body.title,200);if(!title)throw new Error('TITLE_REQUIRED');
  const task=text(body.task||body.instructions,2000);if(!task)throw new Error('TEXT_REQUIRED');
  const subjectKey=SUBJECT_KEYS.includes(body.subjectKey)?body.subjectKey:'';
  const requestId=String(body.requestId||'').replace(/[^A-Za-z0-9_-]/g,'').slice(0,60)||`${date.getTime()}_${Math.random().toString(36).slice(2,9)}`;
  const kind=body.kind==='training'?'training':'homework',id=`class_${kind}_${requestId}`;
  const db=adminDb(),base=workspaceRoot(),ref=db.doc(`${base}/homework/${id}`);
  if((await ref.get()).exists)return {saved:true,id,duplicate:true,students:ROSTER.length};
  const timestamp=date.toISOString(),localDate=riyadhDateString(date),page=Number(body.page)>0?Math.floor(Number(body.page)):null;
  const dueDate=/^\d{4}-\d{2}-\d{2}$/.test(String(body.dueDate||''))?String(body.dueDate):nextSchoolDay(localDate);
  const record={id,classId:CLASS_ID,schoolId:SCHOOL_ID,termId:TERM_ID,weekKey:weekKeyFor(weekNumberForDate(date)),weekNumber:weekNumberForDate(date),
    subject:subjectKey?SUBJECTS[subjectKey].label:(kind==='training'?'تدريب منزلي':'واجب'),...(subjectKey?{subjectKey}:{}),title,instructions:task,task,
    ...(text(body.lesson,160)?{lesson:text(body.lesson,160)}:{}),...(page?{page}:{}),...(text(body.exercise,120)?{exercise:text(body.exercise,120)}:{}),
    targetIds:[],scheduledDate:localDate,dueDate,assignedAt:timestamp,publishedAt:timestamp,status:'published',kind,source:'teacher_class'};
  const batch=db.batch();batch.set(ref,record);
  for(const student of ROSTER){const evidenceId=`${id}_${student.id}`;batch.set(db.doc(`${base}/homeworkEvidence/${evidenceId}`),{id:evidenceId,homeworkId:id,studentId:student.id,status:'assigned',assignedAt:timestamp,source:'teacher_class'})}
  await batch.commit();
  return {saved:true,id,duplicate:false,students:ROSTER.length};
}
async function homeworkEdit(body){
  const id=String(body.homeworkId||'');if(!id||id.includes('/'))throw new Error('HOMEWORK_ID_REQUIRED');
  const db=adminDb(),ref=db.doc(`${workspaceRoot()}/homework/${id}`),snap=await ref.get();
  if(!snap.exists)throw new Error('HOMEWORK_NOT_FOUND');
  const timestamp=new Date().toISOString(),patch={editedByTeacherAt:timestamp};
  if(body.cancel===true)patch.status='cancelled';
  if(body.title!==undefined){const title=text(body.title,200);if(!title)throw new Error('TITLE_REQUIRED');patch.title=title}
  if(body.task!==undefined){const task=text(body.task,2000);if(!task)throw new Error('TEXT_REQUIRED');patch.task=task;patch.instructions=task}
  if(body.dueDate!==undefined){if(!/^\d{4}-\d{2}-\d{2}$/.test(String(body.dueDate)))throw new Error('DATE_INVALID');patch.dueDate=String(body.dueDate)}
  await ref.set(patch,{merge:true});
  return {saved:true,id,cancelled:patch.status==='cancelled'};
}
// Teacher approval is separate from the student's own "done" mark.
async function homeworkReview(body){
  const id=String(body.homeworkId||''),student=rosterStudent(body.studentId);
  if(!id||id.includes('/'))throw new Error('HOMEWORK_ID_REQUIRED');if(!student)throw new Error('STUDENT_NOT_FOUND');
  const db=adminDb(),ref=db.doc(`${workspaceRoot()}/homeworkEvidence/${id}_${student.id}`),snap=await ref.get();
  if(!snap.exists)throw new Error('HOMEWORK_NOT_FOUND');
  const approved=body.approved!==false;
  await ref.set({teacherApprovedAt:approved?new Date().toISOString():null},{merge:true});
  return {saved:true,approved};
}

export async function teacherWrite(action,body={},date=new Date()){
  previewWriteGuard();
  if(action==='assess_one')return assessOne(body,date);
  if(action==='assess_bulk')return assessBulk(body,date);
  if(action==='assess_undo')return assessUndo(body,date);
  if(action==='focus_set')return setFocus(body);
  if(action==='plan_edit')return planEdit(body);
  if(action==='homework_send')return homeworkSend(body,date);
  if(action==='homework_edit')return homeworkEdit(body);
  if(action==='homework_review')return homeworkReview(body);
  // The teacher's identity comes from the signed session checked by the caller, never from the request body.
  if(action==='message_reply'){
    const studentId=String(body.studentId||''),result=await sendMessage(studentId,'teacher',body,date);
    await markTeacherReplied(studentId,date);
    return result;
  }
  if(action==='messages_mark_read')return markThreadRead(String(body.studentId||''),'teacher',date);
  if(action==='assistant_provider')return saveProvider(body);
  if(action==='guardian_assistant_settings')return saveGuardianAssistantSettings(body);
  if(action==='announcement_save'){
    const id=String(body.id||`a${Date.now()}`).replace(/[^a-zA-Z0-9_-]/g,'').slice(0,80);
    const title=String(body.title||'').trim().slice(0,160);
    if(!title)throw new Error('TITLE_REQUIRED');
    const status=['draft','published','archived'].includes(String(body.status))?String(body.status):'draft';
    const ref=adminDb().doc(`${workspaceRoot()}/announcements/${id}`),snap=await ref.get(),previous=snap.exists?snap.data():{};
    let imageDataUrl=String(previous?.imageDataUrl||'');
    if(body.removeImage===true)imageDataUrl='';
    const incoming=String(body.imageDataUrl||'');
    if(incoming){
      if(!/^data:image\/(jpeg|png|webp);base64,[A-Za-z0-9+/=]+$/.test(incoming))throw new Error('IMAGE_INVALID');
      if(incoming.length>850000)throw new Error('IMAGE_TOO_LARGE');
      imageDataUrl=incoming;
    }
    const record={id,title,body:String(body.body||'').trim().slice(0,2000),date:/^\d{4}-\d{2}-\d{2}$/.test(String(body.date||''))?String(body.date):riyadhDateString(date),status,imageDataUrl,updatedAt:date.toISOString()};
    await ref.set(record,{merge:true});
    return {saved:true,item:{id:record.id,title:record.title,body:record.body,date:record.date,status:record.status,updatedAt:record.updatedAt,hasImage:Boolean(imageDataUrl)}};
  }
  return null;
}
