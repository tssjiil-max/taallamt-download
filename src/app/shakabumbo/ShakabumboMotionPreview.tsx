import React from 'react';
import './ShakabumboMotionPreview.css';

/**
 * Visual-only sandbox. Never invokes TTS, microphone, student state, or the
 * existing ShakabumboRig. Consumer owns imageUrl (transparent PNG/WebP).
 * A single raster image cannot deliver true skeletal animation or lip sync.
 */
export type ShakMotionPhase = 'idle' | 'listening' | 'thinking' | 'speaking' | 'celebrating' | 'quran-listening';
export const MOTION_PHASE_LABELS: Record<ShakMotionPhase, string> = {
  idle: 'مستعد لمساعدتك',
  listening: 'أنصت إليك',
  thinking: 'أفكر في سؤالك',
  speaking: 'أتحدث — حركة تجريبية',
  celebrating: 'أحسنت يا بطل!',
  'quran-listening': 'أنصت للقرآن الكريم',
};
export function ShakabumboMotionPreview({imageUrl,phase='idle'}:{
 imageUrl:string;phase?:ShakMotionPhase
}){
 return <div className="shakMotionPreview" data-phase={phase} aria-label={MOTION_PHASE_LABELS[phase]}>
   <div className="shakMotionPreview__figure">
     <img src={imageUrl} alt="شكابمبو ذو الشعر البرتقالي والميدالية والميكروفون" draggable={false}/>
   </div>
   <p className="shakMotionPreview__status" aria-live="polite">{MOTION_PHASE_LABELS[phase]}</p>
 </div>;
}
/** Controls isolated from the live student interface. */
export function ShakabumboMotionLab({imageUrl}:{imageUrl:string}){
 const [phase,setPhase]=React.useState<ShakMotionPhase>('idle');
 return <section className="shakMotionLab" dir="rtl" aria-label="معاينة حركة شكابمبو">
   <ShakabumboMotionPreview imageUrl={imageUrl} phase={phase}/>
   <div className="shakMotionLab__controls">{(Object.keys(MOTION_PHASE_LABELS) as ShakMotionPhase[]).map(key=>
     <button key={key} type="button" aria-pressed={phase===key} onClick={()=>setPhase(key)}>
       {MOTION_PHASE_LABELS[key]}
     </button>)}</div>
   <small>معاينة حركة بصرية فقط؛ لا يوجد تزامن شفاه حقيقي حتى تتوفر طبقات تحريك مستقلة.</small>
 </section>;
}
