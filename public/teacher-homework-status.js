(()=>{
  const match=location.pathname.match(/^\/teacher\/student\/(s2-4-\d{2})\/?$/);if(!match)return;const studentId=match[1];
  const CACHE_MS=60*1000;
  let lastFetchAt=0;
  let inflight=null;

  const panel=()=>document.querySelector('.teacherStudentAdmin [data-panel="homework"]');
  const visible=()=>{const node=panel();return Boolean(node&&!node.hidden)};

  async function refresh(force=false){
    const currentPanel=panel();if(!currentPanel||currentPanel.hidden)return;
    if(!force&&Date.now()-lastFetchAt<CACHE_MS)return;
    if(inflight)return inflight;
    inflight=(async()=>{
      try{
        const r=await fetch(`/api/student-state?studentId=${encodeURIComponent(studentId)}`,{cache:'no-store'}),state=await r.json();if(!r.ok||!state.ok)return;
        let box=currentPanel.querySelector('.tsaHomeworkState');if(!box){box=document.createElement('div');box.className='tsaHomeworkState';Object.assign(box.style,{margin:'0 0 12px',padding:'10px 12px',borderRadius:'12px',background:'#eef7ff',color:'#245b83',fontSize:'12px',fontWeight:'800',lineHeight:'1.7'});const grid=currentPanel.querySelector('.tsaActionGrid');currentPanel.insertBefore(box,grid||null)}
        const completed=new Set((state.homeworkEvidence||[]).filter(x=>x.status==='completed').map(x=>x.homeworkId));
        const rows=(state.homework||[]).slice(0,4).map(x=>`${completed.has(x.id)?'✅':'⏳'} ${x.title}`);
        box.textContent=`الواجبات والتدريبات: ${state.homework?.length||0} · تم التنفيذ: ${completed.size}${rows.length?`\n${rows.join(' · ')}`:''}`;
        box.style.whiteSpace='pre-wrap';lastFetchAt=Date.now();
      }catch{}
      finally{inflight=null}
    })();
    return inflight;
  }

  document.addEventListener('click',event=>{
    const target=event.target;if(!(target instanceof Element))return;
    const tab=target.closest('.teacherStudentAdmin .tsaTabs button[data-tab="homework"]');
    if(tab)setTimeout(()=>void refresh(true),0);
  },true);

  window.addEventListener('focus',()=>{if(visible())void refresh()});
  const root=document.getElementById('root')||document.body;
  new MutationObserver(()=>{if(visible())void refresh()}).observe(root,{childList:true,subtree:true,attributes:true,attributeFilter:['hidden']});
  if(visible())void refresh();
})();