const clampStars=(value)=>Math.max(0,Math.min(30,Number.isFinite(Number(value))?Number(value):0));
const SHAKABUMBO_PROFILE='/student-assets/student-profile.webp';
const SHAKABUMBO_MAIN='/student-assets/student-main-logo.webp';
const SHAKABUMBO_REWARD='/student-assets/student-reward-star.webp';
const SHAKABUMBO_NAV=SHAKABUMBO_MAIN;
const SUBJECT_ASSETS={
  'لغتي':'/student-assets/subject-lughati.webp',
  'القرآن الكريم':'/student-assets/subject-quran.webp',
  'الدراسات الإسلامية':'/student-assets/subject-islamic.webp',
  'الإملاء والخط':'/student-assets/subject-writing.webp'
};
const CLEAN_ASSET_CACHE=new Map();
function readStudent(){try{return JSON.parse(localStorage.getItem('studentProfile')||'{}')||{}}catch{return {}}}
function currentStars(){const student=readStudent();const value=student.currentStars??student.stars??student.monthlyStars??localStorage.getItem('studentStars');return clampStars(value)}
function studentName(){const s=readStudent();const raw=s.studentName||s.fullName||s.displayName||s.name||localStorage.getItem('studentName')||'';const value=String(raw).trim();return value&&value!=='أحمد'?value:'اسم الطالب'}
function studentId(){return new URLSearchParams(location.search).get('studentId')||readStudent().id||localStorage.getItem('activeStudentId')||''}
function ensureInfoCard(container,key,title){let card=container.querySelector(`[data-student-info="${key}"]`);if(card)return card;card=document.createElement('div');card.dataset.studentInfo=key;const heading=document.createElement('b');heading.textContent=title;card.appendChild(heading);container.appendChild(card);return card}
async function cleanAndCropAsset(src){
  if(CLEAN_ASSET_CACHE.has(src))return CLEAN_ASSET_CACHE.get(src);
  const job=(async()=>{
    const response=await fetch(src,{cache:'force-cache'});
    if(!response.ok)throw new Error(`asset ${response.status}: ${src}`);
    const bitmap=await createImageBitmap(await response.blob());
    const w=bitmap.width,h=bitmap.height;
    const canvas=document.createElement('canvas');canvas.width=w;canvas.height=h;
    const ctx=canvas.getContext('2d',{willReadFrequently:true});ctx.drawImage(bitmap,0,0);bitmap.close?.();
    const image=ctx.getImageData(0,0,w,h),data=image.data;
    const candidate=new Uint8Array(w*h),seen=new Uint8Array(w*h),queue=new Int32Array(w*h);let head=0,tail=0;
    for(let i=0,p=0;i<w*h;i++,p+=4){const a=data[p+3];candidate[i]=(a>0&&data[p]<=24&&data[p+1]<=24&&data[p+2]<=24)?1:0}
    const push=(idx)=>{if(candidate[idx]&&!seen[idx]){seen[idx]=1;queue[tail++]=idx}};
    for(let x=0;x<w;x++){push(x);push((h-1)*w+x)}for(let y=0;y<h;y++){push(y*w);push(y*w+w-1)}
    while(head<tail){const i=queue[head++],x=i%w,y=(i/w)|0;if(x>0)push(i-1);if(x+1<w)push(i+1);if(y>0)push(i-w);if(y+1<h)push(i+w)}
    let minX=w,minY=h,maxX=-1,maxY=-1;
    for(let i=0,p=0;i<w*h;i++,p+=4){if(seen[i])data[p+3]=0;if(data[p+3]>2){const x=i%w,y=(i/w)|0;if(x<minX)minX=x;if(x>maxX)maxX=x;if(y<minY)minY=y;if(y>maxY)maxY=y}}
    ctx.putImageData(image,0,0);
    if(maxX<minX||maxY<minY)return src;
    const pad=Math.max(2,Math.round(Math.max(maxX-minX+1,maxY-minY+1)*0.015));
    const sx=Math.max(0,minX-pad),sy=Math.max(0,minY-pad),ex=Math.min(w,maxX+pad+1),ey=Math.min(h,maxY+pad+1);
    const crop=document.createElement('canvas');crop.width=ex-sx;crop.height=ey-sy;crop.getContext('2d').drawImage(canvas,sx,sy,crop.width,crop.height,0,0,crop.width,crop.height);
    return crop.toDataURL('image/png');
  })().catch(()=>src);
  CLEAN_ASSET_CACHE.set(src,job);return job;
}
function ensureImg(parent,selector,className,src,alt){if(!parent)return null;let img=parent.querySelector(selector);if(!img){img=document.createElement('img');img.className=className;parent.prepend(img)}img.alt=alt||'';if(img.dataset.cleanSource!==src){img.dataset.cleanSource=src;img.style.opacity='0';cleanAndCropAsset(src).then(clean=>{if(img.isConnected&&img.dataset.cleanSource===src){img.src=clean;img.style.opacity='1'}})}return img}
function installCleanStudentTop(student){
  const host=student.querySelector('.studentProfileMain');if(!host)return;
  host.querySelectorAll('.studentDailyWisdom,.studentProfileDetails').forEach(n=>n.remove());
  let top=host.querySelector('.studentCleanTop');
  if(!top){
    top=document.createElement('section');top.className='studentCleanTop';top.setAttribute('aria-label','بيانات الطالب');
    const photo=document.createElement('div');photo.className='studentCleanPhoto';
    const details=document.createElement('section');details.className='studentCleanDetails';
    top.append(photo,details);host.appendChild(top);
  }
  const photo=top.querySelector('.studentCleanPhoto');ensureImg(photo,'.studentCleanPhotoImage','studentCleanPhotoImage',SHAKABUMBO_PROFILE,'صورتي');
  if(photo&&!photo.dataset.studentPhotoBound){photo.dataset.studentPhotoBound='true';photo.setAttribute('role','button');photo.tabIndex=0;photo.addEventListener('click',()=>openStudentPanel('photo'));photo.addEventListener('keydown',event=>{if(event.key==='Enter'||event.key===' '){event.preventDefault();openStudentPanel('photo')}})}
  const details=top.querySelector('.studentCleanDetails');
  const signature=studentName();
  if(details.dataset.signature!==signature){
    details.dataset.signature=signature;details.replaceChildren();
    const nameRow=document.createElement('div');nameRow.className='studentDetailRow';
    const nameLabel=document.createElement('span');nameLabel.className='studentDetailLabel';nameLabel.textContent='اسم الطالب:';
    const nameValue=document.createElement('strong');nameValue.className='studentDetailValue';nameValue.textContent=signature;
    nameRow.append(nameLabel,nameValue);
    const gradeRow=document.createElement('div');gradeRow.className='studentDetailRow';
    const gradeLabel=document.createElement('span');gradeLabel.className='studentDetailLabel';gradeLabel.textContent='الصف:';
    const gradeValue=document.createElement('strong');gradeValue.className='studentDetailValue';gradeValue.textContent='الثاني / 4';
    gradeRow.append(gradeLabel,gradeValue);
    const school=document.createElement('div');school.className='studentSchool';school.textContent='مدرسة عمرو بن أوس الثقفي';
    const motto=document.createElement('p');motto.className='studentMotto';motto.textContent='أتعلم وأصنع مستقبلي المشرق!';
    details.append(nameRow,gradeRow,school,motto);
  }
}
function installStrictStudentVisualGuard(){if(document.getElementById('student-visual-guard'))return;const style=document.createElement('style');style.id='student-visual-guard';style.textContent=`
.student .studentSubject svg,.student .studentSubject picture,.student .studentSubject .subjectIcon{display:none!important;visibility:hidden!important;width:0!important;height:0!important;margin:0!important;padding:0!important}
.student .studentSubject{background-image:none!important}
.student .studentProfile::before,.student .studentProfileMain::before{display:none!important;content:none!important;background:none!important;mask:none!important}
.student .profileIdentity,.student .studentMainLogo,.student .starToday{display:none!important}
.student .nextReward{display:none!important}
.student .studentCleanPhotoImage,.student .rewardMascotImage,.student .studentNavMascot,.student .studentSubjectMascot{background:transparent!important}
`;document.head.appendChild(style)}
function purgeRequestedIcons(student){student.querySelectorAll('.studentSubject img:not(.studentSubjectMascot),.studentSubject svg,.studentSubject picture,.studentSubject .subjectIcon,.scheduleItem .subjectIcon,.taskItem .subjectIcon').forEach(node=>node.remove())}
function removeRenderedSubjectTitle(card,subject){card.querySelectorAll('b,h1,h2,h3,h4,h5,h6,p,span').forEach(el=>{if(el.childElementCount===0&&(el.textContent||'').trim()===subject)el.remove()});[...card.childNodes].forEach(node=>{if(node.nodeType===Node.TEXT_NODE&&node.textContent.trim()===subject)node.remove()})}
function installSubjectIcons(student){student.querySelectorAll('.studentSubject').forEach(card=>{const subject=card.dataset.subjectName||Object.keys(SUBJECT_ASSETS).find(name=>(card.textContent||'').includes(name));if(!subject)return;card.dataset.subjectName=subject;removeRenderedSubjectTitle(card,subject);ensureImg(card,'.studentSubjectMascot','studentSubjectMascot',SUBJECT_ASSETS[subject],subject)})}
function installSingleNavMascot(student){const host=student.querySelector('.studentNav .mascotNav>span');if(!host)return;let img=host.querySelector('.studentNavMascot');[...host.children].forEach(child=>{if(child!==img)child.remove()});if(!img){img=document.createElement('img');img.className='studentNavMascot';host.appendChild(img)}ensureImg(host,'.studentNavMascot','studentNavMascot',SHAKABUMBO_NAV,'شكابمبو')}
function toast(message){let box=document.querySelector('.studentPatchToast');if(!box){box=document.createElement('div');box.className='studentPatchToast';document.body.appendChild(box)}box.textContent=message;setTimeout(()=>box?.remove(),2600)}
function panel(title,body){document.querySelector('.studentPatchModal')?.remove();const wrap=document.createElement('div');wrap.className='studentPatchModal';const card=document.createElement('section');const close=document.createElement('button');close.className='studentPatchClose';close.type='button';close.textContent='×';close.addEventListener('click',()=>wrap.remove());const h=document.createElement('h3');h.textContent=title;card.append(close,h,body);wrap.appendChild(card);wrap.addEventListener('click',e=>{if(e.target===wrap)wrap.remove()});document.body.appendChild(wrap)}
async function loadState(){const id=studentId();if(!id)return null;try{const r=await fetch(`/api/student-state?studentId=${encodeURIComponent(id)}`,{cache:'no-store'});const data=await r.json();return data?.ok?data:null}catch{return null}}
function rows(items){const box=document.createElement('div');box.className='studentPatchRows';(items.length?items:['لا توجد بيانات متاحة حاليًا']).forEach(text=>{const article=document.createElement('article');article.textContent=text;box.appendChild(article)});return box}
function listValue(value,fallback=[]){if(Array.isArray(value))return value.map(x=>String(x).trim()).filter(Boolean);if(typeof value==='string')return value.split(/[،,\n]/).map(x=>x.trim()).filter(Boolean);return fallback}
function actionGrid(items){const body=document.createElement('div');body.className='studentMorePanel';items.forEach(([label,action])=>{const button=document.createElement('button');button.type='button';button.textContent=label;button.addEventListener('click',action);body.appendChild(button)});return body}
function closeStudentPanel(){document.querySelector('.studentPatchModal')?.remove()}
function scrollStudentTo(selector){closeStudentPanel();document.querySelector(selector)?.scrollIntoView({behavior:'smooth',block:'start'})}
function bindStudentInfoCards(student){student.querySelectorAll('.miniCards [data-student-info]').forEach(card=>{if(card.dataset.studentActionBound==='true')return;card.dataset.studentActionBound='true';card.setAttribute('role','button');card.tabIndex=0;const open=()=>openStudentPanel(card.dataset.studentInfo);card.addEventListener('click',open);card.addEventListener('keydown',event=>{if(event.key==='Enter'||event.key===' '){event.preventDefault();open()}})})}
async function savePhoto(file){if(!file||!file.type.startsWith('image/')){toast('اختر صورة فقط.');return}const reader=new FileReader();reader.onload=async()=>{try{const photoDataUrl=String(reader.result);const id=studentId();if(id){const response=await fetch('/api/student-state',{method:'POST',headers:{'content-type':'application/json'},body:JSON.stringify({studentId:id,action:'student_profile',photoDataUrl})});const data=await response.json();if(!response.ok||!data.ok)throw new Error(data.error||'REQUEST_FAILED')}const profile=readStudent();profile.photoDataUrl=photoDataUrl;localStorage.setItem('studentProfile',JSON.stringify(profile));const img=document.querySelector('.studentCleanPhotoImage');if(img)img.src=photoDataUrl;toast(id?'تم حفظ صورة الطالب.':'تم حفظ الصورة على هذا الجهاز.');}catch(error){toast(error.message==='PHOTO_TOO_LARGE'?'الصورة كبيرة. اختر صورة أصغر.':'تعذر حفظ الصورة، ولم يتم استبدالها.')}};reader.onerror=()=>toast('تعذر قراءة الصورة.');reader.readAsDataURL(file)}
async function openStudentPanel(kind,subject){
  if(kind==='photo'){const body=document.createElement('div');body.className='studentPhotoPanel';const img=document.createElement('img');img.src=readStudent().photoDataUrl||SHAKABUMBO_PROFILE;const input=document.createElement('input');input.type='file';input.accept='image/*';input.addEventListener('change',()=>savePhoto(input.files?.[0]));body.append(img,input);panel('صورتي',body);return}
  if(kind==='hobbies'){const profile=readStudent();panel('هواياتي',rows(listValue(profile.hobbies,['القراءة','الرسم'])));return}
  if(kind==='goals'){const profile=readStudent();const stars=currentStars();const remaining=[...document.querySelectorAll('.taskItem:not(.done)')].length;const fallback=[remaining?`إكمال ${remaining} من مهام اليوم المتبقية`:'المحافظة على إنجاز مهام اليوم',stars<30?`الوصول إلى 30 نجمة — بقي ${30-stars} نجمة`:'استلام المكافأة وبدء هدف جديد'];panel('أهدافي',rows(listValue(profile.goals,fallback)));return}
  if(kind==='achievements'){const profile=readStudent();const fallback=['قارئ مميز','متعاون',`نجومي الحالية: ${currentStars()} من 30`];panel('إنجازاتي',rows(listValue(profile.achievements,fallback)));return}
  if(kind==='skills'){const state=await loadState();const academic=(state?.assessments||[]).flatMap(item=>item.academic||[]);const mastered=academic.filter(item=>item.result==='mastered').length;const practice=academic.filter(item=>item.result==='needs_practice').length;panel('مهاراتي',rows(academic.length?[`أتقن: ${mastered}`,`يحتاج تدريب: ${practice}`,`إجمالي التقييمات المسجلة: ${academic.length}`]:['لا توجد تقييمات مهارية مسجلة بعد.']));return}
  if(kind==='settings'){const body=actionGrid([
    ['تغيير صورتي',()=>openStudentPanel('photo')],
    ['عرض المواد',()=>scrollStudentTo('#subjects')],
    ['مهامي اليوم',()=>scrollStudentTo('.studentDay')],
    ['تحديث بيانات الصفحة',()=>location.reload()]
  ]);panel('الإعدادات',body);return}
  if(kind==='subject'){const state=await loadState();const subjectHomework=(state?.homework||[]).filter(x=>!subject||x.subject===subject||x.title?.includes(subject));const assessments=(state?.assessments||[]).flatMap(a=>a.academic||[]);panel(subject||'المادة',rows([...(subjectHomework.map(x=>`${x.title}${x.instructions?` — ${x.instructions}`:''}`)),...(assessments.length?[`آخر التقييمات المسجلة: ${assessments.length}`]:[])]));return}
  if(kind==='books'){const body=actionGrid(Object.keys(SUBJECT_ASSETS).map(title=>[`كتاب ${title}`,()=>{closeStudentPanel();openStudentPanel('subject',title)}]));panel('الكتب والمواد',body);return}
  if(kind==='shakabumbo'){const state=await loadState();const done=[...document.querySelectorAll('.taskItem.done')].length;panel('لوحة شكابمبو',rows([`عدد النجوم الحالي: ${state?.stars??currentStars()} من 30`,`مهام اليوم المكتملة: ${done}`,`أقرب مكافأة: ${(30-(state?.stars??currentStars()))>0?`باقي ${30-(state?.stars??currentStars())} نجمة`:'مكافأتك جاهزة'}`,'استمر يا بطل، كل محاولة تقربك من هدفك.']));return}
  if(kind==='more'){const actions={'صورتي':'photo','هواياتي':'hobbies','أهدافي':'goals','الإعدادات':'settings'};const body=actionGrid(Object.entries(actions).map(([label,target])=>[label,()=>openStudentPanel(target)]));panel('المزيد',body);return}
}
function applyStudentPatch(){if(!location.pathname.startsWith('/student'))return;installStrictStudentVisualGuard();const student=document.querySelector('.student');if(!student)return;student.querySelector('.studentProfile>h2')?.remove();student.querySelector('.nextReward')?.remove();student.querySelector('.studentMainLogo')?.remove();student.querySelector('.starToday')?.remove();installCleanStudentTop(student);
const rewardMascot=student.querySelector('.rewardMascot');if(rewardMascot){rewardMascot.querySelectorAll('img:not(.rewardMascotImage),svg').forEach(n=>n.remove());ensureImg(rewardMascot,'.rewardMascotImage','rewardMascotImage',SHAKABUMBO_REWARD,'شكابمبو يرفع النجمة')}
installSingleNavMascot(student);
const info=student.querySelector('.miniCards');if(info){const existing=[...info.children];const hobby=existing.find(el=>el.textContent.includes('هواياتي'));const achievement=existing.find(el=>el.textContent.includes('إنجازاتي'));if(hobby)hobby.dataset.studentInfo='hobbies';if(achievement)achievement.dataset.studentInfo='achievements';const goals=ensureInfoCard(info,'goals','أهدافي');const skills=ensureInfoCard(info,'skills','مهاراتي');if(hobby&&achievement)info.append(hobby,goals,achievement,skills);bindStudentInfoCards(student)}
purgeRequestedIcons(student);installSubjectIcons(student);const stars=currentStars();const grid=student.querySelector('.starGrid');if(grid){[...grid.children].forEach((node,index)=>node.classList.toggle('on',index<stars));grid.setAttribute('aria-label',`${stars} من 30 نجمة`)}}
window.addEventListener('taallamt:student-panel',event=>openStudentPanel(event.detail?.panel,event.detail?.subject));
requestAnimationFrame(applyStudentPatch);window.addEventListener('storage',applyStudentPatch);new MutationObserver(()=>requestAnimationFrame(applyStudentPatch)).observe(document.getElementById('root'),{childList:true,subtree:true});
