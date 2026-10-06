(()=>{
  if(!location.pathname.startsWith('/student'))return;

  const SUBJECT_ASSETS={
    // «لغتي» has ONE final source: this entry. student-style-patch.js and student-shakabumbo-icons.js must not set it.
    'لغتي':'/shakabumbo-icons/03_lughati.svg?v=20261005a',
    'الإملاء والخط':'/shakabumbo-icons/04_imlaa_khatt.svg',
    'القرآن الكريم':'/shakabumbo-icons/05_quran.svg',
    'الدراسات الإسلامية':'/shakabumbo-icons/06_islamic_studies.svg'
  };
  const NAV_ASSET='/shakabumbo-icons/02_main_logo.svg';
  const REWARD_ASSET='/shakabumbo-icons/07_star_of_day.svg';

  function keepImage(img,src){
    if(!img)return;
    if(img.getAttribute('src')===src&&img.dataset.cleanSource===src)return;
    img.dataset.cleanSource=src;
    img.dataset.visualSafeSource=src;
    img.src=src;
    img.style.opacity='1';
    img.style.background='transparent';
  }


  const HOME_SUBJECTS=['لغتي','القرآن الكريم','الدراسات الإسلامية','الإملاء والخط'];
  const HOME_KEYS={'لغتي':['arabic'],'القرآن الكريم':['quran'],'الدراسات الإسلامية':['islamic'],'الإملاء والخط':['spelling','handwriting','spelling_handwriting']};
  const HOME_ICONS={'لغتي':'/shakabumbo-icons/03_lughati.svg','القرآن الكريم':'/shakabumbo-icons/05_quran.svg','الدراسات الإسلامية':'/shakabumbo-icons/06_islamic_studies.svg','الإملاء والخط':'/shakabumbo-icons/04_imlaa_khatt.svg'};
  let homeState=null,homeBusy=false;
  function homeStudentId(){try{return new URLSearchParams(location.search).get('studentId')||JSON.parse(localStorage.getItem('studentProfile')||'{}').id||localStorage.getItem('activeStudentId')||''}catch{return ''}}
  async function refreshHomeState(){const id=homeStudentId();if(!id||homeBusy)return;homeBusy=true;try{const r=await fetch('/api/student-state?studentId='+encodeURIComponent(id),{cache:'no-store'}),data=await r.json();if(r.ok&&data?.ok){homeState=data;renderHomeData()}}catch{}finally{homeBusy=false}}
  const homeEsc=value=>String(value??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
  function homeSubjectOf(item,state){const target=(state?.curriculum||[]).find(t=>t.id===item?.targetId);const value=String(target?.subject||item?.subject||item?.subjectKey||'');const id=String(item?.targetId||'');return HOME_SUBJECTS.find(name=>(HOME_KEYS[name]||[]).includes(value)||id===({'لغتي':'subject:arabic','القرآن الكريم':'subject:quran','الدراسات الإسلامية':'subject:islamic','الإملاء والخط':'subject:spelling_handwriting'}[name]))||null}
  function homeLatestAssessments(state){const result=new Map();const rows=[...(state?.assessments||[])].sort((a,b)=>String(b.enteredAt||b.createdAt||'').localeCompare(String(a.enteredAt||a.createdAt||'')));for(const assessment of rows)for(const item of assessment.academic||[]){const subject=homeSubjectOf(item,state);if(subject&&!result.has(subject))result.set(subject,item.result)}return result}
  function homeStatus(result){return result==='mastered'?['أتقن','good']:result==='needs_practice'?['يحتاج تدريب','warn']:result==='not_mastered'?['لم يتقن','bad']:['لم يتم التقييم بعد','']}
  function homeGrid(rows,mode){return '<div class="homeSubjectGrid '+mode+'">'+rows.map(row=>'<article class="homeSubjectItem"><img src="'+HOME_ICONS[row.subject]+'" alt=""/><b>'+homeEsc(row.subject)+'</b><span class="'+(row.tone||'')+'">'+homeEsc(row.value)+'</span></article>').join('')+'</div>'}
  function homeCard(section,title,desc,kind,icon){section.className='dayPanel homeDataCard '+kind;section.dataset.homeCard=kind;section.replaceChildren();const head=document.createElement('header');head.className='homeDataHeading';head.innerHTML='<div class="homeDataTitle"><h2>'+title+'</h2><p>'+desc+'</p></div><span class="homeDataIcon" aria-hidden="true">'+icon+'</span>';const body=document.createElement('div');body.className='homeDataContent';const button=document.createElement('button');button.type='button';button.className='homeDataAction';button.textContent='عرض التفاصيل';button.addEventListener('click',()=>{if(kind==='stars'){document.querySelector('.rewards')?.scrollIntoView({behavior:'smooth',block:'center'});return}const subject=kind==='homework'?homeState?.homework?.[0]?.subject:'لغتي';window.dispatchEvent(new CustomEvent('taallamt:student-panel',{detail:{panel:kind==='assessment'?'skills':'subject',subject}}))});section.append(head,body,button);return body}
  function installHomeLayout(student){if(student.dataset.referenceHome==='true')return;student.dataset.referenceHome='true';student.classList.add('studentHomeReference');const panels=[...student.querySelectorAll('.studentDay .dayPanel')];if(panels[0])panels[0].dataset.referenceSlot='weekly';if(panels[1])panels[1].dataset.referenceSlot='homework';student.querySelector('.studentProfile')?.setAttribute('data-reference-hidden','true');student.querySelector('.subjects')?.setAttribute('data-reference-hidden','true');const welcome=student.querySelector('.studentWelcome>div');if(welcome){const name=welcome.querySelector('b');if(name)name.textContent=name.textContent.replace(/^مرحبًا\s*/,'صباح الخير ');const grade=welcome.querySelector('span');if(grade)grade.textContent='الصف الثاني الابتدائي'}const nav=[...student.querySelectorAll('.studentNav>button')];if(nav.length>=5){nav[2].style.display='none';const stars=nav[3];stars.querySelector('b').textContent='النجوم';const starIcon=stars.querySelector('svg');if(starIcon){starIcon.setAttribute('fill','currentColor');starIcon.setAttribute('stroke','currentColor');starIcon.innerHTML='<path d="m12 2.8 2.75 5.6 6.18.9-4.47 4.35 1.06 6.15L12 16.9l-5.52 2.9 1.06-6.15L3.07 9.3l6.18-.9z"/>'}stars.onclick=()=>student.querySelector('.rewards')?.scrollIntoView({behavior:'smooth',block:'center'});}}
  function renderHomeData(){const student=document.querySelector('.student');if(!student)return;installHomeLayout(student);const state=homeState||{weeklyPlan:[],assessments:[],homework:[],homeworkEvidence:[],stars:0};const signature=JSON.stringify([state.weeklyPlan,state.assessments,state.homework,state.homeworkEvidence,state.stars]);if(student.dataset.homeSignature===signature)return;student.dataset.homeSignature=signature;const host=student.querySelector('.studentDay');let weekly=host.querySelector('[data-reference-slot="weekly"]'),homework=host.querySelector('[data-reference-slot="homework"]');if(!weekly||!homework)return;
    const plan=state.weeklyPlan||[];const weeklyBody=homeCard(weekly,'الخطة الأسبوعية','ماذا سندرس هذا الأسبوع؟','weekly','▦');if(plan.length){const items=HOME_SUBJECTS.map(subject=>{const selected=plan.filter(item=>(HOME_KEYS[subject]||[]).includes(String(item.subject||item.subjectKey||''))||String(item.subject||'')===subject);const units=selected.reduce((n,item)=>n+(Array.isArray(item.targetIds)?item.targetIds.length:0),0);return{subject,value:units?units+' مهارات':selected.length?selected.length+' موضوعات':'ضمن الخطة'}});weeklyBody.innerHTML=homeGrid(items,'plan')}else weeklyBody.innerHTML='<p class="homeEmpty">لم تُنشر الخطة الأسبوعية بعد</p>';
    let assessment=host.querySelector('[data-home-card="assessment"]');if(!assessment){assessment=document.createElement('section');weekly.after(assessment)}const assessmentBody=homeCard(assessment,'التقييم','آخر تقييم لمهاراتك','assessment','✓');const latest=homeLatestAssessments(state);assessmentBody.innerHTML=homeGrid(HOME_SUBJECTS.map(subject=>{const [value,tone]=homeStatus(latest.get(subject));return{subject,value,tone}}),'assessment');
    const ev=state.homeworkEvidence||[];const today=new Date().toLocaleDateString('en-CA',{timeZone:'Asia/Riyadh'});const tasks=(state.homework||[]).filter(item=>{const due=String(item.dueDate||item.dueAt||item.date||'').slice(0,10);return due===today||(!due&&item.publishStatus==='published')}).filter(item=>{const row=ev.find(x=>x.homeworkId===item.id);return !row||!['completed','done','submitted'].includes(String(row.status||'').toLowerCase())});const homeworkBody=homeCard(homework,'الواجبات','واجباتك لهذا اليوم','homework','✎');if(!tasks.length)homeworkBody.innerHTML='<p class="homeEmpty">لا يوجد واجب لليوم</p>';else{const item=tasks[0],row=ev.find(x=>x.homeworkId===item.id),status=['completed','done','submitted'].includes(String(row?.status||'').toLowerCase())?'تم الإنجاز':row?'قيد التنفيذ':'لم يبدأ';homeworkBody.innerHTML='<article class="homeHomeworkItem"><b>'+homeEsc(item.title||'واجب اليوم')+'</b><span>'+homeEsc(item.subject||'')+' · '+status+'</span></article>'+(tasks.length>1?'<p class="homeHomeworkCount">يوجد '+tasks.length+' واجبات لليوم</p>':'')}
    const reward=student.querySelector('.rewards');if(reward){const stars=Math.max(0,Math.min(30,Number(state.stars)||0));reward.dataset.referenceStars='true';reward.innerHTML='<header class="homeRewardHeading"><div><h2>النجوم</h2><p>إنجازاتك وتحفيزك</p></div><span aria-hidden="true">★</span></header><div class="homeRewardProgress"><b>'+stars+' من 30</b><div role="progressbar" aria-valuemin="0" aria-valuemax="30" aria-valuenow="'+stars+'"><i style="width:'+Math.round(stars/30*100)+'%"></i></div><span>'+(stars<30?'باقي '+(30-stars)+' نجمة':'وصلت إلى المكافأة!')+'</span></div><button class="homeDataAction" type="button">عرض التفاصيل</button>';reward.querySelector('button').addEventListener('click',()=>student.querySelector('.studentNav .mascotNav')?.click())}
  }

  function apply(){
    const student=document.querySelector('.student');
    if(!student)return;
    installHomeLayout(student);renderHomeData();

    student.querySelectorAll('.studentSubject').forEach(card=>{
      const subject=card.dataset.subjectName||'';
      const src=SUBJECT_ASSETS[subject];
      if(src)keepImage(card.querySelector('.studentSubjectMascot'),src);
    });

    keepImage(student.querySelector('.studentNavMascot'),NAV_ASSET);
    keepImage(student.querySelector('.rewardMascotImage')||student.querySelector('.rewardMascot img'),REWARD_ASSET);
  }

  let queued=false;
  const schedule=()=>{
    if(queued)return;
    queued=true;
    requestAnimationFrame(()=>{queued=false;apply()});
  };

  const boot=()=>{
    apply();
    refreshHomeState();window.addEventListener('focus',refreshHomeState);window.addEventListener('student-state-updated',refreshHomeState);
    const root=document.getElementById('root');
    if(!root)return;
    new MutationObserver(schedule).observe(root,{childList:true,subtree:true,attributes:true,attributeFilter:['src','data-clean-source']});
  };

  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',boot,{once:true});else boot();
})();
