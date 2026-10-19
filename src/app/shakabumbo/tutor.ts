import type {LessonContext} from './context';
import {SHIKABOMBO_POLICY} from '../../core/shikabombo';
import {REPLY_NO_CONTEXT,FOLLOWUP,ASSESSMENT_HELP,HELP_MENU} from './phrases';
export interface TutorTurn{from:'student'|'shak';text:string}
const normalize=(s:string)=>s.normalize('NFKD').replace(/[ً-ٰٟ]/g,'').replace(/[إأآ]/g,'ا').replace(/ة/g,'ه');
export function tutorRespond(question:string,ctx:LessonContext|null,hintLevel:number):{reply:string;usedHint:boolean}{
 const q=normalize(question.trim());
 if(ctx?.subject==='quran')return{reply:'استمع إلى التلاوة المعتمدة من زر المقطع المقرر.',usedHint:false};
 if(!ctx)return{reply:REPLY_NO_CONTEXT,usedHint:false};
 if(/كلم[هة].*كسرتين|انطق.*كسرتين/.test(q))return{reply:'كَسْرَتَيْنِ',usedHint:false};
 if(/مرحبا|السلام|اهلا|هلا|^هاي$/.test(q))return{reply:'وَعَلَيْكُمُ السَّلَامُ وَرَحْمَةُ اللَّهِ!\n'+HELP_MENU,usedHint:false};
 if(/اقرا|قراء|انطق/.test(q))return{reply:ctx.prompt||ctx.explanation||ctx.title,usedHint:false};
 if(ctx.assessment)return{reply:ASSESSMENT_HELP,usedHint:false};
 if(/اعد|كرر|مره ثانيه|ما فهمت|وضح|اشرح|معنى/.test(q)&&ctx.explanation)return{reply:`${ctx.explanation}\n${FOLLOWUP}`,usedHint:false};
 if(/الاجابه|الجواب|الحل النهائي/.test(q)&&!SHIKABOMBO_POLICY.mayChangeAssessment)return{reply:`نحاول الوصول إلى الإجابة معًا.\n${ctx.hint||HELP_MENU}`,usedHint:!!ctx.hint};
 if(/تلميح|ساعد|كيف|ابدا|اكمل/.test(q)||hintLevel>0){if(ctx.hint)return{reply:`${ctx.hint}\n${hintLevel===0?'ما الخطوة الأولى التي ستجربها؟':'جرّب هذه الخطوة، ثم تحقق من إجابتك في التدريب.'}`,usedHint:true}}
 return{reply:HELP_MENU,usedHint:false};
}
