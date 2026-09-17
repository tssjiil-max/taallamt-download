import {describe,expect,it} from 'vitest';
import {buildLessonPlan,strategyOptionsForLesson,type LessonContext} from './lesson-assistant';

const base=(subject:LessonContext['subject'],overrides:Partial<LessonContext>={}):LessonContext=>({
  subject,
  subjectLabel:subject==='arabic'?'لغتي':subject==='quran'?'القرآن الكريم':subject==='islamic'?'الدراسات الإسلامية':'الإملاء والخط',
  unit:subject==='quran'?'الشمس':'أقاربي',
  lesson:subject==='quran'?'الآيات 1 - 6':'صلة الرحم',
  skill:subject==='quran'?'الحفظ وصحة القراءة والمراجعة':'القراءة الجهرية وفهم المقروء',
  gradeLabel:'الثاني',
  classLabel:'4',
  durationMinutes:45,
  ...overrides,
});

describe('strategyOptionsForLesson',()=>{
  it('keeps Quran strategies distinct from Arabic reading strategies',()=>{
    const quran=strategyOptionsForLesson(base('quran'));
    const arabic=strategyOptionsForLesson(base('arabic'));
    expect(quran).toContain('استماع → محاكاة → ترديد → تسميع');
    expect(arabic).toContain('فكر – زاوج – شارك');
    expect(quran).not.toEqual(arabic);
    expect(quran.length).toBeGreaterThanOrEqual(3);
    expect(quran.length).toBeLessThanOrEqual(5);
  });

  it('uses subject-aware options for Islamic and spelling lessons',()=>{
    expect(strategyOptionsForLesson(base('islamic'))).toContain('موقف وقيمة');
    expect(strategyOptionsForLesson(base('spelling',{skill:'اللام الشمسية'}))).toContain('لاحظ – انطق – اكتب');
  });
});

describe('buildLessonPlan',()=>{
  it('builds five concise steps around the real lesson and skill',()=>{
    const context=base('islamic',{unit:'أسماء الله وصفاته',lesson:'الله السميع البصير',skill:'تمييز أثر الإيمان بالاسمين'});
    const plan=buildLessonPlan(context,{});
    expect(plan.steps).toHaveLength(5);
    expect(plan.lesson).toBe(context.lesson);
    expect(plan.skill).toBe(context.skill);
    expect(plan.steps.some(step=>step.body.includes(context.lesson))).toBe(true);
    expect(plan.steps.some(step=>step.body.includes(context.skill))).toBe(true);
  });

  it('does not add technology or time management unless selected',()=>{
    const context=base('arabic');
    const plain=buildLessonPlan(context,{});
    expect(plain.optionalNotes).toEqual([]);
    const selected=buildLessonPlan(context,{technology:true,timeManagement:true});
    expect(selected.optionalNotes.some(note=>note.kind==='technology')).toBe(true);
    expect(selected.optionalNotes.some(note=>note.kind==='time_management')).toBe(true);
  });

  it('changes strategy without changing the source lesson or skill',()=>{
    const context=base('arabic');
    const strategy='القراءة الموجّهة';
    const plan=buildLessonPlan(context,{strategy});
    expect(plan.strategy).toBe(strategy);
    expect(plan.lesson).toBe(context.lesson);
    expect(plan.skill).toBe(context.skill);
    expect(plan.steps.some(step=>step.body.includes(strategy))).toBe(true);
  });

  it('uses direct recitation assessment for Quran',()=>{
    const plan=buildLessonPlan(base('quran'),{});
    const assessment=plan.steps.find(step=>step.key==='assessment');
    expect(assessment?.body).toContain('تسميع');
  });
});
