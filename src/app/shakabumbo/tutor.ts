import type {LessonContext} from './context';
import {SHIKABOMBO_POLICY} from '../../core/shikabombo';

// A free, offline, rule-based tutoring responder — the default, always-available
// implementation of the ShikabomboAIProvider interface already defined in
// src/core/shikabombo.ts. It is deliberately NOT a paid external AI subscription: it never
// calls out to any network service, so it needs no API key and creates no billing
// obligation. It only ever uses the real, trusted lesson context the student is already
// looking at (src/app/shakabumbo/context.ts) — never invented facts, and never the
// student's hidden correct answer, which this responder is never given in the first place.
// If a real AI provider (OpenAI/Gemini/etc.) is ever connected, it can implement the same
// respond() shape and be swapped in without touching the chat UI — that seam is the point
// of keeping ShikabomboAIProvider as the interface.

export interface TutorTurn{from:'student'|'shak';text:string}

const GREETINGS=['أبشر يا بطل! 🌟','تمام! خلّنا نفكّر فيها مع بعض.','يا هلا! جاهز أساعدك.'];
const NO_CONTEXT='افتح درسًا من صفحاتك التعليمية، وأنا أساعدك فيه خطوة خطوة. ما أقدر أتكلم عن أشياء برا الدرس 🙂';
const CANT_REVEAL='ما أقدر أعطيك الإجابة النهائية مباشرة، بس خلّني أساعدك توصلها بنفسك 💪';

function pick<T>(arr:T[]):T{return arr[Math.floor(Math.random()*arr.length)]}

function stripDiacritics(s:string){return s.normalize('NFKD').replace(/[ً-ٰٟ]/g,'')}

export function tutorRespond(question:string,ctx:LessonContext|null,hintLevel:number):{reply:string;usedHint:boolean}{
  const q=stripDiacritics(question.trim());
  if(!ctx)return{reply:NO_CONTEXT,usedHint:false};

  const askingForAnswer=/الاجابه|الجواب الصح|اعطني الجواب|قول لي الجواب|وش الحل النهائي/.test(q.replace(/[إأآا]/g,'ا'));
  if(askingForAnswer&&!SHIKABOMBO_POLICY.mayChangeAssessment){
    return{reply:`${CANT_REVEAL}\n${ctx.hint?`تلميح: ${ctx.hint}`:'اقرأ السؤال مرة ثانية ببطء وفكر في مثال شبيه من الدرس.'}`,usedHint:true};
  }

  const asksMeaning=/معنى|ايش يعني|وش معنى|اشرح/.test(q);
  const asksRead=/اقرأ|قراءة|كيف انطق|كيف اقرأها/.test(q);
  const sayGreeting=q.length<2;

  if(sayGreeting){
    return{reply:`${pick(GREETINGS)} ${ctx.prompt?`سؤالنا الحالي: «${ctx.prompt}»`:`درسنا اليوم: ${ctx.title}`}`,usedHint:false};
  }

  if(asksRead&&ctx.prompt){
    return{reply:`تعال نقرأها مع بعض: «${ctx.prompt}». اقرأها أنت بصوت عالٍ، وأنا بسمعك 👂`,usedHint:false};
  }

  if(asksMeaning&&ctx.explanation){
    return{reply:ctx.explanation,usedHint:false};
  }

  // Default: escalating hints, never the literal answer — grounded in the real on-screen hint.
  if(ctx.hint){
    if(hintLevel===0)return{reply:`تلميح أول: ${ctx.hint}`,usedHint:true};
    return{reply:`تلميح ثانٍ: فكّر في ${ctx.hint} خطوة خطوة، وجرّب تربطها بما تعلمناه في «${ctx.title}».`,usedHint:true};
  }

  return{reply:`خلّنا نرجع لدرس «${ctx.title}» سوا: ${ctx.explanation||ctx.title}. جرّب تجاوب وأنا بجانبك.`,usedHint:false};
}
