const clampStars=(value)=>Math.max(0,Math.min(30,Number.isFinite(Number(value))?Number(value):0));
const SHAKABUMBO_PROFILE='/student-assets/student-profile.webp';
const SHAKABUMBO_STAR='/student-assets/student-star-today.webp';
const SHAKABUMBO_MAIN='/student-assets/student-main-logo.webp';
const SHAKABUMBO_REWARD='/student-assets/student-reward-star.webp';
const SHAKABUMBO_NAV=SHAKABUMBO_MAIN;
const SUBJECT_ASSETS={
  'لغتي':'/student-assets/subject-lughati.webp',
  'القرآن الكريم':'/student-assets/subject-quran.webp',
  'الدراسات الإسلامية':'/student-assets/subject-islamic.webp',
  'الإملاء والخط':'/student-assets/subject-writing.webp'
};
const DAILY_WISDOM=[
  'أنت قادر على التعلّم والنجاح.',
  'كل يوم فرصة لتتعلم شيئًا جديدًا.',
  'خطوة صغيرة اليوم تصنع نجاحًا كبيرًا.',
  'اسأل وجرّب وتعلّم.',
  'الخطأ فرصة للتعلّم.',
  'بالمثابرة أصل إلى هدفي.',
  'أنا أستطيع عندما أحاول.',
  'القراءة تفتح أبواب المعرفة.',
  'تركيزي اليوم يقربني من هدفي.',
  'أتعلم بهدوء وأتقدم بثقة.',
  'كل مهارة تبدأ بالتدريب.',
  'نجاحي يكبر مع كل محاولة.',
  'أنا مسؤول عن تعلّمي.',
  'أفرح بتقدمي وأواصل.',
  'الصبر والتدريب يصنعان الإتقان.',
  'أبدأ الآن وأنجز مهمتي.',
  'العلم يزيدني قوة وثقة.',
  'أحترم نفسي وأحترم الآخرين.',
  'أنظم وقتي وأنجز أعمالي.',
  'المحاولة اليوم تقرّبني من النجاح.'
];
const CLEAN_ASSET_CACHE=new Map();
function readStudent(){try{return JSON.parse(localStorage.getItem('studentProfile')||'{}')||{}}catch{return {}}}
function currentStars(){const student=readStudent();const value=student.currentStars??student.stars??student.monthlyStars??localStorage.getItem('studentStars');return clampStars(value)}
function dailyWisdom(){const now=new Date();const day=Math.floor(Date.UTC(now.getFullYear(),now.getMonth(),now.getDate())/86400000);return DAILY_WISDOM[((day%DAILY_WISDOM.length)+DAILY_WISDOM.length)%DAILY_WISDOM.length]}
function ensureInfoCard(container,key,title){let card=container.querySelector(`[data-student-info="${key}"]`);if(card)return card;card=document.createElement('div');card.dataset.studentInfo=key;const heading=document.createElement('b');heading.textContent=title;card.appendChild(heading);container.appendChild(card);return card}
function installDailyWisdom(student){const host=student.querySelector('.studentProfileMain');if(!host)return;let card=host.querySelector('.studentDailyWisdom');if(!card){card=document.createElement('section');card.className='studentDailyWisdom';card.setAttribute('aria-label','حكمة اليوم');const title=document.createElement('b');title.textContent='حكمة اليوم';const text=document.createElement('p');card.append(title,text);host.appendChild(card)}const text=card.querySelector('p');if(text)text.textContent=dailyWisdom()}
function removePlaceholderAhmed(student){const root=student.querySelector('.profileIdentity');if(!root)return;const walker=document.createTreeWalker(root,NodeFilter.SHOW_TEXT);const matches=[];while(walker.nextNode()){if((walker.currentNode.nodeValue||'').trim()==='أحمد')matches.push(walker.currentNode)}matches.forEach(node=>{const parent=node.parentElement;if(parent&&parent.childNodes.length===1)parent.remove();else node.nodeValue=''})}
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
function installStrictStudentVisualGuard(){if(document.getElementById('student-visual-guard'))return;const style=document.createElement('style');style.id='student-visual-guard';style.textContent=`
.student .studentSubject svg,.student .studentSubject picture,.student .studentSubject .subjectIcon{display:none!important;visibility:hidden!important;width:0!important;height:0!important;margin:0!important;padding:0!important}
.student .studentSubject{background-image:none!important}
.student .studentProfile::before,.student .studentProfileMain::before{display:none!important;content:none!important;background:none!important;mask:none!important}
.student .profileAvatarWrap .boyAvatar{display:none!important}
.student .studentMainLogo,.student .starToday{display:none!important}
.student .nextReward{display:none!important}
.student .studentProfileAvatar,.student .rewardMascotImage,.student .studentNavMascot,.student .studentSubjectMascot{background:transparent!important}
`;document.head.appendChild(style)}
function purgeRequestedIcons(student){student.querySelectorAll('.studentSubject img:not(.studentSubjectMascot),.studentSubject svg,.studentSubject picture,.studentSubject .subjectIcon,.scheduleItem .subjectIcon,.taskItem .subjectIcon').forEach(node=>node.remove())}
function removeRenderedSubjectTitle(card,subject){card.querySelectorAll('b,h1,h2,h3,h4,h5,h6,p,span').forEach(el=>{if(el.childElementCount===0&&(el.textContent||'').trim()===subject)el.remove()});[...card.childNodes].forEach(node=>{if(node.nodeType===Node.TEXT_NODE&&node.textContent.trim()===subject)node.remove()})}
function installSubjectIcons(student){student.querySelectorAll('.studentSubject').forEach(card=>{const subject=card.dataset.subjectName||Object.keys(SUBJECT_ASSETS).find(name=>(card.textContent||'').includes(name));if(!subject)return;card.dataset.subjectName=subject;removeRenderedSubjectTitle(card,subject);ensureImg(card,'.studentSubjectMascot','studentSubjectMascot',SUBJECT_ASSETS[subject],subject)})}
function installSingleNavMascot(student){const host=student.querySelector('.studentNav .mascotNav>span');if(!host)return;let img=host.querySelector('.studentNavMascot');[...host.children].forEach(child=>{if(child!==img)child.remove()});if(!img){img=document.createElement('img');img.className='studentNavMascot';host.appendChild(img)}ensureImg(host,'.studentNavMascot','studentNavMascot',SHAKABUMBO_NAV,'شكابمبو')}
function applyStudentPatch(){if(!location.pathname.startsWith('/student'))return;installStrictStudentVisualGuard();const student=document.querySelector('.student');if(!student)return;student.querySelector('.studentProfile>h2')?.remove();student.querySelector('.profileAvatarWrap .boyAvatar')?.remove();student.querySelector('.nextReward')?.remove();student.querySelector('.studentMainLogo')?.remove();student.querySelector('.starToday')?.remove();
ensureImg(student.querySelector('.profileAvatarWrap'),'.studentProfileAvatar','studentProfileAvatar',SHAKABUMBO_PROFILE,'صورتي');
removePlaceholderAhmed(student);installDailyWisdom(student);
const rewardMascot=student.querySelector('.rewardMascot');if(rewardMascot){rewardMascot.querySelectorAll('img:not(.rewardMascotImage),svg').forEach(n=>n.remove());ensureImg(rewardMascot,'.rewardMascotImage','rewardMascotImage',SHAKABUMBO_REWARD,'شكابمبو يرفع النجمة')}
installSingleNavMascot(student);
const info=student.querySelector('.miniCards');if(info){const existing=[...info.children];const hobby=existing.find(el=>el.textContent.includes('هواياتي'));const achievement=existing.find(el=>el.textContent.includes('إنجازاتي'));if(hobby)hobby.dataset.studentInfo='hobbies';if(achievement)achievement.dataset.studentInfo='achievements';const goals=ensureInfoCard(info,'goals','أهدافي');const skills=ensureInfoCard(info,'skills','مهاراتي');if(hobby&&achievement)info.append(hobby,goals,achievement,skills)}
purgeRequestedIcons(student);installSubjectIcons(student);const stars=currentStars();const grid=student.querySelector('.starGrid');if(grid){[...grid.children].forEach((node,index)=>node.classList.toggle('on',index<stars));grid.setAttribute('aria-label',`${stars} من 30 نجمة`)}}
requestAnimationFrame(applyStudentPatch);window.addEventListener('storage',applyStudentPatch);new MutationObserver(()=>requestAnimationFrame(applyStudentPatch)).observe(document.getElementById('root'),{childList:true,subtree:true});