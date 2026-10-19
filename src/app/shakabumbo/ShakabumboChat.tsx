import React from 'react';
import {getLessonContext,onLessonContextChange,type LessonContext} from './context';
import {tutorRespond,type TutorTurn} from './tutor';
import {speakArabic,pickArabicVoice} from './speak';
import {VoiceSession,type VoicePhase,type RecognitionLike} from './voice-session';
import {ShakabumboRig} from './ShakabumboRig';

type SpeechWindow=Window&{SpeechRecognition?:new()=>RecognitionLike;webkitSpeechRecognition?:new()=>RecognitionLike};
const recognitionCtor=()=>{const w=window as SpeechWindow;return w.SpeechRecognition||w.webkitSpeechRecognition};
const phaseLabel:Record<VoicePhase,string>={idle:'جاهز لمساعدتك',listening:'أسمعك يا بطل',thinking:'نفكر معًا…',speaking:'شكابمبو يتكلم…',muted:'الميكروفون والصوت مكتومان',error:'نحتاج إعادة المحاولة'};

export function ShakabumboChat({open,onClose,blocked=false}:{open:boolean;onClose:()=>void;blocked?:boolean}){
 const [ctx,setCtx]=React.useState<LessonContext|null>(getLessonContext);
 const ctxRef=React.useRef(ctx);ctxRef.current=ctx;
 const [turns,setTurns]=React.useState<TutorTurn[]>([]),[draft,setDraft]=React.useState('');
 const [typing,setTyping]=React.useState(false),[phase,setPhase]=React.useState<VoicePhase>('idle');
 const [notice,setNotice]=React.useState(''),[arabicVoice,setArabicVoice]=React.useState(false);
 const hintRef=React.useRef(0),dialogRef=React.useRef<HTMLDialogElement>(null),listRef=React.useRef<HTMLDivElement>(null);
 const sessionRef=React.useRef<VoiceSession|null>(null);
 if(!sessionRef.current)sessionRef.current=new VoiceSession({
  recognition:()=>{const Ctor=recognitionCtor();return Ctor?new Ctor():null},
  speak:speakArabic,cancelSpeech:()=>window.speechSynthesis?.cancel(),
  update:(next,message)=>{setPhase(next);if(message)setNotice(message)},
  reply:(text)=>{
   const {reply,usedHint}=tutorRespond(text,ctxRef.current,hintRef.current);
   if(usedHint)hintRef.current=Math.min(1,hintRef.current+1);
   setTurns(prev=>[...prev,{from:'student' as const,text},{from:'shak' as const,text:reply}].slice(-24));return reply;
  }
 });
 const session=sessionRef.current;
 React.useEffect(()=>onLessonContextChange(next=>{ctxRef.current=next;setCtx(next);hintRef.current=0;session.stop();setTurns([]);setNotice('تغيّر النشاط؛ اضغط استئناف لنتحدث عن الدرس الجديد.')}),[session]);
 React.useEffect(()=>{
  const update=()=>setArabicVoice(!!pickArabicVoice());update();
  window.speechSynthesis?.addEventListener('voiceschanged',update);
  return()=>window.speechSynthesis?.removeEventListener('voiceschanged',update);
 },[]);
 React.useEffect(()=>{
  const dialog=dialogRef.current;
  if(open&&!blocked){
   dialog?.showModal();setTyping(false);setNotice('');hintRef.current=0;
   setTurns([{from:'shak',text:ctxRef.current?`أهلًا يا بطل! نتحدث عن ${ctxRef.current.title}. اسألني عن الشرح أو اطلب قراءة السؤال.`:'أهلًا يا بطل! افتح درسًا لأساعدك في السؤال والشرح.'}]);
   if(recognitionCtor()&&window.isSecureContext)session.start();else setNotice('المحادثة الصوتية غير مدعومة هنا. افتح خيار الكتابة أو جرّب متصفحًا يدعمها.');
  }else{session.stop();dialog?.close();setTurns([]);setDraft('')}
  return()=>session.stop();
 },[open,blocked,session]);
 React.useEffect(()=>{const hide=()=>{if(document.hidden)session.stop('muted')};document.addEventListener('visibilitychange',hide);return()=>document.removeEventListener('visibilitychange',hide)},[session]);
 React.useEffect(()=>{listRef.current?.scrollTo({top:listRef.current.scrollHeight})},[turns]);
 const close=()=>{session.stop();onClose()};
 const submit=(e:React.FormEvent)=>{e.preventDefault();const text=draft.trim();if(!text)return;setDraft('');setNotice('');session.stop();session.answer(text,false)};
 const resume=()=>{setNotice('');session.start()};
 return <dialog ref={dialogRef} className="shakChat" aria-label="محادثة صوتية مع شكابمبو" onCancel={close} onClose={()=>{session.stop();if(open)onClose()}} dir="rtl">
  <header className="shakChatHead"><b>تحدث مع شكابمبو</b><button type="button" onClick={close} autoFocus aria-label="إنهاء المحادثة">إنهاء ✕</button></header>
  <div className="shakVoiceHero"><ShakabumboRig state={blocked?'LISTENING_QURAN':phase==='speaking'?'SPEAKING':'IDLE'} talking={phase==='speaking'}/><p role="status">{phaseLabel[phase]}</p></div>
  <p className="shakChatHint">مساعد للدروس الحالية؛ الحوار متتابع ولا يدعم المقاطعة أثناء الرد.</p>
  <div className="shakVoiceControls"><button type="button" onClick={()=>session.stop('muted')} disabled={phase==='muted'} aria-pressed={phase==='muted'}>كتم الصوت والميكروفون</button><button type="button" onClick={resume} disabled={phase==='listening'||phase==='speaking'||!recognitionCtor()}>استئناف المحادثة</button></div>
  {notice&&<p className="shakChatNotice" role="alert">{notice}</p>}
  {!arabicVoice&&<p className="shakChatHint">لم يظهر صوت عربي في الجهاز بعد؛ ننتظر تحميل الأصوات. يمكنك استخدام الكتابة.</p>}
  <div className="shakChatList" ref={listRef} aria-live="polite">{turns.map((turn,i)=><p key={i} className={`shakChatBubble ${turn.from==='student'?'shakChatBubbleMe':'shakChatBubbleShak'}`}>{turn.text}</p>)}</div>
  <button type="button" className="shakTextFallback" aria-expanded={typing} onClick={()=>{session.stop();setTyping(v=>!v)}}>{typing?'إخفاء الكتابة':'الكتابة بدل الصوت'}</button>
  {typing&&<form className="shakChatForm" onSubmit={submit}><label className="shakChatInputLabel">سؤالك<input className="shakChatInput" value={draft} onChange={e=>setDraft(e.target.value)} maxLength={240}/></label><button className="shakChatSend" disabled={!draft.trim()}>إرسال</button></form>}
  <details className="shakVoiceDetails"><summary>اختبار الصوت والعرض الاحتياطي</summary><button type="button" onClick={()=>{session.stop();session.answer('اقرأ كلمة كَسْرَتَيْنِ',false)}}>اختبار «كَسْرَتَيْنِ»</button><button type="button" onClick={()=>{session.stop();setNotice('عرض صوتي معدّ من محتوى الدرس، دون ميكروفون ودون حوار حي.');session.answer('اشرح الدرس',false)}}>عرض الشرح دون ميكروفون</button><small>هذا الاختبار لا يعتمد صحة النطق. لا توجد تسجيلات تعليمية معتمدة مرفقة حتى الآن.</small></details>
  <small className="shakPrivacy">قد يعالج المتصفح الصوت لدى مزوّد خدمة الكلام عبر الإنترنت. الموقع لا يسجّل الصوت ولا يحفظ نص المحادثة بعد إغلاقها. لا تستخدم بيانات شخصية.</small>
 </dialog>;
}
