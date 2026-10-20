import {splitSpeech,playRemoteAudio,stopRemoteAudio} from './remote-speech';
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
let generation=0,currentAudio:HTMLAudioElement|null=null,remoteAbort:AbortController|null=null;
let onCancelled:(()=>void)|null=null;
function clearAudio(){if(currentAudio){currentAudio.onplaying=currentAudio.onended=currentAudio.onerror=null;currentAudio.pause();currentAudio.removeAttribute('src');currentAudio.remove();currentAudio=null}}
export function cancelArabicSpeech(){generation++;stopRemoteAudio();remoteAbort?.abort();remoteAbort=null;clearAudio();const stopped=onCancelled;onCancelled=null;stopped?.();if(typeof speechSynthesis!=='undefined')speechSynthesis.cancel()}
export function speakArabic(text:string,handlers?:{onStart?:()=>void;onEnd?:()=>void;onError?:()=>void;onCancel?:()=>void}):boolean{
 cancelArabicSpeech();if(getLessonContext()?.subject==='quran'){handlers?.onError?.();return false}
 const ctx=getLessonContext();
 if(ctx?.targetId&&ctx.subject!=='quran'&&location.hostname.endsWith('vercel.app')){
  const token=generation,abort=new AbortController();remoteAbort=abort;onCancelled=handlers?.onCancel||null;
  const query=new URLSearchParams(location.search);
  const timer=setTimeout(()=>abort.abort('TIMEOUT'),45000);
  void(async()=>{
   for(const chunk of splitSpeech(text)){
    if(abort.signal.aborted||token!==generation)return;
    const payload={action:'shakabumbo_speech',studentId:query.get('studentId')||(location.pathname==='/shakabumbo-demo'?'__shakabumbo_demo__':''),invite:query.get('invite')||query.get('inviteToken')||'',demoSession:query.get('demoSession')||'',targetId:ctx.targetId,questionId:ctx.questionId,assessment:ctx.assessment,text:chunk};
    const response=await fetch('/api/student-state',{method:'POST',signal:abort.signal,headers:{'content-type':'application/json'},body:JSON.stringify(payload)});
    if(!response.ok){const data=await response.json().catch(()=>({}));throw Error(data.error||'SPEECH_UNAVAILABLE')}
    if(!/^audio\//.test(response.headers.get('content-type')||''))throw Error('AUDIO_FORMAT_INVALID');
    const blob=await response.blob();if(!blob.size)throw Error('AUDIO_EMPTY');
    if(token!==generation||abort.signal.aborted)return;
    await playRemoteAudio(blob,abort.signal,()=>{if(token===generation)handlers?.onStart?.()});
   }
   if(token===generation){remoteAbort=null;onCancelled=null;handlers?.onEnd?.()}
  })().catch(error=>{
   if(token!==generation)return;
   if(import.meta.env.DEV||location.hostname.endsWith('vercel.app'))console.warn('[shak-audio]',String(error?.message||'AUDIO_FAILED').replace(/[^A-Z_0-9 -]/g,'').slice(0,80));
   remoteAbort=null;onCancelled=null;handlers?.onError?.();
  }).finally(()=>clearTimeout(timer));
  return true;
 }
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
