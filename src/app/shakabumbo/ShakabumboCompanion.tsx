import {primeArabicAudio} from './remote-speech';
import React from 'react';
import {ShakabumboRig} from './ShakabumboRig';
import {useShakabumboEngine} from './useShakabumboEngine';
import {ShakabumboChat} from './ShakabumboChat';
import {cancelArabicSpeech} from './speak';
import type {VoicePhase} from './voice-session';
export function ShakabumboCompanion({routeIsQuran}:{routeIsQuran:boolean}){
 const engine=useShakabumboEngine(routeIsQuran),[open,setOpen]=React.useState(false),[phase,setPhase]=React.useState<VoicePhase>('idle');
 const quiet=routeIsQuran||engine.state==='LISTENING_QURAN',hidden=engine.minimized||engine.state==='HIDDEN';
 React.useEffect(()=>{if(quiet||hidden){setOpen(false);cancelArabicSpeech()}},[quiet,hidden]);
 return <section data-motion={engine.motion} className={`shakOneTap${quiet?' shakQuiet':''}${open?' shakOneTapActive':''}`} aria-label="مساعدك شكابمبو">
  {hidden?<button type="button" className="shakRestore" onClick={engine.toggleMinimized}>إظهار شكابمبو</button>:<>
   <div className="shakOneTapLane"><button type="button" className="shakOneTapCharacter" onClick={()=>{if(!quiet){primeArabicAudio();cancelArabicSpeech();setOpen(v=>!v)}}} disabled={quiet} aria-pressed={open} aria-label={quiet?'شكابمبو ينصت للقرآن':open?'إنهاء المحادثة مع شكابمبو':'تحدث مع شكابمبو'}><ShakabumboRig state={quiet?'LISTENING_QURAN':open&&phase==='speaking'?'SPEAKING':engine.state} talking={open&&phase==='speaking'}/></button></div>
   {!open&&<p className="shakTapHint">{quiet?'أنصت معك للقرآن الكريم':'اضغط على شكابمبو ليتحدث معك'}</p>}
   <ShakabumboChat open={open&&!quiet} blocked={quiet} onClose={()=>setOpen(false)} onPhaseChange={setPhase}/>
  </>}
 </section>;
}
