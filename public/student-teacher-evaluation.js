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
    try{const response=await fetch(`/api/student-state?studentId=${encodeURIComponent(id)}`,{cache:'no-store'});const data=await response.json();return response.ok&&data?.ok?data:null}catch{return null}
  }

  function curriculumMap(state){return new Map((state?.curriculum||[]).map(target=>[String(target.id),target]));}
  const riyadhDate=value=>{try{return new Intl.DateTimeFormat('en-CA',{timeZone:'Asia/Riyadh',year:'numeric',month:'2-digit',day:'2-digit'}).format(value instanceof Date?value:new Date(value))}catch{return''}};
  const todayKey=()=>riyadhDate(new Date());
  const assessmentIsToday=assessment=>{
    const raw=assessment?.enteredAt||assessment?.createdAt||assessment?.sessionDate||'';
    if(!raw)return false;
    return /^\d{4}-\d{2}-\d{2}$/.test(String(raw))?String(raw)===todayKey():riyadhDate(raw)===todayKey();
  };
  function todayAcademicMap(state){
    const map=new Map();
    for(const assessment of (state?.assessments||[]).filter(assessmentIsToday)){
      for(const item of assessment?.academic||[]){if(item?.targetId&&!map.has(item.targetId))map.set(item.targetId,item);}
    }
    return map;
  }
  function todayBehaviorCounts(state){
    const counts={distinguished:0,consistent:0,needs_followup:0};
    for(const assessment of (state?.assessments||[]).filter(assessmentIsToday)){
      for(const item of assessment?.behavior||[]){
        if(item?.kind==='value')continue;
        if(Object.prototype.hasOwnProperty.call(counts,item?.code))counts[item.code]+=1;
      }
    }
    return counts;
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
    const heading=document.createElement('h3');heading.textContent='تقييمي اليوم';
    const body=document.createElement('div');body.className='studentTeacherEvaluation';

    const academic=state?todayAcademicMap(state):new Map();
    let mastered=0,needsPractice=0;
    for(const item of academic.values()){
      if(item?.result==='mastered')mastered+=1;
      else if(item?.result==='needs_practice'||item?.result==='not_mastered')needsPractice+=1;
    }
    const academicTitle=document.createElement('b');academicTitle.textContent='التقييم الأكاديمي';body.appendChild(academicTitle);
    body.appendChild(evalRow('أتقن','',String(mastered),'mastered'));
    body.appendChild(evalRow('يحتاج تدريب','',String(needsPractice),'needs_practice'));

    const behaviorTitle=document.createElement('b');behaviorTitle.textContent='السلوك العام';body.appendChild(behaviorTitle);
    const behavior=state?todayBehaviorCounts(state):{distinguished:0,consistent:0,needs_followup:0};
    body.appendChild(evalRow('متميز','',String(behavior.distinguished),'distinguished'));
    body.appendChild(evalRow('مستمر','',String(behavior.consistent),'consistent'));
    body.appendChild(evalRow('يحتاج متابعة','',String(behavior.needs_followup),'needs_followup'));

    panel.replaceChildren(heading,body);
  }

  async function apply(){
    const student=document.querySelector('.student');if(!student)return false;
    const day=student.querySelector('.studentDay');if(!day)return false;
    const panels=[...day.querySelectorAll('.dayPanel')];
    const taskPanel=panels.find(panel=>{const text=panel.querySelector('h3')?.textContent||'';return text.includes('الواجبات اليومية')||text.includes('مهامي اليوم')});
    const evaluationPanel=panels.find(panel=>{const text=panel.querySelector('h3')?.textContent||'';return text.includes('تقييمي اليوم')||text.includes('هذا الأسبوع')||text.includes('خطتي لهذا الأسبوع')})||panels.find(panel=>panel!==taskPanel);
    if(!taskPanel||!evaluationPanel)return false;
    evaluationPanel.dataset.teacherEvaluation='true';installStyle();renderEvaluation(evaluationPanel,await fetchState());return true;
  }

  const boot=()=>{let attempts=0;const timer=setInterval(()=>{attempts++;apply().then(done=>{if(done||attempts>20)clearInterval(timer)});},120);setInterval(()=>void apply(),12000);window.addEventListener('focus',()=>void apply());document.addEventListener('visibilitychange',()=>{if(!document.hidden)void apply()});};
  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',boot,{once:true});else boot();
})();
