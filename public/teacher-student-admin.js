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

  function remember(student){
    try{localStorage.setItem('teacherActiveStudent',JSON.stringify(student));}catch{}
  }

  function interceptStudentRow(event){
    if(location.pathname!=='/teacher/students')return;
    const row=event.target.closest?.('.teacherStudentRow');
    if(!row)return;
    const n=Number(row.querySelector('.teacherStudentNumber')?.textContent?.trim());
    const student=STUDENTS[n-1];
    if(!student)return;
    event.preventDefault();
    event.stopPropagation();
    event.stopImmediatePropagation();
    remember(student);
    const source=query();
    const target=new URLSearchParams();
    const tab=actionToTab(source.get('action'));
    if(tab)target.set('tab',tab);
    ['subject','mode','filter'].forEach(key=>{const value=source.get(key);if(value)target.set(key,value);});
    location.href=`/teacher/student/${student.id}${target.toString()?`?${target}`:''}`;
  }

  function renderTeacherStudent(){
    const match=detailMatch();
    if(!match)return;
    const student=findStudent(match[1]);
    if(!student)return;
    remember(student);
    const root=document.getElementById('root');
    if(!root)return;
    root.innerHTML=`
      <main class="teacherStudentAdmin" dir="rtl">
        <header class="tsaHeader">
          <button class="tsaBack" type="button" aria-label="العودة إلى قائمة الطلاب">‹</button>
          <div><h1>ملف الطالب</h1><p>إدارة الطالب من صفحة المعلم</p></div>
        </header>

        <section class="tsaStudentCard">
          <div class="tsaAvatar">${student.number}</div>
          <div><h2>${esc(student.name)}</h2><p>الصف الثاني / 4</p></div>
          <span class="tsaTeacherBadge">للمعلم فقط</span>
        </section>

        <nav class="tsaTabs" aria-label="إدارة الطالب">
          <button class="active" data-tab="assessment">التقييم</button>
          <button data-tab="followup">المتابعة</button>
          <button data-tab="behavior">السلوك والتحفيز</button>
          <button data-tab="homework">الواجب والتواصل</button>
        </nav>

        <section class="tsaPanel" data-panel="assessment">
          <div class="tsaPanelTitle"><div><h3>التقييم الشامل</h3><p id="tsaGroupLabel">تقييم سريع للمهارات والسلوك</p></div><button type="button" id="tsaEvaluateAll">تقييم الكل: أتقن</button></div>
          ${['لغتي','القرآن الكريم','الدراسات الإسلامية','الإملاء والخط'].map((subject,i)=>`
            <article class="tsaSubjectRow" data-subject="${i}">
              <b>${subject}</b>
              <div class="tsaChoices">
                <button type="button" data-value="mastered">أتقن</button>
                <button type="button" data-value="needs_practice">يحتاج تدريب</button>
              </div>
            </article>`).join('')}
          <article class="tsaSubjectRow tsaBehaviorRow"><b>السلوك</b><div class="tsaChoices"><button type="button" data-value="distinguished">متميز ⭐</button><button type="button" data-value="consistent">مستمر</button><button type="button" data-value="needs_followup">يحتاج متابعة</button></div></article><div class="tsaDraftNote">اسحب يمينًا للطالب التالي · أي اختيار هنا يُحفظ مباشرة في ملف الطالب.</div>
        </section>

        <section class="tsaPanel" data-panel="followup" hidden>
          <h3>المتابعة اليومية</h3>
          <div class="tsaActionGrid"><button type="button">إضافة للمتابعة اليومية</button><button type="button">إعادة تقييم</button><button type="button">خطة علاجية</button><button type="button">ملاحظة للطالب</button></div>
        </section>

        <section class="tsaPanel" data-panel="behavior" hidden>
          <h3>السلوك والتحفيز</h3>
          <div class="tsaActionGrid"><button type="button">متميز ⭐</button><button type="button">مستمر</button><button type="button">يحتاج متابعة</button><button type="button">إضافة نجمة</button></div>
        </section>

        <section class="tsaPanel" data-panel="homework" hidden>
          <h3>الواجب والتواصل</h3>
          <div class="tsaActionGrid"><button type="button">إرسال واجب</button><button type="button">إرسال تدريب منزلي</button><button type="button">رسالة لولي الأمر</button><button type="button">عرض سجل التواصل</button></div>
        </section>
      </main>`;

    const selectTab=(tab)=>{
      const safe=['assessment','followup','behavior','homework'].includes(tab)?tab:'assessment';
      root.querySelectorAll('.tsaTabs button').forEach(button=>button.classList.toggle('active',button.dataset.tab===safe));
      root.querySelectorAll('.tsaPanel').forEach(panel=>{panel.hidden=panel.dataset.panel!==safe;});
    };

    const saveState=async(payload)=>{
      const response=await fetch('/api/student-state',{method:'POST',headers:{'content-type':'application/json'},body:JSON.stringify({studentId:student.id,...payload})});
      const data=await response.json().catch(()=>({}));
      if(!response.ok||!data.ok)throw new Error(data.error||`HTTP_${response.status}`);
      return data;
    };

    root.querySelector('.tsaBack')?.addEventListener('click',()=>{history.back();});
    root.querySelectorAll('.tsaTabs button').forEach(btn=>btn.addEventListener('click',()=>selectTab(btn.dataset.tab)));
    root.querySelectorAll('.tsaSubjectRow .tsaChoices button').forEach(btn=>btn.addEventListener('click',async()=>{
      const row=btn.closest('.tsaSubjectRow');
      if(!row)return;
      const buttons=[...row.querySelectorAll('.tsaChoices button')];
      const previous=buttons.find(button=>button.classList.contains('selected'))||null;
      buttons.forEach(button=>button.classList.toggle('selected',button===btn));
      buttons.forEach(button=>{button.disabled=true;});
      try{
        if(row.classList.contains('tsaBehaviorRow')){
          await saveState({action:'behavior',code:btn.dataset.value});
        }else{
          const targetId=SUBJECT_TARGETS[Number(row.dataset.subject)];
          if(!targetId)throw new Error('ASSESSMENT_TARGET_INVALID');
          await saveState({action:'assessment',academic:[{targetId,result:btn.dataset.value}]});
        }
      }catch(error){
        buttons.forEach(button=>button.classList.toggle('selected',button===previous));
        alert('تعذر حفظ التقييم. حاول مرة أخرى.');
      }finally{
        buttons.forEach(button=>{button.disabled=false;});
      }
    }));

    const params=query();
    const group=params.get('group');
    const groupLabel=root.querySelector('#tsaGroupLabel');
    if(groupLabel)groupLabel.textContent=group==='focused'?'المتابعة المركزة · تقييم سريع للمهارات والسلوك':'المتابعة · تقييم سريع للمهارات والسلوك';
    root.querySelector('#tsaEvaluateAll')?.addEventListener('click',async event=>{
      const allButton=event.currentTarget;
      const rows=[...root.querySelectorAll('.tsaSubjectRow:not(.tsaBehaviorRow)')];
      const previous=rows.map(row=>[...row.querySelectorAll('.tsaChoices button')].find(button=>button.classList.contains('selected'))||null);
      rows.forEach(row=>{
        const button=row.querySelector('button[data-value="mastered"]');
        row.querySelectorAll('.tsaChoices button').forEach(choice=>choice.classList.toggle('selected',choice===button));
      });
      allButton.disabled=true;
      rows.forEach(row=>row.querySelectorAll('.tsaChoices button').forEach(button=>{button.disabled=true;}));
      try{
        const academic=rows.map(row=>({targetId:SUBJECT_TARGETS[Number(row.dataset.subject)],result:'mastered'})).filter(item=>item.targetId);
        await saveState({action:'assessment',academic});
      }catch(error){
        rows.forEach((row,index)=>row.querySelectorAll('.tsaChoices button').forEach(button=>button.classList.toggle('selected',button===previous[index])));
        alert('تعذر حفظ تقييم الكل. حاول مرة أخرى.');
      }finally{
        allButton.disabled=false;
        rows.forEach(row=>row.querySelectorAll('.tsaChoices button').forEach(button=>{button.disabled=false;}));
      }
    });
    let touchX=null;
    root.addEventListener('touchstart',e=>{touchX=e.changedTouches?.[0]?.clientX??null;},{passive:true});
    root.addEventListener('touchend',e=>{
      if(touchX===null)return;
      const dx=(e.changedTouches?.[0]?.clientX??touchX)-touchX;touchX=null;
      if(dx<70)return;
      const idx=STUDENTS.findIndex(s=>s.id===student.id);
      const next=STUDENTS[idx+1];
      if(next)location.href=`/teacher/student/${next.id}?tab=assessment${group?`&group=${encodeURIComponent(group)}`:''}`;
    },{passive:true});
    selectTab(params.get('tab')||'assessment');
    const subject=params.get('subject');
    if(subject){
      requestAnimationFrame(()=>{
        const row=[...root.querySelectorAll('.tsaSubjectRow')].find(item=>item.querySelector('b')?.textContent?.trim()===subject);
        row?.scrollIntoView({behavior:'smooth',block:'center'});
      });
    }
  }

  document.addEventListener('click',interceptStudentRow,true);
  const boot=()=>{if(detailMatch())requestAnimationFrame(()=>requestAnimationFrame(renderTeacherStudent));};
  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',boot,{once:true});else boot();
})();
