const ICONS={
  profile:'https://raw.githack.com/tssjiil-max/taallamt-download/feature/student-teacher-staging-20261003/staging-site/shakabumbo-icons/01_sourati.svg',
  main:'https://raw.githack.com/tssjiil-max/taallamt-download/feature/student-teacher-staging-20261003/staging-site/shakabumbo-icons/02_main_logo.svg',
  star:'https://raw.githack.com/tssjiil-max/taallamt-download/feature/student-teacher-staging-20261003/staging-site/shakabumbo-icons/07_star_of_day.svg',
  subjects:{
    // «لغتي» is owned by student-parent-visual-safe.js (single final source); do not add it here.
    'الإملاء والخط':'https://raw.githack.com/tssjiil-max/taallamt-download/feature/student-teacher-staging-20261003/staging-site/shakabumbo-icons/04_imlaa_khatt.svg',
    'القرآن الكريم':'https://raw.githack.com/tssjiil-max/taallamt-download/feature/student-teacher-staging-20261003/staging-site/shakabumbo-icons/05_quran.svg',
    'الدراسات الإسلامية':'https://raw.githack.com/tssjiil-max/taallamt-download/feature/student-teacher-staging-20261003/staging-site/shakabumbo-icons/06_islamic_studies.svg'
  }
};

const setSource=(image,source)=>{
  if(!image)return;
  if(image.getAttribute('src')!==source)image.setAttribute('src',source);
  if(image.dataset.cleanSource!==undefined)image.dataset.cleanSource=source;
};

function applyProfileIcon(){
  const image=document.querySelector('.studentCleanPhotoImage');
  if(!image)return;
  const current=image.getAttribute('src')||'';
  if(current.startsWith('data:')||current.startsWith('blob:')){
    image.dataset.cleanSource='student-upload';
    return;
  }
  setSource(image,ICONS.profile);
}

function applyShakabumboIcons(){
  if(!location.pathname.startsWith('/student'))return;

  applyProfileIcon();
  setSource(document.querySelector('.student .heroMascot'),ICONS.main);
  setSource(document.querySelector('.studentNavMascot'),ICONS.main);
  setSource(document.querySelector('.rewardMascotImage'),ICONS.star);

  document.querySelectorAll('.studentSubject').forEach(card=>{
    const subject=card.getAttribute('data-subject-name');
    const source=ICONS.subjects[subject];
    if(source)setSource(card.querySelector('.studentSubjectMascot'),source);
  });
}

requestAnimationFrame(applyShakabumboIcons);
const root=document.getElementById('root');
if(root)new MutationObserver(()=>requestAnimationFrame(applyShakabumboIcons)).observe(root,{childList:true,subtree:true});
