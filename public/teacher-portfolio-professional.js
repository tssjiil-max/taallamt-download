(()=>{
  if(!location.pathname.startsWith('/teacher/library'))return;
  if(new URLSearchParams(location.search).get('section')!=='portfolio')return;

  const PROFESSIONAL_SECTIONS=[
    'الهوية المهنية','الأهداف المهنية','التخطيط للتعلم','تنفيذ التدريس والأنشطة','التقويم ونواتج التعلم','الفروق الفردية والخطط العلاجية','التواصل مع الأسرة','التحفيز والإنجاز','التطوير المهني والمجتمع المهني','المبادرات والمشروعات','ملخص الأثر'
  ];
  const UPLOAD_SECTIONS=['الهوية المهنية','التخطيط للتعلم','تنفيذ التدريس والأنشطة','التقويم ونواتج التعلم','الفروق الفردية والخطط العلاجية','التواصل مع الأسرة','التحفيز والإنجاز','التطوير المهني والمجتمع المهني','المبادرات والمشروعات'];
  const esc=v=>String(v??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
  const api=async(url,options)=>{const response=await fetch(url,options);const data=await response.json().catch(()=>({}));if(!response.ok||data.ok===false)throw new Error(data.error||`HTTP_${response.status}`);return data};
  const fmtDate=value=>value?new Date(value).toLocaleDateString('ar-SA-u-ca-islamic-umalqura',{year:'numeric',month:'short',day:'numeric'}):'';
  const percent=value=>`${Math.max(0,Math.min(100,Number(value)||0))}%`;

  function waitForContainer(attempt=0){
    const container=document.getElementById('taNativeLibraryContent');
    if(container){setTimeout(()=>renderPortfolio(container),120);return}
    if(attempt<240)requestAnimationFrame(()=>waitForContainer(attempt+1));
  }

  function identityHtml(teacher){
    return `<section class="taPortfolioHero">
      <div class="taPortfolioHeroMark">📘</div>
      <div><p class="taPortfolioEyebrow">ملف إنجاز مهني رقمي</p><h2>${esc(teacher.name||'المعلم')}</h2><p>${esc(teacher.role||'')} · ${esc(teacher.school||'')}</p><p>${esc(teacher.className||'')} · ${esc(teacher.term||'')}</p></div>
    </section>
    <div class="taPortfolioIdentityGrid">
      <article><b>المواد</b><span>${esc((teacher.subjects||[]).join(' · '))}</span></article>
      <article><b>الرؤية المهنية</b><span>${esc(teacher.professionalVision||'')}</span></article>
      <article><b>الرسالة المهنية</b><span>${esc(teacher.professionalMission||'')}</span></article>
    </div>`;
  }

  function goalHtml(goal){
    const progress=Number.isFinite(goal.progress)?`<div class="taGoalTrack"><i style="width:${Math.max(0,Math.min(100,goal.progress))}%"></i></div>`:'';
    return `<article class="taGoalCard"><div class="taGoalTop"><b>${esc(goal.title)}</b><span>${esc(goal.current)}</span></div><p>الهدف: ${esc(goal.target)}</p>${progress}<small>المصدر: ${esc(goal.source)}</small></article>`;
  }

  function evidenceHtml(item){
    const manual=item.manual?'<span class="taEvidenceSource manual">مضاف من الجوال</span>':'<span class="taEvidenceSource">من النظام</span>';
    return `<div class="taEvidence taProfessionalEvidence">${manual}<b>${esc(item.title)}</b>${item.note?`<p>${esc(item.note)}</p>`:''}<small>${fmtDate(item.occurredAt)}</small>${item.downloadUrl?`<div class="taResourceFooter"><a href="${item.downloadUrl}" target="_blank" rel="noopener">فتح / تحميل الشاهد</a></div>`:''}</div>`;
  }

  function sectionDescription(data,title){
    return (data.professionalSections||[]).find(section=>section.title===title)?.description||'';
  }

  function sectionBlock(data,title){
    if(title==='الهوية المهنية')return `<section class="taPortfolioSection professional"><h3>${title}</h3><p class="taSectionPurpose">${esc(sectionDescription(data,title))}</p>${identityHtml(data.teacher||{})}${(data.sections?.[title]||[]).map(evidenceHtml).join('')}</section>`;
    if(title==='الأهداف المهنية')return `<section class="taPortfolioSection professional"><h3>${title}</h3><p class="taSectionPurpose">${esc(sectionDescription(data,title))}</p><div class="taGoals">${(data.professionalGoals||[]).map(goalHtml).join('')}</div></section>`;
    if(title==='ملخص الأثر')return impactBlock(data);
    const items=data.sections?.[title]||[];
    return `<section class="taPortfolioSection professional"><div class="taSectionHeading"><div><h3>${esc(title)}</h3><p class="taSectionPurpose">${esc(sectionDescription(data,title))}</p></div><span class="taSectionCount">${items.length} شاهد</span></div>${items.length?items.slice(0,60).map(evidenceHtml).join(''):'<div class="taEmpty compact">لا توجد شواهد في هذا القسم بعد. سيملؤه النظام تلقائيًا أو يمكنك إضافة شاهد من الجوال.</div>'}</section>`;
  }

  function impactBlock(data){
    const x=data.impactSummary||{};
    return `<section class="taPortfolioSection professional"><h3>ملخص الأثر</h3><p class="taSectionPurpose">${esc(sectionDescription(data,'ملخص الأثر'))}</p>
      <div class="taImpactGrid">
        <article><b>${percent(x.masteryRate)}</b><span>إتقان المهارات المقيمة</span></article>
        <article><b>${x.studentsAssessed||0}/${x.totalStudents||0}</b><span>طلاب تم تقييمهم</span></article>
        <article><b>${x.remediationPlans||0}</b><span>خطط علاجية</span></article>
        <article><b>${percent(x.remediationResolvedRate)}</b><span>تحسن الخطط العلاجية</span></article>
        <article><b>${x.publishedWeeks||0}</b><span>أسابيع موثقة</span></article>
        <article><b>${x.homeworkActivities||0}</b><span>واجبات وأنشطة</span></article>
        <article><b>${x.communications||0}</b><span>تواصل تربوي</span></article>
        <article><b>${x.manualEvidence||0}</b><span>شواهد أضيفت يدويًا</span></article>
      </div><p class="taImpactNarrative">${esc(x.narrative||'')}</p></section>`;
  }

  function uploadPanel(){
    const options=UPLOAD_SECTIONS.map(title=>`<option value="${esc(title)}">${esc(title)}</option>`).join('');
    return `<details class="taPortfolioUploader" ${new URLSearchParams(location.search).get('upload')==='1'?'open':''}>
      <summary>+ إضافة شاهد من الجوال</summary>
      <form id="taProfessionalEvidenceForm" class="taUploadGrid">
        <p class="taUploadHint">يمكنك إضافة صورة أو PDF أو Word أو ملف نصي. يبقى شاهد ملف الإنجاز خاصًا بالمعلم.</p>
        <label>قسم الشاهد</label><select name="portfolioSection">${options}</select>
        <label>عنوان الشاهد</label><input name="title" required placeholder="مثال: دورة في استراتيجيات القراءة">
        <label>الملف</label><input name="file" type="file" required accept="image/*,.pdf,.doc,.docx,.txt">
        <label>وصف مختصر أو أثر الشاهد</label><textarea name="note" placeholder="ماذا يثبت هذا الشاهد؟ وما أثره على الممارسة أو تعلم الطلاب؟"></textarea>
        <div class="taLibActions"><button type="submit">حفظ في ملف الإنجاز</button></div><div class="taUploadStatus" hidden></div>
      </form>
    </details>`;
  }

  async function imagePayload(file){
    if(!file.type.startsWith('image/')||file.size<=2300000)return rawPayload(file);
    const url=URL.createObjectURL(file);
    try{
      const image=await new Promise((resolve,reject)=>{const img=new Image();img.onload=()=>resolve(img);img.onerror=reject;img.src=url});
      const scale=Math.min(1,1600/Math.max(image.width,image.height));
      const canvas=document.createElement('canvas');canvas.width=Math.max(1,Math.round(image.width*scale));canvas.height=Math.max(1,Math.round(image.height*scale));
      canvas.getContext('2d').drawImage(image,0,0,canvas.width,canvas.height);
      const blob=await new Promise(resolve=>canvas.toBlob(resolve,'image/jpeg',.8));
      if(!blob)throw new Error('IMAGE_COMPRESS_FAILED');
      return rawPayload(new File([blob],file.name.replace(/\.[^.]+$/,'.jpg'),{type:'image/jpeg'}));
    }finally{URL.revokeObjectURL(url)}
  }

  async function rawPayload(file){
    if(file.size>3000000)throw new Error('FILE_TOO_LARGE');
    const data=await new Promise((resolve,reject)=>{const reader=new FileReader();reader.onload=()=>resolve(String(reader.result||''));reader.onerror=reject;reader.readAsDataURL(file)});
    return {name:file.name,mimeType:file.type||'application/octet-stream',base64:data.split(',')[1]||''};
  }

  function bindUpload(container){
    const form=container.querySelector('#taProfessionalEvidenceForm');if(!form)return;
    form.addEventListener('submit',async event=>{
      event.preventDefault();const status=form.querySelector('.taUploadStatus');status.hidden=false;status.className='taUploadStatus';status.textContent='جارٍ تجهيز الشاهد ورفعه…';
      try{
        const file=form.elements.file.files?.[0];if(!file)throw new Error('FILE_REQUIRED');
        const payload=await imagePayload(file);
        await api('/api/library-files',{method:'POST',headers:{'content-type':'application/json'},body:JSON.stringify({...payload,title:form.elements.title.value.trim(),category:'teacher-portfolio',visibility:'teacher',portfolioSection:form.elements.portfolioSection.value,note:form.elements.note.value.trim()})});
        status.className='taUploadStatus ok';status.textContent='تمت إضافة الشاهد إلى ملف الإنجاز ✓';
        setTimeout(()=>location.assign('/teacher/library?section=portfolio'),650);
      }catch(error){status.className='taUploadStatus error';status.textContent=error.message==='FILE_TOO_LARGE'?'الملف أكبر من الحد الحالي 3MB. الصور الكبيرة يتم ضغطها تلقائيًا.':'تعذر رفع الشاهد: '+error.message}
    });
  }

  function exportHtml(data){
    const identity=`<h1>ملف إنجاز المعلم</h1><h2>${esc(data.teacher?.name||'')}</h2><p>${esc(data.teacher?.school||'')} — ${esc(data.teacher?.className||'')} — ${esc(data.teacher?.term||'')}</p>`;
    const goals=`<h2>الأهداف المهنية</h2>${(data.professionalGoals||[]).map(g=>`<h3>${esc(g.title)}</h3><p>الهدف: ${esc(g.target)} — الوضع الحالي: ${esc(g.current)}</p>`).join('')}`;
    const sections=PROFESSIONAL_SECTIONS.filter(x=>!['الهوية المهنية','الأهداف المهنية'].includes(x)).map(title=>`<h2>${esc(title)}</h2>${title==='ملخص الأثر'?`<p>${esc(data.impactSummary?.narrative||'')}</p>`:(data.sections?.[title]||[]).map(item=>`<div class="evidence"><b>${esc(item.title)}</b><span>${fmtDate(item.occurredAt)}</span></div>`).join('')||'<p>لا توجد شواهد بعد.</p>'}`).join('');
    return `<!doctype html><html lang="ar" dir="rtl"><head><meta charset="utf-8"><title>ملف إنجاز المعلم</title><style>body{font-family:Arial,Tahoma,sans-serif;max-width:850px;margin:auto;padding:32px;color:#234b70;line-height:1.8}h1{color:#1678bf;border-bottom:3px solid #35a6e8;padding-bottom:10px}h2{margin-top:28px;color:#176cc5;border-bottom:1px solid #dceaf4}.evidence{padding:9px 0;border-bottom:1px solid #edf3f7;display:flex;justify-content:space-between;gap:12px}.evidence span{font-size:12px;color:#7890a2}</style></head><body>${identity}${goals}${sections}</body></html>`;
  }

  function downloadCopy(data){
    const blob=new Blob([exportHtml(data)],{type:'text/html;charset=utf-8'});const url=URL.createObjectURL(blob);const link=document.createElement('a');link.href=url;link.download='ملف-إنجاز-المعلم.html';document.body.appendChild(link);link.click();link.remove();setTimeout(()=>URL.revokeObjectURL(url),1000);
  }

  async function sharePortfolio(data){
    const text=`ملف إنجاز المعلم ${data.teacher?.name||''} — ${data.teacher?.school||''} — ${data.counts?.total||0} شاهدًا موثقًا.`;
    if(navigator.share){try{await navigator.share({title:'ملف إنجاز المعلم',text,url:location.href});return}catch(error){if(error?.name==='AbortError')return}}
    try{await navigator.clipboard.writeText(`${text}\n${location.href}`);alert('تم نسخ رابط ملف الإنجاز للمشاركة.')}catch{alert(text)}
  }

  function bindActions(container,data){
    container.querySelector('[data-portfolio-print]')?.addEventListener('click',()=>window.print());
    container.querySelector('[data-portfolio-download]')?.addEventListener('click',()=>downloadCopy(data));
    container.querySelector('[data-portfolio-share]')?.addEventListener('click',()=>sharePortfolio(data));
    bindUpload(container);
  }

  async function renderPortfolio(container){
    if(container.dataset.professionalPortfolioLoading==='1')return;container.dataset.professionalPortfolioLoading='1';
    container.innerHTML='<div class="taEmpty">جارٍ إنشاء ملف الإنجاز من بيانات النظام…</div>';
    try{
      const data=await api('/api/teacher-portfolio');
      const sections=PROFESSIONAL_SECTIONS.map(title=>sectionBlock(data,title)).join('');
      container.innerHTML=`<div class="taPortfolioAutoNote"><b>ملف حي يتحدث تلقائيًا</b><span>يُنشئ محتواه من التخطيط والتقييم والواجبات والخطط العلاجية والتواصل والتحفيز داخل «تعلّمت»، ويمكنك إضافة شواهد خارجية من جوالك.</span></div>
        <div class="taStandaloneActions taPortfolioActions"><button type="button" data-portfolio-print>طباعة / حفظ PDF</button><button type="button" data-portfolio-download>تحميل نسخة</button><button type="button" class="secondary" data-portfolio-share>إرسال / مشاركة</button></div>
        ${uploadPanel()}
        <div class="taSummaryGrid professional"><div class="taSummaryCard"><b>${data.counts?.total||0}</b><span>إجمالي الشواهد</span></div><div class="taSummaryCard"><b>${percent(data.impactSummary?.masteryRate||0)}</b><span>إتقان المهارات</span></div><div class="taSummaryCard"><b>${data.impactSummary?.studentsAssessed||0}</b><span>طلاب تم تقييمهم</span></div><div class="taSummaryCard"><b>${data.counts?.manualFiles||0}</b><span>شواهد من الجوال</span></div></div>${sections}`;
      bindActions(container,data);
    }catch(error){container.innerHTML=`<div class="taEmpty">تعذر إنشاء ملف الإنجاز: ${esc(error.message)}</div>`;container.dataset.professionalPortfolioLoading='0'}
  }

  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',()=>waitForContainer(),{once:true});else waitForContainer();
})();
