import {adminDb,previewWriteGuard} from '../server/firebase-admin.js';
import {CLASS_STUDENTS,WORKSPACE_ID,CLASS_ID} from '../server/class-roster.js';
import {contentForWeek,COPYWORK_PAGES,quranForDay,riyadhDateString,riyadhWeekday,termPhase,weekNumberForDate,TERM_WEEKS} from '../server/learning-content.js';
import {readClassOverview,sendClassHomework} from '../server/class-link.js';
import {QURAN_FOLLOWUP_ROSTER} from '../server/quran-followup-curriculum.js';
import {accessFailure,requireTeacher,sessionStatus,teacherLogin,teacherLogout} from '../server/access.js';
import {nextSchoolDay,planWeekForDate,WEEKDAY_LABELS} from '../server/plan.js';
import {SCHOOL_ID,TERM_ID} from '../server/roster.js';
import {teacherRead,teacherWrite} from '../server/teacher-api.js';
import {assistantAsk,assistantFailure} from '../server/assistant.js';

const root=()=>`workspaces/${WORKSPACE_ID}`;
const nowIso=()=>new Date().toISOString();
const weekKey=(week)=>`1448-f1-w${String(week).padStart(2,'0')}`;
const subjectLabels={arabic:'لغتي',quran:'القرآن الكريم',islamic:'الدراسات الإسلامية',spelling:'الإملاء والخط',handwriting:'الإملاء والخط'};
const fallbackSchedule={0:['arabic','quran'],1:['arabic','quran'],2:['islamic','quran'],3:['islamic'],4:['spelling']};
const arabicDigits=value=>String(value).replace(/\d/g,d=>'٠١٢٣٤٥٦٧٨٩'[Number(d)]);
const copyworkPage=lesson=>COPYWORK_PAGES[String(lesson||'').trim()]||null;
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

// Which weekdays each subject is taught on, from the class timetable (or the verified fallback distribution).
async function weekScheduleBySubject(){
  const bySubject={arabic:[],quran:[],islamic:[],spelling:[]};let source='timetable';
  for(let weekday=0;weekday<=4;weekday++){
    const schedule=await scheduledSubjectsForDay(weekday);source=schedule.source;
    for(const subject of schedule.subjects)if(bySubject[subject])bySubject[subject].push(weekday);
  }
  return {bySubject,source};
}
function planDays(subject,item,weekdays){
  if(item.holiday)return [];
  if(subject==='quran')return [0,1,2].map(weekday=>({weekday,day:WEEKDAY_LABELS[weekday],text:item.days?.[weekday]||''})).filter(day=>day.text);
  return weekdays.map(weekday=>({weekday,day:WEEKDAY_LABELS[weekday],text:''}));
}
export async function buildWeeklyPlan(week,{publish=true}={}){
  const w=Math.max(1,Math.min(TERM_WEEKS,Number(week)||weekNumberForDate())),content=contentForWeek(w),items=[],schedule=await weekScheduleBySubject();
  for(const subject of ['arabic','quran','islamic','spelling']){
    const item=content[subject],page=subject==='arabic'?copyworkPage(item.lesson):null;
    items.push({id:`auto-week:${weekKey(w)}:${subject}`,weekKey:weekKey(w),weekNumber:w,subject,targetIds:[targetId(subject,w)],title:item.title,unit:item.unit||item.surah||'',lesson:item.lesson||'',skill:item.skill||'',
      holiday:Boolean(item.holiday),...(item.copywork?{copywork:item.copywork}:{}),...(item.spellingTask?{spellingTask:item.spellingTask}:{}),...(item.handwritingTask?{handwritingTask:item.handwritingTask}:{}),
      ...(page?{page,pageLabel:arabicDigits(page),exercise:'نسخ لغتي'}:{}),days:planDays(subject,item,schedule.bySubject[subject]||[]),
      classId:CLASS_ID,schoolId:SCHOOL_ID,termId:TERM_ID,contentSource:'server/learning-content.js',scheduleSource:schedule.source,
      publishStatus:publish?'published':'ready',publishOnSaturday:true,source:'automation',updatedAt:nowIso()});
  }
  return items;
}
// Idempotent: one record per class, week and subject. A second run never duplicates the plan, never moves its first
// publish time and never removes a teacher's exceptional edit (stored separately under `override`).
export async function publishWeeklyPlan(week){
  previewWriteGuard();
  const db=adminDb(),items=await buildWeeklyPlan(week,{publish:true}),batch=db.batch(),timestamp=nowIso();
  const existing=new Map(rows(await db.collection(`${root()}/weeklyPlans`).where('weekKey','==',items[0].weekKey).get()).map(item=>[item.id,item]));
  let created=0;
  for(const item of items){
    const previous=existing.get(item.id);
    if(!previous)created+=1;
    batch.set(db.doc(`${root()}/weeklyPlans/${item.id}`),{...item,generatedAt:previous?.generatedAt||timestamp,publishedAt:previous?.publishStatus==='published'?(previous.publishedAt||previous.updatedAt||timestamp):timestamp},{merge:true});
  }
  await batch.commit();return {saved:true,week:items[0]?.weekNumber||week,created,updated:items.length-created,items};
}

function fallbackSubjects(weekday,reason='TIMETABLE_EMPTY'){
  return {subjects:[...(fallbackSchedule[weekday]||[])],timetableCount:0,source:'verified_distribution_schedule_fallback',reason};
}
async function scheduledSubjectsForDay(weekday){
  try{
    const db=adminDb(),snap=await db.collection(`${root()}/timetable`).get();
    const all=rows(snap).filter(item=>(!item.classId||item.classId===CLASS_ID)&&Number(item.weekday)===weekday),subjects=[];
    for(const item of all){const normalized=normalizeSubject(item.subject);if(normalized&&!subjects.includes(normalized))subjects.push(normalized)}
    if(snap.size===0)return fallbackSubjects(weekday);
    return {subjects,timetableCount:snap.size,source:'timetable'};
  }catch(error){
    return {...fallbackSubjects(weekday,'TIMETABLE_READ_UNAVAILABLE'),error:error instanceof Error?error.message:String(error)};
  }
}

// Every homework states the subject, lesson, page (when the source has one), the exercise and exactly what to do.
// Page numbers exist in the sources only for the Lughati copy exercise; nothing else is invented.
function homeworkCopies(subject,item,daySpecific){
  if(subject==='quran'){
    const surah=daySpecific?.surah||item.surah||'',segment=daySpecific?.lesson||item.lesson||'';
    return [{pathKey:'quran',taskType:quranTaskType(daySpecific,item),title:`القرآن الكريم — ${surah} ${segment}`.trim(),lesson:surah?`سورة ${surah}`:'',segment,skill:'الحفظ',instructions:`حفظ أو مراجعة ${segment} من سورة ${surah}، مع قراءة صحيحة وتكرار المقطع.`}];
  }
  if(subject==='arabic'){
    const task=item.copywork||null,page=task?.page||copyworkPage(item.lesson);if(!page)return [];
    return [{pathKey:'copywork_lughati',taskType:'copywork_lughati',title:`نسخ لغتي — ${item.lesson}`,lesson:item.lesson,page,assignmentType:'نسخ لغتي',skill:'النسخ',
      task:`أنجز واجب «نسخ لغتي» في الصفحة ${arabicDigits(page)} من كتاب لغتي (درس «${item.lesson}»)، واكتب بخط واضح.`,
      instructions:`المصدر: كتاب لغتي. الدرس: ${item.lesson}. الصفحة: ${arabicDigits(page)}. المطلوب: نسخ لغتي.`}];
  }
  if(subject==='islamic')return [{pathKey:'islamic',taskType:'lesson_practice',title:`الدراسات الإسلامية — ${item.lesson}`,lesson:item.lesson,skill:item.skill||'',instructions:`راجع درس «${item.lesson}»، ثم اذكر مثالًا بسيطًا يوضح ${item.skill}.`}];
  const result=[];
  if(item.spellingTask){
    const task=item.spellingTask,page=Number(task.page)||null;
    result.push({pathKey:'spelling_task',taskType:'spelling_task',title:`الإملاء — ${task.title}`,lesson:item.lesson,skill:task.title,page,assignmentType:'الإملاء',sourceBook:task.source,
      task:`تدريب الإملاء: «${task.title}»${page?` — صفحة ${arabicDigits(page)}`:' — الصفحة لم تُحدد بعد'} من كتاب مهارة الإملاء وفن الخط.`,
      instructions:`المصدر: كتاب مهارة الإملاء وفن الخط. المهارة: ${task.title}. ${page?`الصفحة: ${arabicDigits(page)}.`:'الصفحة: لم تُحدد بعد.'}`});
  }
  if(item.handwritingTask){
    const task=item.handwritingTask,page=Number(task.page)||null;
    result.push({pathKey:'handwriting_task',taskType:'handwriting_task',title:`فن الخط — ${task.title}`,lesson:task.title,skill:'فن الخط',page,assignmentType:'فن الخط',sourceBook:task.source,
      task:`تدريب فن الخط: «${task.title}»${page?` — صفحة ${arabicDigits(page)}`:' — الصفحة لم تُحدد بعد'} من كتاب مهارة الإملاء وفن الخط.`,
      instructions:`المصدر: كتاب مهارة الإملاء وفن الخط. فن الخط: ${task.title}. ${page?`الصفحة: ${arabicDigits(page)}.`:'الصفحة: لم تُحدد بعد.'} اكتب بخط النسخ مع مراعاة السطور.`});
  }
  return result;
}
function quranTaskType(daySpecific,item){
  const text=`${daySpecific?.lesson||item?.lesson||''} ${daySpecific?.surah||item?.surah||''}`;
  return /(تقويم|مراجعة|استكمال|اختبارات)/.test(text)?'quran_review':'quran_memorization';
}
function automationHomeworks(subject,item,daySpecific,localDate,week,scheduleSource){
  return homeworkCopies(subject,item,daySpecific).map(copy=>({
    id:`auto-homework:${localDate}:${copy.pathKey||subject}`,
    subject:copy.taskType==='handwriting_task'?'فن الخط':copy.taskType==='spelling_task'?'الإملاء':subjectLabels[subject]||subject,
    subjectKey:subject,
    learningPath:copy.pathKey||subject,
    title:copy.title,
    instructions:copy.instructions,
    task:copy.task||copy.instructions,
    ...(copy.lesson?{lesson:copy.lesson}:{}),
    ...(copy.segment?{segment:copy.segment}:{}),
    ...(copy.skill?{skill:copy.skill}:{}),
    ...(copy.page?{page:copy.page,pageLabel:arabicDigits(copy.page)}:{}),
    ...(copy.assignmentType?{assignmentType:copy.assignmentType,exercise:copy.assignmentType}:{}),
    ...(copy.sourceBook?{sourceBook:copy.sourceBook}:{}),
    targetIds:[targetId(subject,week)],
    scheduledDate:localDate,
    dueDate:nextSchoolDay(localDate),
    kind:'homework',
    taskType:copy.taskType||'lesson_practice',
    source:'automation',
    scheduleSource,
    weekNumber:week,
    weekKey:weekKey(week),
    termId:TERM_ID,
    schoolId:SCHOOL_ID
  }));
}

// Idempotent: the homework id is derived from the day and the subject, and each student has one evidence record per homework.
export async function publishDailyHomework(date=new Date()){
  previewWriteGuard();const weekday=riyadhWeekday(date),localDate=riyadhDateString(date),week=weekNumberForDate(date);
  if(termPhase(date)!=='during')return {saved:true,skipped:true,reason:'OUTSIDE_TERM',localDate,week,created:[],gaps:[]};
  if(weekday===5||weekday===6)return {saved:true,skipped:true,reason:'NON_SCHOOL_DAY',localDate,week};
  const content=contentForWeek(week),schedule=await scheduledSubjectsForDay(weekday),subjects=[...schedule.subjects],db=adminDb(),created=[],gaps=[];
  for(const subject of subjects){
    const item=content[subject];if(!item||item.holiday)continue;const daySpecific=subject==='quran'?quranForDay(week,weekday):null;if(subject==='quran'&&!daySpecific)continue;
    const plannedList=automationHomeworks(subject,item,daySpecific,localDate,week,schedule.source);
    if(!plannedList.length){gaps.push({subject,code:'SOURCE_PAGE_MISSING',message:`${subjectLabels[subject]}: لا توجد بيانات موثقة للمهمة في المصدر؛ لم يُنشر واجب لهذه المادة.`});continue}
    for(const planned of plannedList){
      const id=planned.id,ref=db.doc(`${root()}/homework/${id}`),existing=await ref.get();
      if(existing.exists){
        const current=existing.data()||{};
        if(current.source==='automation'&&!current.editedByTeacherAt){const {id:_id,scheduledDate:_date,...refresh}=planned;await ref.set(refresh,{merge:true})}
        created.push({id,subject,path:planned.learningPath,duplicate:true});continue;
      }
      const timestamp=nowIso(),record={...planned,classId:CLASS_ID,assignedAt:timestamp,publishedAt:timestamp,status:'published'};
      const batch=db.batch();
      batch.set(ref,record);
      for(const student of QURAN_FOLLOWUP_ROSTER){const evidenceId=`${id}_${student.id}`;batch.set(db.doc(`${root()}/homeworkEvidence/${evidenceId}`),{id:evidenceId,homeworkId:id,studentId:student.id,status:'assigned',assignedAt:timestamp,source:'automation'})}
      await batch.commit();
      created.push({id,subject,path:record.learningPath,title:record.title,taskType:record.taskType,duplicate:false});
    }
  }
  return {saved:true,localDate,weekday,week,subjects,scheduleSource:schedule.source,timetableMissing:schedule.timetableCount===0,created,gaps};
}

export async function previewAutomation(date=new Date()){
  const weekday=riyadhWeekday(date),localDate=riyadhDateString(date),week=weekNumberForDate(date),content=contentForWeek(week),schedule=await scheduledSubjectsForDay(weekday),subjects=[...schedule.subjects];
  const homework=subjects.flatMap(subject=>{const item=content[subject],daySpecific=subject==='quran'?quranForDay(week,weekday):null;if(!item||item.holiday||(subject==='quran'&&!daySpecific))return [];return automationHomeworks(subject,item,daySpecific,localDate,week,schedule.source)});
  return {ok:true,localDate,weekday,week,weekKey:weekKey(week),timetableMissing:schedule.timetableCount===0,scheduleSource:schedule.source,scheduledSubjects:subjects,classwork:subjects.includes('arabic')?[{subject:'لغتي',title:content.arabic?.lesson||'تدريبات المهارات والظواهر اللغوية',instructions:'تُحل تمارين المهارات والظواهر اللغوية داخل الفصل في كتاب لغتي.'}]:[],content,homework};
}

// Idempotent catch-up for the current week and day: publishes what the Saturday/daily cron would have published.
// Every write uses a deterministic id, so repeats change nothing.
export async function ensureCurrentLearning(date=new Date()){
  previewWriteGuard();
  const db=adminDb(),week=planWeekForDate(date),key=weekKey(week),result={week,weeklyPublished:false,curriculumSeeded:false};
  // On Saturday the plan belongs to the week that starts tomorrow, so the term check looks at that day.
  if(termPhase(riyadhWeekday(date)===6?new Date(date.getTime()+86400000):date)!=='during')return {saved:true,...result,skipped:true,reason:'OUTSIDE_TERM',daily:await publishDailyHomework(date)};
  const planSnap=await db.collection(`${root()}/weeklyPlans`).where('weekKey','==',key).get();
  if(rows(planSnap).filter(item=>item.publishStatus==='published').length<4){
    const target=await db.doc(`${root()}/curriculumTargets/${targetId('arabic',week)}`).get();
    if(!target.exists){await seedCurriculum();result.curriculumSeeded=true}
    await publishWeeklyPlan(week);result.weeklyPublished=true;
  }
  const daily=await publishDailyHomework(date);
  return {saved:true,...result,daily};
}

// Run log: one record per Riyadh day. It tells the scheduled job and the catch-up apart and keeps the time of every run.
const runRef=localDate=>adminDb().doc(`${root()}/automationRuns/${localDate}`);
export async function recordAutomationRun(source,result,date=new Date()){
  const localDate=riyadhDateString(date),timestamp=date.toISOString(),snap=await runRef(localDate).get(),previous=snap.exists?snap.data():{};
  const daily=result?.daily||result?.homework||result||{};
  await runRef(localDate).set({
    date:localDate,planWeek:planWeekForDate(date),firstRunAt:previous.firstRunAt||timestamp,firstSource:previous.firstSource||source,
    lastRunAt:timestamp,lastSource:source,runs:(Number(previous.runs)||0)+1,
    weeklyPublished:Boolean(previous.weeklyPublished||result?.weeklyPublished||result?.weekly?.created),
    homeworkCreated:(Number(previous.homeworkCreated)||0)+(Array.isArray(daily.created)?daily.created.filter(item=>!item.duplicate).length:0),
    gaps:Array.isArray(daily.gaps)?daily.gaps:[]
  },{merge:true});
}
const freshDays=new Map();
// Catch-up that does not depend on the teacher: the first read of the day (teacher, student or guardian) makes sure the
// week's plan and today's homework exist, even if the scheduled job did not run. Later reads cost one small lookup at most.
export async function ensureFresh(date=new Date()){
  const localDate=riyadhDateString(date),planWeek=planWeekForDate(date),stamp=`${WORKSPACE_ID}:${localDate}:${planWeek}`;
  if(freshDays.has(stamp))return {fresh:true,cached:true};
  try{
    const snap=await runRef(localDate).get();
    if(snap.exists&&Number(snap.data()?.planWeek)===planWeek&&snap.data()?.complete===true){freshDays.set(stamp,true);return {fresh:true}}
    const result=await ensureCurrentLearning(date);
    await recordAutomationRun('catchup',result,date);
    await runRef(localDate).set({complete:true},{merge:true});
    freshDays.set(stamp,true);
    return {fresh:true,ran:true,result};
  }catch(error){
    return {fresh:false,error:error instanceof Error?error.message:String(error)};
  }
}
// Entry point of the scheduled jobs (api/cron-daily.js and api/cron-weekly.js).
export async function runScheduled(source,date=new Date()){
  const result=await ensureCurrentLearning(date);
  await recordAutomationRun(source,result,date);
  await runRef(riyadhDateString(date)).set({complete:true},{merge:true});
  return result;
}

const jsonBody=req=>(typeof req.body==='string'?JSON.parse(req.body||'{}'):req.body)||{};
export default async function handler(req,res){
  try{
    const body=req.method==='POST'?jsonBody(req):{};
    const action=String(req.query?.action||body.action||'preview');
    res.setHeader('Cache-Control','private, no-store, max-age=0');
    if(action==='session')return res.status(200).json(sessionStatus(req));
    if(action==='login'){if(req.method!=='POST')return res.status(405).json({ok:false,error:'METHOD_NOT_ALLOWED'});return res.status(200).json(await teacherLogin(req,res,body))}
    if(action==='logout')return res.status(200).json(teacherLogout(req,res));
    if(action==='preview')return res.status(200).json(await previewAutomation());
    // Everything below is a teacher tool: it needs the signed teacher session.
    requireTeacher(req,{write:req.method==='POST'});
    if(req.method==='GET'){
      if(action==='overview'){await ensureFresh();return res.status(200).json(await readClassOverview())}
      await ensureFresh();
      const payload=await teacherRead(action,req.query||{});
      if(payload)return res.status(200).json(payload);
      return res.status(400).json({ok:false,error:'ACTION_INVALID'});
    }
    if(req.method!=='POST')return res.status(405).json({ok:false,error:'METHOD_NOT_ALLOWED'});
    previewWriteGuard();
    if(action==='seed'){const curriculum=await seedCurriculum();const weekly=await publishWeeklyPlan(weekNumberForDate());return res.status(200).json({ok:true,curriculum,weekly})}
    if(action==='weekly')return res.status(200).json({ok:true,...await publishWeeklyPlan(Number(body.week)||weekNumberForDate(new Date(Date.now()+86400000))) });
    if(action==='daily')return res.status(200).json({ok:true,...await publishDailyHomework()});
    if(action==='ensure'){const result=await ensureCurrentLearning();await recordAutomationRun('teacher',result);return res.status(200).json({ok:true,...result})}
    if(action==='class_homework')return res.status(200).json({ok:true,...await sendClassHomework(body)});
    if(action==='assistant_ask'){
      // «إيقاف» in the page closes the connection; that cancels the request to the provider as well.
      const stop=new AbortController();
      if(typeof res.on==='function')res.on('close',()=>{if(!res.writableEnded)stop.abort()});
      return res.status(200).json(await assistantAsk(body,{signal:stop.signal}));
    }
    const result=await teacherWrite(action,body);
    if(result)return res.status(200).json({ok:true,...result});
    return res.status(400).json({ok:false,error:'ACTION_INVALID'});
  }catch(error){
    if(accessFailure(res,error)||assistantFailure(res,error))return;
    const message=error instanceof Error?error.message:String(error);
    const status=message==='PRODUCTION_WRITE_BLOCKED'?403:message.endsWith('_REQUIRED')||message.endsWith('_INVALID')||message==='MESSAGE_TOO_LONG'?400:message.endsWith('_NOT_FOUND')?404:message==='SCOPE_NOT_ASSESSABLE'?409:message==='MESSAGE_LIMIT_REACHED'?429:500;
    return res.status(status).json({ok:false,error:message});
  }
}
