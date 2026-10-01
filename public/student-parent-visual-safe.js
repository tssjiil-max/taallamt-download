(()=>{
  if(!location.pathname.startsWith('/student'))return;

  const SUBJECT_ASSETS={
    'لغتي':'/shakabumbo-icons/03_lughati.svg',
    'الإملاء والخط':'/shakabumbo-icons/04_imlaa_khatt.svg',
    'القرآن الكريم':'/shakabumbo-icons/05_quran.svg',
    'الدراسات الإسلامية':'/shakabumbo-icons/06_islamic_studies.svg'
  };
  const NAV_ASSET='/shakabumbo-icons/02_main_logo.svg';
  const REWARD_ASSET='/shakabumbo-icons/07_star_of_day.svg';

  function keepImage(img,src){
    if(!img)return;
    if(img.getAttribute('src')===src&&img.dataset.cleanSource===src)return;
    img.dataset.cleanSource=src;
    img.dataset.visualSafeSource=src;
    img.src=src;
    img.style.opacity='1';
    img.style.background='transparent';
  }

  function apply(){
    const student=document.querySelector('.student');
    if(!student)return;

    student.querySelectorAll('.studentSubject').forEach(card=>{
      const subject=card.dataset.subjectName||'';
      const src=SUBJECT_ASSETS[subject];
      if(src)keepImage(card.querySelector('.studentSubjectMascot'),src);
    });

    keepImage(student.querySelector('.studentNavMascot'),NAV_ASSET);
    keepImage(student.querySelector('.rewardMascotImage')||student.querySelector('.rewardMascot img'),REWARD_ASSET);
  }

  let queued=false;
  const schedule=()=>{
    if(queued)return;
    queued=true;
    requestAnimationFrame(()=>{queued=false;apply()});
  };

  const boot=()=>{
    apply();
    const root=document.getElementById('root');
    if(!root)return;
    new MutationObserver(schedule).observe(root,{childList:true,subtree:true,attributes:true,attributeFilter:['src','data-clean-source']});
  };

  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',boot,{once:true});else boot();
})();
