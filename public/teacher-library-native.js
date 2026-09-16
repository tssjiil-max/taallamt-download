(()=>{
  if(!location.pathname.startsWith('/teacher/library'))return;
  const CATEGORY={
    'الكتب والأدلة':'books',
    'أوراق العمل':'worksheets',
    'الخطط العلاجية':'remediation',
    'الخطط الأسبوعية':'weekly',
    'نماذج التقييم':'assessments',
    'الإملاء والخط':'spelling',
    'مواد تعليمية جاهزة للطباعة':'general'
  };
  const TITLES={books:'الكتب والأدلة',worksheets:'أوراق العمل',remediation:'الخطط العلاجية',weekly:'الخطط الأسبوعية',assessments:'نماذج التقييم',spelling:'الإملاء والخط',general:'مواد تعليمية جاهزة للطباعة',portfolio:'ملف إنجاز المعلم'};
  const STUDENTS=['أحمد بسام الأحمد','أسامه سلطان الصاعدي','أمير نايف الحجيلي','أنس أحمد الجهني','أوس نايف الشريف','أويس عادل المالكي','تميم ماجد الحجيلي','ثامر عبدالله العوفي','راكان حاتم الجهني','ريان محمود بري','سلطان فهد الجهني','شامخ بدر الجهني','عادل غالب العنزي','عبدالجليل سالم عبدالجليل','عبدالرحمن نواف الحازمي','عمر حميد العمري','فيصل محمد المطيري','قصي عبدالله الحجيلي','كنان محمد اليوسفي','محمد سماح البوق','محمد صالح عواد','موسى رياض الأحمد','نايف أحمد الجهني','نواف مطلق العمري','الحسن عادل الرجبي','وسام سلطان السناني','يمان أحمد الجهني','يوسف فلاح الحربي','يوسف محمد الجهني'].map((name,index)=>({id:`s2-4-${String(index+1).padStart(2,'0')}`,name,number:index+1}));
  const esc=v=>String(v??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
  const api=async(url,options)=>{const response=await fetch(url,options);const data=await response.json().catch(()=>({}));if(!response.ok||data.ok===false)throw new Error(data.error||`HTTP_${response.status}`);return data};
  const params=()=>new URLSearchParams(location.search);
  const section=()=>params().get('section')||'';
  const hrefFor=key=>`/teacher/library?section=${encodeURIComponent(key)}`;

  function waitForGrid(attempt=0){
    const grid=document.querySelector('.libraryGrid');
    if(grid){boot(grid);return}
    if(attempt<180)requestAnimationFrame(()=>waitForGrid(attempt+1));
  }

  function mainToolbar(grid){
    if(document.querySelector('[data-native-library-toolbar]'))return;
    const toolbar=document.createElement('div');
    toolbar.className='taLibraryToolbar';
    toolbar.dataset.nativeLibraryToolbar='1';
    toolbar.innerHTML=`<a class="taNativeAction" href="${hrefFor('general')}&upload=1">+ رفع ملف</a><a class="taNativeAction" href="${hrefFor('portfolio')}">ملف إنجاز المعلم</a>`;
    const note=document.createElement('p');note.className='taLibraryNote';note.textContent='كل ملف يمكن أن يكون عامًا لجميع الطلاب، خاصًا لطالب أو مجموعة، أو للمعلم فقط.';
    grid.before(toolbar);toolbar.after(note);
    [...toolbar.querySelectorAll('a')].forEach(a=>{a.style.textDecoration='none';a.style.display='flex';a.style.alignItems='center';a.style.justifyContent='center'});
  }

  function convertCardsToLinks(grid){
    grid.querySelectorAll('.libraryCard').forEach(card=>{
      if(card.tagName==='A')return;
      const title=card.querySelector('b')?.textContent?.trim()||'';
      const key=CATEGORY[title];if(!key)return;
      const link=document.createElement('a');
      link.className=card.className;link.href=hrefFor(key);link.innerHTML=card.innerHTML;link.setAttribute('aria-label',`فتح ${title}`);link.style.textDecoration='none';link.style.color='inherit';
      card.replaceWith(link);
    });
  }

  function sectionShell(grid,key){
    const title=TITLES[key]||'المكتبة';
    const header=document.querySelector('.sectionHeader h1');if(header)header.textContent=title;
    const subtitle=document.querySelector('.sectionHeader p');if(subtitle)subtitle.textContent='مكتبة المعلم التعليمية';
    grid.className='taStandaloneBody';
    grid.innerHTML=`<div class="taStandaloneActions"><a class="secondary" href="/teacher/library">‹ الرجوع للمكتبة</a>${key!=='portfolio'?`<a href="${hrefFor(key)}&upload=1">+ رفع ملف لهذا القسم</a>`:''}</div><div id="taNativeLibraryContent"><div class="taEmpty">جارٍ تحميل القسم…</div></div>`;
  }

  function fileCard(file){
    const access=file.visibility==='public'?'عام':file.visibility==='private'?'خاص':'للمعلم';
    return `<article class="taResource"><span class="taBadge ${file.visibility==='private'?'private':file.visibility==='teacher'?'teacher':''}">${access}</span> <b>${esc(file.title||file.name||'ملف')}</b><p>${esc(file.note||file.subject||'')}</p><div class="taResourceFooter"><a href="/api/library-files?action=download&id=${encodeURIComponent(file.id)}&role=teacher" target="_blank" rel="noopener">فتح / تحميل</a></div></article>`;
  }

  function uploadForm(category){
    const people=STUDENTS.map(s=>`<label><input type="checkbox" value="${s.id}"> ${s.number}. ${esc(s.name)}</label>`).join('');
    return `<details class="taResource" ${params().get('upload')==='1'?'open':''}><summary style="font-weight:900;cursor:pointer">رفع ملف جديد</summary><form id="taNativeUploadForm" class="taUploadGrid" style="margin-top:10px"><label>الملف</label><input name="file" type="file" required accept=".pdf,.jpg,.jpeg,.png,.webp,.doc,.docx,.txt"><label>العنوان</label><input name="title" required><label>الإتاحة</label><select name="visibility"><option value="public">عام — يظهر لجميع الطلاب</option><option value="private">خاص — لطالب أو مجموعة</option><option value="teacher">للمعلم فقط</option></select><div class="taPrivateTargets" hidden><label>الطلاب المحددون</label><div class="taStudentPick">${people}</div></div><label>ملاحظة</label><textarea name="note"></textarea><div class="taLibActions"><button type="submit">رفع وحفظ</button></div><div class="taUploadStatus" hidden></div></form></details>`;
  }

  function bindUpload(category){
    const form=document.getElementById('taNativeUploadForm');if(!form)return;
    const visibility=form.elements.visibility;visibility.addEventListener('change',()=>{const targets=form.querySelector('.taPrivateTargets');if(targets)targets.hidden=visibility.value!=='private'});
    form.addEventListener('submit',async event=>{
      event.preventDefault();const status=form.querySelector('.taUploadStatus');status.hidden=false;status.className='taUploadStatus';status.textContent='جارٍ رفع الملف…';
      try{
        const file=form.elements.file.files?.[0];if(!file)throw new Error('FILE_REQUIRED');if(file.size>3000000)throw new Error('FILE_TOO_LARGE');
        const base64=await new Promise((resolve,reject)=>{const reader=new FileReader();reader.onload=()=>resolve(String(reader.result||'').split(',')[1]||'');reader.onerror=reject;reader.readAsDataURL(file)});
        const targetStudentIds=[...form.querySelectorAll('.taStudentPick input:checked')].map(input=>input.value);
        await api('/api/library-files',{method:'POST',headers:{'content-type':'application/json'},body:JSON.stringify({name:file.name,mimeType:file.type||'application/octet-stream',base64,title:form.elements.title.value.trim(),category,visibility:visibility.value,targetStudentIds,note:form.elements.note.value.trim()})});
        status.className='taUploadStatus ok';status.textContent='تم رفع الملف وحفظه ✓';setTimeout(()=>location.assign(hrefFor(category)),650);
      }catch(error){status.className='taUploadStatus error';status.textContent=error.message==='FILE_TOO_LARGE'?'الملف أكبر من 3MB.':'تعذر رفع الملف: '+error.message}
    });
  }

  function contentCard(item,actionHref,actionLabel){
    const details=[item.unit||item.surah,item.lesson,item.skill].filter(Boolean).join(' · ');
    return `<article class="taResource"><b>${esc(item.title||'')}</b><p>${esc(details)}</p>${actionHref?`<div class="taResourceFooter"><a href="${actionHref}">${esc(actionLabel)}</a></div>`:''}</article>`;
  }

  async function renderPortfolio(container){
    const data=await api('/api/teacher-portfolio');
    const sections=Object.entries(data.sections||{}).map(([name,items])=>`<section class="taPortfolioSection"><h3>${esc(name)} (${items.length})</h3>${items.slice(0,30).map(item=>`<div class="taEvidence"><b>${esc(item.title)}</b><small>${item.occurredAt?new Date(item.occurredAt).toLocaleDateString('ar-SA'):''}</small>${item.downloadUrl?`<div class="taResourceFooter"><a href="${item.downloadUrl}" target="_blank">فتح الشاهد</a></div>`:''}</div>`).join('')}</section>`).join('');
    container.innerHTML=`<div class="taSummaryGrid"><div class="taSummaryCard"><b>${data.counts?.total||0}</b><span>إجمالي الشواهد</span></div><div class="taSummaryCard"><b>${data.counts?.assessments||0}</b><span>تقييمات</span></div><div class="taSummaryCard"><b>${data.counts?.remediation||0}</b><span>خطط علاجية</span></div><div class="taSummaryCard"><b>${data.counts?.manualFiles||0}</b><span>شواهد مرفوعة</span></div></div><div class="taStandaloneActions"><a href="${hrefFor('general')}&upload=1">+ إضافة شاهد من الجوال</a><button type="button" onclick="window.print()">طباعة / حفظ PDF</button></div>${sections||'<div class="taEmpty">سيبدأ الملف بجمع الشواهد تلقائيًا مع استخدام الموقع.</div>'}`;
  }

  async function renderCategory(key){
    const container=document.getElementById('taNativeLibraryContent');if(!container)return;
    try{
      if(key==='portfolio'){await renderPortfolio(container);return}
      const [library,preview]=await Promise.all([api('/api/library-files?role=teacher'),api('/api/learning-automation?action=preview')]);
      const files=(library.files||[]).filter(file=>file.category===key);const content=preview.content||{};
      let html=uploadForm(key);
      if(key==='books')html+=`<article class="taResource"><b>دليل مواد الصف الثاني — الفصل الأول 1448هـ</b><p>مرجع الوحدات والدروس والمهارات المستخدم في الأتمتة.</p></article><article class="taResource"><b>توزيع حفظ القرآن الكريم</b><p>التوزيع الأسبوعي الموثق للحفظ والمراجعة.</p></article>`;
      if(key==='weekly')html+=Object.values(content).map(item=>contentCard(item)).join('');
      if(key==='worksheets')html+=Object.values(content).map(item=>contentCard(item,`${hrefFor('worksheets')}&print=${encodeURIComponent(item.subject)}`,'توليد ورقة عمل')).join('');
      if(key==='assessments')html+=Object.values(content).map(item=>contentCard(item,`${hrefFor('assessments')}&print=${encodeURIComponent(item.subject)}`,'إنشاء نموذج تقييم')).join('');
      if(key==='spelling'&&content.spelling)html+=contentCard(content.spelling,`${hrefFor('spelling')}&print=spelling`,'تدريب / اختبار المهارة');
      if(key==='remediation'){
        const remediation=await api('/api/remediation-suggestions');const items=remediation.suggestions||[];
        html+=(items.length?items.map(item=>`<article class="taResource"><b>${esc(item.studentName)} — ${esc(item.skill||item.title)}</b><p>لم يتقن متتالية: ${item.notMasteredCount||0} · يحتاج تدريب: ${item.needsPracticeCount||0}</p>${item.activePlanId?'<span class="taBadge">خطة نشطة</span>':''}</article>`).join(''):'<div class="taEmpty">لا توجد حالات تحتاج خطة علاجية آلية الآن.</div>');
      }
      if(files.length)html+='<h3 style="margin:14px 3px 5px">ملفاتي</h3>'+files.map(fileCard).join('');else if(key==='general')html+='<div class="taEmpty">لا توجد ملفات مضافة بعد.</div>';
      container.innerHTML=html;bindUpload(key);
      const print=params().get('print');if(print&&content[print])renderPrintable(container,content[print],key==='assessments'?'assessment':'worksheet');
    }catch(error){container.innerHTML=`<div class="taEmpty">تعذر تحميل القسم: ${esc(error.message)}</div>`}
  }

  function renderPrintable(container,item,type){
    const title=type==='assessment'?`نموذج تقييم — ${item.title}`:`ورقة عمل — ${item.title}`;
    const details=`<div class="taResource"><b>${esc(item.title)}</b><p>${esc([item.unit||item.surah,item.lesson,item.skill].filter(Boolean).join(' · '))}</p></div>`;
    const tasks=type==='assessment'?`<article class="taResource"><b>المهمة 1</b><p>تطبيق مباشر على المهارة.</p><hr><b>المهمة 2</b><p>سؤال تحقق قصير.</p><hr><b>النتيجة:</b> ☐ أتقن &nbsp; ☐ يحتاج تدريب &nbsp; ☐ لم يتقن</article>`:`<article class="taResource"><b>تدريب 1</b><p>أراجع المهارة وأطبقها.</p><hr><b>تدريب 2</b><p>أكتب مثالًا صحيحًا.</p><hr><b>تدريب 3</b><p>تطبيق قصير على المهارة.</p></article>`;
    container.innerHTML=`<div class="taStandaloneActions"><a class="secondary" href="${hrefFor(type==='assessment'?'assessments':'worksheets')}">‹ رجوع</a><button type="button" onclick="window.print()">طباعة / حفظ PDF</button></div><h2>${esc(title)}</h2>${details}${tasks}`;
  }

  function boot(grid){
    const key=section();
    if(!key){mainToolbar(grid);convertCardsToLinks(grid);return}
    if(!Object.prototype.hasOwnProperty.call(TITLES,key))return;
    sectionShell(grid,key);renderCategory(key);
  }

  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',()=>waitForGrid(),{once:true});else waitForGrid();
})();
