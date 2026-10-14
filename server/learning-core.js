// Taallamt Learning Intelligence Core. Pure, deterministic; no provider, network or official-grade writes.
const DAY=86400000;
const stamp=value=>Number.isFinite(Date.parse(value))?Date.parse(value):0;
const text=(value,max=2000)=>String(value??'').trim().slice(0,max);
export function validateContent(input){
  const status=input?.status==='approved'?'approved':'draft';
  const questions=(Array.isArray(input?.questions)?input.questions:[]).slice(0,40).map((q,i)=>({id:text(q.id||`q${i+1}`,80),prompt:text(q.prompt,600),answers:(Array.isArray(q.answers)?q.answers:[]).map(x=>text(x,300)).filter(Boolean).slice(0,8),hint:text(q.hint,500),errorType:text(q.errorType||'needs_review',80),ignoreDiacritics:q.ignoreDiacritics===true&&q.diacritics!==true,diacritics:q.diacritics===true,...(typeof q.points==='number'&&Number.isFinite(q.points)&&q.points>0&&q.points<=100?{points:q.points}:{}),partialAnswers:(Array.isArray(q.partialAnswers)?q.partialAnswers:[]).filter(p=>typeof p.answer==='string'&&typeof p.points==='number'&&p.points>0&&p.points<(q.points||1)).map(p=>({answer:text(p.answer,300),points:p.points}))}));
  if(new Set(questions.map(q=>q.id)).size!==questions.length)throw new Error('QUESTION_ID_INVALID');
  const reference=text(input?.reference,500),explanation=text(input?.explanation,5000);
  if(status==='approved'&&(!reference||!explanation||questions.length<3||questions.some(q=>!q.prompt||!q.answers.length)))throw new Error('CONTENT_APPROVAL_INVALID');
  const alternatives={};for(const key of ['example','segmentation','guided'])if(text(input?.alternatives?.[key],5000))alternatives[key]=text(input.alternatives[key],5000);
  return {status,reference,explanation,alternatives,questions,prerequisites:[...new Set((Array.isArray(input?.prerequisites)?input.prerequisites:[]).map(x=>text(x,100)).filter(Boolean))].slice(0,12),strategy:['example','segmentation','guided'].includes(input?.strategy)?input.strategy:'example',dailyLimit:Math.max(3,Math.min(20,Number(input?.dailyLimit)||9)),reviewDays:Math.max(1,Math.min(30,Number(input?.reviewDays)||7)),weekNumber:Math.max(1,Math.min(18,Number(input?.weekNumber)||1)),rulingVerified:input?.rulingVerified===true};
}
export function gradeAnswer(question,answer){
  const normalize=value=>{let s=text(value,300).normalize('NFC').replace(/\s+/g,' ');if(question.ignoreDiacritics)s=s.replace(/[\u064b-\u0652\u0670]/g,'');return s};
  return (question.answers||[]).some(value=>normalize(value)===normalize(answer));
}
export function publicActivity(question){return question?{id:question.id,prompt:question.prompt,hint:question.hint||''}:null}
export function learningWeek(now){const date=new Date(new Date(now).getTime()+3*60*60*1000);date.setUTCDate(date.getUTCDate()-date.getUTCDay());return date.toISOString().slice(0,10)}
export function recordAttempt(memory={},attempt,now){
  const previous=Array.isArray(memory.attempts)?memory.attempts:[];
  if(previous.some(row=>row.id===attempt.id))return memory;
  const row={id:text(attempt.id,100),targetId:text(attempt.targetId,100),questionId:text(attempt.questionId,80),correct:attempt.correct===true,mode:['diagnostic','practice','test','review'].includes(attempt.mode)?attempt.mode:'practice',strategy:text(attempt.strategy||'example',80),errorType:attempt.correct?'':text(attempt.errorType||'needs_review',80),at:now};
  const attempts=[...previous,row],week=learningWeek(now),awards=memory.learningStars||[],recent=attempts.filter(a=>a.targetId===row.targetId).slice(-3);
  const improved=row.correct&&recent.length===3&&!recent[0].correct&&recent.slice(1).every(a=>a.correct)&&new Set(recent.map(a=>a.questionId)).size===3;
  const verified=row.correct&&recent.length===3&&recent.every(a=>a.correct&&['test','diagnostic','review'].includes(a.mode))&&new Set(recent.map(a=>a.questionId)).size===3;
  const eligible=(improved||verified)&&awards.filter(a=>a.week===week).length<3&&!awards.some(a=>a.week===week&&a.targetId===row.targetId);
  const learningStars=eligible?[...awards,{id:row.id,targetId:row.targetId,week,at:now,reason:improved?'تحسنت بعد التدريب وأجبت عن مثالين مختلفين بشكل صحيح':'أجبت عن ثلاثة أسئلة مختلفة بشكل صحيح'}].slice(-156):awards;
  return {...memory,learningStars,version:1,attempts:attempts.slice(-200),resume:{targetId:row.targetId,mode:row.mode,at:now},updatedAt:now};
}
export function selectActivity(target,memory={}){
  const questions=target.learning?.questions||[];
  if(!questions.length)return null;
  const attempts=(memory.attempts||[]).filter(row=>row.targetId===target.id),last=attempts.at(-1)?.questionId;
  const counts=new Map();for(const row of attempts)counts.set(row.questionId,(counts.get(row.questionId)||0)+1);
  return [...questions].filter(q=>q.id!==last||questions.length===1).sort((a,b)=>(counts.get(a.id)||0)-(counts.get(b.id)||0))[0]||questions[0];
}
export function buildLearningModel({studentId,targets=[],assessments=[],memory={},now=new Date().toISOString(),weekNumber=18}){
  const approved=targets.filter(t=>t.learning?.status==='approved'&&t.subject!=='quran'&&Number(t.weekNumber||t.learning.weekNumber||1)<=weekNumber&&t.learning.questions?.length>=3);
  const official=new Map();
  for(const row of [...assessments].filter(x=>x.studentId===studentId).sort((a,b)=>stamp(a.enteredAt)-stamp(b.enteredAt)))for(const item of row.academic||[])official.set(item.targetId,{result:item.result,at:row.enteredAt});
  const skills=approved.map(target=>{
    const teacher=official.get(target.id)||null,all=(memory.attempts||[]).filter(a=>a.targetId===target.id),recent=all.filter(a=>!teacher||stamp(a.at)>stamp(teacher.at)),tests=recent.filter(a=>['test','diagnostic','review'].includes(a.mode)).slice(-5),distinct=new Set(tests.map(a=>a.questionId)).size;
    const practiceMastered=tests.length>=3&&distinct>=3&&tests.every(a=>a.correct)&&(target.subject!=='handwriting'||tests.every(a=>a.strategy==='teacher_review')),regressed=recent.slice(-3).filter(a=>!a.correct).length>=2;
    const state=regressed?'needs_practice':practiceMastered?'practice_mastered':teacher?.result==='mastered'&&!regressed?'mastered':teacher||recent.length?'needs_practice':'unknown';
    const lastAt=recent.at(-1)?.at||teacher?.at||'',due=['mastered','practice_mastered'].includes(state)&&stamp(now)-stamp(lastAt)>=(target.learning.reviewDays||7)*DAY;
    const errors={};for(const row of recent.filter(a=>!a.correct))errors[row.errorType||'needs_review']=(errors[row.errorType||'needs_review']||0)+1;
    return {targetId:target.id,title:target.skill||target.title,subject:target.subject,state,official:teacher?.result||null,scoredAttempts:recent.length,score:recent.length?Math.round(recent.filter(a=>a.correct).length/recent.length*100):null,attempts:all.length,lastAt,reviewDue:due,errors,confidence:recent.length>=6?'medium':'low',reason:due?'حان موعد مراجعة المهارة':state==='unknown'?'نحتاج نشاطًا تشخيصيًا قبل تحديد المستوى':regressed?'تكرر الخطأ بعد إتقان سابق':state==='needs_practice'?'نتائج التدريب أو تقييم المعلم تشير إلى الحاجة للتدريب':state==='practice_mastered'?'ثلاثة أسئلة مختلفة صحيحة؛ تقييم المعلم مستقل':'أتقنها الطالب وفق تقييم المعلم'};
  });
  const byId=new Map(skills.map(s=>[s.targetId,s])),targetMap=new Map(approved.map(t=>[t.id,t]));
  function resolve(id,path=new Set()){
    if(path.has(id)||!targetMap.has(id))return null;
    const nextPath=new Set(path).add(id);
    for(const prerequisite of targetMap.get(id).learning.prerequisites||[]){const s=byId.get(prerequisite);if(!s||!['mastered','practice_mastered'].includes(s.state)){const resolved=resolve(prerequisite,nextPath);return resolved}}
    return byId.get(id);
  }
  const ordered=[...skills].sort((a,b)=>Number(b.reviewDue)-Number(a.reviewDue)||Number(a.state==='mastered'||a.state==='practice_mastered')-Number(b.state==='mastered'||b.state==='practice_mastered'));
  let chosen=null;for(const skill of ordered){if(['mastered','practice_mastered'].includes(skill.state)&&!skill.reviewDue)continue;chosen=resolve(skill.targetId);if(chosen)break}
  const chosenTarget=chosen?targetMap.get(chosen.targetId):null,failed=chosen?(memory.attempts||[]).filter(a=>a.targetId===chosen.targetId).slice(-3).filter(a=>!a.correct).length:0;
  const strategy=failed>=2?Object.keys(chosenTarget?.learning.alternatives||{}).find(key=>key!==chosenTarget.learning.strategy)||chosenTarget?.learning.strategy:chosenTarget?.learning.strategy;
  const next=chosen?{strategy,targetId:chosen.targetId,mode:chosen.reviewDue?'review':chosen.state==='unknown'?'diagnostic':'practice',reason:chosen.reason}:null;
  const supportPlans=skills.flatMap(skill=>{const recent=(memory.attempts||[]).filter(a=>a.targetId===skill.targetId).slice(-3),failures=recent.filter(a=>!a.correct).length;if(failures<2||skill.state!=='needs_practice')return [];return [{targetId:skill.targetId,title:skill.title,status:failures>=3?'teacher_review':'training',reason:'تكرر الخطأ في '+skill.title,steps:['راجع الشرح مع المثال.','تدرّب على مثال مختلف مع التلميح.','اختبر المهارة بأسئلة جديدة.'],maxAttempts:3,needsTeacher:failures>=3}];});
  return {studentId,supportPlans,stars:(memory.learningStars||[]).filter(a=>a.week===learningWeek(now)),skills,next,resume:memory.resume&&targetMap.has(memory.resume.targetId)?memory.resume:null,generatedAt:now};
}
