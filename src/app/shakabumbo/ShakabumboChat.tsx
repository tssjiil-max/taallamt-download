import React from 'react';
import {getLessonContext,onLessonContextChange,type LessonContext} from './context';
import {tutorRespond,type TutorTurn} from './tutor';

// Real text + voice chat with Shakabumbo, grounded only in the lesson the student is
// actually looking at (src/app/shakabumbo/context.ts). Voice input uses the browser's own
// free Web Speech API (no paid subscription, no server round-trip for recognition); when
// it isn't available the mic button is simply not shown and typing still works, per the
// brief's requirement that text must work even when speech can't. Nothing the student says
// is recorded or stored — recognition results live only in this component's state and are
// discarded when the chat closes.

type SpeechRecognitionLike=any;

function getRecognitionCtor():(new()=>SpeechRecognitionLike)|null{
  if(typeof window==='undefined')return null;
  return (window as any).SpeechRecognition||(window as any).webkitSpeechRecognition||null;
}

export function ShakabumboChat({open,onClose}:{open:boolean;onClose:()=>void}){
  const [ctx,setCtx]=React.useState<LessonContext|null>(()=>getLessonContext());
  const [turns,setTurns]=React.useState<TutorTurn[]>([]);
  const [draft,setDraft]=React.useState('');
  const [listening,setListening]=React.useState(false);
  const [micDenied,setMicDenied]=React.useState(false);
  const [speaking,setSpeaking]=React.useState(false);
  const hintLevelRef=React.useRef(0);
  const recognitionRef=React.useRef<SpeechRecognitionLike|null>(null);
  const recognitionSupported=React.useMemo(()=>getRecognitionCtor()!==null,[]);
  const listRef=React.useRef<HTMLDivElement>(null);

  React.useEffect(()=>onLessonContextChange(setCtx),[]);

  React.useEffect(()=>{
    if(!open)return;
    if(turns.length===0){
      const hello=ctx
        ?`أبشر! أنا هنا أساعدك في «${ctx.title}». اسألني بصوتك أو اكتب سؤالك.`
        :'افتح درسًا من صفحاتك التعليمية وارجع لي، وأنا أساعدك فيه خطوة خطوة.';
      setTurns([{from:'shak',text:hello}]);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  },[open]);

  React.useEffect(()=>{listRef.current?.scrollTo({top:listRef.current.scrollHeight})},[turns]);

  React.useEffect(()=>()=>{try{window.speechSynthesis?.cancel()}catch{/* ignore */}},[]);

  const speak=React.useCallback((text:string)=>{
    if(typeof speechSynthesis==='undefined')return;
    try{
      speechSynthesis.cancel();
      const utterance=new SpeechSynthesisUtterance(text);
      utterance.lang='ar-SA';utterance.rate=0.92;
      utterance.onstart=()=>setSpeaking(true);
      utterance.onend=()=>setSpeaking(false);
      utterance.onerror=()=>setSpeaking(false);
      speechSynthesis.speak(utterance);
    }catch{/* speech synthesis is best-effort */}
  },[]);

  const send=React.useCallback((text:string)=>{
    const clean=text.trim();
    if(!clean)return;
    setTurns(prev=>[...prev,{from:'student',text:clean}]);
    const {reply,usedHint}=tutorRespond(clean,ctx,hintLevelRef.current);
    if(usedHint)hintLevelRef.current=Math.min(1,hintLevelRef.current+1);
    setTurns(prev=>[...prev,{from:'shak',text:reply}]);
    speak(reply);
  },[ctx,speak]);

  const submitDraft=(e:React.FormEvent)=>{e.preventDefault();const text=draft;setDraft('');send(text)};

  const toggleMic=()=>{
    const Ctor=getRecognitionCtor();
    if(!Ctor)return;
    if(listening){recognitionRef.current?.stop();return}
    const recognition:SpeechRecognitionLike=new Ctor();
    recognition.lang='ar-SA';
    recognition.interimResults=false;
    recognition.maxAlternatives=1;
    recognition.onstart=()=>{setListening(true);setMicDenied(false)};
    recognition.onresult=(event:any)=>{
      const text=event.results?.[0]?.[0]?.transcript;
      if(text)send(text);
    };
    recognition.onerror=(event:any)=>{
      setListening(false);
      if(event?.error==='not-allowed'||event?.error==='service-not-allowed')setMicDenied(true);
    };
    recognition.onend=()=>setListening(false);
    recognitionRef.current=recognition;
    try{recognition.start()}catch{setListening(false)}
  };

  const stopSpeaking=()=>{try{speechSynthesis.cancel()}catch{/* ignore */}setSpeaking(false)};

  if(!open)return null;

  return (
    <div className="shakChat" role="dialog" aria-label="محادثة مع شكابمبو" aria-modal="false">
      <header className="shakChatHead">
        <b>اسأل شكابمبو</b>
        <div className="shakChatHeadBtns">
          {speaking&&<button type="button" className="shakChatIconBtn" onClick={stopSpeaking} aria-label="إيقاف صوت شكابمبو">🔇</button>}
          <button type="button" className="shakChatIconBtn" onClick={onClose} aria-label="إغلاق المحادثة">✕</button>
        </div>
      </header>
      {!ctx&&<p className="shakChatHint">افتح درسًا ليفهم شكابمبو سؤالك ضمنه.</p>}
      <div className="shakChatList" ref={listRef} aria-live="polite">
        {turns.map((turn,i)=>(
          <p key={i} className={`shakChatBubble ${turn.from==='student'?'shakChatBubbleMe':'shakChatBubbleShak'}`}>{turn.text}</p>
        ))}
      </div>
      {micDenied&&<p className="shakChatHint">ما قدرنا نستخدم الميكروفون. يمكنك الكتابة بدلًا منه.</p>}
      <form className="shakChatForm" onSubmit={submitDraft}>
        {recognitionSupported&&(
          <button
            type="button"
            className={`shakChatMic${listening?' shakChatMicOn':''}`}
            onClick={toggleMic}
            aria-pressed={listening}
            aria-label={listening?'إيقاف الاستماع':'اسأل بصوتك'}
          >{listening?'🎙️…':'🎤'}</button>
        )}
        <input
          className="shakChatInput"
          value={draft}
          onChange={e=>setDraft(e.target.value)}
          placeholder="اكتب سؤالك لشكابمبو"
          maxLength={240}
          aria-label="سؤالك لشكابمبو"
        />
        <button type="submit" className="shakChatSend" disabled={!draft.trim()} aria-label="إرسال">إرسال</button>
      </form>
    </div>
  );
}
