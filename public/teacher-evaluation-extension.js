(()=>{
  const match=()=>location.pathname.match(/^\/teacher\/student\/(s2-4-\d{2})\/?$/);
  const SUBJECT_TARGETS=['subject:arabic','subject:quran','subject:islamic','subject:spelling_handwriting'];
  const asArray=value=>Array.isArray(value)?value:value===undefined||value===null?[]:[value];
  const textValue=value=>typeof value==='string'?value.trim():value&&typeof value==='object'?String(value.label||value.name||value.title||value.valueName||value.value||'').trim():'';
  const unique=list=>[...new Set(list.map(textValue).filter(Boolean))];

  function weeklyValueNames(state){
    const fields=['valueNames','values','value','valueName','virtues','linkedValues','coreValues'];
    const values=[];const targets=new Map((state?.curriculum||[]).map(item=>[String(item.id),item]));
    for(const item of state?.weeklyPlan||[]){
      for(const field of fields)for(const value of asArray(item?.[field]))values.push(value);
      for(const id of asArray(item?.targetIds)){const target=targets.get(String(id));if(!target)continue;for(const field of fields)for(const value of asArray(target?.[field]))values.push(value);}
    }
    return unique(values);
  }

  async function fetchState(studentId){const response=await fetch(`/api/student-state?studentId=${encodeURIComponent(studentId)}`,{cache:'no-store'});const data=await response.json().catch(()=>({}));if(!response.ok||!data.ok)throw new Error(data.error||`HTTP_${response.status}`);return data;}
  async function saveExtension(studentId,payload){const response=await fetch('/api/student-evaluation',{method:'POST',headers:{'content-type':'application/json'},body:JSON.stringify({studentId,...payload})});const data=await response.json().catch(()=>({}));if(!response.ok||!data.ok)throw new Error(data.error||`HTTP_${response.status}`);return data;}

  function installStyle(){
    if(document.getElementById('teacher-evaluation-extension-style'))return;
    const style=document.createElement('style');style.id='teacher-evaluation-extension-style';style.textContent=`
      .teacherStudentAdmin .tsaValueRow{display:grid;grid-template-columns:minmax(78px,.9fr) 1.7fr;gap:8px;align-items:center;padding:10px 0;border-bottom:1px solid #edf2f6}
      .teacherStudentAdmin .tsaValueRow>b{font-size:12px;color:#244c75}.teacherStudentAdmin .tsaValueRow small{display:block;font-size:8px;color:#7c8fa0;margin-top:2px}
      .teacherStudentAdmin .tsaValueRow .tsaChoices{display:flex;gap:5px;flex-wrap:wrap}.teacherStudentAdmin .tsaValueRow .tsaChoices button{flex:1 1 70px;min-height:34px;border:1px solid #dce8f1;border-radius:9px;background:#fff;font-size:9px;font-weight:800}.teacherStudentAdmin .tsaValueRow .tsaChoices button.selected{background:#e8f5ff;border-color:#58aee7;color:#116ca8}.teacherStudentAdmin .tsaValueRow .tsaChoices button:disabled{opacity:.5}
    `;document.head.appendChild(style);
  }

  function setSelected(row,button){row.querySelectorAll('.tsaChoices button').forEach(choice=>choice.classList.toggle('selected',choice===button));}

  async function enhance(){
    const route=match();if(!route)return false;
    const root=document.querySelector('.teacherStudentAdmin');if(!root)return false;
    if(root.dataset.evaluationExtended==='true')return true;
    root.dataset.evaluationExtended='true';installStyle();const studentId=route[1];

    root.querySelectorAll('.tsaSubjectRow[data-subject] .tsaChoices').forEach(choices=>{
      if(choices.querySelector('[data-eval-extension="not_mastered"]'))return;
      const button=document.createElement('button');button.type='button';button.dataset.value='not_mastered';button.dataset.evalExtension='not_mastered';button.textContent='لم يتقن';choices.appendChild(button);
    });

    const behaviorRow=root.querySelector('.tsaBehaviorRow');
    if(behaviorRow&&!root.querySelector('.tsaValueRow')){
      const valueRow=document.createElement('article');valueRow.className='tsaValueRow';
      valueRow.innerHTML='<div><b>القيم</b><small data-value-names>حسب توزيع المنهج</small></div><div class="tsaChoices"><button type="button" data-value="distinguished" data-eval-extension="value">متميز ⭐</button><button type="button" data-value="consistent" data-eval-extension="value">مستمر</button><button type="button" data-value="needs_followup" data-eval-extension="value">يحتاج متابعة</button></div>';
      behaviorRow.insertAdjacentElement('afterend',valueRow);
    }

    let currentValues=[];
    try{const state=await fetchState(studentId);currentValues=weeklyValueNames(state);const note=root.querySelector('.tsaValueRow [data-value-names]');if(note)note.textContent=currentValues.length?`قيم هذا الأسبوع: ${currentValues.join('، ')}`:'لا توجد قيمة محددة في توزيع هذا الأسبوع';root.querySelectorAll('.tsaValueRow .tsaChoices button').forEach(button=>{button.disabled=!currentValues.length;});}catch{const note=root.querySelector('.tsaValueRow [data-value-names]');if(note)note.textContent='تعذر تحميل قيم هذا الأسبوع';root.querySelectorAll('.tsaValueRow .tsaChoices button').forEach(button=>{button.disabled=true;});}

    root.addEventListener('click',async event=>{
      const button=event.target.closest?.('[data-eval-extension]');if(!button||!root.contains(button))return;
      event.preventDefault();event.stopPropagation();event.stopImmediatePropagation();
      const row=button.closest('.tsaSubjectRow,.tsaValueRow');if(!row)return;const previous=row.querySelector('.tsaChoices button.selected');setSelected(row,button);row.querySelectorAll('.tsaChoices button').forEach(choice=>{choice.disabled=true;});
      try{
        if(button.dataset.evalExtension==='not_mastered'){
          const targetId=SUBJECT_TARGETS[Number(row.dataset.subject)];if(!targetId)throw new Error('ASSESSMENT_TARGET_INVALID');
          await saveExtension(studentId,{action:'academic',targetId,result:'not_mastered'});
        }else if(button.dataset.evalExtension==='value'){
          if(!currentValues.length)throw new Error('VALUE_REQUIRED');
          await saveExtension(studentId,{action:'value',code:button.dataset.value,valueNames:currentValues});
        }
      }catch{setSelected(row,previous);alert('تعذر حفظ التقييم. حاول مرة أخرى.');}
      finally{row.querySelectorAll('.tsaChoices button').forEach(choice=>{choice.disabled=row.classList.contains('tsaValueRow')&&!currentValues.length;});}
    },true);
    return true;
  }

  const boot=()=>{let attempts=0;const timer=setInterval(()=>{attempts++;enhance().then(done=>{if(done||attempts>30)clearInterval(timer)});},100);};
  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',boot,{once:true});else boot();
})();
