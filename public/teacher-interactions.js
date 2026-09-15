(()=>{
  if(location.pathname!=='/teacher')return;

  const stop=(event)=>{event.preventDefault();event.stopPropagation();event.stopImmediatePropagation();};
  const go=(path)=>{location.href=path;};
  const toStudents=(action,extra={})=>{
    const params=new URLSearchParams();
    if(action)params.set('action',action);
    Object.entries(extra).forEach(([key,value])=>{if(value!==undefined&&value!==null&&String(value)!=='')params.set(key,String(value));});
    go(`/teacher/students${params.toString()?`?${params}`:''}`);
  };
  const panelByTitle=(title)=>[...document.querySelectorAll('.teacher .panel')].find(panel=>panel.querySelector('h3')?.textContent?.trim()===title)||null;
  const scrollPanel=(title)=>panelByTitle(title)?.scrollIntoView({behavior:'smooth',block:'start'});
  const scrollMore=()=>document.querySelector('.teacher .teacherPanels')?.scrollIntoView({behavior:'smooth',block:'start'});
  const sectionFromQuery=()=>new URLSearchParams(location.search).get('section');
  const applySection=()=>{
    const section=sectionFromQuery();
    if(!section)return;
    requestAnimationFrame(()=>requestAnimationFrame(()=>{
      if(section==='curriculum')scrollPanel('تقدم المنهج');
      else if(section==='tasks')scrollPanel('مهامي اليوم');
      else if(section==='announcements')scrollPanel('الإعلانات');
      else if(section==='more')scrollMore();
    }));
  };

  const markInteractive=()=>{
    document.querySelectorAll('.teacher .teacherStat,.teacher .statusLine').forEach(el=>{
      if(!el.hasAttribute('tabindex'))el.setAttribute('tabindex','0');
      if(!el.hasAttribute('role'))el.setAttribute('role','button');
    });
  };

  document.addEventListener('keydown',event=>{
    if(event.key!=='Enter'&&event.key!==' ')return;
    const target=event.target;if(!(target instanceof Element))return;
    const interactive=target.closest('.teacherStat,.statusLine');
    if(!interactive)return;
    event.preventDefault();
    interactive.dispatchEvent(new MouseEvent('click',{bubbles:true,cancelable:true}));
  },true);

  document.addEventListener('click',event=>{
    const target=event.target;if(!(target instanceof Element))return;

    const startButton=target.closest('button.startLesson');
    if(startButton){
      stop(event);
      const active=startButton.dataset.started==='true';
      startButton.dataset.started=active?'false':'true';
      startButton.replaceChildren(document.createTextNode(active?'ابدأ الحصة':'الحصة جارية ✓'));
      let toast=document.querySelector('.teacherLessonToast');
      if(!toast){toast=document.createElement('div');toast.className='teacherLessonToast';Object.assign(toast.style,{position:'fixed',zIndex:'9999',left:'50%',bottom:'84px',transform:'translateX(-50%)',padding:'10px 15px',borderRadius:'13px',background:'#257a4c',color:'#fff',fontWeight:'800',fontSize:'13px',boxShadow:'0 6px 22px rgba(0,0,0,.2)',textAlign:'center'});document.body.appendChild(toast)}
      toast.textContent=active?'تم إنهاء الحصة':'تم بدء الحصة ✓';
      setTimeout(()=>toast?.remove(),2200);
      return;
    }

    const stat=target.closest('.teacherStat');
    if(stat){
      const label=stat.querySelector('b')?.textContent?.trim();
      if(label==='رسائل جديدة'){stop(event);toStudents('homework',{mode:'messages'});return;}
      if(label==='يحتاجون متابعة'){stop(event);toStudents('followup',{filter:'needs-followup'});return;}
      if(label==='تم تقييم اليوم'){stop(event);toStudents('assessment',{filter:'evaluated'});return;}
      if(label==='عدد الطلاب'){stop(event);toStudents();return;}
    }

    const quick=target.closest('.teacher .tQuick button');
    if(quick){
      const title=quick.querySelector('b')?.textContent?.trim();
      if(title==='المناهج'){stop(event);go('/teacher?section=curriculum');return;}
      if(title==='الطلاب'){stop(event);toStudents();return;}
      if(title==='التقييم الشامل'){stop(event);toStudents('assessment');return;}
      if(title==='التواصل'){stop(event);toStudents('homework',{mode:'messages'});return;}
    }

    const panelAction=target.closest('.teacher .panel>header>button');
    if(panelAction){
      const title=panelAction.closest('.panel')?.querySelector('h3')?.textContent?.trim();
      if(title==='تقدم المنهج'){stop(event);go('/teacher?section=curriculum');return;}
      if(title==='متابعة اليوم'){stop(event);toStudents('followup');return;}
      if(title==='مهامي اليوم'){stop(event);go('/teacher?section=tasks');return;}
      if(title==='الإعلانات'){stop(event);go('/teacher?section=announcements');return;}
    }

    const status=target.closest('.teacher .statusLine');
    if(status){
      const label=status.querySelector('b')?.textContent?.trim();
      if(label==='يحتاجون متابعة'){stop(event);toStudents('followup',{filter:'needs-followup'});return;}
      if(label==='ممتازون اليوم'){stop(event);toStudents('assessment',{filter:'mastered'});return;}
      if(label==='لم يتم تقييمهم'){stop(event);toStudents('assessment',{filter:'unassessed'});return;}
      if(label==='ملاحظات سلوكية'){stop(event);toStudents('behavior',{filter:'behavior'});return;}
    }

    const task=target.closest('.teacher .checkItem');
    if(task){
      const text=task.querySelector('b')?.textContent?.trim()||'';
      if(text.includes('إدخال تقييم لغتي')){stop(event);toStudents('assessment',{subject:'لغتي'});return;}
      if(text.includes('خطط علاجية')){stop(event);toStudents('followup',{mode:'remedial'});return;}
      if(text.includes('إرسال واجبات الدراسات')){stop(event);toStudents('homework',{subject:'الدراسات الإسلامية'});return;}
    }

    const nav=target.closest('.teacher .teacherNav button');
    if(nav){
      const title=nav.querySelector('b')?.textContent?.trim();
      if(title==='الكتب'){stop(event);go('/teacher?section=curriculum');return;}
      if(title==='المزيد'){stop(event);go('/teacher?section=more');return;}
    }
  },true);

  const boot=()=>{markInteractive();applySection();};
  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',boot,{once:true});else boot();
  const root=document.getElementById('root');
  if(root)new MutationObserver(markInteractive).observe(root,{childList:true,subtree:true});
})();
