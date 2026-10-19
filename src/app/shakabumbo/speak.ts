import {getLessonContext} from './context';
import manifest from './voice-manifest.json';
// Same-origin pre-generated Modern Standard Arabic audio comes first. No model download,
// API key, account, per-minute billing, or dependency on installed Arabic device voices.
// New teacher-authored text can use a device voice when it has no authored clip yet.
const recordings:Record<string,string>=manifest;
export const prepareArabicSpeech=(text:string)=>text.normalize('NFC');
export const speechSegments=(text:string)=>prepareArabicSpeech(text).split(/\n+/).map(s=>s.trim()).filter(Boolean);
export function pickArabicVoice():SpeechSynthesisVoice|null{
 if(typeof speechSynthesis==='undefined')return null;
 const voices=speechSynthesis.getVoices();return voices.find(v=>/^ar[-_]SA$/i.test(v.lang))||voices.find(v=>/^ar\b/i.test(v.lang))||null;
}
let generation=0,currentAudio:HTMLAudioElement|null=null;
let onCancelled:(()=>void)|null=null;
function clearAudio(){if(currentAudio){currentAudio.onplaying=currentAudio.onended=currentAudio.onerror=null;currentAudio.pause();currentAudio.removeAttribute('src');currentAudio.remove();currentAudio=null}}
export function cancelArabicSpeech(){generation++;clearAudio();const stopped=onCancelled;onCancelled=null;stopped?.();if(typeof speechSynthesis!=='undefined')speechSynthesis.cancel()}
export function speakArabic(text:string,handlers?:{onStart?:()=>void;onEnd?:()=>void;onError?:()=>void;onCancel?:()=>void}):boolean{
 cancelArabicSpeech();if(getLessonContext()?.subject==='quran'){handlers?.onError?.();return false}
 const token=generation,segments=speechSegments(text),voice=pickArabicVoice();let index=0,started=false;
 if(!segments.length||segments.some(s=>!recordings[s]&&!voice)){handlers?.onError?.();return false}
 onCancelled=handlers?.onCancel||null;
 const start=()=>{if(token!==generation)return;if(!started){started=true;handlers?.onStart?.()}};
 const fail=()=>{if(token!==generation)return;clearAudio();onCancelled=null;handlers?.onError?.()};
 const next=()=>{
  if(token!==generation)return;clearAudio();if(index>=segments.length){onCancelled=null;handlers?.onEnd?.();return}
  const segment=segments[index++],src=recordings[segment];
  if(src&&!voice){
   const audio=new Audio(src);currentAudio=audio;audio.dataset.shakVoice='1';audio.setAttribute('aria-hidden','true');audio.style.display='none';document.body.append(audio);
   audio.onplaying=start;audio.onended=next;audio.onerror=fail;
   audio.play().catch(fail);
  }else if(voice&&typeof speechSynthesis!=='undefined'){
   const u=new SpeechSynthesisUtterance(segment);u.voice=voice;u.lang=voice.lang;u.rate=.85;u.pitch=1;u.onstart=start;u.onend=next;u.onerror=fail;speechSynthesis.speak(u);
  }else fail();
 };
 try{next();return true}catch{fail();return false}
}
