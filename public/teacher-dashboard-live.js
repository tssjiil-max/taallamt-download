// Teacher dashboard <-> student pages link.
// Replaces the dashboard's placeholder numbers with one class-level read (/api/learning-automation?action=overview),
// shows this week's plan and today's homework with live completion from the student pages, and lets the teacher
// send one homework to the whole class. If the backend is unreachable the dashboard is left exactly as rendered.
(()=>{
  if(location.pathname!=='/teacher'&&location.pathname!=='/')return;

  const OVERVIEW_URL='/api/learning-automation?action=overview';
  const CACHE_KEY='taallamtClassOverview:v1';
  const CACHE_MS=60000,REFRESH_THROTTLE_MS=30000;
  const SUBJECT_OPTIONS=[['','بدون مادة محددة'],['arabic','لغتي'],['quran','القرآن الكريم'],['islamic','الدراسات الإسلامية'],['spelling','الإملاء والخط']];
  const ICONS={
    calendar:'<rect x="3" y="5" width="18" height="16" rx="2"/><path d="M8 3v4M16 3v4M3 10h18"/>',
    tasks:'<rect x="5" y="4" width="14" height="17" rx="2"/><path d="M9 3h6v4H9z"/><path d="m8 12 1.5 1.5L12 11M8 17l1.5 1.5L12 16M14 12h2M14 17h2"/>'
  };
  const esc=value=>String(value??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
  const icon=name=>`<svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.9" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true" class="uiIcon">${ICONS[name]}</svg>`;
  const text=node=>(node?.textContent||'').trim();

  let overview=null,busy=false,lastFetchAt=0;

  async function request(url,options){
    const response=await fetch(url,options);
    const data=await response.json().catch(()=>({}));
    if(!response.ok||data?.ok===false)throw new Error(data?.error||`HTTP_${response.status}`);
    return data;
  }
  function readCache(){try{const raw=JSON.parse(sessionStorage.getItem(CACHE_KEY)||'null');return raw&&Date.now()-raw.at<CACHE_MS?raw.data:null}catch{return null}}
  function writeCache(data){try{sessionStorage.setItem(CACHE_KEY,JSON.stringify({at:Date.now(),data}))}catch{}}
  function clearCache(){try{sessionStorage.removeItem(CACHE_KEY)}catch{}}

  // ---- header dates: today in Riyadh instead of the fixed sample date ------------------
  function renderDates(){
    const meta=document.querySelector('.teacher .teacherMeta');if(!meta)return;
    const pills=[...meta.querySelectorAll('.metaPill:not(.metaQuote)')];if(pills.length<2)return;
    const now=new Date();
    const format=(locale,options)=>{try{return new Intl.DateTimeFormat(locale,{timeZone:'Asia/Riyadh',...options}).format(now).replace(/\s*(هـ|م|بعد الهجرة|ميلادي)\.?$/,'').trim()}catch{return ''}};
    const long={day:'numeric',month:'long',year:'numeric'},short={day:'numeric',month:'numeric',year:'numeric'};
    const gregorian=[format('ar-SA-u-ca-gregory-nu-latn',long),format('ar-SA-u-ca-gregory-nu-latn',short)];
    const hijri=[format('ar-SA-u-ca-islamic-umalqura-nu-latn',long),format('ar-SA-u-ca-islamic-umalqura-nu-latn',short)];
    if(!gregorian[0]||!hijri[0])return;
    const write=(pill,value,suffix)=>{const next=`${value} ${suffix}`,current=[...pill.childNodes].filter(node=>node.nodeType===Node.TEXT_NODE).map(node=>node.nodeValue).join('').trim();if(current===next)return;[...pill.childNodes].forEach(node=>{if(node.nodeType===Node.TEXT_NODE)node.remove()});pill.appendChild(document.createTextNode(next))};
    const overflows=()=>meta.scrollWidth>meta.clientWidth+0.5;
    // Long month names first; fall back to numeric dates when the three pills would not fit the header.
    write(pills[0],gregorian[0],'م');write(pills[1],hijri[0],'هـ');
    if(overflows()&&hijri[1])write(pills[1],hijri[1],'هـ');
    if(overflows()&&gregorian[1])write(pills[0],gregorian[1],'م');
  }

  // ---- existing dashboard numbers -------------------------------------------------
  function setStat(label,value){
    document.querySelectorAll('.teacher .teacherStat').forEach(card=>{if(text(card.querySelector('b'))===label){const strong=card.querySelector('strong');if(strong){strong.dataset.liveCount='1';if(strong.textContent!==String(value))strong.textContent=String(value)}}});
  }
  function panelByTitle(title){return [...document.querySelectorAll('.teacher .teacherPanels>.panel')].find(panel=>text(panel.querySelector('h3'))===title)||null}
  function setStatus(panelTitle,label,value){
    const panel=panelByTitle(panelTitle);if(!panel)return;
    panel.querySelectorAll('.statusLine').forEach(line=>{if(text(line.querySelector('b'))===label){const strong=line.querySelector('strong');if(strong&&strong.textContent!==String(value))strong.textContent=String(value)}});
  }
  function renderNumbers(data){
    const t=data.totals||{};
    setStat('رسائل جديدة',t.messages??0);setStat('يحتاجون متابعة',t.needsFollowup??0);setStat('تم تقييم اليوم',t.assessedToday??0);setStat('عدد الطلاب',t.students??0);
    setStatus('متابعة اليوم','يحتاجون متابعة',t.needsFollowup??0);setStatus('متابعة اليوم','ممتازون اليوم',t.excellentToday??0);setStatus('متابعة اليوم','لم يتم تقييمهم',t.notAssessedToday??0);setStatus('متابعة اليوم','ملاحظات سلوكية',t.behaviorNotesToday??0);
    setStatus('التقييم الشامل','لم يتم تقييمهم',t.notAssessedToday??0);setStatus('التقييم الشامل','يحتاجون متابعة',t.needsFollowup??0);setStatus('التقييم الشامل','تم تقييم اليوم',t.assessedToday??0);
    const curriculum=panelByTitle('تقدم المنهج');
    if(curriculum){
      const byTitle=new Map((data.curriculum||[]).map(item=>[item.title,item]));
      curriculum.querySelectorAll('.courseProgress').forEach(row=>{
        const item=byTitle.get(text(row.querySelector('b')));if(!item)return;
        const bar=row.querySelector('.courseBar i'),percent=row.querySelector(':scope>span');
        if(bar)bar.style.width=`${item.percent}%`;if(percent&&percent.textContent!==`${item.percent}%`)percent.textContent=`${item.percent}%`;
        row.title=`الأسبوع ${item.week} من ${item.weeks}${item.masteryPercent===null?'':` · إتقان ${item.masteryPercent}% من ${item.assessed} طالب مقيَّم`}`;
      });
    }
  }

  // ---- live panels: weekly plan + today's homework -----------------------------------
  function ensurePanel(key,title,iconName,actionLabel){
    const host=document.querySelector('.teacher .teacherPanels');if(!host)return null;
    let panel=host.querySelector(`[data-tdl="${key}"]`);
    if(!panel){
      panel=document.createElement('section');panel.className='panel tdlPanel';panel.dataset.tdl=key;
      panel.innerHTML=`<header><h3>${icon(iconName)}${esc(title)}</h3><button type="button" data-tdl-action>${esc(actionLabel)}</button></header><div class="tdlRows"></div><p class="tdlFoot"></p>`;
      host.appendChild(panel);
    }
    return panel;
  }
  function renderWeekly(data){
    const plan=data.weeklyPlan||{},panel=ensurePanel('weekly','خطة الأسبوع','calendar',`الأسبوع ${plan.week??''}`);if(!panel)return;
    panel.querySelector('[data-tdl-action]').textContent=`الأسبوع ${plan.week??''}`;
    panel.querySelector('.tdlRows').innerHTML=(plan.items||[]).map(item=>{
      const detail=item.holiday?'إجازة · لا يوجد درس جديد':[item.lesson,item.skill].filter(Boolean).join(' · ');
      return `<div class="tdlRow"><b>${esc(item.title)}</b><small>${esc(detail||'—')}</small></div>`;
    }).join('');
    const foot=panel.querySelector('.tdlFoot');foot.dataset.state=plan.published?'ok':'warn';foot.textContent=plan.published?'منشورة في صفحات الطلاب ✓':'لم تُنشر للطلاب بعد';
  }
  function renderHomework(data){
    const panel=ensurePanel('homework','واجبات اليوم','tasks','إرسال للجميع');if(!panel)return;
    const list=data.homeworkToday||[],rowsBox=panel.querySelector('.tdlRows');
    rowsBox.innerHTML=list.length?list.map(item=>{
      const source=item.source==='automation'?'من توزيع اليوم':item.assigned>=((data.totals||{}).students||0)?'للجميع':`${item.assigned} طالب`;
      return `<button type="button" class="tdlRow tdlHomework" data-homework-id="${esc(item.id)}"><b>${esc(item.title)}</b><strong>${item.done}/${item.assigned}</strong><small>${esc([item.kind==='training'?'تدريب منزلي':'واجب',source].join(' · '))}</small></button>`;
    }).join(''):`<div class="tdlEmpty">${data.schoolDay===false?'اليوم إجازة · لا توجد واجبات.':'لا توجد واجبات منشورة اليوم.'}</div>`;
    const t=data.totals||{},foot=panel.querySelector('.tdlFoot');
    foot.dataset.state=t.pendingOlder?'warn':'ok';
    foot.textContent=list.length?`أُنجز ${t.homeworkDoneToday??0} من ${t.homeworkAssignedToday??0}${t.pendingOlder?` · سابقة لم تُنجز: ${t.pendingOlder}`:''}`:(t.pendingOlder?`واجبات سابقة لم تُنجز: ${t.pendingOlder}`:'');
  }
  function render(data){
    if(!data||!document.querySelector('.teacher .teacherPanels'))return false;
    overview=data;renderNumbers(data);renderWeekly(data);renderHomework(data);
    document.querySelector('.teacher')?.setAttribute('data-live-overview',data.localDate||'');
    return true;
  }

  // Without a reachable backend the dashboard still shows its built-in sample numbers; say so instead of passing them off as live.
  function setOffline(offline){
    const host=document.querySelector('.teacher .teacherPanels');if(!host)return;
    let note=document.querySelector('.teacher .tdlOffline');
    if(!offline){note?.remove();return}
    if(!note){note=document.createElement('p');note.className='tdlOffline';note.textContent='تعذر الاتصال بالخادم · الأرقام الظاهرة أرقام تجريبية وليست بيانات الفصل.';host.insertAdjacentElement('afterend',note)}
  }

  // ---- overlays ----------------------------------------------------------------------
  const closeOverlay=()=>document.querySelector('.taFormOverlay.tdlOverlay')?.remove();
  function openOverlay(html){
    closeOverlay();const overlay=document.createElement('div');overlay.className='taFormOverlay tdlOverlay';overlay.innerHTML=`<section class="taFormCard">${html}</section>`;
    overlay.addEventListener('click',event=>{if(event.target===overlay)closeOverlay()});document.body.appendChild(overlay);return overlay;
  }
  function openHomeworkStatus(id){
    const item=(overview?.homeworkToday||[]).find(row=>row.id===id);if(!item)return;
    const done=new Set(item.doneStudentIds||[]),assigned=new Set(item.assignedStudentIds||[]);
    const students=(overview.students||[]).filter(student=>assigned.has(student.id));
    const rows=students.map(student=>`<button type="button" class="tdlStudent" data-student-id="${esc(student.id)}"><span>${student.number}</span><b>${esc(student.name)}</b><em data-done="${done.has(student.id)}">${done.has(student.id)?'أنجز ✓':'لم ينجز بعد'}</em></button>`).join('');
    const overlay=openOverlay(`<h3>${esc(item.title)}</h3><p>أنجز ${item.done} من ${item.assigned} · اضغط اسم الطالب لفتح ملفه</p><div class="tdlStudentList">${rows||'<div class="tdlEmpty">لا يوجد طلاب مكلّفون.</div>'}</div><div class="taFormActions"><button class="taFormCancel" type="button" data-close>إغلاق</button></div>`);
    overlay.querySelector('[data-close]')?.addEventListener('click',closeOverlay);
    overlay.querySelectorAll('[data-student-id]').forEach(button=>button.addEventListener('click',()=>{location.href=`/teacher/student/${encodeURIComponent(button.dataset.studentId)}?tab=homework`}));
  }
  function openClassHomeworkForm(){
    const options=SUBJECT_OPTIONS.map(([value,label])=>`<option value="${value}">${esc(label)}</option>`).join('');
    const overlay=openOverlay(`<h3>إرسال واجب للجميع</h3><p>يصل مباشرة إلى «مهامي اليوم» في صفحات جميع الطلاب</p><form><label for="tdlKind">النوع</label><select id="tdlKind" name="kind"><option value="homework">واجب</option><option value="training">تدريب منزلي</option></select><label for="tdlSubject">المادة</label><select id="tdlSubject" name="subjectKey">${options}</select><label for="tdlTitle">العنوان</label><input id="tdlTitle" name="title" autocomplete="off"/><label for="tdlInstructions">التعليمات</label><textarea id="tdlInstructions" name="instructions" autocomplete="off"></textarea><label for="tdlAnswer">الإجابة النموذجية للتصحيح الآلي (اختياري)</label><input id="tdlAnswer" name="answerKey" autocomplete="off"/><div class="taFormActions"><button class="taFormSave" type="submit">إرسال للجميع</button><button class="taFormCancel" type="button" data-close>إلغاء</button></div><div class="taFormStatus" hidden></div></form>`);
    overlay.querySelector('[data-close]')?.addEventListener('click',closeOverlay);
    overlay.querySelector('form')?.addEventListener('submit',async event=>{
      event.preventDefault();const form=event.currentTarget,status=overlay.querySelector('.taFormStatus'),save=overlay.querySelector('.taFormSave');
      const payload={action:'class_homework',kind:form.elements.kind.value,subjectKey:form.elements.subjectKey.value,title:form.elements.title.value.trim(),instructions:form.elements.instructions.value.trim(),answerKey:form.elements.answerKey.value.trim()};
      status.hidden=false;
      if(!payload.title){status.className='taFormStatus error';status.textContent='اكتب عنوان الواجب أولًا.';return}
      save.disabled=true;status.className='taFormStatus';status.textContent='جارٍ الإرسال…';
      try{
        const data=await request('/api/learning-automation',{method:'POST',headers:{'content-type':'application/json'},body:JSON.stringify(payload)});
        status.className='taFormStatus ok';status.textContent=`تم الإرسال إلى ${data.students} طالبًا ✓`;
        clearCache();setTimeout(()=>{closeOverlay();void refresh(true)},800);
      }catch(error){
        status.className='taFormStatus error';status.textContent=error?.message==='PRODUCTION_WRITE_BLOCKED'?'الإرسال متاح في نسخة التجربة فقط.':'تعذر الإرسال. حاول مرة أخرى.';save.disabled=false;
      }
    });
    overlay.querySelector('#tdlTitle')?.focus();
  }
  document.addEventListener('click',event=>{
    const target=event.target;if(!(target instanceof Element))return;
    const panel=target.closest('.teacher .tdlPanel');if(!panel)return;
    const action=target.closest('[data-tdl-action]');
    if(action){event.preventDefault();event.stopPropagation();if(panel.dataset.tdl==='homework')openClassHomeworkForm();else location.href='/teacher/library?section=weekly';return}
    const row=target.closest('.tdlHomework');if(row){event.preventDefault();event.stopPropagation();openHomeworkStatus(row.dataset.homeworkId)}
  },true);

  // ---- loading -----------------------------------------------------------------------
  // The weekly plan and the day's homework are normally published by the scheduled jobs. If the dashboard
  // finds them missing, it asks the server to publish them once (idempotent), then reads the overview again.
  async function ensureOnce(data){
    if(!data?.needsEnsure)return data;
    const flag=`taallamtEnsureTried:${data.localDate}`;
    try{if(sessionStorage.getItem(flag))return data;sessionStorage.setItem(flag,'1')}catch{return data}
    try{await request('/api/learning-automation',{method:'POST',headers:{'content-type':'application/json'},body:JSON.stringify({action:'ensure'})});return await request(OVERVIEW_URL,{cache:'no-store'})}catch{return data}
  }
  async function refresh(force=false){
    if(busy||document.hidden)return;
    if(!force&&Date.now()-lastFetchAt<REFRESH_THROTTLE_MS)return;
    busy=true;lastFetchAt=Date.now();
    try{const data=await ensureOnce(await request(OVERVIEW_URL,{cache:'no-store'}));writeCache(data);render(data);setOffline(false)}
    catch(error){console.warn('teacher dashboard overview',error);if(!overview)setOffline(true)}
    finally{busy=false}
  }
  function boot(){
    const cached=readCache();
    const start=()=>{renderDates();if(cached)render(cached);void refresh(!cached)};
    if(document.querySelector('.teacher .teacherPanels'))start();
    else{const observer=new MutationObserver(()=>{if(document.querySelector('.teacher .teacherPanels')){observer.disconnect();start()}});observer.observe(document.getElementById('root')||document.body,{childList:true,subtree:true})}
    window.addEventListener('focus',()=>void refresh(false));
    document.addEventListener('visibilitychange',()=>{if(!document.hidden)void refresh(false)});
  }
  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',boot,{once:true});else boot();
})();
