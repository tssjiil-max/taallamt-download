(()=>{
  if(!location.pathname.startsWith('/student'))return;

  const studentId=()=>new URLSearchParams(location.search).get('studentId')||(()=>{
    try{return JSON.parse(localStorage.getItem('studentProfile')||'{}')?.id||localStorage.getItem('activeStudentId')||''}
    catch{return localStorage.getItem('activeStudentId')||''}
  })();

  const riyadhDate=value=>{
    try{return new Intl.DateTimeFormat('en-CA',{timeZone:'Asia/Riyadh',year:'numeric',month:'2-digit',day:'2-digit'}).format(value instanceof Date?value:new Date(value))}
    catch{return''}
  };
  const todayKey=()=>riyadhDate(new Date());
  const assessmentIsToday=assessment=>{
    const raw=assessment?.enteredAt||assessment?.createdAt||assessment?.sessionDate||'';
    if(!raw)return false;
    return /^\d{4}-\d{2}-\d{2}$/.test(String(raw))?String(raw)===todayKey():riyadhDate(raw)===todayKey();
  };

  function installStyle(){
    if(document.getElementById('student-teacher-evaluation-style'))return;
    const style=document.createElement('style');style.id='student-teacher-evaluation-style';style.textContent=`
      .studentTeacherEvaluation{display:grid;gap:5px;max-height:198px;overflow:auto;padding-inline:1px;scrollbar-width:thin}
      .studentTeacherEvaluation> b{font-size:9px;color:#2c6c94;margin-top:2px}
      .studentTeacherEvalRow{display:grid;grid-template-columns:minmax(0,1fr) auto;gap:6px;align-items:center;min-height:30px;padding:5px 7px;border-radius:9px;background:#f8fbff;border:1px solid #e7eff7}
      .studentTeacherEvalRow b{font-size:9.5px;color:#315e7f;line-height:1.25;min-width:0;white-space:normal}
      .studentTeacherEvalStatus{font-size:8px;font-weight:900;border-radius:999px;padding:4px 6px;white-space:nowrap;background:#eef3f7;color:#6c7d8d}
      .studentTeacherEvalStatus.mastered,.studentTeacherEvalStatus.distinguished{background:#e7f8ef;color:#1c7b50}
      .studentTeacherEvalStatus.needs_practice,.studentTeacherEvalStatus.consistent{background:#fff5d9;color:#8b6815}
      .studentTeacherEvalStatus.needs_followup{background:#fff0f0;color:#a64646}
    `;document.head.appendChild(style);
  }

  async function fetchState(){
    const id=studentId();if(!id)return null;
    try{
      const response=await fetch(`/api/student-state?studentId=${encodeURIComponent(id)}`,{cache:'no-store'});
      const data=await response.json();
      return response.ok&&data?.ok?data:null;
    }catch{return null}
  }

  function todayAcademicMap(state){
    const map=new Map();
    for(const assessment of (state?.assessments||[]).filter(assessmentIsToday)){
      for(const item of assessment?.academic||[]){
        if(item?.targetId&&!map.has(item.targetId))map.set(item.targetId,item);
      }
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

  function evalRow(title,value,code){
    const row=document.createElement('div');row.className='studentTeacherEvalRow';
    const label=document.createElement('b');label.textContent=title;
    const status=document.createElement('span');status.className=`studentTeacherEvalStatus ${code||''}`;status.textContent=String(value);
    row.append(label,status);return row;
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
    body.appendChild(evalRow('أتقن',mastered,'mastered'));
    body.appendChild(evalRow('يحتاج تدريب',needsPractice,'needs_practice'));

    const behavior=state?todayBehaviorCounts(state):{distinguished:0,consistent:0,needs_followup:0};
    const behaviorTitle=document.createElement('b');behaviorTitle.textContent='السلوك العام';body.appendChild(behaviorTitle);
    body.appendChild(evalRow('متميز',behavior.distinguished,'distinguished'));
    body.appendChild(evalRow('مستمر',behavior.consistent,'consistent'));
    body.appendChild(evalRow('يحتاج متابعة',behavior.needs_followup,'needs_followup'));

    panel.replaceChildren(heading,body);
  }

  async function apply(){
    const student=document.querySelector('.student');if(!student)return false;
    const day=student.querySelector('.studentDay');if(!day)return false;
    const panels=[...day.querySelectorAll('.dayPanel')];
    const taskPanel=panels.find(panel=>{
      const text=panel.querySelector('h3')?.textContent||'';
      return text.includes('الواجبات اليومية')||text.includes('مهامي اليوم');
    });
    const evaluationPanel=panels.find(panel=>{
      const text=panel.querySelector('h3')?.textContent||'';
      return text.includes('تقييمي اليوم')||text.includes('هذا الأسبوع')||text.includes('خطتي لهذا الأسبوع');
    })||panels.find(panel=>panel!==taskPanel);
    if(!taskPanel||!evaluationPanel)return false;
    evaluationPanel.dataset.teacherEvaluation='true';
    installStyle();renderEvaluation(evaluationPanel,await fetchState());return true;
  }

  const boot=()=>{
    let attempts=0;
    const timer=setInterval(()=>{attempts++;apply().then(done=>{if(done||attempts>20)clearInterval(timer)});},120);
    setInterval(()=>void apply(),12000);
    window.addEventListener('focus',()=>void apply());
    document.addEventListener('visibilitychange',()=>{if(!document.hidden)void apply()});
  };
  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',boot,{once:true});else boot();
})();
