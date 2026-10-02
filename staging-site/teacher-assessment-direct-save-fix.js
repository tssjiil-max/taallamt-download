(()=>{
  const match=location.pathname.match(/^\/teacher\/student\/(s2-4-\d{2})\/?$/);if(!match)return;
  const studentId=match[1],group=new URLSearchParams(location.search).get('group');
  const style=document.createElement('style');style.id='teacher-assessment-direct-save-fix-style';style.textContent='.teacherStudentAdmin .tsaAssessmentSave{display:none!important}';document.head.appendChild(style);
  const removeLegacySave=()=>{document.querySelectorAll('.teacherStudentAdmin .tsaAssessmentSave').forEach(node=>node.remove());};
  const assessmentComplete=()=>{const rows=[...document.querySelectorAll('.teacherStudentAdmin [data-panel="assessment"] .tsaSubjectRow')];return rows.length===5&&rows.every(row=>row.querySelector('.tsaChoices button.selected'));};
  const goNext=()=>{
    if(group!=='followup'&&group!=='focused')return;
    let ids=[];try{ids=JSON.parse(sessionStorage.getItem(`taallamtAssessmentGroupIds:${group}`)||'[]');}catch{}
    const index=ids.indexOf(studentId),next=index>=0?ids[index+1]:null;
    if(next)location.href=`/teacher/student/${encodeURIComponent(next)}?tab=assessment&group=${encodeURIComponent(group)}`;
    else location.href=`/teacher/students?action=assessment&group=${encodeURIComponent(group)}`;
  };
  const waitForSaveThenAdvance=(button,behaviorRow)=>{
    let tries=0;
    const check=()=>{
      tries+=1;
      if(button.disabled&&tries<80){setTimeout(check,50);return;}
      if(button.disabled)return;
      if(behaviorRow){const status=document.querySelector('.teacherStudentAdmin .tsaLiveStatus');if(status?.dataset?.tone==='error')return;}
      if(assessmentComplete())goNext();
    };
    setTimeout(check,0);
  };
  document.addEventListener('click',event=>{
    const target=event.target;if(!(target instanceof Element))return;
    const button=target.closest('.teacherStudentAdmin [data-panel="assessment"] .tsaChoices button');if(!button)return;
    const row=button.closest('.tsaSubjectRow');if(!row)return;
    row.querySelectorAll('.tsaChoices button').forEach(choice=>choice.classList.toggle('selected',choice===button));
    waitForSaveThenAdvance(button,row.classList.contains('tsaBehaviorRow'));
  },true);
  removeLegacySave();const root=document.getElementById('root')||document.body;new MutationObserver(removeLegacySave).observe(root,{childList:true,subtree:true});
})();
