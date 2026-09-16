(()=>{
  const STUDENTS=[
    'أحمد بسام صالح الأحمد',
    'أسامه سلطان بن بخت الصاعدي',
    'أمير نايف عبدالله الحجلي',
    'أنس احمد عبدالله الجهني',
    'أوس نايف بن حمد الشريف',
    'أويس عادل فيصل المالكي',
    'تميم ماجد جابر الحجلي',
    'ثامر عبدالله رجاء العوفي',
    'راكان حاتم مهل الجهني',
    'ريان محمود - باري',
    'سلطان فهد زعل الجهني',
    'شامخ بدر لافي الجهني',
    'عادل غالب عبدالله العنزي',
    'عبدالجليل سالم محمود عبدالجليل',
    'عبدالرحمن نواف هندي الحازمي',
    'عمر حميد بن سليم العروي',
    'فيصل محمد عويض المطيري',
    'قصي عبدالله ظاهر الحجلي',
    'كنان محمد عبدالعزيز اليوسفي',
    'محمد سماح سعد البوق',
    'محمد صالح حمد عواد',
    'موسى رياض صالح الأحمد',
    'نايف احمد صويدر الجهني',
    'نواف مطلق صالح العمري',
    'وائل محمد حسين روزي',
    'وسام سلطان عبيد السناني',
    'يمان احمد بن عايد الجهني',
    'يوسف فلاح خلف الحربي',
    'يوسف محمد لافي الجهني'
  ];

  const roster=STUDENTS.map((name,index)=>({
    id:`s2-4-${String(index+1).padStart(2,'0')}`,
    number:index+1,
    name,
    grade:'الثاني',
    className:'4'
  }));

  try{localStorage.setItem('taallamtStudentRoster',JSON.stringify(roster));}catch{}

  const esc=(s)=>String(s).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));

  function setTeacherCount(){
    if(location.pathname.startsWith('/student'))return;
    document.querySelectorAll('.teacherStat').forEach(card=>{
      const label=card.querySelector('b')?.textContent?.trim();
      if(label==='عدد الطلاب'){
        const value=card.querySelector('strong');
        if(value)value.textContent=String(roster.length);
      }
    });
  }

  function selectStudent(student){
    try{
      localStorage.setItem('studentProfile',JSON.stringify({
        id:student.id,
        number:student.number,
        name:student.name,
        grade:student.grade,
        className:student.className
      }));
      localStorage.setItem('studentName',student.name);
      localStorage.setItem('activeStudentId',student.id);
    }catch{}
    location.href=`/student?studentId=${encodeURIComponent(student.id)}`;
  }

  function renderList(){
    if(location.pathname!=='/teacher/students')return;
    const root=document.getElementById('root');
    if(!root)return;
    const params=new URLSearchParams(location.search);
    if(params.get('action')==='assessment'){
      root.innerHTML=`
        <main class="teacherStudentsScreen" dir="rtl">
          <header class="teacherStudentsHeader">
            <button class="teacherStudentsBack" type="button" aria-label="العودة">‹</button>
            <div><h1>التقييم الشامل</h1><p>اختر مجموعة التقييم</p></div>
          </header>
          <section class="teacherStudentsList">
            <button class="teacherStudentRow" type="button" data-assessment-group="followup">
              <span class="teacherStudentNumber">1</span><span class="teacherStudentName"><b>المتابعة</b><small style="display:block">التقييم والمتابعة المعتادة</small></span><span class="teacherStudentChevron">‹</span>
            </button>
            <button class="teacherStudentRow" type="button" data-assessment-group="focused">
              <span class="teacherStudentNumber">2</span><span class="teacherStudentName"><b>المتابعة المركزة</b><small style="display:block">للطلاب الذين يحتاجون متابعة أكثر</small></span><span class="teacherStudentChevron">‹</span>
            </button>
          </section>
        </main>`;
      root.querySelector('.teacherStudentsBack')?.addEventListener('click',()=>{location.href='/teacher';});
      root.querySelectorAll('[data-assessment-group]').forEach(btn=>btn.addEventListener('click',()=>{
        location.href=`/teacher/student/${roster[0].id}?tab=assessment&group=${btn.dataset.assessmentGroup}`;
      }));
      return;
    }
    root.innerHTML=`
      <main class="teacherStudentsScreen" dir="rtl">
        <header class="teacherStudentsHeader">
          <button class="teacherStudentsBack" type="button" aria-label="العودة لصفحة المعلم">‹</button>
          <div>
            <h1>الطلاب</h1>
            <p>الصف الثاني / 4 · <b>${roster.length}</b> طالبًا</p>
          </div>
        </header>
        <section class="teacherStudentsTools">
          <input id="teacherStudentSearch" type="search" inputmode="search" placeholder="ابحث عن طالب..." autocomplete="off" />
          <span class="teacherStudentsCount">الكل (${roster.length})</span>
        </section>
        <section class="teacherStudentsList" id="teacherStudentsList" aria-label="قائمة الطلاب">
          ${roster.map(s=>`
            <button class="teacherStudentRow" type="button" data-student-id="${s.id}">
              <span class="teacherStudentNumber">${s.number}</span>
              <span class="teacherStudentName">${esc(s.name)}</span>
              <span class="teacherStudentChevron">‹</span>
            </button>`).join('')}
        </section>
      </main>`;

    root.querySelector('.teacherStudentsBack')?.addEventListener('click',()=>{location.href='/teacher';});
    root.querySelectorAll('.teacherStudentRow').forEach(row=>row.addEventListener('click',()=>{
      const student=roster.find(s=>s.id===row.dataset.studentId);
      if(student)selectStudent(student);
    }));
    const search=root.querySelector('#teacherStudentSearch');
    search?.addEventListener('input',()=>{
      const q=search.value.trim().toLowerCase();
      root.querySelectorAll('.teacherStudentRow').forEach(row=>{
        const name=row.querySelector('.teacherStudentName')?.textContent?.toLowerCase()||'';
        row.hidden=!!q&&!name.includes(q);
      });
    });
  }

  document.addEventListener('click',(event)=>{
    if(location.pathname.startsWith('/student')||location.pathname==='/teacher/students')return;
    const btn=event.target.closest?.('.teacher .tQuick button');
    if(!btn)return;
    const title=btn.querySelector('b')?.textContent?.trim();
    if(title!=='الطلاب')return;
    event.preventDefault();
    event.stopPropagation();
    event.stopImmediatePropagation();
    location.href='/teacher/students';
  },true);

  const run=()=>{
    setTeacherCount();
    renderList();
  };
  run();
  const root=document.getElementById('root');
  if(root)new MutationObserver(run).observe(root,{childList:true,subtree:true});
  window.addEventListener('popstate',run);
})();
