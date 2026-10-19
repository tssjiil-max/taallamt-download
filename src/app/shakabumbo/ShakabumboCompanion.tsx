import React from 'react';
import {ShakabumboRig} from './ShakabumboRig';
import {useShakabumboEngine} from './useShakabumboEngine';
import {ShakabumboChat} from './ShakabumboChat';

const STATE_LABEL:Record<string,string>={
  ENTERING:'شكابمبو ينزل لينضم إليك',
  LANDING:'شكابمبو يهبط',
  IDLE:'شكابمبو يرافقك',
  WALKING:'شكابمبو يمشي معك',
  THINKING:'شكابمبو يشجعك بهدوء',
  EXPLAINING:'شكابمبو يشير إلى السؤال',
  SPEAKING:'شكابمبو يشرح',
  ENCOURAGING:'أحسنت! شكابمبو يصفق لك',
  CELEBRATING:'شكابمبو يحتفل معك',
  LISTENING_QURAN:'شكابمبو ينصت بهدوء للقرآن الكريم',
  HIDDEN:''
};

// Detects an on-screen keyboard well enough to get out of its way; it never blocks typing.
function useKeyboardOpen(){
  const [open,setOpen]=React.useState(false);
  React.useEffect(()=>{
    const vv=window.visualViewport;
    const onFocusIn=(event:FocusEvent)=>{
      const tag=(event.target as HTMLElement|null)?.tagName;
      if(tag==='INPUT'||tag==='TEXTAREA')setOpen(true);
    };
    const onFocusOut=()=>setOpen(false);
    document.addEventListener('focusin',onFocusIn);
    document.addEventListener('focusout',onFocusOut);
    const onResize=()=>{if(vv)setOpen(vv.height<window.innerHeight*.72)};
    vv?.addEventListener('resize',onResize);
    return()=>{document.removeEventListener('focusin',onFocusIn);document.removeEventListener('focusout',onFocusOut);vv?.removeEventListener('resize',onResize)};
  },[]);
  return open;
}

export function ShakabumboCompanion({routeIsQuran}:{routeIsQuran:boolean}){
  const engine=useShakabumboEngine(routeIsQuran);
  const keyboardOpen=useKeyboardOpen();
  const [chatOpen,setChatOpen]=React.useState(false);
  const sitting=engine.state==='LISTENING_QURAN';
  const hidden=engine.state==='HIDDEN'||engine.minimized;
  const announce=STATE_LABEL[engine.state]||'';

  // Never open the chat during recitation: it must not interrupt the Quran listening state.
  React.useEffect(()=>{if(routeIsQuran&&chatOpen)setChatOpen(false)},[routeIsQuran,chatOpen]);

  return (
    <>
      <div
        className={`shakStage${hidden?' shakStageHidden':''}${keyboardOpen?' shakStageTucked':''}${sitting?' shakStageSitting':''}`}
        aria-hidden={hidden?'true':undefined}
      >
        <div
          className="shakWalker"
          style={{'--shak-x':`${engine.x}%`,'--shak-facing':engine.facing==='left'?'-1':'1'} as React.CSSProperties}
        >
          <ShakabumboRig state={engine.state} talking={engine.talking}/>
        </div>
      </div>
      <p className="shakAnnounce" aria-live="polite">{hidden?'':announce}</p>
      <button
        type="button"
        className={`shakToggle${hidden?' shown':''}`}
        onClick={engine.toggleMinimized}
        aria-pressed={!hidden}
        aria-label={hidden?'إظهار شكابمبو':'تصغير شكابمبو'}
      >
        {hidden?'إظهار شكابمبو 👋':'إخفاء مؤقت'}
      </button>
      {!hidden&&!routeIsQuran&&(
        <button type="button" className="shakAskBtn" onClick={()=>setChatOpen(v=>!v)} aria-pressed={chatOpen} aria-label="اسأل شكابمبو">
          💬 اسأل شكابمبو
        </button>
      )}
      <ShakabumboChat open={chatOpen&&!hidden&&!routeIsQuran} onClose={()=>setChatOpen(false)}/>
    </>
  );
}
