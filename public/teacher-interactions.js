(()=>{
  if(location.pathname!=='/teacher')return;
  document.addEventListener('click',event=>{
    const target=event.target;if(!(target instanceof Element))return;
    const button=target.closest('button.startLesson');if(!button)return;
    event.preventDefault();event.stopPropagation();event.stopImmediatePropagation();
    const active=button.dataset.started==='true';
    button.dataset.started=active?'false':'true';
    button.replaceChildren(document.createTextNode(active?'ابدأ الحصة':'الحصة جارية ✓'));
    let toast=document.querySelector('.teacherLessonToast');
    if(!toast){toast=document.createElement('div');toast.className='teacherLessonToast';Object.assign(toast.style,{position:'fixed',zIndex:'9999',left:'50%',bottom:'84px',transform:'translateX(-50%)',padding:'10px 15px',borderRadius:'13px',background:'#257a4c',color:'#fff',fontWeight:'800',fontSize:'13px',boxShadow:'0 6px 22px rgba(0,0,0,.2)',textAlign:'center'});document.body.appendChild(toast)}
    toast.textContent=active?'تم إنهاء الحصة':'تم بدء الحصة ✓';
    setTimeout(()=>toast?.remove(),2200);
  },true);
})();
