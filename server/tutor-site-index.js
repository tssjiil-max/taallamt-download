// Read-only retrieval. Distribution metadata is not a substitute for textbook text.
import {ARABIC_WEEKS,ISLAMIC_WEEKS,SPELLING_HANDWRITING_BOOK_WEEKS} from './learning-content.js';
import {TUTOR_BOOK_CONTENT,TUTOR_BOOK_COVERAGE} from './tutor-book-content.js';
import {FOUNDATION_CONTENT} from './foundation-content.js';
const labels={arabic:'لغتي',islamic:'الدراسات الإسلامية',spelling:'الإملاء',handwriting:'فن الخط'};
const normalize=s=>String(s||'').normalize('NFKD').replace(/[ً-ٰٟ]/g,'').replace(/[إأآ]/g,'ا').replace(/ى/g,'ي').replace(/ة/g,'ه').replace(/[٠-٩]/g,d=>String('٠١٢٣٤٥٦٧٨٩'.indexOf(d))).replace(/[^ء-ي0-9\s]/g,' ').replace(/\s+/g,' ').trim().replace(/(^| )(واحد|الاول|اثنين|الثاني|ثلاثه|الثالث)(?= |$)/g,(_m,space,n)=>space+({واحد:1,الاول:1,اثنين:2,الثاني:2,ثلاثه:3,الثالث:3}[n]));
export function buildTutorReferences(catalog,question,history=[]){
 const index=[];const seen=new Set();
 const add=(subject,title,unit='')=>{const key=subject+title;if(!title||seen.has(key))return;seen.add(key);index.push({subject:labels[subject],title,unit})};
 for(const [subject,weeks] of [['arabic',ARABIC_WEEKS],['islamic',ISLAMIC_WEEKS]])for(const row of Object.values(weeks))if(!row.holiday&&!/تمهيد|ختام/.test(row.unit))add(subject,row.lesson,row.unit);
 for(const t of TUTOR_BOOK_CONTENT)add(t.subject,t.title,t.unit);
 for(const row of Object.values(SPELLING_HANDWRITING_BOOK_WEEKS))for(const subject of ['spelling','handwriting'])add(subject,row[subject]?.title);
 const query=normalize(question),terms=query.split(/\s+/).filter(w=>w.length>2);
 const previous=normalize((Array.isArray(history)?history:[]).filter(t=>t.role==='user').slice(-1).map(t=>String(t.content||'').slice(0,240)).join(' '));
 const storedIds=new Set(catalog.map(t=>t.id));
 const content=[...catalog,...[...TUTOR_BOOK_CONTENT,...FOUNDATION_CONTENT].filter(t=>!storedIds.has(t.id))].filter(t=>labels[t.subject]&&t.learning?.status==='approved'&&!String(t.id||'').includes('original-arabic-')&&!String(t.learning.reference||'').includes('نص وتدريب أصليان'));
 const ranked=content.map(t=>{const title=normalize(t.title),aliases=t.id==='book-arabic-friends'?[title,'الصديقين']: [title];
  const exact=aliases.some(a=>query.includes(a)),follow=aliases.some(a=>previous.includes(a));
  const score=(exact?500+title.length:0)+(follow?80:0)+terms.reduce((n,w)=>n+(normalize(t.title+' '+t.learning.explanation).includes(w)?1:0),0);
  return {t,score};
 }).sort((a,b)=>b.score-a.score);
 const result={coverage:'مراجع دروس الجزء الأول من كتابي المعلم المرفوعين، طبعة 1447: 8 نصوص قراءة أساسية في لغتي و19 ملخص درس في الدراسات الإسلامية. ليست كل أنشطة الكتاب أو الأناشيد أو أجزاء السنة الأخرى منقولة. استخدم نص المرجع المرفق للإجابة عن الدرس ولا تقل إنه غير مدرج. اطلب الصفحة فقط إن كان التفصيل المطلوب غير موجود. الصديقان في لغتي، والصديق الوفي عنوان مستقل في فن الخط.',bookCoverage:TUTOR_BOOK_COVERAGE,index,lessons:ranked.slice(0,3).map(({t})=>({title:t.title,subject:labels[t.subject],reference:t.learning.reference,kind:t.kind||'approved_platform_explanation',explanation:String(t.learning.explanation||'').slice(0,2000)}))};
 while(JSON.stringify(result).length>7800&&result.lessons.length>1)result.lessons.pop();
 if(JSON.stringify(result).length>7800)result.lessons[0].explanation=result.lessons[0].explanation.slice(0,800);
 return JSON.stringify(result);
}
