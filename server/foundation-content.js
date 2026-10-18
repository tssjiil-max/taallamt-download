// Shared original practice, enabled by the teacher's staging activation request.
// This is supplementary skill practice, not a transcription of the official textbook.
import {validateContent} from './learning-core.js';
const lesson=(key,subject,title,explanation,rows)=>({id:`foundation-${key}`,subject,title,skill:title,weekNumber:1,source:'original_foundation',learning:validateContent({status:'approved',reference:'تعلّمت · تدريب تأسيسي أصلي · مراجعة النص ومفتاح الإجابة ١٨ أكتوبر ٢٠٢٦',explanation,questions:rows.map(([prompt,answers,hint],i)=>({id:`q${i+1}`,prompt,answers:Array.isArray(answers)?answers:[answers],hint:hint||explanation,ignoreDiacritics:true})),strategy:'example',dailyLimit:12,reviewDays:7,weekNumber:1})});
export const FOUNDATION_CONTENT=[
lesson('words','arabic','أفهم معنى الكلمة','اختر الإجابة من الكلمات المعروضة. نقرأ الكلمة ونبحث عن معناها.',[
['اختر ضد «كبير»: صغير / طويل.','صغير'],['اختر ضد «قريب»: بعيد / جديد.','بعيد'],['اختر مرادف «مسرور»: سعيد / حزين.','سعيد']]),
lesson('sentence','arabic','أرتب جملة مفيدة','تخبرنا الجملة المفيدة بمعنى واضح. رتب الكلمات المعروضة لتكون جملة، دون إضافة كلمات.',[
['رتب: عمر — يقرأ — قصة.',['يقرأ عمر قصة','عمر يقرأ قصة']],['رتب: هند — ترسم — زهرة.',['ترسم هند زهرة','هند ترسم زهرة']],['رتب: خالد — يرتب — كتبه.',['يرتب خالد كتبه','خالد يرتب كتبه']]]),
lesson('lam','spelling','أميز اللام الشمسية والقمرية','اللام القمرية تُنطق مثل «القمر»، واللام الشمسية لا تُنطق ويُشدّد الحرف بعدها مثل «الشمس». اكتب شمسية أو قمرية.',[
['صنّف لام «الشمس»: شمسية / قمرية.',['شمسية','لام شمسية']],['صنّف لام «القمر»: شمسية / قمرية.',['قمرية','لام قمرية']],['صنّف لام «البيت»: شمسية / قمرية.',['قمرية','لام قمرية']],['صنّف لام «الطريق»: شمسية / قمرية.',['شمسية','لام شمسية']]]),
lesson('long','spelling','أميز حروف المد','حروف المد: الألف مثل باب، والواو مثل نور، والياء مثل جميل. اختر حرف المد.',[
['ما حرف المد في «باب»؟',['الألف','ا','ألف']],['ما حرف المد في «نور»؟',['الواو','و','واو']],['ما حرف المد في «جميل»؟',['الياء','ي','ياء']]]),
lesson('taa','spelling','أميز التاء المربوطة والمفتوحة','التاء المربوطة تكتب ة أو ـة في آخر الكلمة، مثل مدرسة. التاء المفتوحة تكتب ت، مثل بيت. اكتب مربوطة أو مفتوحة.',[
['ما نوع التاء في «مدرسة»؟',['مربوطة','تاء مربوطة']],['ما نوع التاء في «بيت»؟',['مفتوحة','تاء مفتوحة']],['ما نوع التاء في «شجرة»؟',['مربوطة','تاء مربوطة']]]),
lesson('writing','handwriting','أكتب كلمات واضحة','انسخ النموذج على ورقة بتسطير المدرسة. راع شكل الحروف واتصالها والمسافات. أرسل الصورة لمعلمك؛ المعلم يقيّم موضع الحروف على السطر، ولا يمنح النظام درجة خط آلية.',[
['انسخ على الورقة: أحب مدرستي.','أحب مدرستي'],['انسخ على الورقة: أقرأ كل يوم.','أقرأ كل يوم'],['انسخ على الورقة: أكتب بخط واضح.','أكتب بخط واضح']]),
lesson('faith','islamic','أتعلم أساسيات ديني','الله ربي، والإسلام ديني، ومحمد صلى الله عليه وسلم نبيي. نراجع هذه المعاني بإجابات قصيرة.',[
['من ربك؟',['الله','ربي الله','الله ربي']],['ما دينك؟',['الإسلام','الاسلام','ديني الإسلام']],['من نبيك؟',['محمد','محمد صلى الله عليه وسلم','نبيي محمد']]]),
lesson('manners','islamic','أختار السلوك الحسن','أصدق في حديثي، وأستأذن قبل دخول بيت غيري، وأحافظ على نظافة المكان. اختر السلوك الحسن.',[
['اختر: الصدق / الكذب.','الصدق'],['قبل دخول بيت غيري أختار: الاستئذان / الدخول دون إذن.','الاستئذان'],['بعد الطعام أختار: تنظيف المكان / ترك المخلفات.','تنظيف المكان']])
];
export function foundationEnabled(env=process.env){return env.VERCEL_ENV!=='production'&&(!env.VERCEL_ENV||env.VERCEL_GIT_COMMIT_REF==='preview/shakabumbo-pilot-20261013')}
export function foundationCatalog(stored=[],env=process.env){
  if(!foundationEnabled(env))return stored;
  const ids=new Set(stored.map(t=>t.id));
  // A teacher's saved draft/disabled revision always takes precedence; never re-enable it.
  return [...stored,...FOUNDATION_CONTENT.filter(t=>!ids.has(t.id))];
}
export function foundationSnapshot(snapshot,id){
  if(snapshot.exists||!foundationEnabled())return snapshot;
  const target=FOUNDATION_CONTENT.find(t=>t.id===id);
  return target?{exists:true,id,data:()=>target}:snapshot;
}
