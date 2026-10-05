// Teacher <-> student link: one class-level read model plus the two class-level writes.
// Kept in server/ (not api/) so the project stays inside the Vercel function budget.
import {adminDb,previewWriteGuard} from './firebase-admin.js';
import {CLASS_STUDENTS,WORKSPACE_ID,CLASS_ID} from './class-roster.js';
import {contentForWeek,riyadhDateString,riyadhWeekday,weekNumberForDate,TERM_WEEKS} from './learning-content.js';
import {createAutoGradingConfig,gradingSecretFromEnv} from './homework-autograde.js';

const root=()=>`workspaces/${WORKSPACE_ID}`;
const rows=snap=>snap.docs.map(doc=>({id:doc.id,...doc.data()}));
const DAY_MS=86400000;
export const SUBJECT_KEYS=['arabic','quran','islamic','spelling'];
export const SUBJECT_LABELS={arabic:'لغتي',quran:'القرآن الكريم',islamic:'الدراسات الإسلامية',spelling:'الإملاء والخط'};
export const weekKeyFor=week=>`1448-f1-w${String(week).padStart(2,'0')}`;

const timeOf=row=>String(row?.enteredAt||row?.createdAt||row?.assignedAt||row?.startedAt||row?.sessionDate||'');
const newestFirst=(a,b)=>timeOf(b).localeCompare(timeOf(a));
const localDay=value=>{if(!value)return '';const date=new Date(value);return Number.isNaN(date.getTime())?'':riyadhDateString(date)};

// Maps any stored target id or subject label to one of the four subject keys.
export function subjectOfTarget(targetId){
  const raw=String(targetId||'').trim();
  const direct=raw.match(/^(?:subject|auto):([a-z_]+)/);
  const key=direct?direct[1]:raw;
  if(key==='arabic'||raw==='لغتي')return 'arabic';
  if(key==='quran'||raw==='القرآن الكريم')return 'quran';
  if(key==='islamic'||raw==='الدراسات الإسلامية')return 'islamic';
  if(['spelling','handwriting','spelling_handwriting'].includes(key)||raw==='الإملاء والخط')return 'spelling';
  return null;
}

const isDoneEvidence=item=>item?.status==='completed'||item?.correct===true;
const homeworkDay=item=>String(item?.scheduledDate||'')||localDay(item?.assignedAt);

function followupReasons({latestBehavior,latestAcademic,activePlans,recentNote,focused}){
  const reasons=[];
  if(latestBehavior?.code==='needs_followup')reasons.push('سلوك: يحتاج متابعة');
  for(const key of SUBJECT_KEYS){
    const result=latestAcademic.get(key)?.result;
    if(result==='not_mastered')reasons.push(`${SUBJECT_LABELS[key]}: لم يتقن`);
    else if(result==='needs_practice')reasons.push(`${SUBJECT_LABELS[key]}: يحتاج تدريب`);
  }
  if(activePlans.length)reasons.push(`خطة علاجية نشطة (${activePlans.length})`);
  if(recentNote)reasons.push(`${recentNote.reason||'متابعة'}: ${String(recentNote.summary||'').slice(0,80)}`);
  if(focused&&!reasons.length)reasons.push('في مجموعة المتابعة المركزة');
  return reasons;
}

// Pure read model: everything the teacher dashboard needs about the class, from plain rows.
export function buildClassOverview({students=CLASS_STUDENTS,assessments=[],homework=[],evidence=[],communications=[],remediation=[],ledgers=[],profiles=[],weeklyPlans=[],date=new Date()}={}){
  const today=riyadhDateString(date),weekday=riyadhWeekday(date),week=weekNumberForDate(date),weekKey=weekKeyFor(week);
  const schoolDay=weekday!==5&&weekday!==6;
  const content=contentForWeek(week);
  const noteSince=new Date(date.getTime()-7*DAY_MS).toISOString();

  const byStudent=(list)=>{const map=new Map();for(const item of list){const id=item?.studentId;if(!id)continue;if(!map.has(id))map.set(id,[]);map.get(id).push(item)}return map};
  const assessmentsBy=byStudent([...assessments].sort(newestFirst));
  const evidenceBy=byStudent(evidence);
  const communicationsBy=byStudent([...communications].sort(newestFirst));
  const remediationBy=byStudent(remediation.filter(plan=>['active','needs_more_support'].includes(plan?.status)));
  const starsBy=new Map(ledgers.map(item=>[item.studentId,Math.max(0,Math.min(30,Number(item.stars)||0))]));
  const profileBy=new Map(profiles.map(item=>[item.studentId||item.id,item]));
  const homeworkById=new Map(homework.map(item=>[item.id,item]));
  const todayHomework=homework.filter(item=>homeworkDay(item)===today).sort((a,b)=>String(a.assignedAt||'').localeCompare(String(b.assignedAt||'')));
  const todayIds=new Set(todayHomework.map(item=>item.id));

  const studentRows=students.map(student=>{
    const mine=assessmentsBy.get(student.id)||[];
    const latestAcademic=new Map();let latestBehavior=null,needsFollowupCount=0;
    const todayAcademic=[];let todayBehavior=null,assessedToday=false;
    for(const row of mine){
      const isToday=localDay(row.enteredAt||row.sessionDate)===today;
      for(const item of Array.isArray(row.academic)?row.academic:[]){
        const key=subjectOfTarget(item?.targetId);if(!key)continue;
        if(!latestAcademic.has(key))latestAcademic.set(key,{result:item.result,at:timeOf(row)});
        if(isToday){todayAcademic.push({subject:key,result:item.result});assessedToday=true}
      }
      for(const item of Array.isArray(row.behavior)?row.behavior:[]){
        if(item?.code==='needs_followup')needsFollowupCount+=1;
        if(item?.kind==='value')continue;
        if(!latestBehavior)latestBehavior={code:item.code,label:item.label,at:timeOf(row)};
        if(isToday){if(!todayBehavior)todayBehavior={code:item.code,label:item.label};assessedToday=true}
      }
    }
    const profile=profileBy.get(student.id)||{};
    const focused=profile.assessmentGroup==='focused'||needsFollowupCount>=4;
    const notes=communicationsBy.get(student.id)||[];
    const recentNote=notes.find(item=>['followup','remediation'].includes(item.reasonCode)&&String(item.createdAt||'')>=noteSince)||null;
    const activePlans=remediationBy.get(student.id)||[];
    const reasons=followupReasons({latestBehavior,latestAcademic,activePlans,recentNote,focused});
    const myEvidence=evidenceBy.get(student.id)||[];
    let todayAssigned=0,todayDone=0,pendingOlder=0;
    for(const item of myEvidence){
      if(!homeworkById.has(item.homeworkId))continue;
      if(todayIds.has(item.homeworkId)){todayAssigned+=1;if(isDoneEvidence(item))todayDone+=1}
      else if(!isDoneEvidence(item))pendingOlder+=1;
    }
    const messages=notes.filter(item=>item.reasonCode==='guardian_message');
    const excellentToday=assessedToday&&todayAcademic.every(item=>item.result==='mastered')&&todayBehavior?.code!=='needs_followup'&&(todayAcademic.length>0||todayBehavior?.code==='distinguished');
    return {
      id:student.id,number:student.number,name:student.name,
      stars:starsBy.get(student.id)||0,
      assessedToday,excellentToday,
      behaviorToday:todayBehavior?.code||null,
      latestBehavior:latestBehavior?.code||null,
      latestAcademic:Object.fromEntries([...latestAcademic].map(([key,value])=>[key,value.result])),
      needsFollowup:reasons.length>0,followupReasons:reasons,
      group:focused?'focused':'followup',
      homeworkToday:{assigned:todayAssigned,done:todayDone},pendingOlder,
      messages:messages.length,lastMessage:messages[0]?{reason:messages[0].reason||'رسالة',summary:String(messages[0].summary||'').slice(0,160),createdAt:messages[0].createdAt||''}:null,
      lastNote:recentNote?{reason:recentNote.reason||'متابعة',summary:String(recentNote.summary||'').slice(0,160)}:null
    };
  });

  const homeworkToday=todayHomework.map(item=>{
    const assigned=evidence.filter(row=>row.homeworkId===item.id);
    const done=assigned.filter(isDoneEvidence);
    return {
      id:item.id,title:item.title||'واجب',subject:item.subject||'',subjectKey:item.subjectKey||subjectOfTarget(item.subject)||'',kind:item.kind||'homework',source:item.source||'teacher',
      assigned:assigned.length,done:done.length,submitted:assigned.filter(row=>row.status==='submitted'&&!isDoneEvidence(row)).length,
      doneStudentIds:done.map(row=>row.studentId),assignedStudentIds:assigned.map(row=>row.studentId)
    };
  });

  const published=weeklyPlans.filter(item=>item.weekKey===weekKey&&item.publishStatus==='published');
  const weeklyItems=SUBJECT_KEYS.map(key=>{
    const live=published.find(item=>subjectOfTarget(item.subject)===key)||null,planned=content[key]||{};
    return {subject:key,title:SUBJECT_LABELS[key],unit:live?.unit||planned.unit||planned.surah||'',lesson:live?.lesson||planned.lesson||'',skill:live?.skill||planned.skill||'',holiday:Boolean(planned.holiday),published:Boolean(live)};
  });
  const weeklyPublished=weeklyItems.every(item=>item.published);
  const expectedAuto=schoolDay&&weeklyItems.some(item=>!item.holiday);
  const autoHomeworkToday=todayHomework.some(item=>item.source==='automation');

  const assessedToday=studentRows.filter(row=>row.assessedToday).length;
  const totals={
    students:studentRows.length,
    assessedToday,notAssessedToday:studentRows.length-assessedToday,
    excellentToday:studentRows.filter(row=>row.excellentToday).length,
    needsFollowup:studentRows.filter(row=>row.needsFollowup).length,
    behaviorNotesToday:studentRows.filter(row=>row.behaviorToday==='needs_followup').length,
    messages:communications.filter(item=>item.reasonCode==='guardian_message'&&String(item.createdAt||'')>=noteSince).length,
    homeworkAssignedToday:homeworkToday.reduce((sum,item)=>sum+item.assigned,0),
    homeworkDoneToday:homeworkToday.reduce((sum,item)=>sum+item.done,0),
    pendingOlder:studentRows.reduce((sum,row)=>sum+row.pendingOlder,0)
  };

  const progressPercent=Math.round(week/TERM_WEEKS*100);
  const curriculum=SUBJECT_KEYS.map(key=>{
    const known=studentRows.filter(row=>row.latestAcademic[key]);
    const mastered=known.filter(row=>row.latestAcademic[key]==='mastered').length;
    return {subject:key,title:SUBJECT_LABELS[key],percent:progressPercent,week,weeks:TERM_WEEKS,assessed:known.length,mastered,masteryPercent:known.length?Math.round(mastered/known.length*100):null};
  });

  return {
    ok:true,generatedAt:date.toISOString(),localDate:today,weekday,schoolDay,week,weekKey,termWeeks:TERM_WEEKS,
    totals,curriculum,
    weeklyPlan:{week,weekKey,published:weeklyPublished,items:weeklyItems},
    homeworkToday,
    needsEnsure:!weeklyPublished||(expectedAuto&&!autoHomeworkToday),
    students:studentRows
  };
}

export async function readClassOverview(date=new Date()){
  const db=adminDb(),base=root(),week=weekNumberForDate(date);
  const since=days=>new Date(date.getTime()-days*DAY_MS).toISOString();
  const [assessments,homework,evidence,communications,remediation,ledgers,profiles,weeklyPlans]=await Promise.all([
    db.collection(`${base}/assessments`).where('enteredAt','>=',since(21)).get(),
    db.collection(`${base}/homework`).where('assignedAt','>=',since(8)).get(),
    db.collection(`${base}/homeworkEvidence`).where('assignedAt','>=',since(8)).get(),
    db.collection(`${base}/communications`).where('createdAt','>=',since(30)).get(),
    db.collection(`${base}/remediationPlans`).get(),
    db.collection(`${base}/rewardLedgers`).where('month','==',date.toISOString().slice(0,7)).get(),
    db.collection(`${base}/studentProfiles`).select('studentId','assessmentGroup').get(),
    db.collection(`${base}/weeklyPlans`).where('weekKey','==',weekKeyFor(week)).get()
  ]);
  return buildClassOverview({assessments:rows(assessments),homework:rows(homework),evidence:rows(evidence),communications:rows(communications),remediation:rows(remediation),ledgers:rows(ledgers),profiles:rows(profiles),weeklyPlans:rows(weeklyPlans),date});
}

// One homework or training for the whole class in a single write batch.
export async function sendClassHomework(body={},date=new Date()){
  previewWriteGuard();
  const title=String(body.title||'').trim().slice(0,200);if(!title)throw new Error('TITLE_REQUIRED');
  const instructions=String(body.instructions||'').trim().slice(0,2000);
  const kind=body.kind==='training'?'training':'homework';
  const subjectKey=SUBJECT_KEYS.includes(body.subjectKey)?body.subjectKey:'';
  const answerKey=String(body.answerKey||'').trim().slice(0,500);
  const alternatives=(Array.isArray(body.acceptedAnswers)?body.acceptedAnswers:String(body.acceptedAnswers||'').split(/[\n,،]+/)).map(item=>String(item).trim().slice(0,500)).filter(Boolean).slice(0,12);
  const maxScore=Math.min(100,Math.max(1,Number(body.maxScore)||10));
  const autoGrading=answerKey?createAutoGradingConfig({answerKey,acceptedAnswers:alternatives,maxScore},gradingSecretFromEnv()):null;
  const timestamp=date.toISOString(),id=`class_${kind}_${date.getTime()}_${Math.random().toString(36).slice(2,9)}`;
  const record={id,classId:CLASS_ID,subject:subjectKey?SUBJECT_LABELS[subjectKey]:(kind==='training'?'تدريب منزلي':'واجب'),...(subjectKey?{subjectKey}:{}),title,instructions,targetIds:[],scheduledDate:riyadhDateString(date),assignedAt:timestamp,status:'published',kind,source:'teacher_class',...(autoGrading?{autoGrading}:{})};
  const db=adminDb(),batch=db.batch();
  batch.set(db.doc(`${root()}/homework/${id}`),record);
  for(const student of CLASS_STUDENTS){
    const evidenceId=`${id}_${student.id}`;
    batch.set(db.doc(`${root()}/homeworkEvidence/${evidenceId}`),{id:evidenceId,homeworkId:id,studentId:student.id,status:'assigned',assignedAt:timestamp,source:'teacher_class',maxScore:autoGrading?.maxScore||maxScore,autoGradingEnabled:Boolean(autoGrading)});
  }
  await batch.commit();
  return {saved:true,id,students:CLASS_STUDENTS.length,autoGradingEnabled:Boolean(autoGrading)};
}
