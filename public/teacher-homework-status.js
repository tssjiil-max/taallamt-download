(()=>{
  const match=location.pathname.match(/^\/teacher\/student\/(s2-4-\d{2})\/?$/);if(!match)return;const studentId=match[1];
  const REFRESH_THROTTLE_MS=30000;let busy=false,lastRefreshAt=0;
  async function refresh(force=false){
    if(busy)return;if(!force&&Date.now()-lastRefreshAt<REFRESH_THROTTLE_MS)return;lastRefreshAt=Date.now();busy=true;
    const panel=document.querySelector('.teacherStudentAdmin [data-panel="homework"]');if(!panel){busy=false;return;}
    try{const r=await fetch(`/api/student-state?studentId=${encodeURIComponent(studentId)}`,{cache:'no-store'}),state=await r.json();if(!r.ok||!state.ok)return;
      let box=panel.querySelector('.tsaHomeworkState');if(!box){box=document.createElement('div');box.className='tsaHomeworkState';Object.assign(box.style,{margin:'0 0 12px',padding:'10px 12px',borderRadius:'12px',background:'#eef7ff',color:'#245b83',fontSize:'12px',fontWeight:'800',lineHeight:'1.7'});const grid=panel.querySelector('.tsaActionGrid');panel.insertBefore(box,grid||null)}
      const evidence=new Map((state.homeworkEvidence||[]).map(x=>[x.homeworkId,x]));
      const completed=[...evidence.values()].filter(x=>x.status==='completed'||x.correct===true).length;
      const graded=[...evidence.values()].filter(x=>x.status==='graded').length;
      const rows=(state.homework||[]).slice(0,4).map(x=>{const e=evidence.get(x.id);if(e?.status==='graded')return `${e.correct?'🎯':'📝'} ${x.title} · ${e.score??0}/${e.maxScore??x.autoGrading?.maxScore??10}`;if(e?.status==='submitted')return `📝 ${x.title} · بانتظار المراجعة`;if(e?.status==='completed')return `✅ ${x.title}`;return `⏳ ${x.title}`});
      box.textContent=`الواجبات والتدريبات: ${state.homework?.length||0} · تم التنفيذ: ${completed} · مصححة آليًا: ${graded}${rows.length?`\n${rows.join(' · ')}`:''}`;
      box.style.whiteSpace='pre-wrap';
    }catch{}finally{busy=false}
  }
  const boot=()=>{
    void refresh(true);
    window.addEventListener('focus',()=>{void refresh(false)});
    document.addEventListener('click',event=>{const button=event.target?.closest?.('.teacherStudentAdmin .tsaTabs [data-tab="homework"]');if(button)void refresh(true)},true);
  };
  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',boot,{once:true});else boot();
})();
