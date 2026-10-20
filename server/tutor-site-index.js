// Read-only retrieval. Distribution metadata is not a substitute for textbook text.
import {ARABIC_WEEKS,ISLAMIC_WEEKS,SPELLING_HANDWRITING_BOOK_WEEKS} from './learning-content.js';
import {FOUNDATION_CONTENT} from './foundation-content.js';
const labels={arabic:'لغتي',islamic:'الدراسات الإسلامية',spelling:'الإملاء',handwriting:'فن الخط'};
const normalize=s=>String(s||'').normalize('NFKD').replace(/[ً-ٰٟ]/g,'').replace(/[إأآ]/g,'ا').replace(/ى/g,'ي');
export function buildTutorReferences(catalog,question){
 const index=[];const seen=new Set();
 const add=(subject,title,unit='')=>{const key=subject+title;if(!title||seen.has(key))return;seen.add(key);index.push({subject:labels[subject],title,unit})};
 for(const [subject,weeks] of [['arabic',ARABIC_WEEKS],['islamic',ISLAMIC_WEEKS]])for(const row of Object.values(weeks))if(!row.holiday&&!/تمهيد|ختام/.test(row.unit))add(subject,row.lesson,row.unit);
 for(const row of Object.values(SPELLING_HANDWRITING_BOOK_WEEKS))for(const subject of ['spelling','handwriting'])add(subject,row[subject]?.title);
 const terms=normalize(question).split(/\s+/).filter(w=>w.length>2);
 const storedIds=new Set(catalog.map(t=>t.id));
 const content=[...catalog,...FOUNDATION_CONTENT.filter(t=>!storedIds.has(t.id))].filter(t=>labels[t.subject]&&t.learning?.status==='approved'&&!String(t.id||'').includes('original-arabic-')&&!String(t.learning.reference||'').includes('نص وتدريب أصليان'));
 const ranked=content.map(t=>({t,score:terms.reduce((n,w)=>n+(normalize(t.title+' '+t.learning.explanation).includes(w)?1:0),0)})).sort((a,b)=>b.score-a.score);
 const result={coverage:'فهرس توزيع الفصل الأول المتاح فقط؛ لا تدّع اكتمال جميع كتب السنة. إذا كان الدرس مفهرسًا دون نص، أكد وجود عنوانه واطلب صفحة الدرس لشرح تفاصيلها دون تخمين. الصديقان في لغتي، والصديق الوفي عنوان مستقل في فن الخط.',index,lessons:ranked.slice(0,6).map(({t})=>({title:t.title,subject:labels[t.subject],reference:t.learning.reference,explanation:String(t.learning.explanation||'').slice(0,350)}))};
 while(JSON.stringify(result).length>7800&&result.lessons.length)result.lessons.pop();
 return JSON.stringify(result);
}
