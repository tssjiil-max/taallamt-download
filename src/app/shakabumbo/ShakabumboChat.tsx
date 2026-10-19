import React from 'react';
import {getLessonContext,onLessonContextChange,type LessonContext} from './context';
import {tutorRespond,type TutorTurn} from './tutor';
import {speakArabic} from './speak';

// Real text + voice chat with Shakabumbo, grounded only in the lesson the student is
// actually looking at (src/app/shakabumbo/context.ts). Voice input uses the browser's own
// free Web Speech API (no paid subscription, no server round-trip for recognition); when
// it isn't available the mic button is simply not shown and typing still works, per the
// brief's requirement that text must work even when speech can't. Nothing the student says
// is recorded or stored — recognition results live only in this component's state and are
// discarded when the chat closes.
//
// "Live voice mode": tapping the mic once starts a genuine back-and-forth session, not a
// single ask-then-reply round trip. After Shakabumbo finishes speaking its reply, the
// microphone re-opens on its own so the student can keep talking without tapping the mic
// again for every turn — closer to a real spoken conversation — until the student taps the
// mic to stop, types instead, or closes the chat.

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
  const [liveVoice,setLiveVoice]=React.useState(false);
  const [micDenied,setMicDenied]=React.useState(false);
  const [speaking,setSpeaking]=React.useState(false);
  const hintLevelRef=React.useRef(0);
  const recognitionRef=React.useRef<SpeechRecognitionLike|null>(null);
  const liveVoiceRef=React.useRef(false);liveVoiceRef.current=liveVoice;
  const openRef=React.useRef(open);openRef.current=open;
  const recognitionSupported=React.useMemo(()=>getRecognitionCtor()!==null,[]);
  const listRef=React.useRef<HTMLDivElement>(null);
  const resumeTimerRef=React.useRef<ReturnType<typeof setTimeout>|null>(null);
  // `startListening`'s recognition callback fires asynchronously, well after this render —
  // it must always call the LATEST send/context, not whatever was in scope when the
  // recognition object was created, or a lesson-context change mid-conversation would be
  // silently ignored. A ref sidesteps the stale-closure trap instead of fighting it.
  const sendRef=React.useRef<(text:string)=>void>(()=>{});

  React.useEffect(()=>onLessonContextChange(setCtx),[]);

  React.useEffect(()=>{
    if(!open)return;
    if(turns.length===0){
      const hello=ctx
        ?`أبشر! أنا هنا أساعدك في «${ctx.title}». اضغط الميكروفون وخلنا نتكلم، أو اكتب سؤالك.`
        :'افتح درسًا من صفحاتك التعليمية وارجع لي، وأنا أساعدك فيه خطوة خطوة.';
      setTurns([{from:'shak',text:hello}]);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  },[open]);

  React.useEffect(()=>{listRef.current?.scrollTo({top:listRef.current.scrollHeight})},[turns]);

  const startListening=React.useCallback(()=>{
    const Ctor=getRecognitionCtor();
    if(!Ctor||!openRef.current)return;
    const recognition:SpeechRecognitionLike=new Ctor();
    recognition.lang='ar-SA';
    recognition.interimResults=false;
    recognition.maxAlternatives=1;
    recognition.onstart=()=>{setListening(true);setMicDenied(false)};
    recognition.onresult=(event:any)=>{
      const text=event.results?.[0]?.[0]?.transcript;
      if(text)sendRef.current(text);
    };
    recognition.onerror=(event:any)=>{
      setListening(false);
      if(event?.error==='not-allowed'||event?.error==='service-not-allowed'){setMicDenied(true);setLiveVoice(false)}
    };
    recognition.onend=()=>setListening(false);
    recognitionRef.current=recognition;
    try{recognition.start()}catch{setListening(false)}
    // eslint-disable-next-line react-hooks/exhaustive-deps
  },[]);

  const stopListening=React.useCallback(()=>{
    recognitionRef.current?.stop();
    if(resumeTimerRef.current){clearTimeout(resumeTimerRef.current);resumeTimerRef.current=null}
  },[]);

  // Stop the whole live session when the chat closes or the Quran listening state forces it
  // (the parent already withholds `open` on the Quran route, but this is a second guard).
  React.useEffect(()=>{
    if(!open){setLiveVoice(false);stopListening();try{window.speechSynthesis?.cancel()}catch{/* ignore */}}
  },[open,stopListening]);

  React.useEffect(()=>()=>{stopListening();try{window.speechSynthesis?.cancel()}catch{/* ignore */}},[stopListening]);

  const speak=React.useCallback((text:string)=>{
    speakArabic(text,{
      onStart:()=>setSpeaking(true),
      onEnd:()=>{
        setSpeaking(false);
        // The live-conversation hand-off: Shakabumbo finished talking, so it's the
        // student's turn again — re-open the mic on its own, a beat later so the two
        // voices don't overlap.
        if(liveVoiceRef.current&&openRef.current){
          resumeTimerRef.current=setTimeout(()=>{if(liveVoiceRef.current&&openRef.current)startListening()},500);
        }
      },
      onError:()=>setSpeaking(false)
    });
  },[startListening]);

  const send=React.useCallback((text:string)=>{
    const clean=text.trim();
    if(!clean)return;
    setTurns(prev=>[...prev,{from:'student',text:clean}]);
    const {reply,usedHint}=tutorRespond(clean,ctx,hintLevelRef.current);
    if(usedHint)hintLevelRef.current=Math.min(1,hintLevelRef.current+1);
    setTurns(prev=>[...prev,{from:'shak',text:reply}]);
    speak(reply);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  },[ctx,speak]);

  React.useEffect(()=>{sendRef.current=send},[send]);

  const submitDraft=(e:React.FormEvent)=>{
    e.preventDefault();
    const text=draft;setDraft('');
    setLiveVoice(false);stopListening(); // typing switches the turn back to a single reply, not a voice loop
    send(text);
  };

  const toggleMic=()=>{
    if(!getRecognitionCtor())return;
    if(liveVoice||listening){
      setLiveVoice(false);
      stopListening();
      return;
    }
    setLiveVoice(true);
    startListening();
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
      {liveVoice&&<p className="shakChatHint shakChatLiveHint" aria-live="polite">{listening?'🎙️ أسمعك الآن…':speaking?'🔊 شكابمبو يتكلم…':'جلسة صوتية مستمرة — اضغط الميكروفون لإيقافها'}</p>}
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
            className={`shakChatMic${listening||liveVoice?' shakChatMicOn':''}`}
            onClick={toggleMic}
            aria-pressed={listening||liveVoice}
            aria-label={liveVoice?'إيقاف المحادثة الصوتية':'ابدأ محادثة صوتية مستمرة'}
          >{listening?'🎙️…':liveVoice?'🔊':'🎤'}</button>
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
