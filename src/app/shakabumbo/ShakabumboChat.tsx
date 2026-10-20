import React from 'react';
import {getLessonContext,onLessonContextChange} from './context';
import {type TutorTurn} from './tutor';
import {speakArabic,cancelArabicSpeech} from './speak';
import {WELCOME} from './phrases';
import {VoiceSession,type VoicePhase,type RecognitionLike} from './voice-session';
type SpeechWindow=Window&{SpeechRecognition?:new()=>RecognitionLike;webkitSpeechRecognition?:new()=>RecognitionLike};
const recognitionCtor=()=>{const w=window as SpeechWindow;return w.SpeechRecognition||w.webkitSpeechRecognition};
const labels:Record<VoicePhase,string>={'requesting-permission':'جارٍ تشغيل الميكروفون…','generating-audio':'أجهّز الصوت…',idle:'متوقف — أنا هنا لمساعدتك',listening:'أسمعك يا بطل',thinking:'نفكر معًا…',speaking:'أتحدث معك…',muted:'الصوت والميكروفون مكتومان',error:'اضغط على صورتي للمحاولة من جديد'};
export function ShakabumboChat({open,onClose,blocked=false,onPhaseChange}:{open:boolean;onClose:()=>void;blocked?:boolean;onPhaseChange?:(phase:VoicePhase)=>void}){
 const ctxRef=React.useRef(getLessonContext()),hintRef=React.useRef(0),closeRef=React.useRef(onClose);closeRef.current=onClose;
 const [turns,setTurns]=React.useState<TutorTurn[]>([]),[draft,setDraft]=React.useState(''),[typing,setTyping]=React.useState(false);
 const [phase,setPhase]=React.useState<VoicePhase>('idle'),[notice,setNotice]=React.useState('');
 const requestRef=React.useRef<AbortController|null>(null);
 const historyRef=React.useRef<{role:string;content:string}[]>([]);
 const sessionRef=React.useRef<VoiceSession|null>(null);
 if(!sessionRef.current)sessionRef.current=new VoiceSession({recognition:()=>{const C=recognitionCtor();return C&&window.isSecureContext?new C():null},speak:speakArabic,cancelSpeech:cancelArabicSpeech,
  update:(next,message)=>{if(['idle','muted','error'].includes(next))requestRef.current?.abort();setPhase(next);if(message)setNotice(message)},
  reply:async text=>{const ctx=ctxRef.current;if(!ctx?.targetId||ctx.subject==='quran')throw new Error('افتح درسًا من المنصة');requestRef.current?.abort();const controller=new AbortController();requestRef.current=controller;const q=new URLSearchParams(location.search);const r=await fetch('/api/student-state',{method:'POST',signal:controller.signal,headers:{'content-type':'application/json'},body:JSON.stringify({action:'shakabumbo_reply',studentId:q.get('studentId')||(location.pathname==='/shakabumbo-demo'?'__shakabumbo_demo__':''),invite:q.get('invite')||q.get('inviteToken')||'',demoSession:q.get('demoSession')||'',targetId:ctx.targetId,questionId:ctx.questionId,assessment:ctx.assessment,question:text,history:historyRef.current})});const data=await r.json();if(controller.signal.aborted)throw new Error('CANCELLED');if(!r.ok||!data.reply)throw new Error(data.error||'MODEL_UNAVAILABLE');historyRef.current=[...historyRef.current,{role:'user',content:text},{role:'assistant',content:data.reply}].slice(-4);setTurns(prev=>[...prev,{from:'student' as const,text},{from:'shak' as const,text:data.reply}].slice(-12));return data.reply}
 });
 const session=sessionRef.current;
 React.useEffect(()=>{onPhaseChange?.(phase)},[phase,onPhaseChange]);
 React.useEffect(()=>onLessonContextChange(next=>{ctxRef.current=next;hintRef.current=0;session.stop();setTurns([]);setNotice('');closeRef.current()}),[session]);
 React.useEffect(()=>{
  if(open&&!blocked){ctxRef.current=getLessonContext();hintRef.current=0;setTyping(false);setNotice('');setTurns([{from:'shak',text:WELCOME}]);session.start(WELCOME)}
  else{session.stop();historyRef.current=[];setTurns([]);setDraft('')}
  return()=>session.stop();
 },[open,blocked,session]);
 React.useEffect(()=>{const stop=()=>{if(document.hidden)session.stop('muted')};document.addEventListener('visibilitychange',stop);return()=>document.removeEventListener('visibilitychange',stop)},[session]);
 if(!open||blocked)return null;
 return <div className="shakSimpleChat" role="region" aria-label="المحادثة مع شكابمبو" dir="rtl">
  <p className={`shakSimpleStatus shakPhase-${phase}`} role="status"><span aria-hidden="true"/> {labels[phase]}</p>
  {turns.length>1&&<p className="shakChatBubble shakChatBubbleShak">{turns[turns.length-1].text}</p>}
  {notice&&<p className="shakSimpleNotice" role="alert">{notice}</p>}
  <p className="shakTapHint">اضغط على صورتي مرة أخرى لإنهاء المحادثة</p>
  <details className="shakSimpleOptions"><summary>المحادثة والخيارات</summary>
   <div className="shakChatList" aria-live="polite">{turns.map((t,i)=><p key={i} className={`shakChatBubble ${t.from==='student'?'shakChatBubbleMe':'shakChatBubbleShak'}`}>{t.text}</p>)}</div>
   <div className="shakVoiceControls"><button type="button" onClick={()=>session.stop('muted')}>كتم</button><button type="button" onClick={()=>{setNotice('');session.start()}}>استئناف</button><button type="button" onClick={onClose}>إنهاء</button><button type="button" aria-expanded={typing} onClick={()=>{session.stop();setTyping(v=>!v)}}>الكتابة بدل الصوت</button></div>
   {typing&&<form className="shakChatForm" onSubmit={e=>{e.preventDefault();const text=draft.trim();if(!text)return;setDraft('');setNotice('');session.stop();session.answer(text,false)}}><label className="shakChatInputLabel">سؤالك<input className="shakChatInput" value={draft} onChange={e=>setDraft(e.target.value)} maxLength={240}/></label><button className="shakChatSend" disabled={!draft.trim()}>إرسال</button></form>}
   <small>قد يستخدم المتصفح خدمة عبر الإنترنت لفهم الكلام. لا يحفظ الموقع التسجيلات أو نص المحادثة بعد إغلاقها. المساعد مرتبط بدرسِك الحالي.</small>
  </details>
 </div>;
}
