// Staging (Vercel preview / local) never shares records with Production: only the production deployment uses the live workspace.
export const IS_PRODUCTION=process.env.VERCEL_ENV==='production';
export const PRODUCTION_WORKSPACE_ID='second-4';
export const STAGING_WORKSPACE_ID='second-4-staging';
export const WORKSPACE_ID=IS_PRODUCTION?PRODUCTION_WORKSPACE_ID:STAGING_WORKSPACE_ID;
export const CLASS_ID='second-4';
export const CLASS_STUDENTS=[
 'أحمد بسام الأحمد','أسامه سلطان الصاعدي','أمير نايف الحجيلي','أنس أحمد الجهني','أوس نايف الشريف','أويس عادل المالكي','تميم ماجد الحجيلي','ثامر عبدالله العوفي','راكان حاتم الجهني','ريان محمود بري','سلطان فهد الجهني','شامخ بدر الجهني','عادل غالب العنزي','عبدالجليل سالم عبدالجليل','عبدالرحمن نواف الحازمي','عمر حميد العمري','فيصل محمد المطيري','قصي عبدالله الحجيلي','كنان محمد اليوسفي','محمد سماح البوق','محمد صالح عواد','موسى رياض الأحمد','نايف أحمد الجهني','نواف مطلق العمري','الحسن عادل الرجبي','وسام سلطان السناني','يمان أحمد الجهني','يوسف فلاح الحربي','يوسف محمد الجهني'
].map((name,index)=>({id:`s2-4-${String(index+1).padStart(2,'0')}`,number:index+1,name,fullName:name,grade:'الثاني',className:'4',classId:CLASS_ID}));
const QURAN_TRACKING_ADDITIONS=[
 {id:'s2-4-30',number:30,name:'راكان عبدالله الأحمدي',fullName:'راكان عبدالله الأحمدي',grade:'الثاني',className:'4',classId:CLASS_ID},
 {id:'s2-4-31',number:31,name:'معن أيمن الأحمدي',fullName:'معن أيمن الأحمدي',grade:'الثاني',className:'4',classId:CLASS_ID}
];
export function getStudent(id){return CLASS_STUDENTS.find(s=>s.id===id)||QURAN_TRACKING_ADDITIONS.find(s=>s.id===id)||null}
