import React from 'react';
import type {CompanionState} from './state';
import original from '../assets/shak-original-full.webp';
import wave from '../assets/shak-original-wave.webp';
// Two complete aligned poses. Only the free hand was opened in the greeting artwork;
// no detached head, body reconstruction, or joint warping.
export function ShakabumboRig({state,talking}:{state:CompanionState;talking:boolean}){
 return <span className="shakPose" data-state={state} data-talking={talking?'1':'0'}><img className="shakOriginal shakOriginalBase" src={original} alt="شكابمبو الأصلي يحمل نجمته الذهبية" width="640" height="585" draggable={false}/><img className="shakOriginal shakOriginalWave" src={wave} alt="" aria-hidden="true" width="640" height="585" draggable={false}/></span>;
}
