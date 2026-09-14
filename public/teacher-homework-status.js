(()=>{
  const match=location.pathname.match(/^\/teacher\/student\/(s2-4-\d{2})\/?$/);if(!match)return;const studentId=match[1];
  async function refresh(){
    const panel=document.querySelector('.teacherStudentAdmin [data-panel="homework"]');if(!panel)return;
    try{const r=await fetch(`/api/student-state?studentId=${encodeURIComponent(studentId)}`,{cache:'no-store'}),state=await r.json();if(!r.ok||!state.ok)return;
      let box=panel.querySelector('.tsaHomeworkState');if(!box){box=document.createElement('div');box.className='tsaHomeworkState';Object.assign(box.style,{margin:'0 0 12px',padding:'10px 12px',borderRadius:'12px',background:'#eef7ff',color:'#245b83',fontSize:'12px',fontWeight:'800',lineHeight:'1.7'});const grid=panel.querySelector('.tsaActionGrid');panel.insertBefore(box,grid||null)}
      const completed=new Set((state.homeworkEvidence||[]).filter(x=>x.status==='completed').map(x=>x.homeworkId));
      const rows=(state.homework||[]).slice(0,4).map(x=>`${completed.has(x.id)?'✅':'⏳'} ${x.title}`);
      box.textContent=`الواجبات والتدريبات: ${state.homework?.length||0} · تم التنفيذ: ${completed.size}${rows.length?`\n${rows.join(' · ')}`:''}`;
      box.style.whiteSpace='pre-wrap';
    }catch{}
  }
  const boot=()=>{refresh();setInterval(refresh,10000);window.addEventListener('focus',refresh)};
  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',boot,{once:true});else boot();
})();
