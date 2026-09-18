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

function contextFromItem(subject:LessonSubject,item:PreviewItem,preview:LearningPreview,fallback:LessonContext):LessonContext|null{
  const lesson=String(item.lesson||item.weekly||'').trim();
  const skill=String(item.skill||'').trim();
  if(!lesson||!skill)return null;
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

export function resolveLessonFromPreview(preview:LearningPreview,fallback:LessonContext=CURRENT_LESSON):LessonContext|null{
  for(const raw of preview.scheduledSubjects||[]){
    if(!isSubject(raw))continue;
    const item=preview.content?.[raw];
    if(!item)continue;
    const context=contextFromItem(raw,item,preview,fallback);
    if(context)return context;
  }
  return null;
}

export function lessonCandidatesFromPreview(preview:LearningPreview,fallback:LessonContext=CURRENT_LESSON):LessonContext[]{
  const result:LessonContext[]=[];
  for(const subject of subjects){
    const item=preview.content?.[subject];
    if(!item)continue;
    const context=contextFromItem(subject,item,preview,fallback);
    if(context)result.push({...context,period:'حصة مختارة'});
  }
  return result;
}

export interface LessonWorkspaceData{
  current:LessonContext|null;
  choices:LessonContext[];
  preview:LearningPreview|null;
  status:'resolved'|'selection_required'|'unavailable';
}

export async function loadLessonWorkspace(fetcher:typeof fetch=fetch):Promise<LessonWorkspaceData>{
  try{
    const response=await fetcher('/api/learning-automation?action=preview',{cache:'no-store'});
    if(!response.ok)return {current:null,choices:[],preview:null,status:'unavailable'};
    const preview=await response.json() as LearningPreview;
    const current=resolveLessonFromPreview(preview,CURRENT_LESSON);
    const choices=lessonCandidatesFromPreview(preview,CURRENT_LESSON);
    return {current,choices,preview,status:current?'resolved':choices.length?'selection_required':'unavailable'};
  }catch{
    return {current:null,choices:[],preview:null,status:'unavailable'};
  }
}

export async function loadCurrentLessonContext(fetcher:typeof fetch=fetch):Promise<LessonContext|null>{
  return (await loadLessonWorkspace(fetcher)).current;
}
