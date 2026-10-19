import React from 'react';
import {ShakabumboRig} from './ShakabumboRig';
import {useShakabumboEngine} from './useShakabumboEngine';
import {ShakabumboChat} from './ShakabumboChat';

export function ShakabumboCompanion({routeIsQuran}:{routeIsQuran:boolean}){
 const engine=useShakabumboEngine(routeIsQuran),[chatOpen,setChatOpen]=React.useState(false);
 const quiet=routeIsQuran||engine.state==='LISTENING_QURAN';
 const hidden=engine.minimized||engine.state==='HIDDEN';
 React.useEffect(()=>{if(quiet){setChatOpen(false);window.speechSynthesis?.cancel()}},[quiet]);
 return <section data-motion={engine.motion} className={`shakCompanionShelf${quiet?' shakQuiet':''}`} aria-label="مساعدك شكابمبو">
  {!hidden&&<button type="button" className="shakOriginalButton" onClick={()=>{if(!quiet)setChatOpen(true)}} disabled={quiet} aria-label={quiet?'شكابمبو ينصت للقرآن':'تحدث مع شكابمبو'}><ShakabumboRig state={engine.state} talking={engine.talking}/></button>}
  <div className="shakCompanionIntro"><strong>شكابمبو معك</strong><p aria-live="polite">{quiet?'أنصت معك للقرآن الكريم بهدوء.':'اضغط عليّ وخلّنا نتحدث عن درسك.'}</p>{!quiet&&!hidden&&<button type="button" className="shakAskBtn" onClick={()=>setChatOpen(true)}>تحدث مع شكابمبو 🎙️</button>}<button type="button" className="shakToggle" onClick={()=>{setChatOpen(false);engine.toggleMinimized()}} aria-pressed={!hidden}>{hidden?'إظهار شكابمبو':'إخفاء مؤقت'}</button></div>
  <ShakabumboChat open={chatOpen&&!hidden&&!quiet} blocked={quiet} onClose={()=>setChatOpen(false)}/>
 </section>;
}
