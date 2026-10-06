import {CLASS_ID} from './class-roster.js';

// Source: the user supplied second grade, first semester curriculum image.
// Calendar week 13 is the autumn break; curriculum weeks resume at calendar 14.
export const QURAN_TRACKING_STUDENT_IDS=[
 's2-4-01','s2-4-02','s2-4-03','s2-4-04','s2-4-05','s2-4-06','s2-4-07','s2-4-08','s2-4-09','s2-4-10','s2-4-11','s2-4-12','s2-4-13',
 's2-4-15','s2-4-16','s2-4-17','s2-4-18','s2-4-19','s2-4-20','s2-4-21','s2-4-22','s2-4-23','s2-4-24',
 's2-4-26','s2-4-27','s2-4-28','s2-4-29','s2-4-25','s2-4-30','s2-4-31'
];
const suppliedNames=[
 'أحمد بسام الأحمد','أسامه سلطان الصاعدي','أمير نايف الحجيلي','أنس أحمد الجهني','أوس نايف الشريف','أويس عادل المالكي','تميم ماجد الحجيلي','ثامر عبدالله العوفي','راكان حاتم الجهني','ريان محمود باري','سلطان فهد الجهني','شامخ بدر الجهني','عادل غالب العنزي',
 'عبدالرحمن نواف الحازمي','عمر حميد العروي','فيصل محمد المطيري','قصي عبدالله الحجيلي','كنان محمد اليوسفي','محمد سماح البوق','محمد صالح عواد','موسى رياض الأحمد','نايف أحمد الجهني','نواف مطلق العمري','وسام سلطان السناني','يمان أحمد الجهني','يوسف فلاح الحربي','يوسف محمد الجهني','الحسن عادل الرجبي','راكان عبدالله الأحمدي','معن أيمن الأحمدي'
];
export const QURAN_FOLLOWUP_ROSTER=QURAN_TRACKING_STUDENT_IDS.map((id,index)=>({id,name:suppliedNames[index]}));
export const QURAN_TRACKING_CLASS_ID=CLASS_ID;
export const QURAN_FOLLOWUP_WEEKS=[
 {week:1,surah:'الليل'},{week:2,surah:'الليل'},{week:3,surah:'الشمس'},{week:4,surah:'البلد'},
 {week:5,surah:'البلد'},{week:6,surah:'الفجر'},{week:7,surah:'الفجر'},{week:8,surah:'الغاشية'},
 {week:9,surah:'الغاشية'},{week:10,surah:'الغاشية'},{week:11,surah:'الأعلى'},{week:12,surah:'الطارق'},
 {week:13,surah:'البروج'},{week:14,surah:'البروج'},{week:15,surah:'البروج'},
 {week:16,surah:'البروج',description:'مراجعة سور القرآن الكريم وتثبيت الحفظ'},
 {week:17,surah:'البروج',description:'مراجعة عامة'},
 {week:18,surah:'',kind:'exam',description:'اختبارات شفهية وعملية ونهائية'},
 {week:19,surah:'',kind:'exam',description:'اختبارات شفهية وعملية ونهائية'}
];
export function resolveQuranWeek(calendarWeek){
 const week=Number(calendarWeek);
 if(!Number.isInteger(week)||week<1||week===13)return null;
 const curriculumWeek=week>13?week-1:week;
 return QURAN_FOLLOWUP_WEEKS[curriculumWeek-1]||null;
}
