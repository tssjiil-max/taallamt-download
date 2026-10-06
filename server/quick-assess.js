// Quick skill assessment: the teacher opens a subject, the week's skill is already there, one button marks the rest of
// the class as "أتقن" and only the students in the focused follow-up list are assessed one by one.
// Records are keyed by school / class / term / week / subject / student, so repeating a request never duplicates anything.
import {adminDb,previewWriteGuard} from './firebase-admin.js';
import {CLASS_ID} from './class-roster.js';
import {contentForWeek,riyadhDateString,weekNumberForDate,QURAN_WEEKS,TERM_WEEKS} from './learning-content.js';
import {QURAN_FOLLOWUP_WEEKS,resolveQuranWeek} from './quran-followup-curriculum.js';
import {SUBJECTS,SUBJECT_KEYS,subjectKeyOf,targetIdFor,weekKeyFor,weekRange,workspaceRoot} from './plan.js';
import {ROSTER,rosterStudent,SCHOOL_ID,TERM_ID} from './roster.js';

export const RESULTS=['mastered','needs_repeat','not_mastered'];
export const RESULT_LABELS={mastered:'أتقن',needs_repeat:'يحتاج إعادة',not_mastered:'لم يتقن'};
const TO_STORED={mastered:'mastered',needs_repeat:'needs_practice',not_mastered:'not_mastered'};
const FROM_STORED={mastered:'mastered',needs_practice:'needs_repeat',not_mastered:'not_mastered'};
const TO_QURAN={mastered:'MASTERED',needs_repeat:'NEEDS_REPEAT',not_mastered:'NOT_MASTERED'};
const FROM_QURAN={MASTERED:'mastered',NEEDS_REPEAT:'needs_repeat',NOT_MASTERED:'not_mastered'};
export const resultFromStored=value=>FROM_STORED[value]||null;
export const resultFromQuran=value=>FROM_QURAN[value]||null;

const rows=snap=>snap.docs.map(doc=>({id:doc.id,...doc.data()}));
const pad=week=>String(week).padStart(2,'0');
const skillSessionId=(week,subject)=>`skill:${weekKeyFor(week)}:${subject}`;
export const skillRecordId=(week,subject,studentId)=>`${skillSessionId(week,subject)}:${studentId}`;
export const quranRecordId=(week,studentId)=>`${TERM_ID}_${CLASS_ID}_w${pad(week)}_${studentId}`;

// Quran follow-up weeks are teaching weeks: the autumn break (calendar week 13) is not counted.
export function currentQuranWeek(date=new Date()){
  const calendar=weekNumberForDate(date);
  return (resolveQuranWeek(calendar)||resolveQuranWeek(calendar-1)||QURAN_FOLLOWUP_WEEKS[0]).week;
}
// Ayah range comes from the weekly distribution only when it names the same surah; otherwise no range is shown.
export function quranWeekInfo(curriculumWeek){
  const item=QURAN_FOLLOWUP_WEEKS.find(entry=>entry.week===Number(curriculumWeek))||null;
  if(!item)return null;
  const distribution=QURAN_WEEKS[item.week];
  const sameSurah=Boolean(item.surah)&&distribution&&String(distribution.surah||'').split('/').map(part=>part.trim()).includes(item.surah);
  const range=sameSurah&&/الآيات|\d/.test(distribution.weekly||'')&&!String(distribution.surah).includes('/')?distribution.weekly:'';
  return {week:item.week,surah:item.surah||'',description:item.description||'',kind:item.kind||'memorization',range,title:item.surah?`سورة ${item.surah}`:(item.description||'')};
}

export function resolveScope(subjectKey,week,date=new Date()){
  if(!SUBJECT_KEYS.includes(subjectKey))throw new Error('SUBJECT_INVALID');
  const given=week===undefined||week===null||week==='';
  if(!given&&!/^\d{1,2}$/.test(String(week)))throw new Error('WEEK_INVALID');
  if(subjectKey==='quran'){
    const current=currentQuranWeek(date),info=quranWeekInfo(given?current:Number(week));
    if(!info||info.week>current)throw new Error('WEEK_INVALID');
    const assessable=info.kind!=='exam';
    return {subjectKey,label:SUBJECTS.quran.label,short:SUBJECTS.quran.short,week:info.week,currentWeek:current,isCurrent:info.week===current,weekLabel:`الأسبوع ${info.week}`,
      skill:info.surah?`حفظ سورة ${info.surah}`:info.description,lesson:info.range,unit:info.surah,description:info.description,targetId:`quran-memorization:w${pad(info.week)}`,
      assessable,reason:assessable?'':'أسبوع اختبارات: لا يوجد تقييم حفظ لهذا الأسبوع.'};
  }
  const current=weekNumberForDate(date),w=given?current:Number(week);
  if(w<1||w>current)throw new Error('WEEK_INVALID');
  const item=contentForWeek(w)[subjectKey]||{};
  const assessable=!item.holiday&&Boolean(item.skill||item.lesson);
  return {subjectKey,label:SUBJECTS[subjectKey].label,short:SUBJECTS[subjectKey].short,week:w,currentWeek:current,isCurrent:w===current,weekLabel:`الأسبوع ${w}`,
    skill:item.skill||item.lesson||'',lesson:item.lesson||'',unit:item.unit||'',description:'',targetId:targetIdFor(subjectKey,w),
    assessable,reason:item.holiday?'إجازة: لا يوجد تقييم لهذا الأسبوع.':(assessable?'':'لا توجد مهارة مسجلة لهذا الأسبوع في توزيع المنهج.')};
}
export function scopeWeeks(subjectKey,date=new Date()){
  if(subjectKey==='quran'){
    const current=currentQuranWeek(date);
    return QURAN_FOLLOWUP_WEEKS.filter(item=>item.kind!=='exam'&&item.week<=current).map(item=>({week:item.week,label:`الأسبوع ${item.week} — ${item.surah?`سورة ${item.surah}`:item.description}`,current:item.week===current}));
  }
  const current=weekNumberForDate(date),out=[];
  for(let week=1;week<=Math.min(current,TERM_WEEKS);week++){const item=contentForWeek(week)[subjectKey]||{};if(item.holiday)continue;out.push({week,label:`الأسبوع ${week} — ${item.skill||item.lesson||''}`,current:week===current})}
  return out;
}

// Focused follow-up list. Kept in the student profile next to the existing assessment group, with an optional per-subject override.
export function isFocused(profile,subjectKey){
  const bySubject=profile?.focusBySubject;
  if(bySubject&&typeof bySubject==='object'&&typeof bySubject[subjectKey]==='boolean')return bySubject[subjectKey];
  return profile?.assessmentGroup==='focused';
}
function focusScope(profile,subjectKey){
  const bySubject=profile?.focusBySubject;
  if(bySubject&&typeof bySubject==='object'&&typeof bySubject[subjectKey]==='boolean')return 'subject';
  return profile?.assessmentGroup==='focused'?'all':null;
}
export async function readProfiles(db){
  const snap=await db.collection(`${workspaceRoot()}/studentProfiles`).select('studentId','assessmentGroup','focusBySubject').get();
  return new Map(rows(snap).map(item=>[item.studentId||item.id,item]));
}

// General subjects: every assessment entered since the start of the scope's week is read once, and the newest entry for
// the week's skill wins per student. That includes results saved from a student's file in the older teacher tools, so a
// bulk press can never silently replace them.
const weekStartIso=week=>new Date(Date.parse(`${weekRange(week).start}T00:00:00Z`)-3*3600000).toISOString();
async function readSkillRows(db,week){
  const snap=await db.collection(`${workspaceRoot()}/assessments`).where('enteredAt','>=',weekStartIso(week)).get();
  return rows(snap).sort((a,b)=>String(a.enteredAt||'').localeCompare(String(b.enteredAt||'')));
}
function skillRecords(sortedRows,targetId){
  const map=new Map();
  for(const row of sortedRows){
    const entry=(Array.isArray(row.academic)?row.academic:[]).find(item=>item?.targetId===targetId),result=resultFromStored(entry?.result);
    if(!result||!row.studentId)continue;
    const own=row.source==='skill_assessment';
    map.set(row.studentId,{result,mode:own?(row.mode||'individual'):'individual',opId:own?(row.opId||null):null,updatedAt:row.enteredAt||''});
  }
  return map;
}
async function readScopeRecords(db,scope){
  if(scope.subjectKey==='quran'){
    const snap=await db.collection(`${workspaceRoot()}/quranFollowups`).where('week','==',scope.week).get();
    return new Map(rows(snap).filter(item=>!item.classId||item.classId===CLASS_ID).map(item=>[item.studentId,{result:resultFromQuran(item.status),mode:item.mode||'individual',opId:item.opId||null,updatedAt:item.updatedAt||''}]));
  }
  return skillRecords(await readSkillRows(db,scope.week),scope.targetId);
}
const scopeKey=scope=>`${scope.subjectKey}:${scope.week}`;
async function lastBulkOperation(db,scope){
  const snap=await db.collection(`${workspaceRoot()}/assessmentOps`).where('scopeKey','==',scopeKey(scope)).get();
  return rows(snap).filter(item=>!item.undoneAt).sort((a,b)=>String(b.createdAt).localeCompare(String(a.createdAt)))[0]||null;
}

export function summarize(scope,records,profiles){
  const students=ROSTER.map(student=>{
    const record=records.get(student.id)||null,profile=profiles.get(student.id)||null;
    return {id:student.id,number:student.number,name:student.name,focused:isFocused(profile,scope.subjectKey),focusScope:focusScope(profile,scope.subjectKey),result:record?.result||null,mode:record?.result?record.mode:null,updatedAt:record?.result?record.updatedAt:''};
  });
  const count=fn=>students.filter(fn).length;
  const counts={
    total:students.length,focused:count(s=>s.focused),rest:count(s=>!s.focused),
    assessed:count(s=>s.result),pending:count(s=>!s.result),
    mastered:count(s=>s.result==='mastered'),needs_repeat:count(s=>s.result==='needs_repeat'),not_mastered:count(s=>s.result==='not_mastered'),
    restPending:count(s=>!s.focused&&!s.result),focusedPending:count(s=>s.focused&&!s.result)
  };
  return {students,counts};
}

export async function assessView(query={},date=new Date()){
  const db=adminDb(),scope=resolveScope(String(query.subjectKey||query.subject||''),query.week,date);
  const [records,profiles,lastBulk]=await Promise.all([readScopeRecords(db,scope),readProfiles(db),lastBulkOperation(db,scope)]);
  const {students,counts}=summarize(scope,records,profiles);
  return {ok:true,scope,weeks:scopeWeeks(scope.subjectKey,date),students,counts,
    lastBulk:lastBulk?{id:lastBulk.id,mode:lastBulk.mode,count:(lastBulk.studentIds||[]).length,createdAt:lastBulk.createdAt}:null};
}

function writeRecord(batch,db,scope,studentId,result,mode,opId,timestamp){
  if(scope.subjectKey==='quran'){
    const ref=db.doc(`${workspaceRoot()}/quranFollowups/${quranRecordId(scope.week,studentId)}`);
    if(!result){batch.delete(ref);return}
    batch.set(ref,{studentId,classId:CLASS_ID,schoolId:SCHOOL_ID,term:TERM_ID,week:scope.week,surah:scope.unit||'',description:scope.description||'',status:TO_QURAN[result],mode,opId:opId||null,updatedAt:timestamp,updatedBy:'teacher'},{merge:true});
    return;
  }
  const id=skillRecordId(scope.week,scope.subjectKey,studentId),ref=db.doc(`${workspaceRoot()}/assessments/${id}`);
  if(!result){batch.delete(ref);return}
  batch.set(ref,{id,studentId,classId:CLASS_ID,schoolId:SCHOOL_ID,termId:TERM_ID,weekKey:weekKeyFor(scope.week),weekNumber:scope.week,subjectKey:scope.subjectKey,
    classSessionId:skillSessionId(scope.week,scope.subjectKey),sessionDate:riyadhDateString(new Date(timestamp)),enteredAt:timestamp,track:'general',
    academic:[{targetId:scope.targetId,result:TO_STORED[result]}],behavior:[],source:'skill_assessment',mode,opId:opId||null,updatedBy:'teacher'});
}
function assertAssessable(scope){if(!scope.assessable)throw new Error('SCOPE_NOT_ASSESSABLE')}

// One student: set, correct or clear ("لم يُقيّم بعد") the result of the scope's skill.
export async function assessOne(body={},date=new Date()){
  previewWriteGuard();
  const scope=resolveScope(String(body.subjectKey||''),body.week,date);assertAssessable(scope);
  const student=rosterStudent(body.studentId);if(!student)throw new Error('STUDENT_NOT_FOUND');
  const result=body.result===null||body.result===''||body.result===undefined?null:String(body.result);
  if(result&&!RESULTS.includes(result))throw new Error('RESULT_INVALID');
  const db=adminDb(),batch=db.batch();
  writeRecord(batch,db,scope,student.id,result,'individual',null,date.toISOString());
  await batch.commit();
  return {saved:true,studentId:student.id,result};
}

// "أتقن بقية الطلاب" (mode rest) and "أتقن جميع الطلاب" (mode all). A bulk press never replaces a result that already exists.
export async function assessBulk(body={},date=new Date()){
  previewWriteGuard();
  const mode=body.mode==='all'?'all':'rest';
  const scope=resolveScope(String(body.subjectKey||''),body.week,date);assertAssessable(scope);
  const db=adminDb(),[records,profiles]=await Promise.all([readScopeRecords(db,scope),readProfiles(db)]);
  const {students}=summarize(scope,records,profiles);
  const targets=students.filter(student=>!student.result&&(mode==='all'||!student.focused));
  const skippedExisting=students.filter(student=>student.result&&(mode==='all'||!student.focused)).length;
  const skippedFocused=mode==='rest'?students.filter(student=>student.focused).length:0;
  if(!targets.length)return {saved:true,written:0,skippedExisting,skippedFocused,operationId:null};
  const timestamp=date.toISOString(),operationId=`bulk_${scope.subjectKey}_w${pad(scope.week)}_${date.getTime()}`,batch=db.batch();
  for(const student of targets)writeRecord(batch,db,scope,student.id,'mastered','bulk',operationId,timestamp);
  batch.set(db.doc(`${workspaceRoot()}/assessmentOps/${operationId}`),{id:operationId,scopeKey:scopeKey(scope),subjectKey:scope.subjectKey,week:scope.week,classId:CLASS_ID,mode,result:'mastered',studentIds:targets.map(student=>student.id),createdAt:timestamp,undoneAt:null});
  await batch.commit();
  return {saved:true,written:targets.length,skippedExisting,skippedFocused,operationId};
}

// Undo of the last bulk press in this scope. Results the teacher corrected by hand afterwards are kept.
export async function assessUndo(body={},date=new Date()){
  previewWriteGuard();
  const scope=resolveScope(String(body.subjectKey||''),body.week,date);
  const db=adminDb(),[operation,records]=await Promise.all([lastBulkOperation(db,scope),readScopeRecords(db,scope)]);
  if(!operation)return {saved:true,undone:0,kept:0,operationId:null};
  const batch=db.batch();let undone=0,kept=0;
  for(const studentId of operation.studentIds||[]){
    if(records.get(studentId)?.opId===operation.id){writeRecord(batch,db,scope,studentId,null);undone+=1}else kept+=1;
  }
  batch.set(db.doc(`${workspaceRoot()}/assessmentOps/${operation.id}`),{undoneAt:date.toISOString()},{merge:true});
  await batch.commit();
  return {saved:true,undone,kept,operationId:operation.id};
}

export async function setFocus(body={}){
  previewWriteGuard();
  const student=rosterStudent(body.studentId);if(!student)throw new Error('STUDENT_NOT_FOUND');
  const focused=Boolean(body.focused),subjectKey=body.subjectKey?String(body.subjectKey):'';
  if(subjectKey&&!SUBJECT_KEYS.includes(subjectKey))throw new Error('SUBJECT_INVALID');
  const db=adminDb(),ref=db.doc(`${workspaceRoot()}/studentProfiles/${student.id}`),snap=await ref.get(),profile=snap.exists?snap.data():{},timestamp=new Date().toISOString();
  const bySubject={...(profile.focusBySubject&&typeof profile.focusBySubject==='object'?profile.focusBySubject:{})};
  if(subjectKey){
    bySubject[subjectKey]=focused;
    await ref.set({studentId:student.id,focusBySubject:bySubject,assessmentGroupUpdatedAt:timestamp,updatedAt:timestamp},{merge:true});
  }else{
    // The general list wins again for every subject, so adding or removing a student is always one press.
    await ref.set({studentId:student.id,assessmentGroup:focused?'focused':'followup',focusBySubject:{},assessmentGroupUpdatedAt:timestamp,updatedAt:timestamp},{merge:true});
  }
  return {saved:true,studentId:student.id,focused,scope:subjectKey?'subject':'all'};
}

// Per-subject progress of the current week, for the teacher home card.
export async function readWeekData(db,date=new Date()){
  const week=weekNumberForDate(date),quranWeek=currentQuranWeek(date);
  const [general,quran]=await Promise.all([
    readSkillRows(db,week),
    db.collection(`${workspaceRoot()}/quranFollowups`).where('week','==',quranWeek).get()
  ]);
  return {week,quranWeek,general,quranRows:rows(quran).filter(item=>!item.classId||item.classId===CLASS_ID)};
}
const recordsFor=(data,scope)=>scope.subjectKey==='quran'
  ?new Map(data.quranRows.map(item=>[item.studentId,{result:resultFromQuran(item.status),updatedAt:item.updatedAt||''}]))
  :skillRecords(data.general,scope.targetId);
// Per-subject progress of the current week, for the teacher home card.
export function weekProgress(data,profiles,date=new Date()){
  return SUBJECT_KEYS.map(subjectKey=>{
    const scope=resolveScope(subjectKey,null,date);
    const {counts}=summarize(scope,recordsFor(data,scope),profiles);
    return {subjectKey,label:scope.label,short:scope.short,week:scope.week,skill:scope.skill,lesson:scope.lesson,assessable:scope.assessable,reason:scope.reason,...counts};
  });
}
// Each student's result in every subject for the current week's skills.
export function weekResultsByStudent(data,date=new Date()){
  const out=new Map(ROSTER.map(student=>[student.id,{}]));
  for(const subjectKey of SUBJECT_KEYS){
    const records=recordsFor(data,resolveScope(subjectKey,null,date));
    for(const student of ROSTER)out.get(student.id)[subjectKey]=records.get(student.id)?.result||null;
  }
  return out;
}
// Results entered today (Riyadh day). A student assessed in several subjects appears once in the count.
export function assessedToday(data,date=new Date()){
  const today=riyadhDateString(date),entries=[],day=value=>{const parsed=new Date(value);return Number.isNaN(parsed.getTime())?'':riyadhDateString(parsed)};
  for(const row of data.general){
    if(!rosterStudent(row.studentId)||day(row.enteredAt)!==today)continue;
    for(const item of Array.isArray(row.academic)?row.academic:[]){
      const result=resultFromStored(item?.result),subjectKey=subjectKeyOf(item?.targetId);
      if(result&&subjectKey)entries.push({studentId:row.studentId,subjectKey,result,at:String(row.enteredAt||'')});
    }
  }
  for(const row of data.quranRows){
    const result=resultFromQuran(row.status);
    if(result&&rosterStudent(row.studentId)&&day(row.updatedAt)===today)entries.push({studentId:row.studentId,subjectKey:'quran',result,at:String(row.updatedAt||'')});
  }
  // newest entry per student and subject
  const latest=new Map();
  for(const entry of entries.sort((a,b)=>a.at.localeCompare(b.at)))latest.set(`${entry.studentId}:${entry.subjectKey}`,entry);
  const list=[...latest.values()].sort((a,b)=>b.at.localeCompare(a.at));
  return {entries:list,studentIds:[...new Set(list.map(entry=>entry.studentId))]};
}
