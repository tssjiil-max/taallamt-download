import {effectiveAssessmentGroup} from '/assessment-group-policy.js';

(()=>{
  const STUDENTS=[
    'أحمد بسام صالح الأحمد','أسامه سلطان بن بخت الصاعدي','أمير نايف عبدالله الحجلي','أنس احمد عبدالله الجهني','أوس نايف بن حمد الشريف','أويس عادل فيصل المالكي','تميم ماجد جابر الحجلي','ثامر عبدالله رجاء العوفي','راكان حاتم مهل الجهني','ريان محمود - باري','سلطان فهد زعل الجهني','شامخ بدر لافي الجهني','عادل غالب عبدالله العنزي','عبدالجليل سالم محمود عبدالجليل','عبدالرحمن نواف هندي الحازمي','عمر حميد بن سليم العروي','فيصل محمد عويض المطيري','قصي عبدالله ظاهر الحجلي','كنان محمد عبدالعزيز اليوسفي','محمد سماح سعد البوق','محمد صالح حمد عواد','موسى رياض صالح الأحمد','نايف احمد صويدر الجهني','نواف مطلق صالح العمري','وائل محمد حسين روزي','وسام سلطان عبيد السناني','يمان احمد بن عايد الجهني','يوسف فلاح خلف الحربي','يوسف محمد لافي الجهني'
  ];

  const roster=STUDENTS.map((name,index)=>({id:`s2-4-${String(index+1).padStart(2,'0')}`,number:index+1,name,grade:'الثاني',className:'4'}));
  try{localStorage.setItem('taallamtStudentRoster',JSON.stringify(roster));}catch{}

  const esc=(s)=>String(s).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
  const apiGet=async student=>{const response=await fetch(`/api/student-state?studentId=${encodeURIComponent(student.id)}`,{cache:'no-store'});const data=await response.json();if(!response.ok||!data.ok)throw new Error(data.error||`HTTP_${response.status}`);return {...data,student:{...student,...data.student}};};

  function setTeacherCount(){
    if(location.pathname.startsWith('/student'))return;
    document.querySelectorAll('.teacherStat').forEach(card=>{if(card.querySelector('b')?.textContent?.trim()==='عدد الطلاب'){const value=card.querySelector('strong');if(value)value.textContent=String(roster.length);}});
  }

  function selectStudent(student){
    try{localStorage.setItem('studentProfile',JSON.stringify(student));localStorage.setItem('studentName',student.name);localStorage.setItem('activeStudentId',student.id);}catch{}
    location.href=`/student?studentId=${encodeURIComponent(student.id)}`;
  }

  async function assessmentGroups(){
    const settled=await Promise.allSettled(roster.map(apiGet));
    const states=settled.filter(item=>item.status==='fulfilled').map(item=>item.value);
    const stateById=new Map(states.map(state=>[state.student.id,state]));
    const groups={followup:[],focused:[]};
    roster.forEach(student=>{
      const state=stateById.get(student.id);
      if(!state){groups.followup.push({student,state:null});return;}
      const group=effectiveAssessmentGroup(state.profile||{},state.assessments||[],state.needsFollowupCount);
      groups[group].push({student,state});
    });
    try{
      sessionStorage.setItem('taallamtAssessmentGroupIds:followup',JSON.stringify(groups.followup.map(x=>x.student.id)));
      sessionStorage.setItem('taallamtAssessmentGroupIds:focused',JSON.stringify(groups.focused.map(x=>x.student.id)));
    }catch{}
    return groups;
  }

  function renderAssessmentChooser(root){
    const signature='assessment-home';
    if(root.dataset.teacherStudentsPatch===signature&&root.querySelector(`[data-patch-signature="${signature}"]`))return;
    root.dataset.teacherStudentsPatch=signature;
    root.innerHTML=`
      <main class="teacherStudentsScreen" dir="rtl" data-patch-signature="${signature}">
        <header class="teacherStudentsHeader"><button class="teacherStudentsBack" type="button" aria-label="العودة">‹</button><div><h1>التقييم السريع</h1><p>اختر مجموعة الطلاب</p></div></header>
        <section class="teacherStudentsList teacherAssessmentGroups">
          <button class="teacherAssessmentGroupCard" type="button" data-assessment-group="followup"><span class="teacherStudentNumber">1</span><span class="teacherStudentName"><b>المتابعة</b><small>التقييم السريع للطلاب المعتادين · <strong data-group-count="followup">...</strong></small></span><span class="teacherStudentChevron">‹</span></button>
          <button class="teacherAssessmentGroupCard" type="button" data-assessment-group="focused"><span class="teacherStudentNumber">2</span><span class="teacherStudentName"><b>المتابعة المركزة</b><small>النقل اليدوي أو بعد أكثر من 3 مرات «يحتاج متابعة» · <strong data-group-count="focused">...</strong></small></span><span class="teacherStudentChevron">‹</span></button>
        </section>
        <div class="teacherAssessmentLoading" data-assessment-loading>جارٍ تحديث المجموعتين...</div>
      </main>`;
    root.querySelector('.teacherStudentsBack')?.addEventListener('click',()=>{location.href='/teacher';});
    root.querySelectorAll('[data-assessment-group]').forEach(btn=>btn.addEventListener('click',()=>{location.href=`/teacher/students?action=assessment&group=${encodeURIComponent(btn.dataset.assessmentGroup)}`;}));
    assessmentGroups().then(groups=>{
      const follow=root.querySelector('[data-group-count="followup"]'),focused=root.querySelector('[data-group-count="focused"]');
      if(follow)follow.textContent=`${groups.followup.length} طالب`;
      if(focused)focused.textContent=`${groups.focused.length} طالب`;
      root.querySelector('[data-assessment-loading]')?.remove();
    }).catch(()=>{const loading=root.querySelector('[data-assessment-loading]');if(loading)loading.textContent='تعذر تحديث المجموعتين الآن.';});
  }

  function renderAssessmentGroup(root,group){
    const safe=group==='focused'?'focused':'followup';
    const signature=`assessment-${safe}`;
    if(root.dataset.teacherStudentsPatch===signature&&root.querySelector(`[data-patch-signature="${signature}"]`))return;
    root.dataset.teacherStudentsPatch=signature;
    const groupTitle=safe==='focused'?'المتابعة المركزة':'المتابعة';
    root.innerHTML=`
      <main class="teacherStudentsScreen" dir="rtl" data-patch-signature="${signature}">
        <header class="teacherStudentsHeader"><button class="teacherStudentsBack" type="button" aria-label="العودة">‹</button><div><h1>التقييم السريع</h1><p>${groupTitle}</p></div></header>
        <div class="teacherAssessmentLoading" data-assessment-loading>جارٍ تحميل الطلاب...</div>
        <section class="teacherStudentsList" data-assessment-list></section>
      </main>`;
    root.querySelector('.teacherStudentsBack')?.addEventListener('click',()=>{location.href='/teacher/students?action=assessment';});
    assessmentGroups().then(groups=>{
      const list=root.querySelector('[data-assessment-list]'),loading=root.querySelector('[data-assessment-loading]');
      if(!list)return;
      const rows=groups[safe];
      if(!rows.length){list.innerHTML='<div class="teacherAssessmentEmpty">لا يوجد طلاب في هذه المجموعة حاليًا.</div>';}
      else{
        list.innerHTML=rows.map(({student,state})=>{
          const count=Number(state?.needsFollowupCount)||0;
          const manual=state?.profile?.assessmentGroup==='focused';
          const detail=safe==='focused'?(count>=4?`${count} مرات «يحتاج متابعة»`:manual?'منقول يدويًا للمتابعة المركزة':'متابعة مركزة'):(count?`${count} مرات «يحتاج متابعة»`:'جاهز للتقييم السريع');
          return `<button class="teacherAssessmentStudentRow" type="button" data-student-id="${student.id}"><span class="teacherStudentNumber">${student.number}</span><span class="teacherStudentName">${esc(student.name)}<small>${esc(detail)}</small></span><span class="teacherStudentChevron">‹</span></button>`;
        }).join('');
        list.querySelectorAll('[data-student-id]').forEach(row=>row.addEventListener('click',()=>{location.href=`/teacher/student/${encodeURIComponent(row.dataset.studentId)}?tab=assessment&group=${safe}`;}));
      }
      loading?.remove();
    }).catch(()=>{const loading=root.querySelector('[data-assessment-loading]');if(loading)loading.textContent='تعذر تحميل الطلاب الآن.';});
  }

  function renderStandardList(root){
    const signature='students-standard';
    if(root.dataset.teacherStudentsPatch===signature&&root.querySelector(`[data-patch-signature="${signature}"]`))return;
    root.dataset.teacherStudentsPatch=signature;
    root.innerHTML=`
      <main class="teacherStudentsScreen" dir="rtl" data-patch-signature="${signature}">
        <header class="teacherStudentsHeader"><button class="teacherStudentsBack" type="button" aria-label="العودة لصفحة المعلم">‹</button><div><h1>الطلاب</h1><p>الصف الثاني / 4 · <b>${roster.length}</b> طالبًا</p></div></header>
        <section class="teacherStudentsTools"><input id="teacherStudentSearch" type="search" inputmode="search" placeholder="ابحث عن طالب..." autocomplete="off"/><span class="teacherStudentsCount">الكل (${roster.length})</span></section>
        <section class="teacherStudentsList" id="teacherStudentsList" aria-label="قائمة الطلاب">${roster.map(s=>`<button class="teacherStudentRow" type="button" data-student-id="${s.id}"><span class="teacherStudentNumber">${s.number}</span><span class="teacherStudentName">${esc(s.name)}</span><span class="teacherStudentChevron">‹</span></button>`).join('')}</section>
      </main>`;
    root.querySelector('.teacherStudentsBack')?.addEventListener('click',()=>{location.href='/teacher';});
    root.querySelectorAll('.teacherStudentRow').forEach(row=>row.addEventListener('click',()=>{const student=roster.find(s=>s.id===row.dataset.studentId);if(student)selectStudent(student);}));
    const search=root.querySelector('#teacherStudentSearch');
    search?.addEventListener('input',()=>{const q=search.value.trim().toLowerCase();root.querySelectorAll('.teacherStudentRow').forEach(row=>{const name=row.querySelector('.teacherStudentName')?.textContent?.toLowerCase()||'';row.hidden=!!q&&!name.includes(q);});});
  }

  function renderList(){
    if(location.pathname!=='/teacher/students')return;
    const root=document.getElementById('root');if(!root)return;
    const params=new URLSearchParams(location.search);
    if(params.get('action')==='assessment'){
      const group=params.get('group');
      if(group==='followup'||group==='focused')renderAssessmentGroup(root,group);else renderAssessmentChooser(root);
      return;
    }
    renderStandardList(root);
  }

  document.addEventListener('click',(event)=>{if(location.pathname.startsWith('/student')||location.pathname==='/teacher/students')return;const btn=event.target.closest?.('.teacher .tQuick button');if(!btn)return;const title=btn.querySelector('b')?.textContent?.trim();if(title!=='الطلاب')return;event.preventDefault();event.stopPropagation();event.stopImmediatePropagation();location.href='/teacher/students';},true);

  const run=()=>{setTeacherCount();renderList();};
  run();
  const root=document.getElementById('root');if(root)new MutationObserver(run).observe(root,{childList:true,subtree:true});
  window.addEventListener('popstate',run);
})();
