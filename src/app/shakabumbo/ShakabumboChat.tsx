import React from 'react';
import {getLessonContext,onLessonContextChange} from './context';
import {tutorRespond,type TutorTurn} from './tutor';
import {speakArabic,cancelArabicSpeech} from './speak';
import {WELCOME} from './phrases';
import {VoiceSession,type VoicePhase,type RecognitionLike} from './voice-session';
type SpeechWindow=Window&{SpeechRecognition?:new()=>RecognitionLike;webkitSpeechRecognition?:new()=>RecognitionLike};
const recognitionCtor=()=>{const w=window as SpeechWindow;return w.SpeechRecognition||w.webkitSpeechRecognition};
const labels:Record<VoicePhase,string>={idle:'متوقف — أنا هنا لمساعدتك',listening:'أسمعك يا بطل',thinking:'نفكر معًا…',speaking:'أتحدث معك…',muted:'الصوت والميكروفون مكتومان',error:'اضغط على صورتي للمحاولة من جديد'};
export function ShakabumboChat({open,onClose,blocked=false,onPhaseChange}:{open:boolean;onClose:()=>void;blocked?:boolean;onPhaseChange?:(phase:VoicePhase)=>void}){
 const ctxRef=React.useRef(getLessonContext()),hintRef=React.useRef(0),closeRef=React.useRef(onClose);closeRef.current=onClose;
 const [turns,setTurns]=React.useState<TutorTurn[]>([]),[draft,setDraft]=React.useState(''),[typing,setTyping]=React.useState(false);
 const [phase,setPhase]=React.useState<VoicePhase>('idle'),[notice,setNotice]=React.useState('');
 const sessionRef=React.useRef<VoiceSession|null>(null);
 if(!sessionRef.current)sessionRef.current=new VoiceSession({recognition:()=>{const C=recognitionCtor();return C&&window.isSecureContext?new C():null},speak:speakArabic,cancelSpeech:cancelArabicSpeech,
  update:(next,message)=>{setPhase(next);if(message)setNotice(message)},
  reply:text=>{const {reply,usedHint}=tutorRespond(text,ctxRef.current,hintRef.current);if(usedHint)hintRef.current=Math.min(1,hintRef.current+1);setTurns(prev=>[...prev,{from:'student' as const,text},{from:'shak' as const,text:reply}].slice(-12));return reply}
 });
 const session=sessionRef.current;
 React.useEffect(()=>{onPhaseChange?.(phase)},[phase,onPhaseChange]);
 React.useEffect(()=>onLessonContextChange(next=>{ctxRef.current=next;hintRef.current=0;session.stop();setTurns([]);setNotice('');closeRef.current()}),[session]);
 React.useEffect(()=>{
  if(open&&!blocked){ctxRef.current=getLessonContext();hintRef.current=0;setTyping(false);setNotice('');setTurns([{from:'shak',text:WELCOME}]);session.start(WELCOME)}
  else{session.stop();setTurns([]);setDraft('')}
  return()=>session.stop();
 },[open,blocked,session]);
 React.useEffect(()=>{const stop=()=>{if(document.hidden)session.stop('muted')};document.addEventListener('visibilitychange',stop);return()=>document.removeEventListener('visibilitychange',stop)},[session]);
 if(!open||blocked)return null;
 return <div className="shakSimpleChat" role="region" aria-label="المحادثة مع شكابمبو" dir="rtl">
  <p className={`shakSimpleStatus shakPhase-${phase}`} role="status"><span aria-hidden="true"/> {labels[phase]}</p>
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
