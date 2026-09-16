(()=>{
  const STUDENTS=[
    'أحمد بسام صالح الأحمد','أسامه سلطان بن بخت الصاعدي','أمير نايف عبدالله الحجلي','أنس احمد عبدالله الجهني','أوس نايف بن حمد الشريف','أويس عادل فيصل المالكي','تميم ماجد جابر الحجلي','ثامر عبدالله رجاء العوفي','راكان حاتم مهل الجهني','ريان محمود - باري','سلطان فهد زعل الجهني','شامخ بدر لافي الجهني','عادل غالب عبدالله العنزي','عبدالجليل سالم محمود عبدالجليل','عبدالرحمن نواف هندي الحازمي','عمر حميد بن سليم العروي','فيصل محمد عويض المطيري','قصي عبدالله ظاهر الحجلي','كنان محمد عبدالعزيز اليوسفي','محمد سماح سعد البوق','محمد صالح حمد عواد','موسى رياض صالح الأحمد','نايف احمد صويدر الجهني','نواف مطلق صالح العمري','وائل محمد حسين روزي','وسام سلطان عبيد السناني','يمان احمد بن عايد الجهني','يوسف فلاح خلف الحربي','يوسف محمد لافي الجهني'
  ].map((name,index)=>({id:`s2-4-${String(index+1).padStart(2,'0')}`,number:index+1,name}));

  const SUBJECT_TARGETS=['subject:arabic','subject:quran','subject:islamic','subject:spelling_handwriting'];
  const esc=(value)=>String(value).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
  const findStudent=(id)=>STUDENTS.find(s=>s.id===id)||null;
  const detailMatch=()=>location.pathname.match(/^\/teacher\/student\/(s2-4-\d{2})\/?$/);
  const actionToTab=(action)=>({assessment:'assessment',followup:'followup',behavior:'behavior',homework:'homework',communication:'homework'}[action]||null);
  const query=()=>new URLSearchParams(location.search);

  function remember(student){try{localStorage.setItem('teacherActiveStudent',JSON.stringify(student));}catch{}}

  function interceptStudentRow(event){
    if(location.pathname!=='/teacher/students')return;
    const row=event.target.closest?.('.teacherStudentRow');if(!row)return;
    const n=Number(row.querySelector('.teacherStudentNumber')?.textContent?.trim()),student=STUDENTS[n-1];if(!student)return;
    event.preventDefault();event.stopPropagation();event.stopImmediatePropagation();remember(student);
    const source=query(),target=new URLSearchParams(),tab=actionToTab(source.get('action'));if(tab)target.set('tab',tab);
    ['subject','mode','filter','group'].forEach(key=>{const value=source.get(key);if(value)target.set(key,value);});
    location.href=`/teacher/student/${student.id}${target.toString()?`?${target}`:''}`;
  }

  function renderTeacherStudent(){
    const match=detailMatch();if(!match)return;
    const student=findStudent(match[1]);if(!student)return;remember(student);
    const root=document.getElementById('root');if(!root)return;
    root.innerHTML=`
      <main class="teacherStudentAdmin" dir="rtl">
        <header class="tsaHeader"><button class="tsaBack" type="button" aria-label="العودة إلى قائمة الطلاب">‹</button><div><h1>ملف الطالب</h1><p>إدارة الطالب من صفحة المعلم</p></div></header>
        <section class="tsaStudentCard"><div class="tsaAvatar">${student.number}</div><div><h2>${esc(student.name)}</h2><p>الصف الثاني / 4</p></div><span class="tsaTeacherBadge">للمعلم فقط</span></section>
        <nav class="tsaTabs" aria-label="إدارة الطالب"><button class="active" data-tab="assessment">التقييم</button><button data-tab="followup">المتابعة</button><button data-tab="behavior">السلوك والتحفيز</button><button data-tab="homework">الواجب والتواصل</button></nav>
        <section class="tsaPanel" data-panel="assessment">
          <div class="tsaPanelTitle"><div><h3>التقييم السريع</h3><p id="tsaGroupLabel">تقييم سريع للمواد والسلوك</p></div><button type="button" id="tsaEvaluateAll">أتقن الكل</button></div>
          <div class="tsaGroupControl"><span id="tsaGroupStatus">جارٍ تحديد المجموعة...</span><button type="button" id="tsaGroupToggle" hidden></button></div>
          ${['لغتي','القرآن الكريم','الدراسات الإسلامية','الإملاء والخط'].map((subject,i)=>`<article class="tsaSubjectRow" data-subject="${i}"><b>${subject}</b><div class="tsaChoices"><button type="button" data-value="mastered">أتقن</button><button type="button" data-value="needs_practice">يحتاج تدريب</button></div></article>`).join('')}
          <article class="tsaSubjectRow tsaBehaviorRow"><b>السلوك</b><div class="tsaChoices"><button type="button" data-value="distinguished">متميز ⭐</button><button type="button" data-value="consistent">مستمر</button><button type="button" data-value="needs_followup">يحتاج متابعة</button></div></article>
          <div class="tsaDraftNote">كل اختيار يُحفظ مباشرة ويظهر في صفحة الطالب · عند اكتمال التقييم تنتقل للطالب التالي في نفس المجموعة.</div>
        </section>
        <section class="tsaPanel" data-panel="followup" hidden><h3>المتابعة اليومية</h3><div class="tsaActionGrid"><button type="button">إضافة للمتابعة اليومية</button><button type="button">إعادة تقييم</button><button type="button">خطة علاجية</button><button type="button">ملاحظة للطالب</button></div></section>
        <section class="tsaPanel" data-panel="behavior" hidden><h3>السلوك والتحفيز</h3><div class="tsaActionGrid"><button type="button">متميز ⭐</button><button type="button">مستمر</button><button type="button">يحتاج متابعة</button><button type="button">إضافة نجمة</button></div></section>
        <section class="tsaPanel" data-panel="homework" hidden><h3>الواجب والتواصل</h3><div class="tsaActionGrid"><button type="button">إرسال واجب</button><button type="button">إرسال تدريب منزلي</button><button type="button">رسالة لولي الأمر</button><button type="button">عرض سجل التواصل</button></div></section>
      </main>`;

    const selectTab=(tab)=>{const safe=['assessment','followup','behavior','homework'].includes(tab)?tab:'assessment';root.querySelectorAll('.tsaTabs button').forEach(button=>button.classList.toggle('active',button.dataset.tab===safe));root.querySelectorAll('.tsaPanel').forEach(panel=>{panel.hidden=panel.dataset.panel!==safe;});};
    const fetchState=async()=>{const response=await fetch(`/api/student-state?studentId=${encodeURIComponent(student.id)}`,{cache:'no-store'});const data=await response.json().catch(()=>({}));if(!response.ok||!data.ok)throw new Error(data.error||`HTTP_${response.status}`);return data;};
    const saveState=async(payload)=>{const response=await fetch('/api/student-state',{method:'POST',headers:{'content-type':'application/json'},body:JSON.stringify({studentId:student.id,...payload})});const data=await response.json().catch(()=>({}));if(!response.ok||!data.ok)throw new Error(data.error||`HTTP_${response.status}`);return data;};
    const params=query(),group=params.get('group');
    const groupLabel=root.querySelector('#tsaGroupLabel');if(groupLabel)groupLabel.textContent=group==='focused'?'المتابعة المركزة · تقييم سريع للمواد والسلوك':'المتابعة · تقييم سريع للمواد والسلوك';

    const nextInGroup=()=>{
      if(group!=='followup'&&group!=='focused')return null;
      try{const ids=JSON.parse(sessionStorage.getItem(`taallamtAssessmentGroupIds:${group}`)||'[]');const index=ids.indexOf(student.id);return index>=0?ids[index+1]||null:null;}catch{return null;}
    };
    const goNext=()=>{const next=nextInGroup();if(next)location.href=`/teacher/student/${encodeURIComponent(next)}?tab=assessment&group=${encodeURIComponent(group)}`;else if(group==='followup'||group==='focused')location.href=`/teacher/students?action=assessment&group=${encodeURIComponent(group)}`;};

    const refreshGroupControl=async()=>{
      const status=root.querySelector('#tsaGroupStatus'),toggle=root.querySelector('#tsaGroupToggle');if(!status||!toggle)return;
      try{
        const state=await fetchState(),count=Number(state.needsFollowupCount)||0,auto=count>=4,manual=state.profile?.assessmentGroup==='focused',focused=auto||manual;
        status.textContent=focused?(auto?`المتابعة المركزة تلقائيًا · ${count} مرات يحتاج متابعة`:'المتابعة المركزة · نقل يدوي'):`المتابعة · ${count?`${count} مرات يحتاج متابعة`:'بدون متابعة متكررة'}`;
        toggle.hidden=false;
        if(auto){toggle.disabled=true;toggle.textContent='مركزة تلقائيًا';toggle.dataset.target='focused';}
        else{toggle.disabled=false;toggle.textContent=focused?'إعادة للمتابعة':'نقل للمتابعة المركزة';toggle.dataset.target=focused?'followup':'focused';}
      }catch{status.textContent='تعذر تحديد المجموعة الآن';toggle.hidden=true;}
    };

    root.querySelector('.tsaBack')?.addEventListener('click',()=>{history.back();});
    root.querySelectorAll('.tsaTabs button').forEach(btn=>btn.addEventListener('click',()=>selectTab(btn.dataset.tab)));
    root.querySelector('#tsaGroupToggle')?.addEventListener('click',async event=>{
      const button=event.currentTarget,target=button.dataset.target;if(!['followup','focused'].includes(target))return;button.disabled=true;
      try{await saveState({action:'assessment_group',assessmentGroup:target});if(group==='followup'||group==='focused')goNext();else await refreshGroupControl();}catch{alert('تعذر تغيير مجموعة المتابعة. حاول مرة أخرى.');button.disabled=false;}
    });

    root.querySelectorAll('.tsaSubjectRow .tsaChoices button').forEach(btn=>btn.addEventListener('click',async()=>{
      const row=btn.closest('.tsaSubjectRow');if(!row)return;const buttons=[...row.querySelectorAll('.tsaChoices button')],previous=buttons.find(button=>button.classList.contains('selected'))||null;
      buttons.forEach(button=>button.classList.toggle('selected',button===btn));buttons.forEach(button=>{button.disabled=true;});
      try{if(row.classList.contains('tsaBehaviorRow'))await saveState({action:'behavior',code:btn.dataset.value});else{const targetId=SUBJECT_TARGETS[Number(row.dataset.subject)];if(!targetId)throw new Error('ASSESSMENT_TARGET_INVALID');await saveState({action:'assessment',academic:[{targetId,result:btn.dataset.value}]});}}
      catch{buttons.forEach(button=>button.classList.toggle('selected',button===previous));alert('تعذر حفظ التقييم. حاول مرة أخرى.');}
      finally{buttons.forEach(button=>{button.disabled=false;});}
    }));

    root.querySelector('#tsaEvaluateAll')?.addEventListener('click',async event=>{
      const allButton=event.currentTarget,academicRows=[...root.querySelectorAll('.tsaSubjectRow:not(.tsaBehaviorRow)')],behaviorRow=root.querySelector('.tsaBehaviorRow');
      const allRows=[...academicRows,behaviorRow].filter(Boolean),previous=allRows.map(row=>[...row.querySelectorAll('.tsaChoices button')].find(button=>button.classList.contains('selected'))||null);
      academicRows.forEach(row=>{const button=row.querySelector('button[data-value="mastered"]');row.querySelectorAll('.tsaChoices button').forEach(choice=>choice.classList.toggle('selected',choice===button));});
      if(behaviorRow){const distinguished=behaviorRow.querySelector('button[data-value="distinguished"]');behaviorRow.querySelectorAll('.tsaChoices button').forEach(choice=>choice.classList.toggle('selected',choice===distinguished));}
      allButton.disabled=true;allRows.forEach(row=>row.querySelectorAll('.tsaChoices button').forEach(button=>{button.disabled=true;}));
      try{const academic=academicRows.map(row=>({targetId:SUBJECT_TARGETS[Number(row.dataset.subject)],result:'mastered'})).filter(item=>item.targetId);await saveState({action:'quick_assessment',academic,behaviorCode:'distinguished'});goNext();}
      catch{allRows.forEach((row,index)=>row.querySelectorAll('.tsaChoices button').forEach(button=>button.classList.toggle('selected',button===previous[index])));alert('تعذر حفظ التقييم السريع. حاول مرة أخرى.');}
      finally{allButton.disabled=false;allRows.forEach(row=>row.querySelectorAll('.tsaChoices button').forEach(button=>{button.disabled=false;}));}
    });

    let touchX=null;root.addEventListener('touchstart',e=>{touchX=e.changedTouches?.[0]?.clientX??null;},{passive:true});root.addEventListener('touchend',e=>{if(touchX===null)return;const dx=(e.changedTouches?.[0]?.clientX??touchX)-touchX;touchX=null;if(dx<70)return;const next=nextInGroup();if(next)location.href=`/teacher/student/${encodeURIComponent(next)}?tab=assessment&group=${encodeURIComponent(group)}`;},{passive:true});
    selectTab(params.get('tab')||'assessment');refreshGroupControl();
    const subject=params.get('subject');if(subject)requestAnimationFrame(()=>{const row=[...root.querySelectorAll('.tsaSubjectRow')].find(item=>item.querySelector('b')?.textContent?.trim()===subject);row?.scrollIntoView({behavior:'smooth',block:'center'});});
  }

  document.addEventListener('click',interceptStudentRow,true);
  const boot=()=>{if(detailMatch())requestAnimationFrame(()=>requestAnimationFrame(renderTeacherStudent));};
  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',boot,{once:true});else boot();
})();
