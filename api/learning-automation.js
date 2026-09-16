import {adminDb,previewWriteGuard} from '../server/firebase-admin.js';
import {CLASS_STUDENTS,WORKSPACE_ID,CLASS_ID} from '../server/class-roster.js';
import {contentForWeek,quranForDay,riyadhDateString,riyadhWeekday,weekNumberForDate,TERM_WEEKS} from '../server/learning-content.js';

const root=()=>`workspaces/${WORKSPACE_ID}`;
const nowIso=()=>new Date().toISOString();
const weekKey=(week)=>`1448-f1-w${String(week).padStart(2,'0')}`;
const subjectLabels={arabic:'لغتي',quran:'القرآن الكريم',islamic:'الدراسات الإسلامية',spelling:'الإملاء والخط',handwriting:'الإملاء والخط'};
const fallbackSchedule={0:['arabic','quran'],1:['arabic','quran'],2:['islamic','quran'],3:['islamic'],4:['spelling']};
const normalizeSubject=(value)=>{
  const raw=String(value||'').trim().toLowerCase();
  if(['arabic','لغتي','اللغة العربية'].includes(raw))return 'arabic';
  if(['quran','القرآن الكريم','قرآن','القران الكريم'].includes(raw))return 'quran';
  if(['islamic','الدراسات الإسلامية','الدراسات الاسلامية'].includes(raw))return 'islamic';
  if(['spelling','handwriting','الإملاء والخط','الاملاء والخط'].includes(raw))return 'spelling';
  return null;
};
const targetId=(subject,week)=>`auto:${subject}:w${String(week).padStart(2,'0')}`;
const rows=(snap)=>snap.docs.map(doc=>({id:doc.id,...doc.data()}));

export async function seedCurriculum(){
  previewWriteGuard();
  const db=adminDb(),batch=db.batch(),timestamp=nowIso();let count=0;
  for(let week=1;week<=TERM_WEEKS;week++){
    const content=contentForWeek(week);
    for(const subject of ['arabic','quran','islamic','spelling']){
      const item=content[subject],id=targetId(subject,week);
      batch.set(db.doc(`${root()}/curriculumTargets/${id}`),{id,subject,title:item.lesson||item.title,unit:item.unit||item.surah||'',skill:item.skill||'',reference:`الفصل الأول 1448هـ · الأسبوع ${week}`,weekNumber:week,source:'taallamt_verified_distribution',updatedAt:timestamp},{merge:true});count++;
    }
  }
  await batch.commit();return {saved:true,count};
}

export async function buildWeeklyPlan(week,{publish=true}={}){
  const w=Math.max(1,Math.min(TERM_WEEKS,Number(week)||weekNumberForDate())),content=contentForWeek(w),items=[];
  for(const subject of ['arabic','quran','islamic','spelling']){const item=content[subject];items.push({id:`auto-week:${weekKey(w)}:${subject}`,weekKey:weekKey(w),weekNumber:w,subject,targetIds:[targetId(subject,w)],title:item.title,unit:item.unit||item.surah||'',lesson:item.lesson||'',skill:item.skill||'',publishStatus:publish?'published':'ready',publishOnSaturday:true,source:'automation',updatedAt:nowIso()})}
  return items;
}
export async function publishWeeklyPlan(week){previewWriteGuard();const db=adminDb(),items=await buildWeeklyPlan(week,{publish:true}),batch=db.batch();for(const item of items)batch.set(db.doc(`${root()}/weeklyPlans/${item.id}`),item,{merge:true});await batch.commit();return {saved:true,week:items[0]?.weekNumber||week,items}}

async function scheduledSubjectsForDay(weekday){
  const db=adminDb(),snap=await db.collection(`${root()}/timetable`).get();
  const all=rows(snap).filter(item=>(!item.classId||item.classId===CLASS_ID)&&Number(item.weekday)===weekday),subjects=[];
  for(const item of all){const normalized=normalizeSubject(item.subject);if(normalized&&!subjects.includes(normalized))subjects.push(normalized)}
  if(snap.size===0)return {subjects:[...(fallbackSchedule[weekday]||[])],timetableCount:0,source:'existing_student_week_plan_fallback'};
  return {subjects,timetableCount:snap.size,source:'timetable'};
}

function homeworkCopy(subject,item,daySpecific){
  if(subject==='quran')return {title:`القرآن الكريم — ${daySpecific?.surah||item.surah||''} ${daySpecific?.lesson||item.lesson||''}`.trim(),instructions:`حفظ أو مراجعة ${daySpecific?.lesson||item.lesson||''} من سورة ${daySpecific?.surah||item.surah||''}، مع قراءة صحيحة وتكرار المقطع.`};
  if(subject==='arabic')return {title:`لغتي — ${item.lesson}`,instructions:`راجع درس «${item.lesson}» من وحدة «${item.unit}»، واقرأ جزءًا منه قراءة جهرية ثم نفّذ تدريبًا قصيرًا على ${item.skill}.`};
  if(subject==='islamic')return {title:`الدراسات الإسلامية — ${item.lesson}`,instructions:`راجع درس «${item.lesson}»، ثم اذكر مثالًا بسيطًا يوضح ${item.skill}.`};
  return {title:`الإملاء والخط — ${item.skill}`,instructions:`تدرّب على مهارة «${item.skill}»: اكتب خمس كلمات مناسبة للمهارة ثم جملة قصيرة بخط واضح.`};
}

export async function publishDailyHomework(date=new Date()){
  previewWriteGuard();const weekday=riyadhWeekday(date),localDate=riyadhDateString(date),week=weekNumberForDate(date);
  if(weekday===5||weekday===6)return {saved:true,skipped:true,reason:'NON_SCHOOL_DAY',localDate,week};
  const content=contentForWeek(week),schedule=await scheduledSubjectsForDay(weekday),subjects=[...schedule.subjects],db=adminDb(),created=[];
  for(const subject of subjects){
    const item=content[subject];if(!item||item.holiday)continue;const daySpecific=subject==='quran'?quranForDay(week,weekday):null;if(subject==='quran'&&!daySpecific)continue;
    const id=`auto-homework:${localDate}:${subject}`,ref=db.doc(`${root()}/homework/${id}`),existing=await ref.get();if(existing.exists){created.push({id,subject,duplicate:true});continue;}
    const copy=homeworkCopy(subject,item,daySpecific),timestamp=nowIso(),record={id,classId:CLASS_ID,subject:subjectLabels[subject]||subject,title:copy.title,instructions:copy.instructions,targetIds:[targetId(subject,week)],assignedAt:timestamp,scheduledDate:localDate,status:'published',kind:'homework',source:'automation',scheduleSource:schedule.source,weekNumber:week};
    const batch=db.batch();batch.set(ref,record);for(const student of CLASS_STUDENTS){const evidenceId=`${id}_${student.id}`;batch.set(db.doc(`${root()}/homeworkEvidence/${evidenceId}`),{id:evidenceId,homeworkId:id,studentId:student.id,status:'assigned',assignedAt:timestamp,source:'automation'})}await batch.commit();created.push({id,subject,title:copy.title,duplicate:false});
  }
  return {saved:true,localDate,weekday,week,subjects,scheduleSource:schedule.source,timetableMissing:schedule.timetableCount===0,created};
}

export async function previewAutomation(date=new Date()){
  const weekday=riyadhWeekday(date),localDate=riyadhDateString(date),week=weekNumberForDate(date),content=contentForWeek(week),schedule=await scheduledSubjectsForDay(weekday),subjects=[...schedule.subjects];
  const homework=subjects.map(subject=>{const item=content[subject],daySpecific=subject==='quran'?quranForDay(week,weekday):null;if(!item||item.holiday||(subject==='quran'&&!daySpecific))return null;return {subject,label:subjectLabels[subject],...homeworkCopy(subject,item,daySpecific)}}).filter(Boolean);
  return {ok:true,localDate,weekday,week,weekKey:weekKey(week),timetableMissing:schedule.timetableCount===0,scheduleSource:schedule.source,scheduledSubjects:subjects,content,homework};
}

export default async function handler(req,res){
  try{const action=String(req.query?.action||req.body?.action||'preview');if(action==='preview')return res.status(200).json(await previewAutomation());if(req.method!=='POST')return res.status(405).json({ok:false,error:'METHOD_NOT_ALLOWED'});if(action==='seed'){const curriculum=await seedCurriculum();const weekly=await publishWeeklyPlan(weekNumberForDate());return res.status(200).json({ok:true,curriculum,weekly})}if(action==='weekly')return res.status(200).json({ok:true,...await publishWeeklyPlan(Number(req.body?.week)||weekNumberForDate(new Date(Date.now()+86400000))) });if(action==='daily')return res.status(200).json({ok:true,...await publishDailyHomework()});return res.status(400).json({ok:false,error:'ACTION_INVALID'})}catch(error){return res.status(500).json({ok:false,error:error instanceof Error?error.message:String(error)})}
}
