(()=>{
  if(!location.pathname.startsWith('/student'))return;
  const studentId=()=>new URLSearchParams(location.search).get('studentId')||(()=>{try{return localStorage.getItem('activeStudentId')||''}catch{return ''}})();
  const REFRESH_THROTTLE_MS=30000;
  let state=null,busy=false,lastRefreshAt=0;
  const style=document.createElement('style');style.textContent=`
    .autoGradeBadge{display:inline-flex;align-items:center;margin-inline-start:6px;padding:2px 7px;border-radius:999px;background:#eaf6ff;color:#0876bd;font-size:10px;font-weight:900}
    .studentAutoGradeOverlay{position:fixed;inset:0;z-index:10020;background:rgba(15,49,76,.4);display:grid;place-items:center;padding:18px}
    .studentAutoGradeCard{width:min(400px,94vw);background:#fff;border:1px solid #d6eaf5;border-radius:22px;padding:18px;box-shadow:0 18px 50px rgba(19,74,111,.2);color:#234f6d;direction:rtl}
    .studentAutoGradeCard h3{margin:0 0 5px;color:#0879d9}.studentAutoGradeCard p{margin:0 0 12px;line-height:1.7;color:#617f94}
    .studentAutoGradeCard textarea{width:100%;min-height:100px;resize:vertical;border:1px solid #cfe4f1;border-radius:14px;padding:12px;font:inherit;box-sizing:border-box;outline:none}.studentAutoGradeCard textarea:focus{border-color:#5eb7e8;box-shadow:0 0 0 3px #eaf7ff}
    .studentAutoGradeMeta{display:flex;justify-content:space-between;gap:8px;margin:9px 0;color:#607f94;font-size:12px;font-weight:800}
    .studentAutoGradeActions{display:grid;grid-template-columns:1fr auto;gap:8px;margin-top:12px}.studentAutoGradeActions button{border:0;border-radius:12px;padding:11px 14px;font:inherit;font-weight:900;cursor:pointer}.studentAutoGradeSubmit{background:#168fe6;color:#fff}.studentAutoGradeClose{background:#eef5f9;color:#466b82}
    .studentAutoGradeResult{margin-top:12px;padding:11px 12px;border-radius:13px;background:#eef8ff;color:#236183;font-weight:900}.studentAutoGradeResult.ok{background:#edf9f0;color:#237347}.studentAutoGradeResult.bad{background:#fff5e8;color:#9b641b}
  `;document.head.appendChild(style);
  const esc=v=>String(v??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
  const evidenceFor=id=>(state?.homeworkEvidence||[]).find(x=>x.homeworkId===id)||null;
  function close(){document.querySelector('.studentAutoGradeOverlay')?.remove()}
  function bindTasks(){
    if(!state)return;
    const homework=state.homework||[];
    document.querySelectorAll('.student .serverTask').forEach(button=>{
      const title=button.querySelector('.taskText b')?.textContent?.trim()||'';
      const item=homework.find(x=>x.title===title);if(!item)return;
      button.dataset.homeworkId=item.id;
      const enabled=Boolean(item.autoGrading?.enabled);button.dataset.autoGrade=enabled?'1':'0';
      button.querySelector('.autoGradeBadge')?.remove();
      if(!enabled)return;
      const evidence=evidenceFor(item.id),badge=document.createElement('span');badge.className='autoGradeBadge';
      if(evidence?.status==='graded')badge.textContent=`${evidence.score??0}/${evidence.maxScore??item.autoGrading.maxScore??10}`;
      else badge.textContent='تصحيح آلي';
      button.querySelector('.taskText span')?.appendChild(badge);
      if(evidence?.correct===true){button.classList.add('done');const circle=button.querySelector('.taskCircle');if(circle)circle.textContent='✓'}
    });
  }
  async function refresh(force=false){
    const sid=studentId();if(!sid||busy)return;if(!force&&Date.now()-lastRefreshAt<REFRESH_THROTTLE_MS)return;lastRefreshAt=Date.now();busy=true;
    try{const r=await fetch(`/api/student-state?studentId=${encodeURIComponent(sid)}`,{cache:'no-store'}),data=await r.json();if(r.ok&&data.ok){state=data;bindTasks()}}catch{}finally{busy=false}
  }
  function openHomework(item){
    close();const evidence=evidenceFor(item.id),overlay=document.createElement('div');overlay.className='studentAutoGradeOverlay';
    const max=evidence?.maxScore??item.autoGrading?.maxScore??10;
    overlay.innerHTML=`<section class="studentAutoGradeCard"><h3>${esc(item.title)}</h3><p>${esc(item.instructions||'اكتب إجابتك ثم أرسلها للتصحيح الآلي.')}</p><div class="studentAutoGradeMeta"><span>التصحيح: آلي</span><span>الدرجة من ${esc(max)}</span></div><textarea aria-label="إجابة الواجب" placeholder="اكتب إجابتك هنا">${esc(evidence?.submissionText||'')}</textarea><div class="studentAutoGradeActions"><button type="button" class="studentAutoGradeSubmit">إرسال للتصحيح</button><button type="button" class="studentAutoGradeClose">إغلاق</button></div><div class="studentAutoGradeResult" ${evidence?.status==='graded'?'':'hidden'}>${evidence?.status==='graded'?`درجتك: ${esc(evidence.score??0)} / ${esc(max)} · ${esc(evidence.autoFeedback||'')}`:''}</div></section>`;
    document.body.appendChild(overlay);overlay.querySelector('.studentAutoGradeClose')?.addEventListener('click',close);overlay.addEventListener('click',e=>{if(e.target===overlay)close()});
    const textarea=overlay.querySelector('textarea'),submit=overlay.querySelector('.studentAutoGradeSubmit'),result=overlay.querySelector('.studentAutoGradeResult');
    submit?.addEventListener('click',async()=>{
      const answer=textarea?.value?.trim()||'';if(!answer){result.hidden=false;result.className='studentAutoGradeResult bad';result.textContent='اكتب إجابتك أولًا.';return}
      submit.disabled=true;submit.textContent='جارٍ التصحيح…';
      try{
        const sid=studentId(),r=await fetch('/api/homework-complete',{method:'POST',headers:{'content-type':'application/json'},body:JSON.stringify({studentId:sid,homeworkId:item.id,answer})}),data=await r.json();if(!r.ok||!data.ok)throw new Error(data.error||'REQUEST_FAILED');
        const grade=data.grade||{};result.hidden=false;result.className=`studentAutoGradeResult ${grade.correct?'ok':'bad'}`;result.textContent=`درجتك: ${grade.score??'—'} / ${grade.maxScore??max} · ${grade.feedback||''}`;
        submit.textContent=grade.correct?'تم التصحيح ✓':'حاول مرة أخرى';submit.disabled=Boolean(grade.correct);
        await refresh(true);window.dispatchEvent(new Event('focus'));
      }catch{result.hidden=false;result.className='studentAutoGradeResult bad';result.textContent='تعذر التصحيح الآن. حاول مرة أخرى.';submit.textContent='إرسال للتصحيح';submit.disabled=false}
    });
    textarea?.focus();
  }
  document.addEventListener('click',event=>{
    const target=event.target;if(!(target instanceof Element))return;const button=target.closest('.student .serverTask[data-auto-grade="1"]');if(!button)return;
    const id=button.dataset.homeworkId,item=(state?.homework||[]).find(x=>x.id===id);if(!item)return;
    event.preventDefault();event.stopPropagation();event.stopImmediatePropagation();openHomework(item);
  },true);
  const observer=new MutationObserver(()=>requestAnimationFrame(bindTasks));observer.observe(document.getElementById('root')||document.body,{childList:true,subtree:true});
  void refresh(true);window.addEventListener('focus',()=>{void refresh(false)});
})();
