const ICONS={
  profile:'/shakabumbo-icons/01_sourati.svg',
  main:'/shakabumbo-icons/02_main_logo.svg',
  star:'/shakabumbo-icons/07_star_of_day.svg',
  subjects:{
    'لغتي':'/shakabumbo-icons/03_lughati.svg',
    'الإملاء والخط':'/shakabumbo-icons/04_imlaa_khatt.svg',
    'القرآن الكريم':'/shakabumbo-icons/05_quran.svg',
    'الدراسات الإسلامية':'/shakabumbo-icons/06_islamic_studies.svg'
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
