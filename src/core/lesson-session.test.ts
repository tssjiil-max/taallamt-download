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

  it('can tell the teacher the active objectives without inventing new content',()=>{
    const answer=replyAsShakabambo(islamic,'وش أهداف الدرس؟','teacher');
    expect(answer).toContain('يبين صور بر الوالدين');
    expect(answer).toContain('يستنتج أثر البر في حياة المسلم');
  });

  it('handles a child why-question by connecting it to the lesson instead of fabricating textbook text',()=>{
    const answer=replyAsShakabambo(islamic,'ليش نبر الوالدين؟','student');
    expect(answer).toContain('بر الوالدين');
    expect(answer).toMatch(/هدف|نتعلم|نفكر|أثر/);
    expect(answer).not.toMatch(/قال الله|قال الرسول|الحديث يقول|الكتاب يقول/);
  });

  it('offers subject-aware differentiation and feedback help',()=>{
    const quran:LessonContext={subject:'quran',subjectTitle:'القرآن الكريم',unit:'سورة الليل',lesson:'الآيات 1 - 9',skills:['الحفظ','صحة القراءة'],grade:'الثاني',className:'4'};
    expect(replyAsShakabambo(quran,'كيف أراعي الفروق الفردية؟','teacher')).toMatch(/تسميع|مقطع|دعم/);
    expect(replyAsShakabambo(quran,'أعطني تغذية راجعة','teacher')).toMatch(/خطأ|إعادة|محاولة/);
  });

  it('states the boundary when an exact source answer is not present in lesson context',()=>{
    const answer=replyAsShakabambo(islamic,'ما نص الحديث الموجود في الدرس؟','student');
    expect(answer).toMatch(/غير موجود|مصدر الدرس|المعلم/);
  });
});
