// Weekly plan read model shared by the teacher and the student pages, so both always show the same plan.
// Content comes from the verified curriculum distribution (server/learning-content.js) and the published weeklyPlans records.
import {WORKSPACE_ID} from './class-roster.js';
import {contentForWeek,riyadhDateString,riyadhWeekday,weekNumberForDate,TERM_START,TERM_WEEKS} from './learning-content.js';

export const SUBJECT_KEYS=['arabic','quran','islamic','spelling'];
export const SUBJECTS={
  arabic:{label:'لغتي',short:'لغتي'},
  quran:{label:'القرآن الكريم',short:'القرآن'},
  islamic:{label:'الدراسات الإسلامية',short:'الدراسات'},
  spelling:{label:'الإملاء والخط',short:'الإملاء والخط'}
};
export const WEEKDAY_LABELS=['الأحد','الاثنين','الثلاثاء','الأربعاء','الخميس','الجمعة','السبت'];
const DAY_MS=86400000;
const pad=week=>String(week).padStart(2,'0');
export const clampWeek=week=>Math.max(1,Math.min(TERM_WEEKS,Number(week)||1));
export const weekKeyFor=week=>`1448-f1-w${pad(week)}`;
export const targetIdFor=(subject,week)=>`auto:${subject}:w${pad(week)}`;
export const planDocId=(week,subject)=>`auto-week:${weekKeyFor(week)}:${subject}`;
export const workspaceRoot=()=>`workspaces/${WORKSPACE_ID}`;

export function subjectKeyOf(value){
  const raw=String(value||'').trim();
  const direct=raw.match(/^(?:subject|auto):([a-z_]+)/);
  const key=direct?direct[1]:raw.toLowerCase();
  if(key==='arabic'||raw==='لغتي')return 'arabic';
  if(key==='quran'||raw==='القرآن الكريم')return 'quran';
  if(key==='islamic'||raw==='الدراسات الإسلامية')return 'islamic';
  if(['spelling','handwriting','spelling_handwriting'].includes(key)||raw==='الإملاء والخط')return 'spelling';
  return null;
}

// The plan of the coming week goes live on Saturday (the weekly job runs Saturday 08:00 Asia/Riyadh).
export function planWeekForDate(date=new Date()){
  return weekNumberForDate(riyadhWeekday(date)===6?new Date(date.getTime()+DAY_MS):date);
}
export function weekRange(week){
  const start=Date.parse(`${TERM_START}T00:00:00Z`)+(clampWeek(week)-1)*7*DAY_MS;
  const iso=ms=>new Date(ms).toISOString().slice(0,10);
  return {start:iso(start),end:iso(start+4*DAY_MS)};
}
export function nextSchoolDay(localDate){
  let ms=Date.parse(`${localDate}T00:00:00Z`);
  do{ms+=DAY_MS}while([5,6].includes(new Date(ms).getUTCDay()));
  return new Date(ms).toISOString().slice(0,10);
}
export function todayInfo(date=new Date()){
  const weekday=riyadhWeekday(date);
  return {date:riyadhDateString(date),weekday,weekdayLabel:WEEKDAY_LABELS[weekday],schoolDay:weekday!==5&&weekday!==6};
}

function summaryOf(subject,item){
  if(item.holiday)return 'إجازة';
  if(subject==='quran')return item.unit?`سورة ${item.unit}`:(item.lesson||'');
  if(subject==='spelling'){
    const spell=item.spellingTask?.title||item.skill||'',hand=item.handwritingTask?.title||'';
    return hand?`${spell} · فن الخط: ${hand}`:spell||item.lesson||'';
  }
  return item.lesson||item.skill||'';
}
// One plan item per subject, in display order (from the right): لغتي — القرآن الكريم — الدراسات الإسلامية — الإملاء والخط.
export function buildPlan(week,docs=[]){
  const w=clampWeek(week),content=contentForWeek(w),key=weekKeyFor(w);
  const live=new Map();
  for(const doc of docs){if(doc?.weekKey!==key||doc.publishStatus!=='published')continue;const subject=subjectKeyOf(doc.subject);if(subject&&!live.has(subject))live.set(subject,doc)}
  const gaps=[];
  const items=SUBJECT_KEYS.map(subject=>{
    const planned=content[subject]||{},doc=live.get(subject)||null,override=doc?.override||null;
    const base={unit:planned.unit||planned.surah||'',lesson:planned.lesson||'',skill:planned.skill||'',holiday:Boolean(planned.holiday),
      copywork:planned.copywork||null,spellingTask:planned.spellingTask||null,handwritingTask:planned.handwritingTask||null};
    const item={
      subjectKey:subject,label:SUBJECTS[subject].label,short:SUBJECTS[subject].short,targetId:targetIdFor(subject,w),
      unit:override?.unit||base.unit,lesson:override?.lesson||base.lesson,skill:override?.skill||base.skill,holiday:base.holiday,
      page:Number(doc?.page)||null,exercise:String(doc?.exercise||''),
      copywork:doc?.copywork||base.copywork,spellingTask:doc?.spellingTask||base.spellingTask,handwritingTask:doc?.handwritingTask||base.handwritingTask,
      days:Array.isArray(doc?.days)?doc.days:[],
      note:String(override?.note||''),edited:Boolean(override),editedAt:String(override?.editedAt||''),
      published:Boolean(doc),publishedAt:String(doc?.publishedAt||doc?.updatedAt||''),source:String(doc?.source||'')
    };
    item.summary=summaryOf(subject,item);
    if(!item.holiday&&!item.lesson&&!item.skill)gaps.push({subjectKey:subject,code:'LESSON_MISSING',message:`${SUBJECTS[subject].label}: لا يوجد درس مسجل لهذا الأسبوع في توزيع المنهج.`});
    return item;
  });
  const published=items.every(item=>item.published);
  const stamps=items.map(item=>item.publishedAt).filter(Boolean).sort();
  return {
    week:w,weekKey:key,termWeeks:TERM_WEEKS,range:weekRange(w),holiday:items.every(item=>item.holiday),
    published,publishedAt:published?stamps[stamps.length-1]||'':'',source:published?'automation':'',
    items,gaps
  };
}
export async function readWeekPlan(db,week){
  const snap=await db.collection(`${workspaceRoot()}/weeklyPlans`).where('weekKey','==',weekKeyFor(clampWeek(week))).get();
  return buildPlan(week,snap.docs.map(doc=>({id:doc.id,...doc.data()})));
}
