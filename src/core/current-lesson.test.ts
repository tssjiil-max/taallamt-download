import {describe,expect,it} from 'vitest';
import {CURRENT_LESSON,lessonCandidatesFromPreview,loadLessonWorkspace,resolveLessonFromPreview} from './current-lesson';

describe('resolveLessonFromPreview',()=>{
  it('reads the scheduled lesson, unit, skill and date from the existing learning preview',()=>{
    const context=resolveLessonFromPreview({
      localDate:'2026-09-15',
      scheduledSubjects:['islamic'],
      content:{islamic:{subject:'islamic',title:'الدراسات الإسلامية',unit:'أسماء الله وصفاته',lesson:'الله السميع البصير',skill:'تمييز أثر الإيمان بالاسمين'}}
    },CURRENT_LESSON);
    if(!context)throw new Error('expected a scheduled lesson');
    expect(context.subject).toBe('islamic');
    expect(context.subjectTitle).toBe('الدراسات الإسلامية');
    expect(context.unit).toBe('أسماء الله وصفاته');
    expect(context.lesson).toBe('الله السميع البصير');
    expect(context.skills).toEqual(['تمييز أثر الإيمان بالاسمين']);
    expect(context.date).toBe('2026-09-15');
  });

  it('does not pretend there is a current lesson when the schedule has none',()=>{
    const context=resolveLessonFromPreview({localDate:'2026-09-18',scheduledSubjects:[],content:{}},CURRENT_LESSON);
    expect(context).toBeNull();
  });

  it('offers only real weekly content as manual lesson choices when no current lesson exists',()=>{
    const preview={
      localDate:'2026-09-18',
      scheduledSubjects:[],
      content:{
        arabic:{subject:'arabic',title:'لغتي',unit:'أقاربي',lesson:'صلة الرحم',skill:'استخراج الظواهر اللغوية'},
        quran:{subject:'quran',title:'القرآن الكريم',surah:'الشمس',lesson:'الآيات 1 - 15',skill:'الحفظ وصحة القراءة'},
      }
    };
    const choices=lessonCandidatesFromPreview(preview,CURRENT_LESSON);
    expect(choices).toHaveLength(2);
    expect(choices.map(item=>item.lesson)).toEqual(['صلة الرحم','الآيات 1 - 15']);
    expect(choices.every(item=>item.date==='2026-09-18')).toBe(true);
  });
  it('requests the existing learning preview for an explicitly selected future date',async()=>{
    let requested='';
    const fakeFetch=async(url:string)=>{
      requested=url;
      return {ok:true,json:async()=>({
        localDate:'2026-09-21',
        scheduledSubjects:['arabic'],
        content:{arabic:{subject:'arabic',title:'لغتي',unit:'أقاربي',lesson:'صلة الرحم',skill:'القراءة الجهرية'}}
      })} as Response;
    };
    const workspace=await loadLessonWorkspace('2026-09-21',fakeFetch as typeof fetch);
    expect(requested).toContain('date=2026-09-21');
    expect(workspace.current?.date).toBe('2026-09-21');
    expect(workspace.current?.subject).toBe('arabic');
  });
});
