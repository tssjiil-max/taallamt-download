(()=>{
  const match=location.pathname.match(/^\/teacher\/student\/(s2-4-\d{2})\/?$/);
  if(!match)return;
  const studentId=match[1];

  const style=document.createElement('style');
  style.id='teacher-assessment-direct-save-fix-style';
  style.textContent='.teacherStudentAdmin .tsaAssessmentSave{display:none!important}';
  document.head.appendChild(style);

  const removeLegacySave=()=>{
    document.querySelectorAll('.teacherStudentAdmin .tsaAssessmentSave').forEach(node=>node.remove());
  };

  const assessmentComplete=()=>{
    const rows=[...document.querySelectorAll('.teacherStudentAdmin [data-panel="assessment"] .tsaSubjectRow')];
    return rows.length===5&&rows.every(row=>row.querySelector('.tsaChoices button.selected'));
  };

  const openStudent=()=>{
    location.href=`/student?studentId=${encodeURIComponent(studentId)}`;
  };

  const waitForSaveThenOpen=(button,behaviorRow)=>{
    let tries=0;
    const check=()=>{
      tries+=1;
      if(button.disabled&&tries<80){setTimeout(check,50);return;}
      if(button.disabled)return;
      if(behaviorRow){
        const status=document.querySelector('.teacherStudentAdmin .tsaLiveStatus');
        if(status?.dataset?.tone==='error')return;
      }
      if(assessmentComplete())openStudent();
    };
    setTimeout(check,0);
  };

  document.addEventListener('click',event=>{
    const target=event.target;
    if(!(target instanceof Element))return;
    const button=target.closest('.teacherStudentAdmin [data-panel="assessment"] .tsaChoices button');
    if(!button)return;
    const row=button.closest('.tsaSubjectRow');
    if(!row)return;
    row.querySelectorAll('.tsaChoices button').forEach(choice=>choice.classList.toggle('selected',choice===button));
    waitForSaveThenOpen(button,row.classList.contains('tsaBehaviorRow'));
  },true);

  removeLegacySave();
  const root=document.getElementById('root')||document.body;
  new MutationObserver(removeLegacySave).observe(root,{childList:true,subtree:true});
})();
