import React from 'react';
import {companionBus,type CompanionEventName} from './bus';
import type {CompanionState} from './state';
import {getMotionPref,onMotionPrefChange,type MotionPref} from './settings';

const ENTERED_KEY='shakabumbo:entered-session';
const MIN_X=6,MAX_X=94; // percent along the walking lane, kept clear of the screen edges

type Reaction={state:CompanionState;ms:number};
const REACTION_BY_EVENT:Record<CompanionEventName,Reaction>={
  QUESTION_STARTED:{state:'EXPLAINING',ms:900},
  ANSWER_CORRECT:{state:'ENCOURAGING',ms:1100},
  ANSWER_INCORRECT:{state:'THINKING',ms:1100},
  STAR_AWARDED:{state:'CELEBRATING',ms:1300},
  TASK_COMPLETED:{state:'CELEBRATING',ms:1900},
  QURAN_PLAY_STARTED:{state:'LISTENING_QURAN',ms:0},
  QURAN_PLAY_STOPPED:{state:'IDLE',ms:0}
};

export interface ShakabumboEngine{
  state:CompanionState;
  facing:'left'|'right';
  x:number; // percent, 0..100
  talking:boolean;
  minimized:boolean;
  motion:MotionPref;
  toggleMinimized:()=>void;
}

export function useShakabumboEngine(routeIsQuran:boolean):ShakabumboEngine{
  const [state,setState]=React.useState<CompanionState>('IDLE');
  const [facing,setFacing]=React.useState<'left'|'right'>('right');
  const [x,setX]=React.useState(50);
  const [talking,setTalking]=React.useState(false);
  const [motion,setMotion]=React.useState<MotionPref>(()=>getMotionPref());
  const [minimized,setMinimized]=React.useState(()=>getMotionPref()==='off');

  const motionRef=React.useRef(motion);motionRef.current=motion;
  const minimizedRef=React.useRef(minimized);minimizedRef.current=minimized;
  const stateRef=React.useRef(state);stateRef.current=state;
  const xRef=React.useRef(x);xRef.current=x;
  const dirRef=React.useRef<1|-1>(1);
  const enteredRef=React.useRef(false);
  const quranForcedRef=React.useRef(routeIsQuran);
  const audioListeningRef=React.useRef(false);
  const reactionTimerRef=React.useRef<ReturnType<typeof setTimeout>|null>(null);
  const rafRef=React.useRef<number|null>(null);
  const mountedRef=React.useRef(true);

  const clearReactionTimer=React.useCallback(()=>{
    if(reactionTimerRef.current!==null){clearTimeout(reactionTimerRef.current);reactionTimerRef.current=null}
  },[]);

  const stopWalkLoop=React.useCallback(()=>{
    if(rafRef.current!==null){cancelAnimationFrame(rafRef.current);rafRef.current=null}
  },[]);

  const applyState=React.useCallback((next:CompanionState)=>{
    if(!mountedRef.current)return;
    stateRef.current=next;
    setState(next);
  },[]);

  const quranActive=React.useCallback(()=>quranForcedRef.current||audioListeningRef.current,[]);

  // Autonomous ambient loop: real easing in/out, occasional pauses, direction and facing
  // changes — not a single translateX trick. Only runs for the 'full' motion setting.
  const startAmbientLoop=React.useCallback(()=>{
    stopWalkLoop();
    if(motionRef.current!=='full'||minimizedRef.current||quranActive())return;
    let phase:'pausing'|'walking'='pausing';
    let phaseStart=performance.now();
    let phaseLen=800+Math.random()*1800;
    let last=phaseStart;
    const step=(now:number)=>{
      if(!mountedRef.current)return;
      if(motionRef.current!=='full'||minimizedRef.current||quranActive()){rafRef.current=null;return}
      // a discrete reaction (ANSWER_CORRECT, etc.) owns the pose until it resolves
      if(!(stateRef.current==='IDLE'||stateRef.current==='WALKING')){
        rafRef.current=requestAnimationFrame(step);
        return;
      }
      const dt=Math.min(.05,(now-last)/1000);last=now;
      const elapsed=now-phaseStart;
      if(phase==='pausing'){
        if(stateRef.current!=='IDLE')applyState('IDLE');
        if(elapsed>phaseLen){
          phase='walking';phaseStart=now;phaseLen=2200+Math.random()*2600;
          if(Math.random()<.5){dirRef.current=(dirRef.current*-1) as 1|-1;setFacing(dirRef.current===1?'right':'left')}
        }
      }else{
        if(stateRef.current!=='WALKING')applyState('WALKING');
        const progress=Math.min(1,elapsed/phaseLen);
        // ease-in / ease-out speed envelope, so the character accelerates then settles
        const envelope=Math.sin(Math.PI*progress);
        const speed=46*envelope; // percent per second at the peak of the stride
        let next=xRef.current+dirRef.current*speed*dt;
        if(next<=MIN_X){next=MIN_X;dirRef.current=1;setFacing('right')}
        if(next>=MAX_X){next=MAX_X;dirRef.current=-1;setFacing('left')}
        xRef.current=next;setX(next);
        if(elapsed>phaseLen){phase='pausing';phaseStart=now;phaseLen=1000+Math.random()*2600}
      }
      rafRef.current=requestAnimationFrame(step);
    };
    rafRef.current=requestAnimationFrame(step);
  },[applyState,quranActive,stopWalkLoop]);

  const settleIntoAmbient=React.useCallback(()=>{
    if(quranActive()){applyState('LISTENING_QURAN');return}
    applyState('IDLE');
    if(motionRef.current==='full')startAmbientLoop();
  },[applyState,quranActive,startAmbientLoop]);

  const runEntrance=React.useCallback(()=>{
    enteredRef.current=true;
    try{sessionStorage.setItem(ENTERED_KEY,'1')}catch{/* ignore */}
    if(motionRef.current!=='full'){settleIntoAmbient();return}
    applyState('ENTERING');
    clearReactionTimer();
    reactionTimerRef.current=setTimeout(()=>{
      applyState('LANDING');
      reactionTimerRef.current=setTimeout(()=>{
        applyState('IDLE');
        reactionTimerRef.current=setTimeout(()=>{settleIntoAmbient()},900);
      },360);
    },1050);
  },[applyState,clearReactionTimer,settleIntoAmbient]);

  // mount: decide whether this tab has already seen the fall-in, react to the initial route
  React.useEffect(()=>{
    mountedRef.current=true;
    let seen=false;
    try{seen=sessionStorage.getItem(ENTERED_KEY)==='1'}catch{/* ignore */}
    enteredRef.current=seen;
    if(quranActive()){
      applyState('LISTENING_QURAN');
    }else if(seen){
      settleIntoAmbient();
    }else{
      runEntrance();
    }
    return()=>{mountedRef.current=false;stopWalkLoop();clearReactionTimer()};
    // eslint-disable-next-line react-hooks/exhaustive-deps
  },[]);

  // Quran forcing from the current route (the page itself, independent of audio state).
  React.useEffect(()=>{
    const was=quranForcedRef.current;
    quranForcedRef.current=routeIsQuran;
    if(was===routeIsQuran)return;
    if(routeIsQuran){
      clearReactionTimer();stopWalkLoop();
      applyState('LISTENING_QURAN');
    }else if(!quranActive()){
      if(!enteredRef.current)runEntrance();
      else{applyState('LANDING');clearReactionTimer();reactionTimerRef.current=setTimeout(()=>settleIntoAmbient(),420)}
    }
  },[routeIsQuran,applyState,clearReactionTimer,quranActive,runEntrance,settleIntoAmbient,stopWalkLoop]);

  // Real learning events drive reactions; recitation audio actually playing forces the
  // quiet, seated listening state regardless of which page it started on.
  React.useEffect(()=>{
    const offs:(()=>void)[]=[];
    (Object.keys(REACTION_BY_EVENT) as CompanionEventName[]).forEach(name=>{
      offs.push(companionBus.on(name,()=>{
        if(name==='QURAN_PLAY_STARTED'){audioListeningRef.current=true;clearReactionTimer();stopWalkLoop();applyState('LISTENING_QURAN');return}
        if(name==='QURAN_PLAY_STOPPED'){
          audioListeningRef.current=false;
          if(!quranForcedRef.current){
            if(!enteredRef.current)runEntrance();else{clearReactionTimer();reactionTimerRef.current=setTimeout(()=>settleIntoAmbient(),380)}
          }
          return;
        }
        if(quranActive())return; // silence: no celebration or fidgeting during recitation
        if(minimizedRef.current)return;
        const reaction=REACTION_BY_EVENT[name];
        clearReactionTimer();stopWalkLoop();
        applyState(reaction.state);
        reactionTimerRef.current=setTimeout(()=>settleIntoAmbient(),reaction.ms);
      }));
    });

    // Detect real recitation audio playing anywhere on the page, even if no explicit
    // QURAN_PLAY_* event was emitted by the caller.
    const onPlay=(event:Event)=>{
      if((event.target as HTMLElement|null)?.tagName!=='AUDIO')return;
      companionBus.emit('QURAN_PLAY_STARTED');
    };
    const onPause=()=>{
      const stillPlaying=Array.from(document.querySelectorAll('audio')).some(audio=>!audio.paused&&!audio.ended);
      if(!stillPlaying)companionBus.emit('QURAN_PLAY_STOPPED');
    };
    document.addEventListener('play',onPlay,true);
    document.addEventListener('pause',onPause,true);
    document.addEventListener('ended',onPause,true);
    offs.push(()=>document.removeEventListener('play',onPlay,true));
    offs.push(()=>document.removeEventListener('pause',onPause,true));
    offs.push(()=>document.removeEventListener('ended',onPause,true));
    return()=>offs.forEach(off=>off());
    // eslint-disable-next-line react-hooks/exhaustive-deps
  },[]);

  // Approximate mouth movement while the read-aloud voice is actually speaking (speechSynthesis).
  React.useEffect(()=>{
    if(typeof speechSynthesis==='undefined')return;
    let id:ReturnType<typeof setInterval>|null=null;
    const tick=()=>{
      const speaking=speechSynthesis.speaking&&!speechSynthesis.paused;
      setTalking(speaking);
      if(speaking&&motionRef.current==='full'&&stateRef.current!=='LISTENING_QURAN'&&!minimizedRef.current&&stateRef.current!=='ENTERING'&&stateRef.current!=='LANDING'){
        if(stateRef.current!=='SPEAKING'&&stateRef.current!=='CELEBRATING'&&stateRef.current!=='ENCOURAGING')applyState('SPEAKING');
      }else if(!speaking&&stateRef.current==='SPEAKING'){
        settleIntoAmbient();
      }
    };
    id=setInterval(tick,180);
    return()=>{if(id)clearInterval(id)};
  },[applyState,settleIntoAmbient]);

  // Settings: تشغيل / تقليل / إيقاف — applied live, without a page reload.
  React.useEffect(()=>onMotionPrefChange(pref=>{
    setMotion(pref);motionRef.current=pref;
    if(pref==='off'){stopWalkLoop();clearReactionTimer();setMinimized(true);minimizedRef.current=true;applyState('HIDDEN');return}
    setMinimized(false);minimizedRef.current=false;
    if(pref==='reduced'){stopWalkLoop();settleIntoAmbient();return}
    settleIntoAmbient();
  }),[applyState,clearReactionTimer,settleIntoAmbient,stopWalkLoop]);

  const toggleMinimized=React.useCallback(()=>{
    setMinimized(prev=>{
      const next=!prev;minimizedRef.current=next;
      if(next){stopWalkLoop();clearReactionTimer();applyState('HIDDEN')}
      else settleIntoAmbient();
      return next;
    });
  },[applyState,clearReactionTimer,settleIntoAmbient,stopWalkLoop]);

  return {state,facing,x,talking,minimized,motion,toggleMinimized};
}
