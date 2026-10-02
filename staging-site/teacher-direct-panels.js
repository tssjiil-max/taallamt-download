(()=>{
  const path=location.pathname;
  const view=path==='/teacher/messages'?'messages':path==='/teacher/followup'?'followup':path==='/teacher/stars'?'stars':null;
  if(!view)return;

  const STUDENTS=[
    'أحمد بسام صالح الأحمد','أسامه سلطان بن بخت الصاعدي','أمير نايف عبدالله الحجلي','أنس احمد عبدالله الجهني','أوس نايف بن حمد الشريف','أويس عادل فيصل المالكي','تميم ماجد جابر الحجلي','ثامر عبدالله رجاء العوفي','راكان حاتم مهل الجهني','ريان محمود - باري','سلطان فهد زعل الجهني','شامخ بدر لافي الجهني','عادل غالب عبدالله العنزي','عبدالجليل سالم محمود عبدالجليل','عبدالرحمن نواف هندي الحازمي','عمر حميد بن سليم العروي','فيصل محمد عويض المطيري','قصي عبدالله ظاهر الحجلي','كنان محمد عبدالعزيز اليوسفي','محمد سماح سعد البوق','محمد صالح حمد عواد','موسى رياض صالح الأحمد','نايف احمد صويدر الجهني','نواف مطلق صالح العمري','وائل محمد حسين روزي','وسام سلطان عبيد السناني','يمان احمد بن عايد الجهني','يوسف فلاح خلف الحربي','يوسف محمد لافي الجهني'
  ].map((name,index)=>({id:`s2-4-${String(index+1).padStart(2,'0')}`,number:index+1,name}));

  const esc=(value)=>String(value??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
  const root=document.getElementById('root');
  if(!root)return;

  const titles={
    messages:['الرسائل','الرسائل المرتبطة بالطلاب مباشرة'],
    followup:['يحتاجون متابعة','الطلاب الذين لديهم متابعة مسجلة'],
    stars:['إدارة النجوم','زيادة أو إنقاص نجمة مباشرة لكل طالب']
  };

  const style=document.createElement('style');
  style.id='teacher-direct-panels-style';
  style.textContent=`
    .teacherDirectBody{padding:12px 14px 24px;display:flex;flex-direction:column;gap:8px}
    .teacherDirectStatus{padding:11px 12px;border:1px solid #dceaf4;border-radius:12px;background:#fff;color:#55738f;font-size:12px;font-weight:700;text-align:center}
    .teacherDirectRow{width:100%;min-height:62px;border:1px solid #e2edf5;border-radius:13px;background:#fff;display:grid;grid-template-columns:34px 1fr auto;align-items:center;gap:9px;padding:9px 10px;text-align:right;box-shadow:0 2px 8px rgba(45,109,145,.06)}
    .teacherDirectMain{min-width:0}.teacherDirectMain b{display:block;font-size:14px;color:#244c75;line-height:1.35}.teacherDirectMain small{display:block;margin-top:4px;font-size:11px;line-height:1.5;color:#6b879e;white-space:normal;overflow-wrap:anywhere}
    .teacherDirectOpen{border:0;border-radius:10px;background:#eaf6ff;color:#176cc5;font-weight:900;font-size:11px;padding:8px 10px;white-space:nowrap}
    .teacherDirectStarControls{display:flex;align-items:center;gap:6px}.teacherDirectStarControls button{width:34px;height:34px;border:0;border-radius:9px;font-size:20px;font-weight:900;line-height:1;background:#eef7ff;color:#1689e8}.teacherDirectStarControls button:last-child{background:#fff1f1;color:#b24b4b}.teacherDirectStarControls button:disabled{opacity:.45}.teacherDirectStarBalance{min-width:54px;text-align:center;font-size:12px;font-weight:900;color:#8b6512}
    .teacherDirectCount{margin:0 14px 4px;padding:9px 11px;border-radius:11px;background:#eef7ff;color:#176cc5;font-size:12px;font-weight:900;text-align:center}
  `;
  document.head.appendChild(style);

  const [title,subtitle]=titles[view];
  root.innerHTML=`
    <main class="teacherStudentsScreen" dir="rtl">
      <header class="teacherStudentsHeader">
        <button class="teacherStudentsBack" type="button" aria-label="العودة">‹</button>
        <div><h1>${title}</h1><p>${subtitle}</p></div>
      </header>
      <div class="teacherDirectCount" id="teacherDirectCount">جارٍ تحميل البيانات...</div>
      <section class="teacherDirectBody" id="teacherDirectBody"><div class="teacherDirectStatus">جارٍ التحميل...</div></section>
    </main>`;

  root.querySelector('.teacherStudentsBack')?.addEventListener('click',()=>{location.href='/teacher';});

  async function getState(student){
    const response=await fetch(`/api/student-state?studentId=${encodeURIComponent(student.id)}`,{cache:'no-store'});
    const data=await response.json();
    if(!response.ok||!data.ok)throw new Error(data.error||`HTTP_${response.status}`);
    return {...data,student:{...student,...data.student}};
  }

  function setContent(html,countText){
    const body=root.querySelector('#teacherDirectBody');
    const count=root.querySelector('#teacherDirectCount');
    if(body)body.innerHTML=html;
    if(count)count.textContent=countText;
  }

  function rowBase(state,detail,actionLabel,tab){
    return `<article class="teacherDirectRow" data-student-id="${state.student.id}">
      <span class="teacherStudentNumber">${state.student.number}</span>
      <div class="teacherDirectMain"><b>${esc(state.student.name)}</b><small>${esc(detail)}</small></div>
      <button class="teacherDirectOpen" type="button" data-open-student="${state.student.id}" data-tab="${tab}">${actionLabel}</button>
    </article>`;
  }

  async function renderMessages(states){
    const rows=[];
    let total=0;
    for(const state of states){
      const messages=(state.communications||[]).filter(item=>item.reasonCode==='guardian_message'||String(item.reason||'').includes('رسالة'));
      if(!messages.length)continue;
      total+=messages.length;
      const latest=messages[0];
      rows.push(rowBase(state,`${latest.reason||'رسالة'}: ${latest.summary}${messages.length>1?` · ${messages.length} رسائل`:''}`,'فتح الرسائل','homework'));
    }
    setContent(rows.length?rows.join(''):'<div class="teacherDirectStatus">لا توجد رسائل مسجلة حاليًا.</div>',`${total} رسالة · ${rows.length} طالب`);
  }

  async function renderFollowup(states){
    const rows=[];
    for(const state of states){
      const follow=(state.communications||[]).find(item=>['followup','remediation'].includes(item.reasonCode));
      const behavior=(state.assessments||[]).some(item=>(item.behavior||[]).some(b=>b.code==='needs_followup'||b.label==='يحتاج متابعة'));
      if(!follow&&!behavior)continue;
      const detail=follow?`${follow.reason||'متابعة'}: ${follow.summary}`:'سلوك مسجل: يحتاج متابعة';
      rows.push(rowBase(state,detail,'فتح المتابعة','followup'));
    }
    setContent(rows.length?rows.join(''):'<div class="teacherDirectStatus">لا يوجد طلاب يحتاجون متابعة مسجلة حاليًا.</div>',`${rows.length} طالب يحتاج متابعة`);
  }

  async function renderStars(states){
    const rows=states.map(state=>`<article class="teacherDirectRow" data-student-id="${state.student.id}">
      <span class="teacherStudentNumber">${state.student.number}</span>
      <div class="teacherDirectMain"><b>${esc(state.student.name)}</b><small>رصيد النجوم الحالي</small></div>
      <div class="teacherDirectStarControls">
        <button type="button" data-star-delta="1" aria-label="إضافة نجمة">+</button>
        <span class="teacherDirectStarBalance" data-star-balance>${Number(state.stars)||0} / 30</span>
        <button type="button" data-star-delta="-1" aria-label="إنقاص نجمة">−</button>
      </div>
    </article>`).join('');
    setContent(rows,`${states.length} طالب · إدارة النجوم مباشرة`);
  }

  root.addEventListener('click',async event=>{
    const target=event.target;
    if(!(target instanceof Element))return;
    const open=target.closest('[data-open-student]');
    if(open){
      const id=open.getAttribute('data-open-student');
      const tab=open.getAttribute('data-tab')||'assessment';
      location.href=`/teacher/student/${encodeURIComponent(id)}?tab=${encodeURIComponent(tab)}`;
      return;
    }
    const starButton=target.closest('button[data-star-delta]');
    if(!starButton)return;
    const row=starButton.closest('.teacherDirectRow');
    const studentId=row?.getAttribute('data-student-id');
    const delta=Number(starButton.getAttribute('data-star-delta'));
    if(!studentId||(delta!==1&&delta!==-1))return;
    const buttons=row.querySelectorAll('button[data-star-delta]');
    buttons.forEach(button=>button.disabled=true);
    try{
      const response=await fetch('/api/star-adjust',{method:'POST',headers:{'content-type':'application/json'},body:JSON.stringify({studentId,delta})});
      const data=await response.json();
      if(!response.ok||!data.ok)throw new Error(data.error||`HTTP_${response.status}`);
      const balance=row.querySelector('[data-star-balance]');
      if(balance)balance.textContent=`${data.stars} / 30`;
    }catch(error){
      alert(error?.message==='PRODUCTION_WRITE_BLOCKED'?'تعديل النجوم متاح في Staging فقط.':'تعذر تعديل النجمة.');
    }finally{
      buttons.forEach(button=>button.disabled=false);
    }
  });

  (async()=>{
    const settled=await Promise.allSettled(STUDENTS.map(getState));
    const states=settled.filter(item=>item.status==='fulfilled').map(item=>item.value);
    if(!states.length){setContent('<div class="teacherDirectStatus">تعذر تحميل بيانات الطلاب.</div>','تعذر تحميل البيانات');return;}
    if(view==='messages')await renderMessages(states);
    else if(view==='followup')await renderFollowup(states);
    else await renderStars(states);
  })();
})();
