import React from 'react';
import {ShakabumboRig} from './ShakabumboRig';
// Temporarily unavailable across the site; no chat, microphone or audio is mounted.
export function ShakabumboCompanion({routeIsQuran}:{routeIsQuran:boolean}){
 return <section className="shakOneTap shakQuiet" aria-label="شكابمبو تحت التطوير">
  <div className="shakOneTapLane"><button type="button" className="shakOneTapCharacter" disabled aria-label="شكابمبو تحت التطوير"><ShakabumboRig state="LISTENING_QURAN" talking={false}/></button></div>
  <p className="shakTapHint">تحت التطوير</p>
 </section>;
}
