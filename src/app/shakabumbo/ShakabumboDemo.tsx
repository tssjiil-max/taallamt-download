import React from 'react';
import {ShakabumboCompanion} from './ShakabumboCompanion';
import {setLessonContext} from './context';
export function ShakabumboDemo(){
 const [quran]=React.useState(false),[test]=React.useState(false);
 React.useEffect(()=>{setLessonContext({targetId:'pilot:kasr',questionId:'book',subject:'spelling',subjectLabel:'الإملاء',title:'التنوين بالكسرة',assessment:test,explanation:'التنوين بالكسرة علامتان أسفل الحرف الأخير، وننطق معهما نونًا ساكنة عند الوصل. مثل: كِتَابٍ.',prompt:'ما موضع علامتَي التنوين في كلمة كِتَابٍ؟',hint:test?undefined:'انظر إلى أسفل الحرف الأخير من الكلمة.'});return()=>setLessonContext(null)},[test]);
 const query=new URLSearchParams(location.search);
 if(query.get('responsive')==='1')return <main dir="rtl"><h1>معاينة الجوال</h1><p>إطارات اختبار بأحجام ٣٦٠ و٣٩٠ و٤٣٠ بكسل.</p><div style={{display:'flex',gap:12,flexWrap:'wrap'}}>{[360,390,430].map(width=><iframe title={`جوال ${width}`} key={width} width={width} height="850" src="/shakabumbo-demo?frame=1" style={{border:'1px solid #bed7c9',boxSizing:'content-box'}}/>)}</div></main>;
 return <main dir="rtl" style={{maxWidth:600,margin:'auto',padding:16,fontFamily:'inherit'}}><h1 style={{fontSize:24}}>شكابمبو</h1><p>نعمل على تطوير مساعدك في التعلّم.</p><ShakabumboCompanion routeIsQuran={quran}/></main>;
}
