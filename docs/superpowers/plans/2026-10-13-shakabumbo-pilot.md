# Shakabumbo Pilot Implementation Plan

> التنفيذ مباشرة في الجلسة وفق طلب المستخدم، دون مراجعات متكررة. لا اعتماد نهائي حتى يجرب المعلم.

**Goal:** تجربة تعليم تكيّفي مجانية باسم شكابمبو على Preview فقط.
**Architecture:** محرك قواعد مشترك، نقاط API القائمة، مجموعات البيانات القائمة، تفعيل تجريبي محدود.
**Tech Stack:** React, TypeScript, Node.js, Firebase Admin, Vite.
**Spec:** ../specs/2026-10-13-shakabumbo-pilot.md

## Global Constraints
- لا main أو Production أو خدمة مدفوعة.
- العربية RTL والأيقونات الأصلية دون تغيير.
- لا اختلاق محتوى معتمد أو تقدم تعليمي.
- التصحيح والإجابات واعتماد الخطط على الخادم.

## Review Focus
- تغيير المعلم لتقييم سابق يبطل استنتاج التدريب الأقدم.
- إعادة إرسال محاولة واحدة لا ترفع الإتقان مرتين.
- تغيير ترتيب المتطلبات أو دورة مهارات لا يسبب حلقة.
- حذف/انتهاء إعلان لا يبقيه في العداد.
- إجابات المعلم والملفات الخاصة لا تصل للطالب.

### Task 1: Pure core and announcement policy
Files: server/learning-core.js, server/announcement-policy.js, scripts/learning-core-regression.mjs.
Interfaces: buildLearningModel({studentId,targets,assessments,memory,now}), recordAttempt(memory,attempt,now), selectActivity(target,memory), visibleAnnouncements(items,classId,reads,now).
- [ ] كتابة اختبارات الإتقان والتعثر والمراجعة والمتطلبات والخصوصية؛ تشغيلها وفشلها قبل الكود.
- [ ] تنفيذ المحرك وسياسة الإعلانات، تشغيل node --test scripts/learning-core-regression.mjs.

### Task 2: Persistence and APIs
Files: server/learning-pilot.js, api/student-state.js, api/learning-automation.js, server/teacher-api.js.
- [ ] ربط الصلاحيات والفرع التجريبي والمجموعات القائمة؛ عمليات المحاولة بمعرف ثابت ومعاملات.
- [ ] محتوى معتمد، إدارة خطط باعتماد المعلم، قراءة الإعلانات؛ اختبار الطلبات الاصطناعية ومنع Production.

### Task 3: Student and teacher
Files: src/app/student.tsx, src/app/learning-pilot.tsx, src/app/teacher.tsx, src/app/app.src.css.
- [ ] الإعلانات منفصلة في التجربة، شكابمبو، الحفظ، رحلة التعلم ومركز المعلم.
- [ ] طباعة A4 من المحتوى المعتمد فقط؛ نموذج الإجابة للمعلم فقط؛ لا ادعاء مطابقة التسطير قبل التحقق.

### Task 4: Verification and delivery
- [ ] npm test و npm run build واختبارات المحرك، متصفح بالأحجام المطلوبة وبيانات اصطناعية.
- [ ] نشر Preview للفرع المستقل فقط، Draft PR، تقرير الحدود والمصادر والتكلفة. لا تعميم.
