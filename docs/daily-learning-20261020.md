# Daily learning Preview

Base: PR #14 head 60fef9b, preserving PR #12 audio/textbook work and excluding the separate PR #13 motion prototype. Feature branch only: feature/daily-learning-20261020. No Production deployment or merge.

## Implementation
- server/daily-lessons.js: deterministic projection of published weeklyPlans days into Saudi dates; holidays, term bounds, hidden/rescheduled lessons, stable identities and duplicate suppression. No refresh-time writes. Approved curriculum target must match subject, week and explicit link or exact lesson title. Missing content is reported to the teacher, never generated.
- server/daily-learning-api.js: existing student invite authorization and signed teacher API; configuration and teacher preview; server grading and transactionally persisted attempt journal, learning memory and portfolio event. No official assessment writes. Ten self tests per Saudi day. Durable retry identity and existing weekly reward caps.
- api/student-state.js and api/learning-automation.js: route through existing functions rather than adding deployable endpoints.
- src/app/daily-lessons.tsx, student.tsx and learning-pilot.tsx: home cards, daily lesson, practice through existing adaptive engine, optional 3–5-question test, teacher pause/date/hide/holiday controls, results and reading support program for the five previously identified participants.
- server/learning-pilot.js: allow this exact Preview branch; teacher-only self-test history and reading program linkage.
- vite.config.ts: Preview branch compile-time feature switch, disabled in Production.
- scripts/daily-lessons.test.js and learning-pilot-api.test.js: date/holiday/source/reward and authenticated API regression checks.

## Data and constraints
Existing approved question banks are reused with server-only answer keys. This does not certify academic correctness independently of the teacher's approval. Missing/unapproved targets keep practice and test disabled. Quran opens the existing Quran view with its quiet companion; handwriting requires the established teacher workflow. Existing links, portraits, voice settings and official grades are not changed. Existing learning attempts and achievements are retained.

Configuration: workspaces/<workspace>/settings/dailyLearning. Results stay in each student's existing learningPilotMemory, with durable dailySelfTests journal and portfolioEvents evidence. Teacher results appear under the existing experimental learning dashboard (/teacher?pilot=1#assistant).

## Verification and remaining acceptance
Initial complete test suite: 190 Vitest tests plus 30 learning-core checks passed; initial build passed. Additional daily API tests are run with the final patch. Live Preview data availability and real mobile journeys must be checked after deployment; unit/API fixture tests are not evidence of actual curriculum completeness or physical Android behavior.

Dependency audit reports four pre-existing high-severity Firebase/grpc advisories. This change adds no dependencies and does not alter the lockfile; dependency remediation is separate work.

## Live Preview observation
The first READY Preview loaded the existing student invite successfully and displayed the two scheduled subjects for 2026-10-20. Opening the Islamic lesson worked and preserved the existing text-only character. The current Islamic target has no usable approved question bank linked to that lesson, so practice/self-test are correctly disabled. Full real-student learn → practice → test acceptance is therefore blocked by missing approved content, not declared complete. Quran uses the published day segment and the existing reader.

Final code checks: 196 Vitest tests and 30 learning-core checks; full build/TypeScript. Real Android, live teacher-session controls and a real student's graded self-test were not exercised; saving and isolation were verified against the API database fixture, avoiding fabricated achievements in a real child's record.
