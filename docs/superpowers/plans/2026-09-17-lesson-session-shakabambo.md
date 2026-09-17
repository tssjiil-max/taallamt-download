# Lesson Session + Shakabambo Implementation Plan

**Goal:** Replace the current `ابدأ الحصة` alert with a mobile-first full lesson session that uses the active lesson context, lets the teacher override only selected evidence (especially strategy), and includes Shakabambo as a lesson-aware teaching assistant without touching student/guardian data.

**Architecture:** Keep the teacher dashboard stable. Add a dedicated `/teacher/lesson` route and a small pure lesson-planning module under `src/core`. Reuse the existing curriculum/learning-content conventions and the current lesson context; do not create new collections. Shakabambo suggestions are generated locally from subject/lesson/skills for this first implementation so the feature works without a new secret or external AI dependency.

**Tech Stack:** React, TypeScript, Vite, Vitest, existing CSS.

## Global Constraints
- Feature branch only; no Production deployment.
- No Firestore schema changes or migrations.
- No writes to student assessment, stars, behavior, values, communication, or guardian data.
- No Bottom Navigation changes.
- No new strategy library page or separate AI chat product.
- Shakabambo must be present in the live lesson screen and answers must be grounded in the active lesson context.
- Missing lesson context must not be fabricated.

### Task 1: Pure lesson planning engine
- Add failing tests for subject-specific plans, strategy overrides, technology optionality, and context-grounded Shakabambo responses.
- Add the smallest pure TypeScript module that passes them.

### Task 2: Teacher lesson route
- Add a regression test that requires `/teacher/lesson`, the `ابدأ الحصة` route, Shakabambo controls, and no guardian/student mutation hooks.
- Replace the alert with navigation to the full lesson route.
- Render lesson header, teacher override controls, sequential lesson steps, and Shakabambo assistant.

### Task 3: Mobile styling
- Add mobile-first CSS using the existing white/sky-blue visual language.
- Reuse the existing Shakabambo asset; do not modify the character.

### Task 4: Verification
- Run `npm test` and `npm run build` in the branch build environment.
- Compare branch diff against `build/taallamt-flex-v1`.
- Verify no Production deployment or student/guardian data model changes.
