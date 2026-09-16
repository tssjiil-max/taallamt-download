# Student Learning Automation Link Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Complete the existing learning automation chain from curriculum distribution and timetable to today's homework/memorization, subject modal content, and teacher evaluation without changing the student page design or creating new Firestore collections.

**Architecture:** Keep `api/learning-automation.js` as the single source for distribution/timetable-derived daily work. Add a small student-side bridge that consumes the existing preview + student-state APIs and replaces placeholder tasks only when a real student is selected. Keep teacher evaluation sourced from the already-published weekly plan and existing assessments.

**Tech Stack:** Vercel serverless functions, Firebase Admin/Firestore, TypeScript/React/Vite, browser DOM patches, Node regression scripts.

**Spec:** User-approved conversation scope: distribution → timetable → homework/memorization → today's tasks → subject modal → teacher evaluation; no redesign and no new collections.

## Global Constraints

- Repository: `tssjiil-max/taallamt-download`.
- Final branch: `build/taallamt-flex-v1` only after isolated verification.
- Do not create Firestore collections.
- Do not delete or rewrite existing student/teacher data.
- Do not redesign the student page.
- Do not fabricate teacher assessments.
- Automated work must be idempotent and tied to current Saudi date/week.

---

### Task 1: Regression contract

**Files:**
- Modify: `scripts/learning-automation-regression.mjs`

**Interfaces:**
- Consumes: current `api/learning-automation.js`, `vercel.json`, `index.html`.
- Produces: failing checks for student automation bridge, today's task filtering, subject-modal linkage, resilient timetable fallback, and before-school cron timing.

- [ ] **Step 1: Write failing checks** for bridge existence/loading, deterministic preview homework ids/targetIds, Saudi-local today's task filtering, subject-modal subject mapping, and fallback when timetable read is unavailable.
- [ ] **Step 2: Run `npm run build`** on the isolated branch and confirm the new checks fail for missing implementation.
- [ ] **Step 3: Commit the failing contract.**

### Task 2: Daily automation source

**Files:**
- Modify: `api/learning-automation.js`
- Modify: `vercel.json`

**Interfaces:**
- Consumes: `server/learning-content.js`, existing `timetable`, `weeklyPlans`, `curriculumTargets`, `homework`, `homeworkEvidence` collections.
- Produces: preview homework items with deterministic `id`, `targetIds`, `scheduledDate`, subject label, and task type; safe verified fallback schedule for read-only preview; daily cron before the school day.

- [ ] **Step 1: Make timetable preview resilient** by returning the verified fallback schedule if timetable reads fail, while preserving real timetable precedence when available.
- [ ] **Step 2: Return deterministic preview tasks** that use the same homework id and target id as materialized daily homework.
- [ ] **Step 3: Mark Quran daily work as memorization/review metadata** without changing collections.
- [ ] **Step 4: Move daily cron to 02:00 UTC / 05:00 Asia-Riyadh Sunday–Thursday** so tasks exist before school.
- [ ] **Step 5: Run regression/build and confirm source checks pass.**

### Task 3: Student today-task and subject bridge

**Files:**
- Create: `public/student-automation-bridge.js`
- Modify: `index.html`

**Interfaces:**
- Consumes: `/api/learning-automation?action=preview`, `/api/student-state?studentId=...`, `/api/homework-complete`.
- Produces: live today's task list and automation context inside subject modals without changing React layout.

- [ ] **Step 1: Load only on `/student` and only replace placeholders when a student id exists.**
- [ ] **Step 2: Merge materialized homework with preview tasks by deterministic id.** Materialized items remain completable; preview-only items display as planned work and are never falsely marked complete.
- [ ] **Step 3: Filter `مهامي اليوم` by `scheduledDate === preview.localDate`; remove static sample tasks only after live data resolves.**
- [ ] **Step 4: Enhance subject modal with current-week plan plus today's work/memorization for that subject; remove the generic empty message only when real automation context exists.**
- [ ] **Step 5: Refresh on focus/visibility without duplicating rows.**
- [ ] **Step 6: Run full build and regression suite.**

### Task 4: Final verification and promotion

**Files:** none unless verification exposes a defect.

**Interfaces:**
- Consumes: isolated branch final commit.
- Produces: verified fast-forward of `build/taallamt-flex-v1`.

- [ ] **Step 1: Verify preview deployment reaches READY.**
- [ ] **Step 2: Fetch preview `/api/learning-automation?action=preview` and confirm current Saudi date/week plus today's scheduled subjects and deterministic task ids.**
- [ ] **Step 3: Fetch deployed bridge and confirm it is loaded from `index.html`.**
- [ ] **Step 4: Fast-forward `build/taallamt-flex-v1` to the isolated verified commit only if the branch has not diverged.**
- [ ] **Step 5: Verify production deployment is READY and fetch the production student page and automation endpoint.**
