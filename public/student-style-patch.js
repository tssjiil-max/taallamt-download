const ASSETS={avatar:'/student-assets/avatar-data.txt',shield:'/student-assets/shield-data.txt'};
const DEFAULT_AVATAR='https://raw.githubusercontent.com/tssjiil-max/taallamt-download/build/taallamt-flex-v1/public/shakabumbo-guardian.webp';
const clampStars=(value)=>Math.max(0,Math.min(30,Number.isFinite(Number(value))?Number(value):0));
const assetCache={};
async function loadDataAsset(name){if(assetCache[name])return assetCache[name];const r=await fetch(ASSETS[name],{cache:'no-store'});if(!r.ok)throw new Error(name);return assetCache[name]=(await r.text()).trim()}
function readStudent(){try{return JSON.parse(localStorage.getItem('studentProfile')||'{}')||{}}catch{return {}}}
async function studentAvatar(){const student=readStudent();const value=typeof student.profileImageUrl==='string'?student.profileImageUrl.trim():'';return value||await loadDataAsset('avatar').catch(()=>DEFAULT_AVATAR)}
function currentStars(){const student=readStudent();const value=student.currentStars??student.stars??student.monthlyStars??localStorage.getItem('studentStars');return clampStars(value)}
async function applyStudentPatch(){
 if(!location.pathname.startsWith('/student'))return;
 const hero=document.querySelector('.student .sHero');
 if(hero){const shield=await loadDataAsset('shield').catch(()=>null);if(shield)hero.style.setProperty('--student-shield-image',`url("${shield}")`)}
 const wrap=document.querySelector('.profileAvatarWrap');
 if(wrap){const old=wrap.querySelector('.boyAvatar');let img=wrap.querySelector('.studentProfileAvatar');if(!img){img=document.createElement('img');img.className='studentProfileAvatar';img.alt='صورة الطالب';wrap.insertBefore(img,wrap.firstChild)}img.src=await studentAvatar();if(old)old.remove()}
 const stars=currentStars();const today=document.querySelector('.starToday strong');if(today)today.textContent=`${stars} / 30`;const bar=document.querySelector('.starToday .miniBar i');if(bar)bar.style.width=`${(stars/30)*100}%`;const grid=document.querySelector('.starGrid');if(grid){[...grid.children].forEach((node,index)=>node.classList.toggle('on',index<stars));grid.setAttribute('aria-label',`${stars} من 30 نجمة`)}
}
requestAnimationFrame(applyStudentPatch);window.addEventListener('storage',applyStudentPatch);new MutationObserver(()=>requestAnimationFrame(applyStudentPatch)).observe(document.getElementById('root'),{childList:true,subtree:true});
