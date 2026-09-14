const clampStars=(value)=>Math.max(0,Math.min(30,Number.isFinite(Number(value))?Number(value):0));
function readStudent(){try{return JSON.parse(localStorage.getItem('studentProfile')||'{}')||{}}catch{return {}}}
function currentStars(){const student=readStudent();const value=student.currentStars??student.stars??student.monthlyStars??localStorage.getItem('studentStars');return clampStars(value)}
function ensureInfoCard(container,key,title){let card=container.querySelector(`[data-student-info="${key}"]`);if(card)return card;card=document.createElement('div');card.dataset.studentInfo=key;const heading=document.createElement('b');heading.textContent=title;card.appendChild(heading);container.appendChild(card);return card}
function ensureImg(parent,selector,className,src,alt){if(!parent)return null;let img=parent.querySelector(selector);if(!img){img=document.createElement('img');img.className=className;parent.prepend(img)}img.src=src;img.alt=alt||'';return img}
function installStrictStudentVisualGuard(){if(document.getElementById('student-visual-guard'))return;const style=document.createElement('style');style.id='student-visual-guard';style.textContent=`
.student .studentSubject img,.student .studentSubject svg,.student .studentSubject picture,.student .studentSubject .subjectIcon{display:none!important;visibility:hidden!important;width:0!important;height:0!important;margin:0!important;padding:0!important}
.student .studentSubject{background-image:none!important}
.student .studentProfile::before{display:none!important;content:none!important;background:none!important;mask:none!important}
.student .profileAvatarWrap .boyAvatar{display:none!important}
.student .starToday .starIcon,.student .starToday>svg{display:none!important}
.student .nextReward{display:none!important}
`;document.head.appendChild(style)}
function purgeRequestedIcons(student){student.querySelectorAll('.studentSubject img,.studentSubject svg,.studentSubject picture,.studentSubject .subjectIcon,.starToday .starIcon,.scheduleItem .subjectIcon,.taskItem .subjectIcon').forEach(node=>node.remove())}
function applyStudentPatch(){if(!location.pathname.startsWith('/student'))return;installStrictStudentVisualGuard();const student=document.querySelector('.student');if(!student)return;student.querySelector('.studentProfile>h2')?.remove();student.querySelector('.profileText')?.remove();student.querySelector('.profileAvatarWrap .boyAvatar')?.remove();student.querySelector('.nextReward')?.remove();
const studentData=readStudent();
const avatarWrap=student.querySelector('.profileAvatarWrap');
const uploadedPhoto=[studentData.photoUrl,studentData.photoURL,studentData.avatarUrl,studentData.avatarURL].find(v=>typeof v==='string'&&v.trim());
ensureImg(avatarWrap,'.studentProfileAvatar','studentProfileAvatar',uploadedPhoto||'/student-assets/student-profile.webp','صورة الطالب');
const starToday=student.querySelector('.starToday');
if(starToday){starToday.querySelector('.starIcon')?.remove();ensureImg(starToday,'.studentStarMascot','studentStarMascot','/student-assets/student-star-today.webp','شكابمبو ونجمة اليوم')}
const rewardMascot=student.querySelector('.rewardMascot');
if(rewardMascot){ensureImg(rewardMascot,'img','rewardMascotImage','/student-assets/student-star-today.webp','شكابمبو مع النجمة')}
const navMascot=student.querySelector('.studentNav .mascotNav>span');
if(navMascot){const old=navMascot.querySelector('.mascot');if(old&&old.tagName==='IMG'){old.src='/student-shakabumbo-shield.svg';old.alt='شكابمبو'}else{ensureImg(navMascot,'.studentNavMascot','studentNavMascot','/student-shakabumbo-shield.svg','شكابمبو')}}
const starTitle=student.querySelector('.starToday b');if(starTitle)starTitle.textContent='نجمة اليوم';
const info=student.querySelector('.miniCards');if(info){const existing=[...info.children];const hobby=existing.find(el=>el.textContent.includes('هواياتي'));const achievement=existing.find(el=>el.textContent.includes('إنجازاتي'));if(hobby)hobby.dataset.studentInfo='hobbies';if(achievement)achievement.dataset.studentInfo='achievements';const goals=ensureInfoCard(info,'goals','أهدافي');const skills=ensureInfoCard(info,'skills','مهاراتي');if(hobby&&achievement)info.append(hobby,goals,achievement,skills)}
purgeRequestedIcons(student);const stars=currentStars();const today=student.querySelector('.starToday strong');if(today)today.textContent=`${stars} / 30`;const bar=student.querySelector('.starToday .miniBar i');if(bar)bar.style.width=`${(stars/30)*100}%`;const grid=student.querySelector('.starGrid');if(grid){[...grid.children].forEach((node,index)=>node.classList.toggle('on',index<stars));grid.setAttribute('aria-label',`${stars} من 30 نجمة`)}}
requestAnimationFrame(applyStudentPatch);window.addEventListener('storage',applyStudentPatch);new MutationObserver(()=>requestAnimationFrame(applyStudentPatch)).observe(document.getElementById('root'),{childList:true,subtree:true});
