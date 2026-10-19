// Student/guardian control over Shakabumbo's motion: تشغيل / تقليل / إيقاف.
export type MotionPref='full'|'reduced'|'off';
const KEY='shakabumbo:motion';

export function getMotionPref():MotionPref{
  try{
    const stored=localStorage.getItem(KEY);
    if(stored==='full'||stored==='reduced'||stored==='off')return stored;
  }catch{/* storage may be unavailable (private mode); fall through to the safe default */}
  try{
    if(matchMedia('(prefers-reduced-motion: reduce)').matches)return 'reduced';
  }catch{/* ignore */}
  return 'full';
}

export function setMotionPref(pref:MotionPref){
  try{localStorage.setItem(KEY,pref)}catch{/* ignore */}
  try{window.dispatchEvent(new CustomEvent('shakabumbo:motion-change',{detail:pref}))}catch{/* ignore */}
}

export function onMotionPrefChange(listener:(pref:MotionPref)=>void):()=>void{
  const handler=(event:Event)=>listener((event as CustomEvent<MotionPref>).detail);
  window.addEventListener('shakabumbo:motion-change',handler);
  return()=>window.removeEventListener('shakabumbo:motion-change',handler);
}
