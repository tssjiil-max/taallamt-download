import type {LessonContext,LessonSubject} from './lesson-session';

export const CURRENT_LESSON:LessonContext={
  subject:'islamic',
  subjectTitle:'الدراسات الإسلامية',
  unit:'أخلاق المسلم',
  lesson:'بر الوالدين',
  skills:['يبين صور بر الوالدين','يستنتج أثر البر في حياة المسلم'],
  grade:'الثاني',
  className:'4',
  period:'الحصة 3',
  durationMinutes:45
};

type PreviewItem={subject?:string;title?:string;unit?:string;lesson?:string;skill?:string;surah?:string;weekly?:string};
export type LearningPreview={localDate?:string;scheduledSubjects?:string[];content?:Record<string,PreviewItem>};

const subjects:LessonSubject[]=['arabic','quran','islamic','spelling','handwriting'];
const isSubject=(value:string):value is LessonSubject=>subjects.includes(value as LessonSubject);
const labelFor=(subject:LessonSubject)=>subject==='arabic'?'لغتي':subject==='quran'?'القرآن الكريم':subject==='islamic'?'الدراسات الإسلامية':'الإملاء والخط';

export function resolveLessonFromPreview(preview:LearningPreview,fallback:LessonContext=CURRENT_LESSON):LessonContext{
  const subject=(preview.scheduledSubjects||[]).find(isSubject);
  if(!subject)return fallback;
  const item=preview.content?.[subject];
  if(!item)return fallback;
  const lesson=String(item.lesson||item.weekly||'').trim();
  const skill=String(item.skill||'').trim();
  if(!lesson||!skill)return fallback;
  return {
    subject,
    subjectTitle:String(item.title||labelFor(subject)).trim()||labelFor(subject),
    unit:String(item.unit||item.surah||'').trim(),
    lesson,
    skills:[skill],
    grade:fallback.grade,
    className:fallback.className,
    date:String(preview.localDate||'').trim()||fallback.date,
    period:'الحصة الحالية',
    durationMinutes:fallback.durationMinutes||45
  };
}

export async function loadCurrentLessonContext(fetcher:typeof fetch=fetch):Promise<LessonContext>{
  try{
    const response=await fetcher('/api/learning-automation?action=preview',{cache:'no-store'});
    if(!response.ok)return CURRENT_LESSON;
    const preview=await response.json() as LearningPreview;
    return resolveLessonFromPreview(preview,CURRENT_LESSON);
  }catch{
    return CURRENT_LESSON;
  }
}
