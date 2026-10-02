(()=>{
  if(!location.pathname.startsWith('/student'))return;

  function findStudentSection(kind){
    const student=document.querySelector('.student');
    if(!student)return null;
    if(kind==='subjects')return student.querySelector('#subjects')||student.querySelector('.subjects');
    if(kind==='tasks')return [...student.querySelectorAll('.studentDay .dayPanel')].find(panel=>(panel.querySelector('h3')?.textContent||'').includes('مهامي اليوم'))||null;
    return null;
  }

  function scrollStudentSection(kind){
    document.querySelector('.studentPatchModal')?.remove();
    requestAnimationFrame(()=>requestAnimationFrame(()=>{
      const target=findStudentSection(kind);
      if(!target)return;
      target.scrollIntoView({behavior:'smooth',block:'start'});
    }));
  }

  document.addEventListener('click',event=>{
    const target=event.target;
    if(!(target instanceof Element))return;
    const button=target.closest('.studentPatchModal .studentMorePanel button');
    if(!button)return;
    const label=(button.textContent||'').trim();
    const kind=label==='عرض المواد'?'subjects':label==='مهامي اليوم'?'tasks':null;
    if(!kind)return;
    event.preventDefault();
    event.stopPropagation();
    event.stopImmediatePropagation();
    scrollStudentSection(kind);
  },true);
})();
