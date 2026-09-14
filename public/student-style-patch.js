const clampStars=(value)=>Math.max(0,Math.min(30,Number.isFinite(Number(value))?Number(value):0));
const SHAKABUMBO_PROFILE='/student-assets/student-profile.webp';
const SHAKABUMBO_STAR='/student-assets/student-star-today.webp';
const SHAKABUMBO_MAIN='/student-assets/student-main-logo.webp';
const SHAKABUMBO_REWARD='/student-assets/student-reward-star.webp';
const SHAKABUMBO_NAV='/student-assets/student-shield.webp';
const SUBJECT_ASSETS={
  'لغتي':'/student-assets/subject-lughati.webp',
  'القرآن الكريم':'/student-assets/subject-quran.webp',
  'الدراسات الإسلامية':'/student-assets/subject-islamic.webp',
  'الإملاء والخط':'/student-assets/subject-writing.webp'
};
function readStudent(){try{return JSON.parse(localStorage.getItem('studentProfile')||'{}')||{}}catch{return {}}}
function currentStars(){const student=readStudent();const value=student.currentStars??student.stars??student.monthlyStars??localStorage.getItem('studentStars');return clampStars(value)}
function ensureInfoCard(container,key,title){let card=container.querySelector(`[data-student-info="${key}"]`);if(card)return card;card=document.createElement('div');card.dataset.studentInfo=key;const heading=document.createElement('b');heading.textContent=title;card.appendChild(heading);container.appendChild(card);return card}
function ensureImg(parent,selector,className,src,alt){if(!parent)return null;let img=parent.querySelector(selector);if(!img){img=document.createElement('img');img.className=className;parent.prepend(img)}if(img.getAttribute('src')!==src)img.src=src;img.alt=alt||'';img.style.opacity='1';return img}
function installStrictStudentVisualGuard(){if(document.getElementById('student-visual-guard'))return;const style=document.createElement('style');style.id='student-visual-guard';style.textContent=`
.student .studentSubject svg,.student .studentSubject picture,.student .studentSubject .subjectIcon{display:none!important;visibility:hidden!important;width:0!important;height:0!important;margin:0!important;padding:0!important}
.student .studentSubject{background-image:none!important}
.student .studentProfile::before,.student .studentProfileMain::before{display:none!important;content:none!important;background:none!important;mask:none!important}
.student .profileAvatarWrap .boyAvatar{display:none!important}
.student .starToday .starIcon,.student .starToday>svg{display:none!important}
.student .nextReward{display:none!important}
.student .studentMainLogo,.student .studentProfileAvatar,.student .studentStarMascot,.student .rewardMascotImage,.student .studentNavMascot,.student .studentSubjectMascot{background:transparent!important}
`;document.head.appendChild(style)}
function purgeRequestedIcons(student){student.querySelectorAll('.studentSubject img:not(.studentSubjectMascot),.studentSubject svg,.studentSubject picture,.studentSubject .subjectIcon,.starToday .starIcon,.scheduleItem .subjectIcon,.taskItem .subjectIcon').forEach(node=>node.remove())}
function installSubjectIcons(student){student.querySelectorAll('.studentSubject').forEach(card=>{const text=card.textContent||'';const subject=Object.keys(SUBJECT_ASSETS).find(name=>text.includes(name));if(!subject)return;ensureImg(card,'.studentSubjectMascot','studentSubjectMascot',SUBJECT_ASSETS[subject],subject)})}
function applyStudentPatch(){if(!location.pathname.startsWith('/student'))return;installStrictStudentVisualGuard();const student=document.querySelector('.student');if(!student)return;student.querySelector('.studentProfile>h2')?.remove();student.querySelector('.profileText')?.remove();student.querySelector('.profileAvatarWrap .boyAvatar')?.remove();student.querySelector('.nextReward')?.remove();
const profileMain=student.querySelector('.studentProfileMain');
ensureImg(profileMain,'.studentMainLogo','studentMainLogo',SHAKABUMBO_MAIN,'شكابمبو');
const avatarWrap=student.querySelector('.profileAvatarWrap');
ensureImg(avatarWrap,'.studentProfileAvatar','studentProfileAvatar',SHAKABUMBO_PROFILE,'صورتي');
const starToday=student.querySelector('.starToday');
if(starToday){starToday.querySelector('.starIcon')?.remove();ensureImg(starToday,'.studentStarMascot','studentStarMascot',SHAKABUMBO_STAR,'نجم اليوم')}
const rewardMascot=student.querySelector('.rewardMascot');
if(rewardMascot){ensureImg(rewardMascot,'img','rewardMascotImage',SHAKABUMBO_REWARD,'شكابمبو يرفع النجمة')}
const navMascot=student.querySelector('.studentNav .mascotNav>span');
if(navMascot){navMascot.querySelectorAll('svg').forEach(n=>n.remove());ensureImg(navMascot,'.studentNavMascot','studentNavMascot',SHAKABUMBO_NAV,'شكابمبو')}
const starTitle=student.querySelector('.starToday b');if(starTitle)starTitle.textContent='نجمة اليوم';
const info=student.querySelector('.miniCards');if(info){const existing=[...info.children];const hobby=existing.find(el=>el.textContent.includes('هواياتي'));const achievement=existing.find(el=>el.textContent.includes('إنجازاتي'));if(hobby)hobby.dataset.studentInfo='hobbies';if(achievement)achievement.dataset.studentInfo='achievements';const goals=ensureInfoCard(info,'goals','أهدافي');const skills=ensureInfoCard(info,'skills','مهاراتي');if(hobby&&achievement)info.append(hobby,goals,achievement,skills)}
purgeRequestedIcons(student);installSubjectIcons(student);const stars=currentStars();const today=student.querySelector('.starToday strong');if(today)today.textContent=`${stars} / 30`;const bar=student.querySelector('.starToday .miniBar i');if(bar)bar.style.width=`${(stars/30)*100}%`;const grid=student.querySelector('.starGrid');if(grid){[...grid.children].forEach((node,index)=>node.classList.toggle('on',index<stars));grid.setAttribute('aria-label',`${stars} من 30 نجمة`)}}
requestAnimationFrame(applyStudentPatch);window.addEventListener('storage',applyStudentPatch);new MutationObserver(()=>requestAnimationFrame(applyStudentPatch)).observe(document.getElementById('root'),{childList:true,subtree:true});
