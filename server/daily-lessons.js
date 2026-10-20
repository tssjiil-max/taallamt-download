import {riyadhDateString,riyadhWeekday,termPhase} from './learning-content.js';
import {subjectKeyOf,weekRange} from './plan.js';
import {validateContent,publicActivity,gradeAnswer,recordAttempt,selectActivity} from './learning-core.js';

// Projection only: page refreshes never create lessons, homework, attempts or rewards.
export function dailyLessons({plans=[],catalog=[],settings={},memory={},date=new Date(),teacher=false}){
 const today=riyadhDateString(date),day=riyadhWeekday(date),gaps=[],lessons=[],seen=new Set();
 for(const plan of plans){
  if(plan.publishStatus!=='published')continue;
  const subject=subjectKeyOf(plan.subject),week=Number(plan.weekNumber),range=weekRange(week);
  if(!subject||!Number.isInteger(week)||week<1||week>18||plan.holiday)continue;
  const days=Array.isArray(plan.days)?plan.days:[];
  if(!days.length){gaps.push({id:plan.id,message:'موعد يومي غير محدد: '+(plan.lesson||plan.title||subject)});continue}
  for(const slot of days){
   if(!Number.isInteger(slot.weekday)||slot.weekday<0||slot.weekday>4)continue;
   const scheduled=new Date(Date.parse(range.start+'T00:00:00Z')+slot.weekday*86400000).toISOString().slice(0,10);
   const id=plan.id+':d'+slot.weekday,override=settings.overrides?.[id]||{},availableOn=override.date||scheduled;
   if(!/^\d{4}-\d{2}-\d{2}$/.test(availableOn)||Number.isNaN(Date.parse(availableOn+'T00:00:00Z')))continue;
   if(!teacher&&(override.hidden||!/^\d{4}-\d{2}-\d{2}$/.test(availableOn)||availableOn>today))continue;
   const availableDate=new Date(availableOn+'T09:00:00Z');
   if(!teacher&&(settings.holidays?.includes(availableOn)||riyadhWeekday(availableDate)>4||termPhase(availableDate)!=='during'))continue;
   if(!teacher&&availableOn===today&&(settings.enabled===false||settings.holidays?.includes(today)||day>4||termPhase(date)!=='during'))continue;
   if(seen.has(id))continue;seen.add(id);
   const title=String(plan.override?.lesson||plan.lesson||'');
   if(!title){gaps.push({id,message:'عنوان درس غير مكتمل'});continue}
   const candidates=catalog.filter(t=>!String(t.id).includes('original-arabic-')&&subjectKeyOf(t.subject)===subject&&Number(t.weekNumber||t.learning?.weekNumber)===week&&t.learning?.status==='approved'&&((plan.targetIds||[]).includes(t.id)||[t.title,t.lesson,t.learning?.lessonTitle].includes(title)));
   const target=candidates.length===1?candidates[0]:null;
   let learning=null;
   try{if(target){learning=validateContent(target.learning);if(subject==='quran'||target.subject==='handwriting'||(subject==='islamic'&&!learning.rulingVerified))learning=null}}catch{learning=null}
   if(!learning)gaps.push({id,message:'المحتوى التعليمي المعتمد أو ربطه بالدرس ناقص: '+title});
   const attempts=(memory.attempts||[]).filter(a=>a.targetId===target?.id),lastTests=(memory.selfTests||[]).filter(a=>a.lessonId===id),latest=lastTests.at(-1);
   if(!teacher&&lessons.some(l=>l.subject===subject&&l.title===title&&l.date===availableOn))continue;
   lessons.push({id,subject,title,unit:String(plan.override?.unit||plan.unit||''),skill:String(plan.override?.skill||plan.skill||''),date:availableOn,targetId:learning?target.id:null,explanation:learning?.explanation||'',reference:learning?.reference||'',questions:learning?learning.questions.slice(0,5).map(q=>({id:q.id,prompt:q.prompt,hint:''})):[],practice:learning?publicActivity(selectActivity({...target,learning},memory)):null,hidden:override.hidden===true,status:latest?.correct===latest?.total&&latest?'أتقن':latest?'يحتاج متابعة':attempts.length?'يتعلم':'لم يبدأ',today:availableOn===today});
  }
 }
 return {date:today,lessons:lessons.sort((a,b)=>b.date.localeCompare(a.date)||a.id.localeCompare(b.id)),gaps,enabled:settings.enabled!==false};
}
export function gradeSelfTest(memory,{id,lessonId,target,answers},at){
 const previous=(memory.selfTests||[]).find(t=>t.id===id);
 if(previous){if(previous.lessonId!==lessonId)throw new Error('ATTEMPT_CONFLICT');return {memory,result:{...previous,duplicate:true}}}
 const learning=validateContent(target.learning),questions=learning.questions.slice(0,5);
 if(learning.status!=='approved'||questions.length<3)throw new Error('CONTENT_NOT_AVAILABLE');
 let next=memory;
 const results=questions.map((q,i)=>{const correct=gradeAnswer(q,answers?.[q.id]);next=recordAttempt(next,{id:id+':'+i,targetId:target.id,questionId:q.id,correct,mode:'test',strategy:'self_test',errorType:q.errorType},at);return {questionId:q.id,correct,hint:correct?'أحسنت!':q.hint||'راجع الشرح ثم أعد المحاولة.'}});
 const result={id,lessonId,targetId:target.id,at,correct:results.filter(r=>r.correct).length,total:results.length,results,official:false};
 next={...next,selfTests:[...(memory.selfTests||[]),result].slice(-100)};
 return {memory:next,result};
}
