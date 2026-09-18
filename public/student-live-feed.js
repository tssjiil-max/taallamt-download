(()=>{
  if(!location.pathname.startsWith('/student'))return;

  const studentId=()=>{
    const q=new URLSearchParams(location.search).get('studentId');if(q)return q;
    try{return JSON.parse(localStorage.getItem('studentProfile')||'{}')?.id||localStorage.getItem('activeStudentId')||''}catch{return localStorage.getItem('activeStudentId')||''}
  };
  const esc=v=>String(v??'');
  const dateText=value=>{if(!value)return'';try{return new Intl.DateTimeFormat('ar-SA',{timeZone:'Asia/Riyadh',year:'numeric',month:'short',day:'numeric'}).format(new Date(value))}catch{return String(value).slice(0,10)}};
  const fetchJson=async url=>{const r=await fetch(url,{cache:'no-store'}),d=await r.json().catch(()=>({}));if(!r.ok||d.ok===false)throw new Error(d.error||`HTTP_${r.status}`);return d};

  async function state(){const id=studentId();return id?fetchJson(`/api/student-state?studentId=${encodeURIComponent(id)}`):null}
  function close(){document.querySelector('.studentPatchModal')?.remove()}
  function rows(items,emptyText){
    const body=document.createElement('div');body.className='studentPatchRows';
    const list=items.length?items:[{title:emptyText,meta:''}];
    for(const item of list){
      const article=document.createElement('article');
      const title=document.createElement('b');title.textContent=esc(item.title);article.appendChild(title);
      if(item.body){const p=document.createElement('div');p.textContent=esc(item.body);p.style.marginTop='4px';p.style.fontWeight='700';article.appendChild(p)}
      if(item.meta){const small=document.createElement('small');small.textContent=esc(item.meta);small.style.display='block';small.style.marginTop='4px';small.style.opacity='.68';article.appendChild(small)}
      body.appendChild(article);
    }
    return body;
  }
  function modal(title,body){
    close();const wrap=document.createElement('div');wrap.className='studentPatchModal';
    const card=document.createElement('section'),button=document.createElement('button'),h=document.createElement('h3');
    button.className='studentPatchClose';button.type='button';button.textContent='×';button.addEventListener('click',close);
    h.textContent=title;card.append(button,h,body);wrap.appendChild(card);wrap.addEventListener('click',e=>{if(e.target===wrap)close()});document.body.appendChild(wrap);
  }

  async function openTeacherNotes(){
    try{
      const data=await state();
      const allowed=new Set(['student_note','followup']);
      const notes=(data?.communications||[]).filter(item=>allowed.has(String(item.reasonCode||''))).map(item=>({
        title:item.reasonCode==='followup'?'متابعة المعلم':'ملاحظة من المعلم',
        body:item.summary||'',
        meta:dateText(item.createdAt)
      }));
      modal('ملاحظات المعلم',rows(notes,'لا توجد ملاحظات جديدة من المعلم.'));
    }catch{modal('ملاحظات المعلم',rows([],'تعذر تحميل الملاحظات الآن.'))}
  }

  async function openAnnouncements(){
    try{
      const data=await state();
      const items=(data?.announcements||[]).map(item=>({
        title:item.title||'إعلان',
        body:item.body||'',
        meta:dateText(item.updatedAt||item.date)
      }));
      modal('الإعلانات',rows(items,'لا توجد إعلانات منشورة حاليًا.'));
    }catch{modal('الإعلانات',rows([],'تعذر تحميل الإعلانات الآن.'))}
  }

  function addButton(host,label,onClick,key){
    if(host.querySelector(`[data-live-feed="${key}"]`))return;
    const button=document.createElement('button');button.type='button';button.dataset.liveFeed=key;button.textContent=label;button.addEventListener('click',onClick);host.appendChild(button);
  }

  function enhanceMore(){
    document.querySelectorAll('.studentPatchModal').forEach(wrap=>{
      const title=wrap.querySelector('h3')?.textContent?.trim();if(title!=='المزيد')return;
      const host=wrap.querySelector('.studentMorePanel');if(!host)return;
      addButton(host,'ملاحظات المعلم',openTeacherNotes,'notes');
      addButton(host,'الإعلانات',openAnnouncements,'announcements');
    });
  }

  async function syncLiveState(){
    try{
      const data=await state();if(!data)return;
      try{localStorage.setItem('studentStars',String(Number(data.stars)||0))}catch{}
      const stars=Math.max(0,Math.min(30,Number(data.stars)||0));
      const grid=document.querySelector('.student .starGrid');
      if(grid){
        [...grid.children].forEach((node,index)=>node.classList.toggle('on',index<stars));
        grid.setAttribute('aria-label',`${stars} من 30 نجمة`);
      }
      document.querySelectorAll('[data-star-balance],[data-student-stars]').forEach(node=>{node.textContent=`${stars} / 30`});
      window.dispatchEvent(new CustomEvent('taallamt:student-state-updated',{detail:{state:data}}));
    }catch(error){console.warn('student live state',error)}
  }

  const observer=new MutationObserver(()=>requestAnimationFrame(enhanceMore));
  observer.observe(document.body,{childList:true,subtree:true});
  enhanceMore();syncLiveState();setTimeout(syncLiveState,700);setInterval(syncLiveState,12000);
  window.addEventListener('focus',syncLiveState);
  document.addEventListener('visibilitychange',()=>{if(!document.hidden)syncLiveState()});
})();