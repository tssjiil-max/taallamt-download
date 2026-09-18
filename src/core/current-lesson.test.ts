import {describe,expect,it} from 'vitest';
import {CURRENT_LESSON,resolveLessonFromPreview} from './current-lesson';

describe('resolveLessonFromPreview',()=>{
  it('reads the scheduled lesson, unit, skill and date from the existing learning preview',()=>{
    const context=resolveLessonFromPreview({
      localDate:'2026-09-15',
      scheduledSubjects:['islamic'],
      content:{islamic:{subject:'islamic',title:'الدراسات الإسلامية',unit:'أسماء الله وصفاته',lesson:'الله السميع البصير',skill:'تمييز أثر الإيمان بالاسمين'}}
    },CURRENT_LESSON);
    expect(context.subject).toBe('islamic');
    expect(context.subjectTitle).toBe('الدراسات الإسلامية');
    expect(context.unit).toBe('أسماء الله وصفاته');
    expect(context.lesson).toBe('الله السميع البصير');
    expect(context.skills).toEqual(['تمييز أثر الإيمان بالاسمين']);
    expect(context.date).toBe('2026-09-15');
  });

  it('uses the existing current-lesson card only when no scheduled lesson can be resolved',()=>{
    const context=resolveLessonFromPreview({localDate:'2026-09-18',scheduledSubjects:[],content:{}},CURRENT_LESSON);
    expect(context).toEqual(CURRENT_LESSON);
  });
});
