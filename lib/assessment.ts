import type { Skill, SkillAssessment } from "./types";

export function latestAssessmentBySkill(assessments: SkillAssessment[], studentId: string) {
  const latest = new Map<string, SkillAssessment>();
  assessments
    .filter((assessment) => assessment.studentId === studentId)
    .forEach((assessment) => {
      const current = latest.get(assessment.skillId);
      if (!current || new Date(assessment.assessedAt).getTime() >= new Date(current.assessedAt).getTime()) {
        latest.set(assessment.skillId, assessment);
      }
    });
  return latest;
}

export function skillsNeedingTraining(
  skills: Skill[],
  assessments: SkillAssessment[],
  studentId: string,
  termId?: string,
) {
  const latest = latestAssessmentBySkill(assessments, studentId);
  return skills.filter((skill) => {
    if (!skill.active) return false;
    if (termId && skill.termId !== termId) return false;
    return latest.get(skill.id)?.level === "needs_training";
  });
}

export function assessedSkills(
  skills: Skill[],
  assessments: SkillAssessment[],
  studentId: string,
  termId?: string,
) {
  const latest = latestAssessmentBySkill(assessments, studentId);
  return skills
    .filter((skill) => skill.active && (!termId || skill.termId === termId) && latest.has(skill.id))
    .map((skill) => ({ skill, assessment: latest.get(skill.id)! }));
}

export function remedialAction(skill: Skill) {
  if (skill.subjectId === "quran") {
    if (skill.category.includes("حفظ")) return "تكرار المقطع القصير 3 مرات، ثم التسميع دون نظر، وإعادة الآيات التي ظهر فيها تردد.";
    return "تلاوة المقطع ببطء مع متابعة المصحف، ثم إعادة الكلمات أو الآيات التي تحتاج ضبطًا.";
  }

  if (skill.subjectId === "lughati") {
    if (skill.category.includes("القراءة")) return "قراءة سطرين بصوت واضح مرتين، ثم إعادة الكلمات المتعثرة منفردة داخل جملة قصيرة.";
    if (skill.category.includes("الفهم")) return "قراءة فقرة قصيرة ثم الإجابة شفهيًا عن سؤالين من: من؟ أين؟ كيف؟ لماذا؟";
    if (skill.category.includes("إملاء") || skill.category.includes("الكتابة")) return "تدريب 5 دقائق: ثلاث كلمات من المهارة ثم جملة قصيرة، مع تصحيح الخطأ وإعادة الكلمة مرة واحدة.";
    return "تطبيق المهارة في 3 أمثلة قصيرة، ثم مثال واحد من إنشاء الطالب للتأكد من الفهم.";
  }

  if (skill.subjectId === "islamic") {
    return "مراجعة الفكرة شفهيًا بمثال بسيط من حياة الطالب، ثم سؤال قصير للتأكد من الفهم والتطبيق.";
  }

  return "تدريب قصير على المهارة بخطوة واحدة واضحة، ثم إعادة التقييم بعد عدة محاولات ناجحة.";
}
