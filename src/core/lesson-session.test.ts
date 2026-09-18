import {describe,expect,it} from 'vitest';
import {buildLessonPlan,replyAsShakabambo,type LessonContext} from './lesson-session';

const islamic:LessonContext={subject:'islamic',subjectTitle:'الدراسات الإسلامية',unit:'أخلاق المسلم',lesson:'بر الوالدين',skills:['يبين صور بر الوالدين','يستنتج أثر البر في حياة المسلم'],grade:'الثاني',className:'4'};

describe('lesson session',()=>{
  it('builds a concise subject-specific plan and keeps technology optional',()=>{
    const plan=buildLessonPlan(islamic,{});
    expect(plan.steps.length).toBeGreaterThanOrEqual(4);
    expect(plan.steps.length).toBeLessThanOrEqual(6);
    expect(plan.steps.some(step=>step.kind==='assessment')).toBe(true);
    expect(plan.steps.every(step=>step.kind!=='technology')).toBe(true);
  });

  it('respects a teacher strategy override and aligns the activity with it',()=>{
    const plan=buildLessonPlan(islamic,{strategy:'التعلم التعاوني'});
    expect(plan.strategy).toBe('التعلم التعاوني');
    expect(plan.steps.some(step=>step.text.includes('مجموع'))).toBe(true);
  });

  it('gives Quran a memorization flow instead of a reading-comprehension flow',()=>{
    const quran:LessonContext={subject:'quran',subjectTitle:'القرآن الكريم',unit:'سورة الليل',lesson:'الآيات 1 - 9',skills:['الحفظ','صحة القراءة'],grade:'الثاني',className:'4'};
    const plan=buildLessonPlan(quran,{});
    expect(plan.steps.map(step=>step.text).join(' ')).toMatch(/استماع|محاكاة|ترديد|تسميع/);
    expect(plan.steps.map(step=>step.text).join(' ')).not.toContain('فهم المقروء');
  });

  it('grounds Shakabambo replies in the active lesson and keeps student answers short',()=>{
    const answer=replyAsShakabambo(islamic,'أعطني سؤالًا للطلاب','student');
    expect(answer).toContain('بر الوالدين');
    expect(answer.length).toBeLessThan(220);
  });
});
