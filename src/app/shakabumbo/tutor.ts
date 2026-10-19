import type {LessonContext} from './context';
import {SHIKABOMBO_POLICY} from '../../core/shikabombo';
export interface TutorTurn{from:'student'|'shak';text:string}
const normalize=(s:string)=>s.normalize('NFKD').replace(/[ً-ٰٟ]/g,'').replace(/[إأآ]/g,'ا').replace(/ة/g,'ه');
export function tutorRespond(question:string,ctx:LessonContext|null,hintLevel:number):{reply:string;usedHint:boolean}{
 const q=normalize(question.trim());
 if(!ctx)return{reply:'افتح درسًا من صفحاتك التعليمية، وسأساعدك في السؤال والشرح. مساعدتي محدودة بمحتوى الدرس الحالي.',usedHint:false};
 if(/كلم[هة].*كسرتين|انطق.*كسرتين/.test(q))return{reply:'كَسْرَتَيْنِ',usedHint:false};
 if(/مرحبا|السلام|اهلا|هلا|^هاي$/.test(q))return{reply:`أهلًا يا بطل! درسنا ${ctx.title}. تحب نقرأ السؤال أو نراجع الشرح؟`,usedHint:false};
 const read=/اقرا|قراء|انطق/.test(q);
 if(read)return{reply:ctx.prompt||ctx.explanation||ctx.title,usedHint:false};
 if(ctx.assessment)return{reply:'هذا اختبارك يا بطل. أقدر أقرأ السؤال، وحاول الإجابة بنفسك. نراجع الشرح معًا بعد الاختبار.',usedHint:false};
 if(/اعد|كرر|مره ثانيه|ما فهمت|وضح|اشرح|معنى/.test(q)&&ctx.explanation)
  return{reply:`${ctx.explanation}\nأي جزء تحب نراجعه: السؤال أو التلميح؟`,usedHint:false};
 if(/الاجابه|الجواب|الحل النهائي/.test(q)&&!SHIKABOMBO_POLICY.mayChangeAssessment)
  return{reply:`خلّنا نصل للإجابة بأنفسنا. ${ctx.hint||'اقرأ السؤال ببطء وفكّر في أول خطوة.'}`,usedHint:!!ctx.hint};
 if(/تلميح|ساعد|كيف|ابدا|اكمل/.test(q)||hintLevel>0){
  if(ctx.hint)return{reply:hintLevel===0?`تلميح من درسك: ${ctx.hint}. ما أول خطوة ستجربها؟`:`نرجع للخطوة نفسها: ${ctx.hint}. جرّبها ثم تحقق من إجابتك في التدريب.`,usedHint:true};
 }
 return{reply:`أساعدك في درس ${ctx.title} فقط. تقدر تقول: اقرأ السؤال، اشرح الدرس، أو أعطني تلميحًا.`,usedHint:false};
}
