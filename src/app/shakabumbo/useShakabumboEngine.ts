import {cancelArabicSpeech} from './speak';
import React from 'react';
import {companionBus,type CompanionEventName} from './bus';
import type {CompanionState} from './state';
import {getMotionPref,onMotionPrefChange,type MotionPref} from './settings';
export interface ShakabumboEngine{state:CompanionState;facing:'left'|'right';x:number;talking:boolean;minimized:boolean;motion:MotionPref;toggleMinimized:()=>void}
export function useShakabumboEngine(routeIsQuran:boolean):ShakabumboEngine{
 const [state,setState]=React.useState<CompanionState>('IDLE'),[motion,setMotion]=React.useState<MotionPref>(getMotionPref);
 const [minimized,setMinimized]=React.useState(()=>getMotionPref()==='off'),[audio,setAudio]=React.useState(false);
 const [hidden,setHidden]=React.useState(document.hidden);
 const timer=React.useRef<ReturnType<typeof setTimeout>|null>(null);
 const quiet=routeIsQuran||audio;
 const quietRef=React.useRef(quiet);quietRef.current=quiet;
 React.useEffect(()=>onMotionPrefChange(next=>{setMotion(next);setMinimized(next==='off')}),[]);
 React.useEffect(()=>{
  const media=()=>setAudio(Array.from(document.querySelectorAll<HTMLAudioElement>('audio:not([data-shak-voice])')).some(el=>!el.paused&&!el.ended));
  const visibility=()=>setHidden(document.hidden);
  const on=()=>setAudio(true),off=()=>media();
  const stops=[companionBus.on('QURAN_PLAY_STARTED',on),companionBus.on('QURAN_PLAY_STOPPED',off)];
  document.addEventListener('play',media,true);document.addEventListener('pause',media,true);document.addEventListener('ended',media,true);document.addEventListener('visibilitychange',visibility);media();
  return()=>{stops.forEach(stop=>stop());document.removeEventListener('play',media,true);document.removeEventListener('pause',media,true);document.removeEventListener('ended',media,true);document.removeEventListener('visibilitychange',visibility)};
 },[]);
 React.useEffect(()=>{
  const reactions:Partial<Record<CompanionEventName,CompanionState>>={QUESTION_STARTED:'EXPLAINING',ANSWER_CORRECT:'ENCOURAGING',ANSWER_INCORRECT:'THINKING',STAR_AWARDED:'CELEBRATING',TASK_COMPLETED:'CELEBRATING'};
  const stops=Object.entries(reactions).map(([event,next])=>companionBus.on(event as CompanionEventName,()=>{
   if(quietRef.current||document.hidden)return;if(timer.current)clearTimeout(timer.current);setState(next!);timer.current=setTimeout(()=>setState('IDLE'),1500);
  }));return()=>{stops.forEach(stop=>stop());if(timer.current)clearTimeout(timer.current)};
 },[]);
 React.useEffect(()=>{if(quiet||hidden){if(timer.current)clearTimeout(timer.current);cancelArabicSpeech();setState('IDLE')}},[quiet,hidden]);
 return{state:hidden?'HIDDEN':quiet?'LISTENING_QURAN':state,facing:'right',x:50,talking:false,minimized,motion,toggleMinimized:()=>setMinimized(v=>!v)};
}
