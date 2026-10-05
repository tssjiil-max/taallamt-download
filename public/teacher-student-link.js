// Teacher's student file -> that student's own page.
// Adds «معاينة صفحة الطالب» under the share button; it reuses the student's one canonical link token, so the
// teacher sees exactly the page the student/guardian sees.
(()=>{
  const match=location.pathname.match(/^\/teacher\/student\/(s2-4-\d{2})\/?$/);if(!match)return;
  const studentId=match[1];

  function install(){
    const admin=document.querySelector('.teacherStudentAdmin');if(!admin)return false;
    if(admin.querySelector('[data-student-preview]'))return true;
    // Inserted right after the student card; the share button (added by the access guard) lands between them.
    const anchor=admin.querySelector('[data-guardian-share]')||admin.querySelector('.tsaStudentCard');if(!anchor)return false;
    const button=document.createElement('button');
    button.type='button';button.className='guardianShareButton';button.dataset.studentPreview='true';button.textContent='معاينة صفحة الطالب';
    Object.assign(button.style,{background:'#eef7ff',color:'#176cc5',boxShadow:'none',border:'1px solid #cfe5f5'});
    anchor.insertAdjacentElement('afterend',button);
    button.addEventListener('click',async()=>{
      const label=button.textContent;button.disabled=true;button.textContent='جارٍ فتح صفحة الطالب…';
      try{
        const response=await fetch('/api/student-state',{method:'POST',headers:{'content-type':'application/json'},body:JSON.stringify({studentId,action:'access_share'})});
        const data=await response.json().catch(()=>({}));
        if(!response.ok||!data.ok||!data.inviteToken)throw new Error(data.error||`HTTP_${response.status}`);
        location.href=`/student?studentId=${encodeURIComponent(studentId)}&invite=${encodeURIComponent(data.inviteToken)}`;
      }catch{
        button.textContent='تعذر فتح صفحة الطالب. حاول مرة أخرى.';
        setTimeout(()=>{button.textContent=label;button.disabled=false},2200);
      }
    });
    return true;
  }

  // The student file is rendered by another script shortly after load; retry briefly until it exists.
  const boot=()=>{
    if(install())return;
    let attempts=0;const timer=setInterval(()=>{attempts++;if(install()||attempts>40)clearInterval(timer)},150);
  };
  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',boot,{once:true});else boot();
})();
