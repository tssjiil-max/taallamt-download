(()=>{
  if(!location.pathname.startsWith('/student'))return;

  const subjectMap={'القرآن الكريم':'quran','لغتي':'arabic','الدراسات الإسلامية':'islamic','الإملاء والخط':'spelling'};
  const subjectLabels={quran:'القرآن الكريم',arabic:'لغتي',islamic:'الدراسات الإسلامية',spelling:'الإملاء والخط',handwriting:'الإملاء والخط'};
  const academicLabels={mastered:'أتقن',needs_practice:'يحتاج تدريب',not_mastered:'لم يتقن'};
  let latest=null;

  const studentId=()=>new URLSearchParams(location.search).get('studentId')||(()=>{try{return JSON.parse(localStorage.getItem('studentProfile')||'{}')?.id||localStorage.getItem('activeStudentId')||''}catch{return localStorage.getItem('activeStudentId')||''}})();
  const api=async url=>{const response=await fetch(url,{cache:'no-store'});const data=await response.json().catch(()=>({}));if(!response.ok||data?.ok===false)throw new Error(data?.error||`HTTP_${response.status}`);return data};
  const riyadhDate=value=>{try{return new Intl.DateTimeFormat('en-CA',{timeZone:'Asia/Riyadh',year:'numeric',month:'2-digit',day:'2-digit'}).format(new Date(value))}catch{return ''}};
  const keyForSubject=value=>{const raw=String(value||'').trim();return subjectMap[raw]||(['quran','arabic','islamic','spelling','handwriting'].includes(raw)?raw:'')};
  const evidenceStatus=(state,homeworkId)=>state?.homeworkEvidence?.find(item=>item.homeworkId===homeworkId)?.status||'';

  function notify(message){let box=document.querySelector('.studentPatchToast');if(!box){box=document.createElement('div');box.className='studentPatchToast';document.body.appendChild(box)}box.textContent=message;setTimeout(()=>box?.remove(),2600)}

  async function fetchPreview(){return api('/api/learning-automation?action=preview')}
  async function fetchState(id){return api(`/api/student-state?studentId=${encodeURIComponent(id)}`)}

  function todayMaterialized(state,preview){
    return (state?.homework||[]).filter(item=>{
      const date=String(item.scheduledDate||'')||riyadhDate(item.assignedAt);
      return date===preview.localDate||String(item.id||'').startsWith(`auto-homework:${preview.localDate}:`);
    });
  }

  function mergedTodayTasks(preview,state){
    const materialized=todayMaterialized(state,preview);
    const byId=new Map(materialized.map(item=>[String(item.id),{...item,planned:false}]));
    for(const planned of preview.homework||[]){
      const live=byId.get(String(planned.id));
      byId.set(String(planned.id),live?{...planned,...live,planned:false}:{...planned,planned:true});
    }
    return [...byId.values()];
  }

  function taskSubtitle(task){
    const key=task.subjectKey||keyForSubject(task.subject),label=subjectLabels[key]||task.subject||'المادة';
    if(task.taskType==='quran_memorization')return `${label} · حفظ اليوم`;
    if(task.taskType==='quran_review')return `${label} · مراجعة / تسميع`;
    if(task.taskType==='spelling_practice')return `${label} · تدريب الإملاء والخط`;
    return `${label} · ${task.planned?'من توزيع اليوم':'واجب اليوم'}`;
  }

  async function completeTask(button,task,state){
    if(task.planned){notify('المهمة ظاهرة من توزيع اليوم، وسيصبح تأكيد الإنجاز متاحًا بعد نشرها للطالب.');return}
    const id=studentId();if(!id||!task.id)return;
    button.disabled=true;
    try{
      const response=await fetch('/api/homework-complete',{method:'POST',headers:{'content-type':'application/json'},body:JSON.stringify({studentId:id,homeworkId:task.id})});
      const data=await response.json().catch(()=>({}));if(!response.ok||!data.ok)throw new Error(data.error||`HTTP_${response.status}`);
      button.classList.add('done');const circle=button.querySelector('.taskCircle');if(circle)circle.textContent='✓';task.completed=true;notify('تم تأكيد تنفيذ المهمة ✓');
      if(state?.homeworkEvidence){const row=state.homeworkEvidence.find(item=>item.homeworkId===task.id);if(row)row.status='completed'}
    }catch{notify('تعذر تأكيد المهمة الآن. حاول مرة أخرى.')}finally{button.disabled=false}
  }

  function renderTodayTasks(preview,state){
    const id=studentId();if(!id)return false;
    const panels=[...document.querySelectorAll('.student .dayPanel')],panel=panels.find(item=>(item.querySelector('h3')?.textContent||'').includes('مهامي اليوم'));
    if(!panel)return false;
    const tasks=mergedTodayTasks(preview,state);
    panel.querySelectorAll('.taskItem,.automationTaskEmpty').forEach(node=>node.remove());
    if(!tasks.length){const empty=document.createElement('div');empty.className='automationTaskEmpty';empty.style.cssText='padding:14px 10px;text-align:center;color:#7890a2;font-size:11px;line-height:1.6';empty.textContent='لا توجد مهام منشورة لهذا اليوم حسب توزيع المنهج والجدول.';panel.appendChild(empty);return true}
    for(const task of tasks){
      const done=task.completed||evidenceStatus(state,task.id)==='completed';
      const button=document.createElement('button');button.type='button';button.className=`taskItem automationTask ${done?'done':''}`;button.dataset.homeworkId=String(task.id||'');button.dataset.planned=task.planned?'true':'false';
      const circle=document.createElement('span');circle.className='taskCircle';circle.textContent=done?'✓':'';
      const text=document.createElement('div');text.className='taskText';const title=document.createElement('b');title.textContent=task.title||'مهمة اليوم';const sub=document.createElement('span');sub.textContent=taskSubtitle(task);text.append(title,sub);button.append(circle,text);
      button.addEventListener('click',()=>void completeTask(button,task,state));panel.appendChild(button);
    }
    panel.dataset.automationDate=String(preview.localDate||'');return true;
  }

  function latestAcademicFor(state,targetIds){
    if(!state||!targetIds.size)return null;
    for(const assessment of state.assessments||[]){for(const item of assessment.academic||[]){if(targetIds.has(String(item.targetId)))return item}}
    return null;
  }

  function subjectContextLines(title,preview,state){
    const key=subjectMap[title],content=key?preview.content?.[key]:null;if(!key||!content)return [];
    const tasks=mergedTodayTasks(preview,state).filter(task=>(task.subjectKey||keyForSubject(task.subject))===key||(key==='spelling'&&keyForSubject(task.subject)==='handwriting'));
    const targetIds=new Set((preview.homework||[]).filter(task=>(task.subjectKey||keyForSubject(task.subject))===key).flatMap(task=>Array.isArray(task.targetIds)?task.targetIds:[]).map(String));
    const lines=[];
    const unit=content.unit||content.surah||'';const lesson=content.lesson||content.weekly||'';const skill=content.skill||'';
    if(unit||lesson)lines.push(`خطة هذا الأسبوع: ${[unit,lesson].filter(Boolean).join(' — ')}`);
    if(skill)lines.push(`المهارة: ${skill}`);
    for(const task of tasks){const kind=task.taskType==='quran_memorization'?'حفظ':task.taskType==='quran_review'?'مراجعة / تسميع':'واجب / تدريب';lines.push(`تكليف اليوم (${kind}): ${task.title}${task.instructions?` — ${task.instructions}`:''}`)}
    if(state){const assessment=latestAcademicFor(state,targetIds);lines.push(`تقييم المعلم: ${assessment?academicLabels[assessment.result]||'مسجل':'لم يُقيّم بعد'}`)}
    return lines;
  }

  function enhanceSubjectModals(preview,state){
    document.querySelectorAll('.studentPatchModal').forEach(modal=>{
      const title=modal.querySelector('h3')?.textContent?.trim()||'';if(!subjectMap[title])return;
      const signature=`${preview.localDate}|${preview.week}|${title}|${evidenceStatus(state,(preview.homework||[]).find(x=>(x.subjectKey||keyForSubject(x.subject))===subjectMap[title])?.id)}`;
      if(modal.dataset.automationSignature===signature)return;modal.dataset.automationSignature=signature;
      const lines=subjectContextLines(title,preview,state);if(!lines.length)return;
      let rows=modal.querySelector('.studentPatchRows');if(!rows){rows=document.createElement('div');rows.className='studentPatchRows';modal.querySelector('section')?.appendChild(rows)}
      rows.querySelectorAll('.studentAutomationSubjectContext').forEach(node=>node.remove());
      rows.querySelectorAll('article').forEach(article=>{const text=(article.textContent||'').trim();if(text==='لم ينشر المعلم مهارة أو واجبًا لهذه المادة لهذا الأسبوع بعد.'||text==='لا توجد بيانات مسجلة حتى الآن.')article.remove()});
      for(const line of lines){const article=document.createElement('article');article.className='studentAutomationSubjectContext';article.textContent=line;rows.appendChild(article)}
    });
  }

  async function refresh(){
    let preview;try{preview=await fetchPreview()}catch(error){console.warn('student automation preview',error);return}
    const id=studentId();let state=null;if(id){try{state=await fetchState(id)}catch(error){console.warn('student automation state',error)}}
    latest={preview,state};renderTodayTasks(preview,state);enhanceSubjectModals(preview,state);
    setTimeout(()=>{renderTodayTasks(preview,state);enhanceSubjectModals(preview,state)},380);
  }

  const observer=new MutationObserver(()=>{if(latest)requestAnimationFrame(()=>enhanceSubjectModals(latest.preview,latest.state))});
  const start=()=>{observer.observe(document.body,{childList:true,subtree:true});void refresh();setTimeout(()=>void refresh(),700);window.addEventListener('focus',refresh);document.addEventListener('visibilitychange',()=>{if(!document.hidden)void refresh()})};
  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',start,{once:true});else start();
})();
