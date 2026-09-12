const DEFAULT_AVATAR='/student-default-avatar.svg';
const clampStars=(value)=>Math.max(0,Math.min(30,Number.isFinite(Number(value))?Number(value):0));
function readStudent(){
  try{return JSON.parse(localStorage.getItem('studentProfile')||'{}')||{}}catch{return {}}
}
function studentAvatar(){
  const student=readStudent();
  const value=typeof student.profileImageUrl==='string'?student.profileImageUrl.trim():'';
  return value||DEFAULT_AVATAR;
}
function currentStars(){
  const student=readStudent();
  const value=student.currentStars??student.stars??student.monthlyStars??localStorage.getItem('studentStars');
  return clampStars(value);
}
function applyStudentPatch(){
  if(!location.pathname.startsWith('/student'))return;
  const wrap=document.querySelector('.profileAvatarWrap');
  if(wrap){
    const old=wrap.querySelector('.boyAvatar');
    let img=wrap.querySelector('.studentProfileAvatar');
    if(!img){img=document.createElement('img');img.className='studentProfileAvatar';img.alt='صورة الطالب';wrap.insertBefore(img,wrap.firstChild)}
    img.src=studentAvatar();
    if(old)old.remove();
  }
  const stars=currentStars();
  const today=document.querySelector('.starToday strong');
  if(today)today.textContent=`${stars} / 30`;
  const bar=document.querySelector('.starToday .miniBar i');
  if(bar)bar.style.width=`${(stars/30)*100}%`;
  const grid=document.querySelector('.starGrid');
  if(grid){
    [...grid.children].forEach((node,index)=>node.classList.toggle('on',index<stars));
    grid.setAttribute('aria-label',`${stars} من 30 نجمة`);
  }
}
requestAnimationFrame(applyStudentPatch);
window.addEventListener('storage',applyStudentPatch);
new MutationObserver(()=>requestAnimationFrame(applyStudentPatch)).observe(document.getElementById('root'),{childList:true,subtree:true});
