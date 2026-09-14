const clampStars=(value)=>Math.max(0,Math.min(30,Number.isFinite(Number(value))?Number(value):0));
const SHAKABUMBO_PROFILE='/student-assets/student-profile.webp';
const SHAKABUMBO_STAR='/student-assets/student-star-today.webp';
const SHAKABUMBO_MAIN='/student-assets/student-shield.webp';
const cleanAssetCache=new Map();
function readStudent(){try{return JSON.parse(localStorage.getItem('studentProfile')||'{}')||{}}catch{return {}}}
function currentStars(){const student=readStudent();const value=student.currentStars??student.stars??student.monthlyStars??localStorage.getItem('studentStars');return clampStars(value)}
function ensureInfoCard(container,key,title){let card=container.querySelector(`[data-student-info="${key}"]`);if(card)return card;card=document.createElement('div');card.dataset.studentInfo=key;const heading=document.createElement('b');heading.textContent=title;card.appendChild(heading);container.appendChild(card);return card}
function ensureImg(parent,selector,className,src,alt){if(!parent)return null;let img=parent.querySelector(selector);if(!img){img=document.createElement('img');img.className=className;parent.prepend(img)}img.src=src;img.alt=alt||'';img.style.opacity='1';return img}
function loadImage(src){return new Promise((resolve,reject)=>{const image=new Image();image.decoding='async';image.onload=()=>resolve(image);image.onerror=reject;image.src=src})}
function removeBorderBlack(src){if(cleanAssetCache.has(src))return cleanAssetCache.get(src);const task=(async()=>{const image=await loadImage(src);const w=image.naturalWidth||image.width,h=image.naturalHeight||image.height;if(!w||!h)return src;const canvas=document.createElement('canvas');canvas.width=w;canvas.height=h;const ctx=canvas.getContext('2d',{willReadFrequently:true});if(!ctx)return src;ctx.drawImage(image,0,0,w,h);const frame=ctx.getImageData(0,0,w,h),d=frame.data;const seen=new Uint8Array(w*h),queue=new Int32Array(w*h);let head=0,tail=0;const dark=(idx)=>{const p=idx*4,a=d[p+3];if(a===0)return true;const r=d[p],g=d[p+1],b=d[p+2];return Math.max(r,g,b)<92&&Math.max(r,g,b)-Math.min(r,g,b)<38};const push=(idx)=>{if(idx<0||idx>=w*h||seen[idx]||!dark(idx))return;seen[idx]=1;queue[tail++]=idx};for(let x=0;x<w;x++){push(x);push((h-1)*w+x)}for(let y=1;y<h-1;y++){push(y*w);push(y*w+w-1)}while(head<tail){const idx=queue[head++],x=idx%w,y=(idx/w)|0;for(let dy=-1;dy<=1;dy++)for(let dx=-1;dx<=1;dx++){if(!dx&&!dy)continue;const nx=x+dx,ny=y+dy;if(nx>=0&&ny>=0&&nx<w&&ny<h)push(ny*w+nx)}}for(let i=0;i<seen.length;i++)if(seen[i])d[i*4+3]=0;ctx.putImageData(frame,0,0);return canvas.toDataURL('image/png')})().catch(()=>src);cleanAssetCache.set(src,task);return task}
function setCleanImage(img,src,alt){if(!img)return;img.alt=alt||'';if(img.dataset.cleanSource===src&&img.dataset.cleanReady==='1')return;img.dataset.cleanSource=src;img.dataset.cleanReady='0';img.style.opacity='0';removeBorderBlack(src).then(clean=>{if(img.dataset.cleanSource!==src)return;img.src=clean;img.dataset.cleanReady='1';img.style.opacity='1'}).catch(()=>{if(img.dataset.cleanSource!==src)return;img.src=src;img.dataset.cleanReady='1';img.style.opacity='1'})}
function ensureCleanImg(parent,selector,className,src,alt){if(!parent)return null;let img=parent.querySelector(selector);if(!img){img=document.createElement('img');img.className=className;parent.prepend(img)}setCleanImage(img,src,alt);return img}
function installStrictStudentVisualGuard(){if(document.getElementById('student-visual-guard'))return;const style=document.createElement('style');style.id='student-visual-guard';style.textContent=`
.student .studentSubject img,.student .studentSubject svg,.student .studentSubject picture,.student .studentSubject .subjectIcon{display:none!important;visibility:hidden!important;width:0!important;height:0!important;margin:0!important;padding:0!important}
.student .studentSubject{background-image:none!important}
.student .studentProfile::before,.student .studentProfileMain::before{display:none!important;content:none!important;background:none!important;mask:none!important}
.student .profileAvatarWrap .boyAvatar{display:none!important}
.student .starToday .starIcon,.student .starToday>svg{display:none!important}
.student .nextReward{display:none!important}
.student .studentProfileAvatar,.student .studentStarMascot,.student .rewardMascotImage,.student .studentNavMascot{background:transparent!important}
`;document.head.appendChild(style)}
function purgeRequestedIcons(student){student.querySelectorAll('.studentSubject img,.studentSubject svg,.studentSubject picture,.studentSubject .subjectIcon,.starToday .starIcon,.scheduleItem .subjectIcon,.taskItem .subjectIcon').forEach(node=>node.remove())}
function applyStudentPatch(){if(!location.pathname.startsWith('/student'))return;installStrictStudentVisualGuard();const student=document.querySelector('.student');if(!student)return;student.querySelector('.studentProfile>h2')?.remove();student.querySelector('.profileText')?.remove();student.querySelector('.profileAvatarWrap .boyAvatar')?.remove();student.querySelector('.nextReward')?.remove();
const studentData=readStudent();
const avatarWrap=student.querySelector('.profileAvatarWrap');
const uploadedPhoto=[studentData.photoUrl,studentData.photoURL,studentData.avatarUrl,studentData.avatarURL].find(v=>typeof v==='string'&&v.trim());
if(uploadedPhoto)ensureImg(avatarWrap,'.studentProfileAvatar','studentProfileAvatar',uploadedPhoto,'صورة الطالب');else ensureCleanImg(avatarWrap,'.studentProfileAvatar','studentProfileAvatar',SHAKABUMBO_PROFILE,'صورتي');
const starToday=student.querySelector('.starToday');
if(starToday){starToday.querySelector('.starIcon')?.remove();ensureCleanImg(starToday,'.studentStarMascot','studentStarMascot',SHAKABUMBO_STAR,'نجم اليوم')}
const rewardMascot=student.querySelector('.rewardMascot');
if(rewardMascot){ensureCleanImg(rewardMascot,'img','rewardMascotImage',SHAKABUMBO_STAR,'شكابمبو وكأس النجمة')}
const navMascot=student.querySelector('.studentNav .mascotNav>span');
if(navMascot){navMascot.querySelectorAll('svg').forEach(n=>n.remove());let img=navMascot.querySelector('img');if(!img){img=document.createElement('img');img.className='studentNavMascot';navMascot.prepend(img)}else img.classList.add('studentNavMascot');setCleanImage(img,SHAKABUMBO_MAIN,'شكابمبو')}
const starTitle=student.querySelector('.starToday b');if(starTitle)starTitle.textContent='نجمة اليوم';
const info=student.querySelector('.miniCards');if(info){const existing=[...info.children];const hobby=existing.find(el=>el.textContent.includes('هواياتي'));const achievement=existing.find(el=>el.textContent.includes('إنجازاتي'));if(hobby)hobby.dataset.studentInfo='hobbies';if(achievement)achievement.dataset.studentInfo='achievements';const goals=ensureInfoCard(info,'goals','أهدافي');const skills=ensureInfoCard(info,'skills','مهاراتي');if(hobby&&achievement)info.append(hobby,goals,achievement,skills)}
purgeRequestedIcons(student);const stars=currentStars();const today=student.querySelector('.starToday strong');if(today)today.textContent=`${stars} / 30`;const bar=student.querySelector('.starToday .miniBar i');if(bar)bar.style.width=`${(stars/30)*100}%`;const grid=student.querySelector('.starGrid');if(grid){[...grid.children].forEach((node,index)=>node.classList.toggle('on',index<stars));grid.setAttribute('aria-label',`${stars} من 30 نجمة`)}}
requestAnimationFrame(applyStudentPatch);window.addEventListener('storage',applyStudentPatch);new MutationObserver(()=>requestAnimationFrame(applyStudentPatch)).observe(document.getElementById('root'),{childList:true,subtree:true});
