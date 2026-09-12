const DEFAULT_AVATAR='/student-assets/student-profile.webp';
const clampStars=(value)=>Math.max(0,Math.min(30,Number.isFinite(Number(value))?Number(value):0));
function readStudent(){try{return JSON.parse(localStorage.getItem('studentProfile')||'{}')||{}}catch{return {}}}
function studentAvatar(){const student=readStudent();const value=typeof student.profileImageUrl==='string'?student.profileImageUrl.trim():'';return value||DEFAULT_AVATAR}
function currentStars(){const student=readStudent();const value=student.currentStars??student.stars??student.monthlyStars??localStorage.getItem('studentStars');return clampStars(value)}
function ensureInfoCard(container,key,title){
 let card=container.querySelector(`[data-student-info="${key}"]`);
 if(card)return card;
 card=document.createElement('div');
 card.dataset.studentInfo=key;
 const heading=document.createElement('b');
 heading.textContent=title;
 card.appendChild(heading);
 container.appendChild(card);
 return card;
}
function applyStudentPatch(){
 if(!location.pathname.startsWith('/student'))return;
 const wrap=document.querySelector('.profileAvatarWrap');
 if(wrap){const old=wrap.querySelector('.boyAvatar');let img=wrap.querySelector('.studentProfileAvatar');if(!img){img=document.createElement('img');img.className='studentProfileAvatar';img.alt='صورة الطالب';wrap.insertBefore(img,wrap.firstChild)}img.src=studentAvatar();if(old)old.remove()}
 const starTitle=document.querySelector('.student .starToday b');
 if(starTitle&&starTitle.textContent.trim()!=='نجمة اليوم')starTitle.textContent='نجمة اليوم';
 const info=document.querySelector('.student .miniCards');
 if(info){
  const existing=[...info.children];
  const hobby=existing.find(el=>el.textContent.includes('هواياتي'));
  const achievement=existing.find(el=>el.textContent.includes('إنجازاتي'));
  if(hobby)hobby.dataset.studentInfo='hobbies';
  if(achievement)achievement.dataset.studentInfo='achievements';
  const goals=ensureInfoCard(info,'goals','أهدافي');
  const skills=ensureInfoCard(info,'skills','مهاراتي');
  if(hobby&&achievement)info.append(hobby,goals,achievement,skills);
 }
 const stars=currentStars();
 const today=document.querySelector('.student .starToday strong');
 if(today)today.textContent=`${stars} / 30`;
 const bar=document.querySelector('.student .starToday .miniBar i');
 if(bar)bar.style.width=`${(stars/30)*100}%`;
 const grid=document.querySelector('.student .starGrid');
 if(grid){[...grid.children].forEach((node,index)=>node.classList.toggle('on',index<stars));grid.setAttribute('aria-label',`${stars} من 30 نجمة`)}
 const next=document.querySelector('.student .nextReward strong');
 if(next)next.textContent=`${stars} / 30`;
}
requestAnimationFrame(applyStudentPatch);
window.addEventListener('storage',applyStudentPatch);
new MutationObserver(()=>requestAnimationFrame(applyStudentPatch)).observe(document.getElementById('root'),{childList:true,subtree:true});
