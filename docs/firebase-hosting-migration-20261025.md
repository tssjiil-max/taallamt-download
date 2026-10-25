# Firebase Hosting migration — staging gate (2026-10-25)

Status: PREPARATION ONLY. No live deployment, DNS switch, data migration, or student-page modification authorized by this branch.

## Verified codebase dependencies
- Vite builds static frontend to `dist/`; `index.html` is SPA entry.
- Existing `api/*.js` routes run as Vercel serverless handlers and import `server/*.js` using Firebase Admin. Firebase Hosting alone does **not** execute these handlers.
- `server/firebase-admin.js` requires service account env credentials; `previewWriteGuard()` uses `VERCEL_ENV` and `VERCEL_GIT_COMMIT_REF`. This logic **must be replaced and tested** in the new backend before switching any production writes.
- `vercel.json` rewrites teacher child pages to `legacy.html` and other paths to `index.html`. Those exact routing semantics must be retained.
- Current student login and cookies are tied to /api; backend must remain same-origin through Hosting rewrites.
- RewardLedgers and rewardEvents remain untouched. Star correction deferred to teacher.

## Non-negotiable deployment contract
1. Identify actual Firebase project ID, production Firestore database, and verified permanent custom domain; never invent or substitute a project.
2. Snapshot Firestore (verified restore plan) and export current Hosting/Vercel domain mappings, environment **names** (not secret values), and relevant production endpoint smoke baselines. Do not overwrite any documents.
3. Create isolated staging Hosting site/channel and isolated test data or read-only access, not live student production.
4. Port **all** backend routes to a secured Node runtime (Cloud Run or supported Firebase Functions), including cron jobs, upload/storage access, logging, rate limiting and secrets. Rework previewWriteGuard so production writes cannot silently become disabled or accidentally enabled outside Vercel.
5. Route `/api/**` to backend, preserve `/teacher/student/:id` and listed legacy teacher paths, and use SPA fallback only after API/static/legacy routing. Preserve /api cookies, headers, query strings, and student invitation compatibility.
6. Add automated integration tests: teacher login, student name+6-digit PIN, per-student isolation, previous guardian invite link, star payload unchanged, 401/403 authorization, redirects, cache/SW update, and staging accessibility on Android.
7. Implement protected delivery: PR review + full CI -> staging preview -> manual approval -> immutable production release. No automatic student-facing deployment from Codex/feature branches.
8. Switch the single permanent production domain only after staging E2E and rollback rehearsal; keep Vercel running until all checks pass. Domain/DNS TTL and PWA cache require post-cutover checks.
9. Only **after** production hosting migration succeeds, implement single landing page with teacher/student selection; retain existing student and teacher interiors.
10. No manipulation of balances, PINs, student identities or live database in this migration.

## Exit criteria / blockers
Current blockers: Firebase project/site identity unverified; target Node backend not deployed; secrets not migrated; Hosting config not yet generated; end-to-end verification pending. Thus the Firebase cutover is **NOT** complete and current student access must not be changed.
