import React from 'react';
import type {CompanionState} from './state';
import original from '../assets/shak-orange-microphone.webp';
// Render the exact complete original. All gestures affect this single image.
export function ShakabumboRig({state,talking}:{state:CompanionState;talking:boolean}){
 return <span className="shakPose" data-state={state} data-talking={talking?'1':'0'}><img className="shakOriginal shakOriginalBase" src={original} alt="شكابمبو بشعره البرتقالي والميكروفون والميدالية الذهبية" width="640" height="800" draggable={false}/></span>;
}
