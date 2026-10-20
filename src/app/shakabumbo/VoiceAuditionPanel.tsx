import React from 'react';
import {playRemoteAudio,primeArabicAudio,stopRemoteAudio} from './remote-speech';
import {cancelArabicSpeech} from './speak';
import {stopActiveVoiceSession} from './voice-session';
import {VOICES,PREVIEW_DEFAULT,ORIGINAL,adoptPreviewVoice,type PreviewVoice} from './voice-preview-settings';
export const AUDITION_TEXT='يا هلا يا أبطال! أنا شكابمبو، مساعدكم الذكي في منصة تعلّمت. اليوم عندنا مغامرة جميلة في القراءة. جاهزين نبدأ؟';
const cache=new Map<string,Blob>();
const keyFor=(voice:string)=>'shak-audition-v1:'+voice+':'+AUDITION_TEXT;
async function sample(voice:PreviewVoice,signal:AbortSignal):Promise<Blob>{
 const key=keyFor(voice);if(cache.has(key))return cache.get(key)!;
 try{const saved=JSON.parse(sessionStorage.getItem(key)||'null');if(saved&&Date.now()-saved.at<86400000){const blob=await(await fetch(saved.data)).blob();cache.set(key,blob);return blob}}catch{}
 const response=await fetch('/api/student-state',{method:'POST',signal,headers:{'content-type':'application/json'},body:JSON.stringify({action:'shakabumbo_speech',studentId:'__shakabumbo_demo__',targetId:'pilot:kasr',questionId:'book',assessment:false,voice,text:AUDITION_TEXT})});
 if(!response.ok){const data=await response.json().catch(()=>({}));throw Error(response.status===429?'وصلنا إلى حد خدمة الصوت. انتظر قليلًا ثم أعد المحاولة.':data.providerCode==='model_terms_required'?'يلزم تفعيل شروط نموذج الصوت من حساب المعلم.':'تعذر توليد العينة. أعد المحاولة بعد قليل.')}
 if(!/^audio\//.test(response.headers.get('content-type')||''))throw Error('لم تصل عينة صوتية صالحة.');
 const blob=await response.blob();if(signal.aborted)throw Error('CANCELLED');cache.set(key,blob);
 try{const data=await new Promise<string>((resolve,reject)=>{const r=new FileReader();r.onload=()=>resolve(String(r.result));r.onerror=reject;r.readAsDataURL(blob)});sessionStorage.setItem(key,JSON.stringify({at:Date.now(),data}))}catch{}
 return blob;
}
export function VoiceAuditionPanel({blocked=false}:{blocked?:boolean}){
 const [voice,setVoice]=React.useState<PreviewVoice>('lulwa'),[pitch,setPitch]=React.useState(PREVIEW_DEFAULT.pitch),[speed,setSpeed]=React.useState(PREVIEW_DEFAULT.speed);
 const [status,setStatus]=React.useState('اختر صوتًا واسمع الأصل أولًا.'),[busy,setBusy]=React.useState(false),[error,setError]=React.useState('');
 const controller=React.useRef<AbortController|null>(null);
 const stop=React.useCallback(()=>{controller.current?.abort();controller.current=null;stopRemoteAudio();setBusy(false);setStatus('متوقف')},[]);
 React.useEffect(()=>{window.addEventListener('shak-audio-stop',stop);return()=>{window.removeEventListener('shak-audio-stop',stop);controller.current?.abort();stopRemoteAudio()}},[stop]);
 React.useEffect(()=>{if(blocked)stop()},[blocked,stop]);
 async function play(next:PreviewVoice,processed:boolean){
  primeArabicAudio();stopActiveVoiceSession();cancelArabicSpeech();stop();
  const abort=new AbortController();controller.current=abort;const timer=setTimeout(()=>abort.abort(),45000);
  setVoice(next);setError('');setBusy(true);setStatus('أجهّز العينة…');
  try{const blob=await sample(next,abort.signal);await playRemoteAudio(blob,abort.signal,()=>setStatus(`يعمل صوت ${VOICES.find(v=>v.id===next)?.name} ${processed?'المعدل':'الأصلي'}`),processed?{pitch,speed,processed:true}:ORIGINAL);if(controller.current===abort)setStatus('انتهت العينة؛ قارنها بالصوت الآخر.');}
  catch(e){if(!abort.signal.aborted)setError(e instanceof Error&&!/^[A-Z_]+$/.test(e.message)?e.message:'تعذر تشغيل العينة أو معالجتها. اضغط تشغيل لإعادة المحاولة.');else if(controller.current===abort)setError('توقفت العينة أو تأخر تجهيزها. يمكنك إعادة المحاولة.');}
  finally{clearTimeout(timer);if(controller.current===abort){controller.current=null;setBusy(false)}}
 }
 return <section aria-label="مختبر أصوات شكابمبو" className="tkBox" style={{padding:16,marginBlock:16,border:'1px solid #bed7c9',borderRadius:20}}>
  <h2>اختر صوت شكابمبو</h2><p>للتجربة في هذه النسخة فقط. اسمع الأصوات الأصلية قبل التعديل.</p>
  <p style={{lineHeight:1.9}}>{AUDITION_TEXT}</p>
  <div style={{display:'grid',gap:12}}>{VOICES.map(v=><div key={v.id} style={{display:'flex',gap:8,alignItems:'center',flexWrap:'wrap'}}><strong style={{minWidth:60}}>{v.name}</strong><button className="tkBtn ghost" disabled={busy||blocked} onClick={()=>void play(v.id,false)}>تشغيل {v.name} الأصلي</button><button className="tkBtn ghost" disabled={busy||blocked} onClick={()=>void play(v.id,true)}>تشغيل {v.name} المعدل</button></div>)}</div>
  <label style={{display:'block',marginTop:16}}>الصوت المختار <select aria-label="الصوت المختار" value={voice} disabled={busy} onChange={e=>setVoice(e.target.value as PreviewVoice)}>{VOICES.map(v=><option key={v.id} value={v.id}>{v.name}</option>)}</select></label>
  <label style={{display:'block',marginTop:12}}>الطبقة: {pitch.toFixed(2)}× <input aria-label="الطبقة" type="range" min="1.04" max="1.16" step="0.01" value={pitch} disabled={busy} onChange={e=>setPitch(Number(e.target.value))} style={{width:'100%'}}/></label>
  <label style={{display:'block'}}>السرعة: {speed.toFixed(2)}× <input aria-label="السرعة" type="range" min="0.94" max="1.02" step="0.01" value={speed} disabled={busy} onChange={e=>setSpeed(Number(e.target.value))} style={{width:'100%'}}/></label>
  <p role="status" aria-live="polite">{blocked?'وضع الإنصات للقرآن — الصوت متوقف':status}</p>{error&&<p role="alert">{error}</p>}
  <div style={{display:'flex',gap:8,flexWrap:'wrap'}}><button className="tkBtn ghost" onClick={stop}>إيقاف الصوت</button><button className="tkBtn" disabled={busy||blocked} onClick={()=>{stopActiveVoiceSession();cancelArabicSpeech();adoptPreviewVoice(voice,{pitch,speed,processed:true});setStatus('اعتمدت اختيارك في هذه الجلسة التجريبية فقط. اضغط على شكابمبو لتجربة المحادثة.')}}>اعتماد هذا الصوت المعدل</button><button className="tkBtn ghost" disabled={busy||blocked} onClick={()=>{stopActiveVoiceSession();cancelArabicSpeech();adoptPreviewVoice(voice,{pitch,speed,processed:false});setStatus('اعتمدت الصوت الأصلي في هذه الجلسة التجريبية فقط.')}}>اعتماد الصوت الأصلي</button></div>
  <small>تغيير الطبقة والسرعة يعيد استخدام العينة نفسها. القرار النهائي بعد سماعك؛ لا يعني الاختبار أن الصوت يبدو بعمر محدد.</small>
 </section>;
}
