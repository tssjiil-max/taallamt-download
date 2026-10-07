// Student / guardian read model for the new student pages. One payload feeds the home cards and their detail sheets,
// so a summary and its details can never disagree. It carries only this student's own data: no class lists and
// nothing about the teacher's focused follow-up list.
import {adminDb} from './firebase-admin.js';
import {contentForWeek,riyadhDateString,weekNumberForDate,TERM_WEEKS} from './learning-content.js';
import {QURAN_FOLLOWUP_WEEKS} from './quran-followup-curriculum.js';
import {AccessError,inviteFrom,inviteMatches,isTeacher,validInviteShape} from './access.js';
import {SUBJECTS,SUBJECT_KEYS,buildPlan,clampWeek,planWeekForDate,readWeekPlan,subjectKeyOf,todayInfo,weekKeyFor,weekRange,workspaceRoot} from './plan.js';
import {currentQuranWeek,quranWeekInfo,resultFromQuran,resultFromStored} from './quick-assess.js';
import {guardianSummary,readThread} from './messages.js';
import {CLASS_LABEL,CLASS_SHORT,rosterStudent,SCHOOL_NAME,TERM_LABEL,TEACHER_NAME} from './roster.js';

const DAY_MS=86400000;
const STAR_GOAL=30;
const rows=snap=>snap.docs.map(doc=>({id:doc.id,...doc.data()}));
const localDay=value=>{if(!value)return '';const date=new Date(value);return Number.isNaN(date.getTime())?'':riyadhDateString(date)};
const weekOfTarget=targetId=>{const match=String(targetId||'').match(/:w(\d{1,2})$/);return match?Number(match[1]):null};
const clampStars=value=>Math.max(0,Math.min(STAR_GOAL,Number(value)||0));

export function homeworkStatus(evidence){
  if(evidence?.status==='completed'||evidence?.correct===true)return 'done';
  if(evidence?.status==='submitted'||evidence?.status==='graded')return 'submitted';
  return 'assigned';
}
// Short child-friendly line for the home card: what to do, not the subject name again.
export function homeworkDisplayTitle(homework){
  if(homework.source!=='automation'||homework.editedByTeacherAt)return String(homework.title||'واجب');
  const lesson=String(homework.lesson||''),segment=String(homework.segment||''),skill=String(homework.skill||'');
  if(homework.taskType==='copywriting'||homework.taskType==='copywork_lughati')return `نسخ لغتي: ${lesson}`;
  if(homework.taskType==='quran_memorization')return `حفظ ${segment}${lesson?` — ${lesson}`:''}`;
  if(homework.taskType==='quran_review')return `مراجعة: ${segment||lesson}`;
  if(homework.taskType==='spelling_practice'||homework.taskType==='spelling_task')return `الإملاء: ${skill||lesson}`;
  if(homework.taskType==='handwriting_task')return `فن الخط: ${lesson||skill}`;
  if(homework.taskType==='lesson_practice')return `مراجعة درس: ${lesson}`;
  return String(homework.title||'واجب');
}
export function homeworkSubjectLabel(homework,subjectKey){
  if(homework?.taskType==='copywork_lughati'||homework?.taskType==='copywriting')return 'لغتي — نسخ';
  if(homework?.taskType==='spelling_task'||homework?.taskType==='spelling_practice')return 'الإملاء';
  if(homework?.taskType==='handwriting_task')return 'فن الخط';
  return subjectKey?SUBJECTS[subjectKey].label:String(homework?.subject||'واجب');
}
function homeworkItem(homework,evidence){
  const subjectKey=homework.subjectKey||subjectKeyOf(homework.subject)||'';
  const status=homeworkStatus(evidence);
  return {
    id:homework.id,subjectKey,subjectLabel:homeworkSubjectLabel(homework,subjectKey),
    title:String(homework.title||'واجب'),displayTitle:homeworkDisplayTitle(homework),lesson:String(homework.lesson||''),segment:String(homework.segment||''),skill:String(homework.skill||''),
    page:Number(homework.page)||null,exercise:String(homework.exercise||homework.assignmentType||''),
    task:String(homework.task||homework.instructions||''),
    kind:homework.kind==='training'?'training':'homework',source:String(homework.source||'teacher'),
    publishedAt:String(homework.publishedAt||homework.assignedAt||''),publishedDate:String(homework.scheduledDate||'')||localDay(homework.assignedAt),dueDate:String(homework.dueDate||''),
    status,done:status==='done',completedAt:String(evidence?.completedAt||''),
    confirmedBy:status==='done'?String(evidence?.confirmedBy||'guardian'):'',teacherApprovedAt:String(evidence?.teacherApprovedAt||''),
    autoGrading:Boolean(evidence?.autoGradingEnabled)
  };
}

function assessmentSummary(assessmentRows,quranRows,date){
  const week=weekNumberForDate(date),quranWeek=currentQuranWeek(date),history=[];
  const sorted=[...assessmentRows].sort((a,b)=>String(b.enteredAt||'').localeCompare(String(a.enteredAt||'')));
  const seen=new Set();
  for(const row of sorted){
    for(const entry of Array.isArray(row.academic)?row.academic:[]){
      const subjectKey=subjectKeyOf(entry?.targetId),status=resultFromStored(entry?.result);
      if(!subjectKey||subjectKey==='quran'||!status)continue;
      const entryWeek=weekOfTarget(entry.targetId)||Number(row.weekNumber)||null,key=`${subjectKey}:${entryWeek||row.id}`;
      if(seen.has(key))continue;seen.add(key);
      const content=entryWeek?contentForWeek(entryWeek)[subjectKey]:null;
      history.push({subjectKey,label:SUBJECTS[subjectKey].label,week:entryWeek,skill:content?.skill||content?.lesson||'',lesson:content?.lesson||'',status,updatedAt:String(row.enteredAt||'')});
    }
  }
  const quranHistory=quranRows.map(row=>{const info=quranWeekInfo(row.week);return {subjectKey:'quran',label:SUBJECTS.quran.label,week:Number(row.week),skill:info?.surah?`حفظ سورة ${info.surah}`:(info?.description||''),lesson:info?.range||'',status:resultFromQuran(row.status),updatedAt:String(row.updatedAt||'')}}).filter(item=>item.status);
  const items=SUBJECT_KEYS.map(subjectKey=>{
    if(subjectKey==='quran'){
      const info=quranWeekInfo(quranWeek),current=quranHistory.find(item=>item.week===quranWeek)||null;
      return {subjectKey,label:SUBJECTS.quran.label,short:SUBJECTS.quran.short,week:quranWeek,skill:info?.surah?`حفظ سورة ${info.surah}`:(info?.description||''),lesson:info?.range||'',status:current?.status||null,updatedAt:current?.updatedAt||''};
    }
    const content=contentForWeek(week)[subjectKey]||{},current=history.find(item=>item.subjectKey===subjectKey&&item.week===week)||null;
    return {subjectKey,label:SUBJECTS[subjectKey].label,short:SUBJECTS[subjectKey].short,week,skill:content.holiday?'':(content.skill||content.lesson||''),lesson:content.holiday?'':(content.lesson||''),holiday:Boolean(content.holiday),status:current?.status||null,updatedAt:current?.updatedAt||''};
  });
  return {week,items,history:[...history,...quranHistory].sort((a,b)=>String(b.updatedAt).localeCompare(String(a.updatedAt)))};
}

function quranSummary(quranRows,date){
  const current=currentQuranWeek(date),byWeek=new Map(quranRows.map(row=>[Number(row.week),row]));
  const weeks=QURAN_FOLLOWUP_WEEKS.map(item=>{const info=quranWeekInfo(item.week),row=byWeek.get(item.week);return {week:item.week,surah:info.surah,title:info.title,description:info.description,range:info.range,kind:info.kind,status:row?resultFromQuran(row.status):null,updatedAt:String(row?.updatedAt||'')}});
  const counts={mastered:0,needs_repeat:0,not_mastered:0};
  for(const item of weeks)if(item.status)counts[item.status]+=1;
  const memorization=weeks.filter(item=>item.kind!=='exam'),passed=memorization.filter(item=>item.week<=current);
  return {
    currentWeek:current,current:weeks.find(item=>item.week===current)||null,counts,
    assessedWeeks:passed.filter(item=>item.status).length,pastWeeks:passed.length,totalWeeks:memorization.length,
    upcoming:weeks.filter(item=>item.week>current&&item.kind!=='exam').slice(0,3),weeks
  };
}

const STAR_KINDS={manual:'نجمة من المعلم',manual_adjustment:'تعديل من المعلم',homework:'إنجاز واجب',assessment:'إتقان مهارة'};
function starsSummary(ledger,events){
  const log=events.sort((a,b)=>String(b.createdAt||'').localeCompare(String(a.createdAt||''))).slice(0,30).map(item=>({id:item.id,stars:Number(item.stars)||0,label:String(item.note||'')||(item.kind==='manual_adjustment'?(Number(item.stars)<0?'خصم نجمة من المعلم':'نجمة من المعلم'):STAR_KINDS[item.kind])||'نجمة',createdAt:String(item.createdAt||'')}));
  return {count:clampStars(ledger?.stars),goal:STAR_GOAL,month:new Date().toISOString().slice(0,7),log};
}

export async function buildStudentHome(studentId,{profile=null,date=new Date()}={}){
  const student=rosterStudent(studentId);if(!student)throw new Error('STUDENT_NOT_FOUND');
  const db=adminDb(),base=workspaceRoot(),today=todayInfo(date),month=date.toISOString().slice(0,7),planWeek=planWeekForDate(date);
  const [plan,assessments,quran,evidence,ledger,events,communications,messages]=await Promise.all([
    readWeekPlan(db,planWeek),
    db.collection(`${base}/assessments`).where('studentId','==',studentId).get(),
    db.collection(`${base}/quranFollowups`).where('studentId','==',studentId).get(),
    db.collection(`${base}/homeworkEvidence`).where('studentId','==',studentId).get(),
    db.doc(`${base}/rewardLedgers/${studentId}_${month}`).get(),
    db.collection(`${base}/rewardEvents`).where('studentId','==',studentId).get(),
    db.collection(`${base}/communications`).where('studentId','==',studentId).get(),
    guardianSummary(db,studentId)
  ]);
  const since=new Date(date.getTime()-8*DAY_MS).toISOString();
  const recentEvidence=rows(evidence).filter(item=>String(item.assignedAt||'')>=since&&item.homeworkId);
  const homeworkDocs=await Promise.all(recentEvidence.map(item=>db.doc(`${base}/homework/${item.homeworkId}`).get()));
  const homeworkAll=[];
  homeworkDocs.forEach((doc,index)=>{if(!doc.exists)return;const data={id:doc.id,...doc.data()};if(data.status==='cancelled')return;homeworkAll.push(homeworkItem(data,recentEvidence[index]))});
  homeworkAll.sort((a,b)=>String(b.publishedAt).localeCompare(String(a.publishedAt)));
  const todayHomework=homeworkAll.filter(item=>item.publishedDate===today.date).reverse();
  const pending=homeworkAll.filter(item=>item.publishedDate!==today.date&&!item.done).slice(0,6);
  const week=weekNumberForDate(date);
  return {
    ok:true,generatedAt:date.toISOString(),
    student:{id:student.id,name:student.name,firstName:student.firstName,number:student.number,classLabel:CLASS_LABEL,classShort:CLASS_SHORT,school:SCHOOL_NAME,termLabel:TERM_LABEL,photo:String(profile?.photoDataUrl||''),hobbies:Array.isArray(profile?.hobbies)?profile.hobbies:[]},
    today,
    week:{number:week,key:weekKeyFor(week),label:`الأسبوع ${week}`,termWeeks:TERM_WEEKS,range:weekRange(week)},
    plan,
    assessment:assessmentSummary(rows(assessments),rows(quran),date),
    homework:{today:todayHomework,pending,countToday:todayHomework.length,doneToday:todayHomework.filter(item=>item.done).length,doneRecent:homeworkAll.filter(item=>item.done).length},
    stars:starsSummary(ledger.exists?ledger.data():null,rows(events).filter(item=>String(item.month||'')===month||String(item.createdAt||'').startsWith(month))),
    quran:quranSummary(rows(quran),date),
    teacherName:TEACHER_NAME,messages,
    notes:rows(communications).sort((a,b)=>String(b.createdAt||'').localeCompare(String(a.createdAt||''))).slice(0,12).map(item=>({id:item.id,reason:String(item.reason||'ملاحظة'),summary:String(item.summary||''),createdAt:String(item.createdAt||'')}))
  };
}

// Plan of any week of the term (review of previous weeks). Unpublished weeks show the approved distribution only.
export async function buildStudentWeek(weekValue,date=new Date()){
  const current=planWeekForDate(date),week=Math.min(clampWeek(weekValue||current),current);
  const plan=await readWeekPlan(adminDb(),week);
  return {ok:true,currentWeek:current,plan:plan.published?plan:{...buildPlan(week,[]),fromDistribution:true}};
}

// GET /api/student-state?view=home|week — teacher session or the student's own invite link, nothing else.
export async function studentViewHandler(req,res,{ensureFresh}={}){
  const studentId=String(req.query?.studentId||''),view=String(req.query?.view||'home');
  if(!rosterStudent(studentId))return res.status(404).json({ok:false,error:'STUDENT_NOT_FOUND'});
  const teacher=isTeacher(req),invite=inviteFrom(req,null);
  if(!teacher&&!validInviteShape(invite))throw new AccessError('STUDENT_ACCESS_REQUIRED',401);
  const snap=await adminDb().doc(`${workspaceRoot()}/studentProfiles/${studentId}`).get(),profile=snap.exists?snap.data():null;
  if(!teacher&&!inviteMatches(profile,invite))throw new AccessError('STUDENT_ACCESS_DENIED',403);
  // Messages can be written only with the student's own link; a teacher previewing the page reads the thread.
  const guardianLink=inviteMatches(profile,invite);
  if(view==='messages')return res.status(200).json({ok:true,...await readThread(studentId,'guardian'),canSend:guardianLink,role:teacher?'teacher':'guardian'});
  if(view==='week')return res.status(200).json({...await buildStudentWeek(req.query?.week),role:teacher?'teacher':'guardian'});
  if(ensureFresh)await ensureFresh();
  const home=await buildStudentHome(studentId,{profile});
  return res.status(200).json({...home,messages:{...home.messages,canSend:guardianLink},role:teacher?'teacher':'guardian'});
}
