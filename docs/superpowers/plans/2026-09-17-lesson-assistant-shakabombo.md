# Lesson Assistant + Shakabombo Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Replace the current alert-only **ابدأ الحصة** action with a full lesson workspace that reads the existing learning-automation context, lets the teacher control selected lesson choices, and provides a bounded Shakabombo AI assistant.

**Architecture:** Keep lesson resolution in the existing `learning-automation` API. Add a small pure lesson-planning module for subject-aware strategies and deterministic lesson steps, a `/teacher/lesson` React route, and one Vercel Function for bounded single-turn AI help. No student/guardian data model changes and no new collection.

**Tech Stack:** React + TypeScript + Vite, Vercel Functions, Vercel AI SDK / AI Gateway, existing Firebase-backed learning automation.

**Spec:** `docs/superpowers/specs/2026-09-17-lesson-assistant-shakabombo-design.md`

## Global Constraints
- Staging/preview only; never deploy Production.
- Reuse `/api/learning-automation?action=preview` as lesson source of truth.
- No new timetable/curriculum collection.
- No writes to student assessment, behavior, stars, values, guardian communication, or profile data.
- Shakabombo is bounded to the supplied lesson context and must not guess unsupported textbook facts.
- Preserve existing teacher/student/guardian flows outside the start-lesson entry point.
- Mobile-first Taallamt visual identity; reuse current mascot asset.

---

### Task 1: Regression guard for the new lesson flow

**Files:**
- Create: `scripts/lesson-assistant-regression.mjs`
- Modify: `package.json`

**Interfaces:**
- Consumes: current repository source files.
- Produces: a build-time regression guard that fails until the lesson route, planner, assistant API, styling, and package dependency exist.

- [ ] **Step 1: Write the failing regression script**
  Assert that `src/main.tsx` routes `/teacher/lesson`, **ابدأ الحصة** navigates there, the page loads `learning-automation`, Shakabombo controls exist, `src/core/lesson-assistant.ts` has subject-aware planning, `api/lesson-assistant.js` uses `generateText` and `openai/gpt-5.6-luna`, and `package.json` contains `ai`.
- [ ] **Step 2: Add the regression script to `npm run build` before TypeScript/Vite build.**
- [ ] **Step 3: Push and verify the Vercel preview build fails specifically on the new regression assertions.**

### Task 2: Pure lesson planning domain

**Files:**
- Create: `src/core/lesson-assistant.ts`
- Create: `src/core/lesson-assistant.test.ts`

**Interfaces:**
- Consumes: `LessonContext` with subject, title, unit, lesson, skill, grade/class and duration.
- Produces: `strategyOptionsForLesson(context)` and `buildLessonPlan(context, options)`.

- [ ] **Step 1: Write failing Vitest tests** for Arabic, Quran, Islamic, spelling/handwriting strategy differences; optional technology/time management; and strategy changes preserving lesson/skill.
- [ ] **Step 2: Implement minimal types and strategy maps.**
- [ ] **Step 3: Implement deterministic 5-step lesson plan.**
- [ ] **Step 4: Run tests through CI/build verification and keep all existing tests green.**

### Task 3: Bounded Shakabombo AI endpoint

**Files:**
- Create: `api/lesson-assistant.js`
- Modify: `package.json`
- Modify: `.env.example`

**Interfaces:**
- Consumes POST JSON `{ mode, question, context }` where mode is `teacher` or `student` and context is sanitized lesson metadata.
- Produces JSON `{ ok: true, answer }` or a controlled error response.

- [ ] **Step 1: Add regression expectations before endpoint code.**
- [ ] **Step 2: Add `ai` dependency.**
- [ ] **Step 3: Validate method, mode, question length, and bounded context strings.**
- [ ] **Step 4: Call `generateText` with model `openai/gpt-5.6-luna` and a strict lesson-only Arabic prompt.**
- [ ] **Step 5: Return short answer only; do not persist prompts or answers.**
- [ ] **Step 6: Verify preview function builds and returns controlled output/errors without touching student data.**

### Task 4: Full `/teacher/lesson` page

**Files:**
- Modify: `src/main.tsx`
- Modify: `src/ui.css`

**Interfaces:**
- Consumes: `GET /api/learning-automation?action=preview`, planner functions, `POST /api/lesson-assistant`.
- Produces: full mobile lesson workspace.

- [ ] **Step 1: Route `/teacher/lesson` before default teacher route.**
- [ ] **Step 2: Change **ابدأ الحصة** from alert to navigation.**
- [ ] **Step 3: Load preview context; select sole subject automatically or show scheduled-subject choices.**
- [ ] **Step 4: Add compact pre-lesson controls: strategy, activity, technology, time management, and **جهّز الحصة لي**.**
- [ ] **Step 5: Render current lesson/skill, five lesson steps, next/previous navigation, and short Shakabombo tip for the current step.**
- [ ] **Step 6: Add Shakabombo helper with teacher/student mode and quick requests: simplify, another example, quick question, two-minute activity, advanced-student prompt. Keep only the latest answer.**
- [ ] **Step 7: Add loading/error states that leave the page usable if AI is unavailable.**
- [ ] **Step 8: Style within current white/sky-blue identity and 430px mobile shell.**

### Task 5: Verification and preview

**Files:** none unless test-related fixes are required.

- [ ] **Step 1: Verify regression script passes.**
- [ ] **Step 2: Verify Vitest suite passes.**
- [ ] **Step 3: Verify Vercel Preview is READY.**
- [ ] **Step 4: Open `/teacher`, confirm existing page still renders, and confirm **ابدأ الحصة** opens `/teacher/lesson`.**
- [ ] **Step 5: Check `/teacher/lesson` on mobile viewport, current date/subject resolution, strategy changes, quick assistant request, student-question mode, and AI failure fallback.**
- [ ] **Step 6: Report final diff, modified files, actual test/build results, preview URL, and any remaining source-data limitation.**