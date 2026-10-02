(()=>{
  if(!location.pathname.startsWith('/student'))return;
  const formatSafe=(locale,options,date)=>{try{return new Intl.DateTimeFormat(locale,options).format(date)}catch{return''}};
  function updateStudentTopMeta(){
    const details=document.querySelector('.student .studentCleanDetails');
    if(!details)return;
    const firstValue=details.querySelector('.studentDetailValue');
    if(firstValue&&firstValue.textContent.trim()==='اسم الطالب')firstValue.textContent='—';
    const oldMotto=details.querySelector('.studentMotto');
    if(oldMotto)oldMotto.remove();
    let meta=details.querySelector('.studentDateMeta');
    if(!meta){
      meta=document.createElement('div');
      meta.className='studentDateMeta';
      const hijri=document.createElement('span');hijri.className='studentHijriDate';
      const gregorian=document.createElement('span');gregorian.className='studentGregorianDate';
      meta.append(hijri,gregorian);details.appendChild(meta);
    }
    const now=new Date();
    const hijriText=formatSafe('ar-SA-u-ca-islamic-umalqura',{day:'numeric',month:'long',year:'numeric'},now);
    const gregorianText=formatSafe('ar-SA-u-ca-gregory',{day:'numeric',month:'long',year:'numeric'},now);
    const timeText=formatSafe('ar-SA',{hour:'numeric',minute:'2-digit',hour12:true},now);
    const hijri=meta.querySelector('.studentHijriDate');
    const gregorian=meta.querySelector('.studentGregorianDate');
    const h=`هجري ${hijriText}`;
    const g=`ميلادي ${gregorianText}${timeText?` • ${timeText}`:''}`;
    if(hijri&&hijri.textContent!==h)hijri.textContent=h;
    if(gregorian&&gregorian.textContent!==g)gregorian.textContent=g;
  }
  let queued=false;
  const queueUpdate=()=>{if(queued)return;queued=true;requestAnimationFrame(()=>{queued=false;updateStudentTopMeta()})};
  queueUpdate();
  const root=document.getElementById('root');
  if(root)new MutationObserver(queueUpdate).observe(root,{childList:true,subtree:true});
  window.addEventListener('storage',queueUpdate);
  setInterval(queueUpdate,60000);
})();