(()=>{
  if(!location.pathname.startsWith('/student'))return;
  const studentId=()=>new URLSearchParams(location.search).get('studentId')||(()=>{try{return localStorage.getItem('activeStudentId')}catch{return ''}})();
  const esc=v=>String(v??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
  const subjectMap={'القرآن الكريم':'quran','لغتي':'arabic','الدراسات الإسلامية':'islamic','الإملاء والخط':'spelling'};
  const api=async url=>{const r=await fetch(url,{cache:'no-store'});const d=await r.json();if(!r.ok||d.ok===false)throw new Error(d.error||`HTTP_${r.status}`);return d};
  async function hydrateWeekly(){
    try{
      const data=await api('/api/learning-automation?action=preview'),content=data.content||{};
      const panels=[...document.querySelectorAll('.student .dayPanel')];
      const hasLockedDailyHomework=panels.some(p=>{const text=p.querySelector('h3')?.textContent||'';return text.includes('الواجبات اليومية')||text.includes('مهامي اليوم')});
      if(hasLockedDailyHomework&&panels.length===2)return;
      const panel=panels.find(p=>p.dataset.teacherEvaluation!=='true'&&((p.querySelector('h3')?.textContent||'').includes('هذا الأسبوع')||(p.querySelector('h3')?.textContent||'').includes('خطتي لهذا الأسبوع')));
      if(!panel)return;
      const heading=panel.querySelector('h3');if(heading&&!heading.textContent.includes('خطتي')){const icon=heading.querySelector('svg');heading.textContent='';if(icon)heading.append(icon);heading.append(document.createTextNode('خطتي لهذا الأسبوع'))}
      panel.querySelectorAll('.scheduleItem').forEach(row=>{
        const label=row.querySelector('.scheduleText b')?.textContent?.trim()||'',key=subjectMap[label],item=key?content[key]:null;if(!item)return;
        const sub=row.querySelector('.scheduleText span');if(sub){const parts=[item.unit||item.surah,item.lesson,item.skill].filter(Boolean);sub.textContent=parts.join(' · ')}row.dataset.liveWeek=String(data.week||'');
      });
    }catch(error){console.warn('weekly automation',error)}
  }
  function fileCard(file){const id=encodeURIComponent(file.id),sid=encodeURIComponent(studentId()||'');return `<article class="studentLibraryFile" style="padding:10px 0;border-top:1px solid #e8f0f5"><b style="display:block;color:#245272;font-size:13px">${esc(file.title||file.name)}</b><small style="display:block;color:#7890a2;margin:4px 0">${file.visibility==='private'?'خاص بك':'عام'}${file.note?' · '+esc(file.note):''}</small><a href="/api/library-files?action=download&id=${id}&role=student&studentId=${sid}" target="_blank" rel="noopener" style="display:inline-block;margin-top:5px;padding:7px 10px;border-radius:9px;background:#eaf5fc;color:#176cc5;text-decoration:none;font-size:11px;font-weight:800">فتح / تحميل</a></article>`}
  async function hydrateStudentLibrary(modal){
    if(!modal||modal.dataset.smartStudentLibrary==='1')return;const title=modal.querySelector('h3')?.textContent?.trim()||'';if(title!=='الكتب والمواد')return;modal.dataset.smartStudentLibrary='1';const body=modal.querySelector('.studentMorePanel');if(!body)return;body.innerHTML='<p style="padding:12px;text-align:center;color:#7890a2">جارٍ تحميل مكتبتك…</p>';
    try{const sid=studentId();if(!sid)throw new Error('STUDENT_REQUIRED');const data=await api(`/api/library-files?role=student&studentId=${encodeURIComponent(sid)}`),files=data.files||[];body.className='studentLibraryPanel';body.innerHTML=files.length?files.map(fileCard).join(''):'<p style="padding:18px;text-align:center;color:#7890a2">لا توجد ملفات عامة أو خاصة بك حتى الآن.</p>'}catch{body.innerHTML='<p style="padding:18px;text-align:center;color:#9c4b4b">تعذر تحميل المكتبة الآن.</p>'}
  }
  function watchModals(){document.querySelectorAll('.studentPatchModal').forEach(hydrateStudentLibrary)}
  hydrateWeekly();setTimeout(hydrateWeekly,650);window.addEventListener('focus',hydrateWeekly);
  new MutationObserver(()=>{requestAnimationFrame(()=>{hydrateWeekly();watchModals()})}).observe(document.getElementById('root')||document.body,{childList:true,subtree:true});
})();
