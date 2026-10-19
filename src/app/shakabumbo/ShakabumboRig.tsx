import React from 'react';
import type {CompanionState} from './state';
import original from '../assets/shak-original-full.webp';

// The complete approved original. No detached head, invented body, or joint distortion.
// Whole-image gestures are intentionally limited for the committee demonstration.
export function ShakabumboRig({state,talking}:{state:CompanionState;talking:boolean}){
  return <img className="shakOriginal" data-state={state} data-talking={talking?'1':'0'} src={original} alt="شكابمبو الأصلي يحمل نجمته الذهبية" width="640" height="585" draggable={false}/>;
}
