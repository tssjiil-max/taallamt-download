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
- Shakabombo is bounded to supplied lesson context and must not guess unsupported textbook facts.
- Preserve existing teacher/student/guardian flows outside the start-lesson entry point.
- Mobile-first Taallamt visual identity; reuse current mascot asset.

---

### Task 1: Regression guard
- Create `scripts/lesson-assistant-regression.mjs`.
- Add it to `npm run build` before TypeScript/Vite.
- Push and confirm Preview fails specifically because the new feature is absent.

### Task 2: Pure lesson planning domain
- Create `src/core/lesson-assistant.test.ts` first with subject-difference, optional-tech/time and strategy-change tests.
- Create `src/core/lesson-assistant.ts` with `LessonContext`, `strategyOptionsForLesson`, and `buildLessonPlan`.
- Keep planner read-only and deterministic.

### Task 3: Bounded Shakabombo API
- Add `ai` dependency.
- Create `api/lesson-assistant.js` as POST-only.
- Validate mode, question and context lengths.
- Use `generateText` with `openai/gpt-5.6-luna`.
- Enforce lesson-only behavior, child-friendly student answers and no guessing.
- Persist nothing.

### Task 4: Full lesson page
- Route `/teacher/lesson` before default teacher route.
- Change **ابدأ الحصة** from alert to navigation.
- Fetch `/api/learning-automation?action=preview`.
- Select sole scheduled subject automatically or let teacher choose among scheduled subjects.
- Show lesson, unit/surah and skill from automation.
- Offer strategy/activity/technology/time controls plus **جهّز الحصة لي**.
- Render five concise lesson steps with previous/next navigation and Shakabombo tip.
- Add teacher/student assistant mode and quick requests: simplify, another example, quick question, two-minute activity, advanced-student prompt.
- Keep only latest answer and remain usable when AI is unavailable.

### Task 5: Verification
- Regression script passes.
- Vitest suite passes.
- Vercel Preview becomes READY.
- Verify `/teacher` regression and `/teacher/lesson` mobile flow.
- Verify Shakabombo endpoint behavior and failure fallback.
- Report diff, files and evidence.