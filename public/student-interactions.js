(()=>{
  if(!location.pathname.startsWith('/student'))return;
  const studentId=new URLSearchParams(location.search).get('studentId');if(!studentId)return;

  if(typeof window.__taallamtStudentStateViewFetch!=='function'){
    const cache=new Map(),inflight=new Map();
    window.__taallamtStudentStateViewFetch=async(view,id,{ttl=30000,force=false}={})=>{
      const key=`${id}:${view}`,hit=cache.get(key);
      if(!force&&hit&&Date.now()-hit.at<ttl)return hit.value;
      if(inflight.has(key))return inflight.get(key);
      const promise=(async()=>{
        const r=await fetch(`/api/student-state?studentId=${encodeURIComponent(id)}&view=${encodeURIComponent(view)}`,{cache:'no-store'});
        const d=await r.json().catch(()=>({}));if(!r.ok||!d.ok)throw new Error(d.error||'تعذر التحميل');
        cache.set(key,{at:Date.now(),value:d});return d;
      })().finally(()=>inflight.delete(key));
      inflight.set(key,promise);return promise;
    };
    window.__taallamtInvalidateStudentStateView=(id,view)=>{
      if(view)cache.delete(`${id}:${view}`);else for(const key of [...cache.keys()])if(key.startsWith(`${id}:`))cache.delete(key);
    };
  }

  const fetchState=(force=false)=>window.__taallamtStudentStateViewFetch('activity',studentId,{ttl:30000,force});
  const completeHomework=async homeworkId=>{const r=await fetch('/api/homework-complete',{method:'POST',headers:{'content-type':'application/json'},body:JSON.stringify({studentId,homeworkId})});const d=await r.json();if(!r.ok||!d.ok)throw new Error(d.error||'تعذر تأكيد التنفيذ');window.__taallamtInvalidateStudentStateView?.(studentId,'activity');return d};
  function popup(title,lines){document.querySelector('.studentLivePopup')?.remove();const wrap=document.createElement('div');wrap.className='studentLivePopup';Object.assign(wrap.style,{position:'fixed',inset:'0',zIndex:'10020',background:'rgba(0,0,0,.36)',display:'grid',placeItems:'center',padding:'18px'});const box=document.createElement('section');Object.assign(box.style,{width:'min(390px,94vw)',background:'#fff',borderRadius:'18px',padding:'17px',color:'#244c75',boxShadow:'0 12px 38px rgba(0,0,0,.22)'});const h=document.createElement('h3');h.textContent=title;Object.assign(h.style,{margin:'0 0 10px',color:'#0b62bc'});box.appendChild(h);lines.forEach(x=>{const p=document.createElement('p');p.textContent=x;Object.assign(p.style,{margin:'7px 0',lineHeight:'1.55',fontSize:'13px'});box.appendChild(p)});const close=document.createElement('button');close.textContent='إغلاق';Object.assign(close.style,{width:'100%',height:'42px',marginTop:'12px',border:'0',borderRadius:'11px',background:'#168fe6',color:'#fff',fontWeight:'800'});close.onclick=()=>wrap.remove();box.appendChild(close);wrap.appendChild(box);wrap.onclick=e=>{if(e.target===wrap)wrap.remove()};document.body.appendChild(wrap)}
  async function applyTaskStatus(force=false){try{const state=await fetchState(force),completed=new Set((state.homeworkEvidence||[]).filter(x=>x.status==='completed').map(x=>x.homeworkId));document.querySelectorAll('.student .serverTask').forEach(button=>{const title=button.querySelector('.taskText b')?.textContent?.trim()||'';const item=(state.homework||[]).find(x=>x.title===title);if(!item)return;button.dataset.homeworkId=item.id;const done=completed.has(item.id);button.classList.toggle('done',done);button.dataset.confirmed=done?'true':'false';button.setAttribute('aria-label',done?`${title} — تم تأكيد التنفيذ`:`${title} — اضغط لتأكيد التنفيذ`)})}catch{}}
  document.addEventListener('click',async e=>{
    const target=e.target;
    if(!(target instanceof Element))return;
    const serverTask=target.closest('.serverTask');
    if(serverTask){e.preventDefault();e.stopPropagation();e.stopImmediatePropagation();if(serverTask.dataset.confirmed==='true'){popup('المهمة',['تم تأكيد تنفيذ هذه المهمة مسبقًا ✅']);return}try{if(!serverTask.dataset.homeworkId)await applyTaskStatus();const homeworkId=serverTask.dataset.homeworkId;if(!homeworkId)throw new Error('تعذر تحديد المهمة');serverTask.disabled=true;await completeHomework(homeworkId);serverTask.classList.add('done');serverTask.dataset.confirmed='true';popup('تم التأكيد',['تم تسجيل تنفيذ المهمة وإرسال التأكيد للمعلم ✅'])}catch(err){popup('تعذر التأكيد',[err instanceof Error?err.message:'تعذر تأكيد التنفيذ'])}finally{serverTask.disabled=false}return}
  },true);
  setTimeout(()=>void applyTaskStatus(),700);
  window.addEventListener('focus',()=>{if(!document.hidden)void applyTaskStatus()});
  document.addEventListener('visibilitychange',()=>{if(!document.hidden)void applyTaskStatus()});
})();
