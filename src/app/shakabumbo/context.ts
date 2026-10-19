// The trusted lesson context Shakabumbo's chat is allowed to see: only what the current
// learning screen itself already shows the student (subject, lesson title, the explanation
// text, and the exact question prompt/hint on screen). Never the correct answer — the chat
// must coach toward it, not reveal it, matching SHIKABOMBO_POLICY (mayChangeAssessment:false).
// Set by the real learning screen as its own activity/question state changes; read by the
// chat panel. Not a bus event, because the chat needs the *current* value at open time, not
// just a transient notification.
export interface LessonContext{
  assessment?:boolean;
  subject:string;
  subjectLabel:string;
  title:string;
  explanation?:string;
  prompt?:string;
  hint?:string;
}

let current:LessonContext|null=null;
const listeners=new Set<(ctx:LessonContext|null)=>void>();

export function setLessonContext(ctx:LessonContext|null){
  current=ctx;
  listeners.forEach(listener=>{try{listener(current)}catch{/* a listener must never break the learning flow */}});
}

export function getLessonContext(){return current}

export function onLessonContextChange(listener:(ctx:LessonContext|null)=>void){
  listeners.add(listener);
  return()=>{listeners.delete(listener)};
}
