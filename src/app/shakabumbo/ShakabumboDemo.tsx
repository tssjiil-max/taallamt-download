import React from 'react';
import {ShakabumboCompanion} from './ShakabumboCompanion';
import {setLessonContext} from './context';
import {companionBus} from './bus';
export function ShakabumboDemo(){
 const [quran,setQuran]=React.useState(false),[test,setTest]=React.useState(false);
 React.useEffect(()=>{setLessonContext({subject:'spelling',subjectLabel:'الإملاء',title:'التنوين بالكسرة',assessment:test,explanation:'التنوين بالكسرة علامتان أسفل الحرف الأخير، وننطق معهما نونًا ساكنة عند الوصل. مثل: كِتَابٍ.',prompt:'ما موضع علامتَي التنوين في كلمة كِتَابٍ؟',hint:test?undefined:'انظر إلى أسفل الحرف الأخير من الكلمة.'});return()=>setLessonContext(null)},[test]);
 const query=new URLSearchParams(location.search);
 if(query.get('responsive')==='1')return <main dir="rtl"><h1>معاينة الجوال</h1><p>إطارات اختبار بأحجام ٣٦٠ و٣٩٠ و٤٣٠ بكسل.</p><div style={{display:'flex',gap:12,flexWrap:'wrap'}}>{[360,390,430].map(width=><iframe title={`جوال ${width}`} key={width} width={width} height="850" src="/shakabumbo-demo?frame=1" style={{border:'1px solid #bed7c9'}}/>)}</div></main>;
 return <main dir="rtl" style={{maxWidth:600,margin:'auto',padding:16,fontFamily:'inherit'}}><h1 style={{fontSize:24}}>شكابمبو — تجربة نسخة العرض</h1><p>بيانات تعليمية تجريبية، دون حفظ درجات أو منح نجوم.</p><section className="tkBox"><h2>التنوين بالكسرة</h2><p>اسأل شكابمبو: اشرح الدرس، أو اقرأ السؤال، أو أحتاج تلميحًا.</p><p>السؤال: ما موضع علامتَي التنوين في كلمة كِتَابٍ؟</p><label>مساحة إجابة تجريبية<input aria-label="إجابة تجريبية"/></label></section><ShakabumboCompanion routeIsQuran={quran}/><div style={{display:'flex',gap:8,flexWrap:'wrap'}}><button className="tkBtn ghost" onClick={()=>setQuran(v=>!v)}>{quran?'العودة للتدريب':'محاكاة وضع الإنصات للقرآن'}</button><button className="tkBtn ghost" aria-pressed={test} onClick={()=>setTest(v=>!v)}>{test?'إنهاء وضع الاختبار':'اختبار حجب التلميح'}</button><button className="tkBtn ghost" onClick={()=>companionBus.emit('STAR_AWARDED')}>معاينة حركة المكافأة فقط</button></div><p>الصورة كاملة؛ الحركة بسيطة وليست مشيًا مفصليًا أو مزامنة فم. المحادثة بقواعد الدرس. زر اختبار النطق يحتاج استماعًا بشريًا على جهاز العرض.</p></main>;
}
