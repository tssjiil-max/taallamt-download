(()=>{
  if(!location.pathname.startsWith('/teacher/student/'))return;
  const studentId=location.pathname.match(/\/teacher\/student\/(s2-4-\d{2})/)?.[1];if(!studentId)return;
  const configs={
    'إضافة للمتابعة اليومية':{title:'إضافة للمتابعة اليومية',subtitle:'تُحفظ مباشرة في متابعة الطالب',action:'followup',fields:[['summary','ملاحظة المتابعة','textarea']]},
    'خطة علاجية':{title:'الخطة العلاجية',subtitle:'يمكنك تعديل الخطة المقترحة أو كتابتها بنفسك',action:'remediation',fields:[['summary','تفاصيل الخطة / التدريب المطلوب','textarea']]},
    'ملاحظة للطالب':{title:'ملاحظة للطالب',subtitle:'تظهر في صفحة الطالب',action:'student_note',fields:[['summary','الملاحظة','textarea']]},
    'إرسال واجب':{title:'إرسال واجب',subtitle:'يظهر مباشرة في صفحة الطالب',action:'homework',fields:[['title','عنوان الواجب','input'],['instructions','التعليمات','textarea']]},
    'إرسال تدريب منزلي':{title:'إرسال تدريب منزلي',subtitle:'تدريب داعم يظهر في صفحة الطالب',action:'training',fields:[['title','عنوان التدريب','input'],['instructions','التعليمات','textarea']]},
    'رسالة لولي الأمر':{title:'رسالة لولي الأمر',subtitle:'تُحفظ في سجل التواصل وتظهر في صفحة الطالب/الأسرة',action:'guardian_message',fields:[['summary','نص الرسالة','textarea']]},
  };
  const esc=v=>String(v??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
  function close(){document.querySelector('.taFormOverlay')?.remove()}
  function open(config){
    close();const overlay=document.createElement('div');overlay.className='taFormOverlay';
    const fields=config.fields.map(([name,label,type])=>`<label>${esc(label)}</label>${type==='textarea'?`<textarea name="${name}" autocomplete="off"></textarea>`:`<input name="${name}" autocomplete="off"/>`}`).join('');
    overlay.innerHTML=`<section class="taFormCard"><h3>${esc(config.title)}</h3><p>${esc(config.subtitle)}</p><form>${fields}<div class="taFormActions"><button class="taFormSave" type="submit">حفظ وإرسال</button><button class="taFormCancel" type="button">إلغاء</button></div><div class="taFormStatus" hidden></div></form></section>`;
    document.body.appendChild(overlay);overlay.querySelector('.taFormCancel')?.addEventListener('click',close);overlay.addEventListener('click',e=>{if(e.target===overlay)close()});
    overlay.querySelector('form')?.addEventListener('submit',async e=>{
      e.preventDefault();const form=e.currentTarget,status=overlay.querySelector('.taFormStatus'),save=overlay.querySelector('.taFormSave');const payload={studentId,action:config.action};
      for(const [name] of config.fields)payload[name]=form.elements[name]?.value?.trim()||'';
      const required=config.action==='homework'||config.action==='training'?'title':'summary';if(!payload[required]){status.hidden=false;status.className='taFormStatus error';status.textContent='اكتب البيانات المطلوبة أولًا.';return}
      save.disabled=true;status.hidden=false;status.className='taFormStatus';status.textContent='جارٍ الحفظ…';
      try{const response=await fetch('/api/student-state',{method:'POST',headers:{'content-type':'application/json'},body:JSON.stringify(payload)});const data=await response.json();if(!response.ok||!data.ok)throw new Error(data.error||`HTTP_${response.status}`);status.className='taFormStatus ok';status.textContent='تم الحفظ والإرسال ✓';setTimeout(()=>{close();window.dispatchEvent(new Event('focus'))},650)}catch(error){status.className='taFormStatus error';status.textContent=error?.message==='PRODUCTION_WRITE_BLOCKED'?'الحفظ متاح في نسخة التجربة فقط.':'تعذر الحفظ. حاول مرة أخرى.';save.disabled=false}
    });
    overlay.querySelector('input,textarea')?.focus();
  }
  document.addEventListener('click',event=>{
    const target=event.target;if(!(target instanceof Element))return;const button=target.closest('button');if(!button)return;const text=(button.textContent||'').trim();const config=configs[text];if(!config)return;
    event.preventDefault();event.stopPropagation();event.stopImmediatePropagation();open(config);
  },true);
})();
