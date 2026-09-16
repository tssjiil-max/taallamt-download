(()=>{
  if(!location.pathname.startsWith('/student'))return;
  const MAIN='/student-assets/vector/student-main-logo.svg';
  const PROFILE='/student-assets/vector/student-profile.svg';
  const REWARD='/student-assets/vector/student-reward-star.svg';
  const SUBJECTS={
    'لغتي':'/student-assets/vector/subject-lughati.svg',
    'القرآن الكريم':'/student-assets/vector/subject-quran.svg',
    'الدراسات الإسلامية':'/student-assets/vector/subject-islamic.svg',
    'الإملاء والخط':'/student-assets/vector/subject-writing.svg'
  };
  const readProfile=()=>{try{return JSON.parse(localStorage.getItem('studentProfile')||'{}')||{}}catch{return {}}};
  const setVector=(img,src)=>{if(!img)return;img.dataset.cleanSource=src;if(img.getAttribute('src')!==src)img.setAttribute('src',src)};
  const apply=()=>{
    if(!location.pathname.startsWith('/student'))return;
    setVector(document.querySelector('.studentMascotWrap .heroMascot'),MAIN);
    setVector(document.querySelector('.studentNavMascot'),MAIN);
    setVector(document.querySelector('.rewardMascotImage'),REWARD);
    const photo=document.querySelector('.studentCleanPhotoImage');
    const photoDataUrl=readProfile().photoDataUrl;
    if(photo&&!photoDataUrl)setVector(photo,PROFILE);
    document.querySelectorAll('.studentSubject').forEach(card=>{
      const subject=card.dataset.subjectName||Object.keys(SUBJECTS).find(name=>(card.textContent||'').includes(name));
      if(!subject)return;
      setVector(card.querySelector('.studentSubjectMascot'),SUBJECTS[subject]);
    });
  };
  let queued=false;
  const schedule=()=>{if(queued)return;queued=true;requestAnimationFrame(()=>{queued=false;apply()})};
  requestAnimationFrame(()=>requestAnimationFrame(apply));
  new MutationObserver(schedule).observe(document.getElementById('root'),{childList:true,subtree:true});
  window.addEventListener('storage',schedule);
})();
