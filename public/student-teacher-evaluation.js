(()=>{
  if(!location.pathname.startsWith('/student'))return;

  const SUBJECT_NAMES={
    arabic:'لغتي',quran:'القرآن الكريم',islamic:'الدراسات الإسلامية',
    spelling:'الإملاء والخط',handwriting:'الإملاء والخط',spelling_handwriting:'الإملاء والخط'
  };
  const SUBJECT_TARGETS={
    arabic:'subject:arabic',quran:'subject:quran',islamic:'subject:islamic',
    spelling:'subject:spelling_handwriting',handwriting:'subject:spelling_handwriting',spelling_handwriting:'subject:spelling_handwriting'
  };
  const ACADEMIC_LABELS={mastered:'أتقن',needs_practice:'يحتاج تدريب',not_mastered:'لم يتقن'};
  const BEHAVIOR_LABELS={distinguished:'متميز ⭐',consistent:'مستمر',needs_followup:'يحتاج متابعة'};

  const studentId=()=>new URLSearchParams(location.search).get('studentId')||(()=>{try{return JSON.parse(localStorage.getItem('studentProfile')||'{}')?.id||localStorage.getItem('activeStudentId')||''}catch{return localStorage.getItem('activeStudentId')||''}})();
  const asArray=value=>Array.isArray(value)?value:value===undefined||value===null?[]:[value];
  const textValue=value=>{
    if(typeof value==='string')return value.trim();
    if(value&&typeof value==='object')return String(value.label||value.name||value.title||value.valueName||value.value||'').trim();
    return '';
  };
  const unique=list=>[...new Set(list.map(textValue).filter(Boolean))];
  const subjectKey=value=>{
    const raw=String(value||'').trim();
    if(SUBJECT_NAMES[raw])return raw;
    if(raw==='لغتي')return'arabic';if(raw==='القرآن الكريم')return'quran';if(raw==='الدراسات الإسلامية')return'islamic';if(raw==='الإملاء والخط')return'spelling_handwriting';
    return raw;
  };

  function installStyle(){
    if(document.getElementById('student-teacher-evaluation-style'))return;
    const style=document.createElement('style');style.id='student-teacher-evaluation-style';style.textContent=`
      .studentTeacherEvaluation{display:grid;gap:5px;max-height:198px;overflow:auto;padding-inline:1px;scrollbar-width:thin}
      .studentTeacherEvalRow{display:grid;grid-template-columns:minmax(0,1fr) auto;gap:6px;align-items:center;min-height:30px;padding:5px 7px;border-radius:9px;background:#f8fbff;border:1px solid #e7eff7}
      .studentTeacherEvalRow b{font-size:9.5px;color:#315e7f;line-height:1.25;min-width:0;white-space:normal}
      .studentTeacherEvalRow small{display:block;font-size:7.6px;color:#8191a2;margin-top:1px;font-weight:600}
      .studentTeacherEvalStatus{font-size:8px;font-weight:900;border-radius:999px;padding:4px 6px;white-space:nowrap;background:#eef3f7;color:#6c7d8d}
      .studentTeacherEvalStatus.mastered,.studentTeacherEvalStatus.distinguished{background:#e7f8ef;color:#1c7b50}
      .studentTeacherEvalStatus.needs_practice,.studentTeacherEvalStatus.consistent{background:#fff5d9;color:#8b6815}
      .studentTeacherEvalStatus.not_mastered,.studentTeacherEvalStatus.needs_followup{background:#fff0f0;color:#a64646}
      .studentTeacherEvalEmpty{font-size:9px;line-height:1.6;color:#71879a;text-align:center;padding:12px 7px;background:#f8fbff;border-radius:9px}
    `;document.head.appendChild(style);
  }

  async function fetchState(){
    const id=studentId();if(!id)return null;
    try{const response=await fetch(`/api/student-state?studentId=${encodeURIComponent(id)}&view=evaluation`,{cache:'no-store'});const data=await response.json();return response.ok&&data?.ok?data:null}catch{return null}
  }

  function curriculumMap(state){return new Map((state?.curriculum||[]).map(target=>[String(target.id),target]));}
  function latestAcademicMap(state){
    const map=new Map();
    for(const assessment of state?.assessments||[]){for(const item of assessment?.academic||[]){if(item?.targetId&&!map.has(item.targetId))map.set(item.targetId,item);}}
    return map;
  }
  function latestBehavior(state){
    for(const assessment of state?.assessments||[]){for(const item of assessment?.behavior||[]){if(item?.kind!=='value')return item;}}
    return null;
  }
  function latestValueMap(state){
    const map=new Map();
    for(const assessment of state?.assessments||[]){
      for(const item of assessment?.behavior||[]){
        if(item?.kind!=='value')continue;
        const name=String(item.valueName||item.name||item.title||'').trim();
        if(name&&!map.has(name))map.set(name,item);
      }
    }
    return map;
  }

  function valueNamesFromState(state){
    const fields=['valueNames','values','value','valueName','virtues','linkedValues','coreValues'];
    const values=[];
    for(const item of state?.weeklyPlan||[]){for(const field of fields)for(const value of asArray(item?.[field]))values.push(value);}
    const byId=curriculumMap(state);
    for(const item of state?.weeklyPlan||[]){for(const id of asArray(item?.targetIds)){const target=byId.get(String(id));if(!target)continue;for(const field of fields)for(const value of asArray(target?.[field]))values.push(value);}}
    const recorded=[...latestValueMap(state).keys()];
    return unique(values.length?values:recorded);
  }

  function currentDistributionTargets(state){
    const byId=curriculumMap(state),rows=[],seen=new Set();
    for(const plan of state?.weeklyPlan||[]){
      const key=subjectKey(plan?.subject),ids=asArray(plan?.targetIds).map(String).filter(Boolean);
      if(ids.length){
        for(const id of ids){if(seen.has(id))continue;seen.add(id);const target=byId.get(id)||{};const targetKey=subjectKey(target.subject||key);rows.push({targetId:id,subject:SUBJECT_NAMES[targetKey]||String(plan.subject||target.subject||'المادة'),title:String(target.title||target.skill||target.name||plan.lesson||plan.title||'مهارة الأسبوع')});}
      }else if(SUBJECT_TARGETS[key]){
        const id=SUBJECT_TARGETS[key];if(seen.has(id))continue;seen.add(id);rows.push({targetId:id,subject:SUBJECT_NAMES[key],title:String(plan.lesson||plan.title||plan.skill||'تقييم المادة حسب توزيع هذا الأسبوع')});
      }
    }
    return rows;
  }

  function statusChip(label,code){const span=document.createElement('span');span.className=`studentTeacherEvalStatus ${code||''}`;span.textContent=label;return span;}
  function evalRow(title,subtitle,label,code){
    const row=document.createElement('div');row.className='studentTeacherEvalRow';const copy=document.createElement('div');const b=document.createElement('b');b.textContent=title;copy.appendChild(b);if(subtitle){const small=document.createElement('small');small.textContent=subtitle;copy.appendChild(small)}row.append(copy,statusChip(label,code));return row;
  }

  function renderEvaluation(panel,state){
    const heading=document.createElement('h3');heading.textContent='تقييم المعلم';
    const body=document.createElement('div');body.className='studentTeacherEvaluation';
    if(!state){const empty=document.createElement('div');empty.className='studentTeacherEvalEmpty';empty.textContent=studentId()?'تعذر تحميل تقييم المعلم الآن.':'اختر الطالب لعرض تقييم المعلم.';body.appendChild(empty);panel.replaceChildren(heading,body);return;}

    const academic=latestAcademicMap(state),targets=currentDistributionTargets(state);
    if(!targets.length){const empty=document.createElement('div');empty.className='studentTeacherEvalEmpty';empty.textContent='لم تُنشر مهارات توزيع هذا الأسبوع بعد.';body.appendChild(empty);}
    for(const target of targets){const result=academic.get(target.targetId)?.result;body.appendChild(evalRow(target.subject,target.title,ACADEMIC_LABELS[result]||'لم يُقيّم بعد',result||''));}

    const behavior=latestBehavior(state);const behaviorCode=behavior?.code||'';body.appendChild(evalRow('السلوك','تقييم المعلم',BEHAVIOR_LABELS[behaviorCode]||behavior?.label||'لم يُقيّم بعد',behaviorCode));

    const valueMap=latestValueMap(state),values=valueNamesFromState(state);
    if(values.length){for(const valueName of values){const item=valueMap.get(valueName);const code=item?.code||'';body.appendChild(evalRow(`القيم: ${valueName}`,'حسب توزيع المنهج',BEHAVIOR_LABELS[code]||item?.label||'لم يُقيّم بعد',code));}}
    else body.appendChild(evalRow('القيم','لا توجد قيمة محددة في توزيع هذا الأسبوع','لم يُقيّم بعد',''));
    panel.replaceChildren(heading,body);
  }

  async function apply(){
    const student=document.querySelector('.student');if(!student)return false;
    const day=student.querySelector('.studentDay');if(!day)return false;
    const panels=[...day.querySelectorAll('.dayPanel')];
    const taskPanel=panels.find(panel=>(panel.querySelector('h3')?.textContent||'').includes('مهامي اليوم'));
    const weekPanel=panels.find(panel=>(panel.querySelector('h3')?.textContent||'').includes('هذا الأسبوع'))||panels.find(panel=>panel!==taskPanel&&panel.dataset.teacherEvaluation!=='true');
    if(!taskPanel||!weekPanel)return false;
    if(day.firstElementChild!==taskPanel)day.insertBefore(taskPanel,weekPanel);
    weekPanel.dataset.teacherEvaluation='true';installStyle();renderEvaluation(weekPanel,await fetchState());return true;
  }

  const boot=()=>{let attempts=0;const timer=setInterval(()=>{attempts++;apply().then(done=>{if(done||attempts>20)clearInterval(timer)});},120);};
  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',boot,{once:true});else boot();
})();
