# Firebase Hosting migration — staging gate (2026-10-25; updated 2026-10-26)

Status: KEYLESS AUDIT PIPELINE IMPLEMENTED; OWNER IAM SETUP REQUIRED. The user authorized continued migration and staging work through GitHub Actions. No production cutover or data changes have occurred. The pipeline currently has no deployment steps.

## Implemented on PR #22
- `.github/workflows/firebase-staging-check.yml`: tests and complete build on PRs and the execution branch; separate metadata audit gated by successful CI, exact repository/ref/event and owner configuration.
- OIDC tokens are limited to the audit job; no permanent Google key is stored. Project, project number, app ID, provider and service account must agree before authentication.
- `scripts/firebase-project-audit.py` reads project/app/Hosting/database metadata only and saves a sanitized report. It does not access student documents, security rules, secrets or deploy resources. A successful audit still needs comparison with the existing production configuration.
- `docs/firebase-github-oidc-setup-ar.md` contains the owner setup, narrow custom role, numeric repository/owner WIF conditions, Environment settings, activation and revocation steps.
- `package-lock.json` enables repeatable `npm ci` checks.

## Verified codebase dependencies
- Vite builds static frontend to `dist/`; `index.html` is SPA entry.
- Existing `api/*.js` routes run as Vercel serverless handlers and import `server/*.js` using Firebase Admin. Firebase Hosting alone does not execute these handlers.
- `server/firebase-admin.js` requires service account env credentials; `previewWriteGuard()` uses `VERCEL_ENV` and `VERCEL_GIT_COMMIT_REF`. This logic must fail closed in the new backend before enabling writes.
- `vercel.json` rewrites teacher child pages to `legacy.html` and other paths to `index.html`; preserve those routing semantics.
- `server/access.js` and `server/student-session.js` use `taallamt_teacher` and `taallamt_student` cookies. Firebase Hosting generally strips cookies other than `__session` on dynamic rewrites. Implement and test role-safe session compatibility before deployment; same-origin routing alone is insufficient.
- RewardLedgers and rewardEvents remain untouched. No star correction is part of migration.

## Deployment contract
1. Verify actual Firebase project, app, production Firestore database and permanent domain against the current web app and API configuration; never substitute a project.
2. Verify a snapshot and restore plan and record current domain mappings and production smoke baselines without logging secrets or student data.
3. Use isolated staging data and runtime identity; a Hosting preview channel alone does not isolate Firestore.
4. Port all API handlers, scheduled jobs, uploads/storage, logging, rate limiting and secrets to a secured Node runtime; preserve payloads, query strings, authorization and guardian links.
5. Add Firebase-specific cookie/session, origin/CSRF, fail-closed write-guard and tenant/student isolation tests.
6. Verify teacher/student login, six-digit PIN, existing guardian links, unchanged star payloads, homework/messages, cache/SW updates and Android access in isolated staging.
7. Require PR review, full CI, staging evidence and a separately protected production approval. Do not expand the audit service account into a deployment identity.
8. Rehearse rollback before switching the permanent production domain; keep Vercel running until all gates pass.
9. After successful migration, implement the unified teacher/student entry page while retaining interiors and existing student identities.
10. Never alter live balances, PINs, student IDs or documents as a migration shortcut.

## Verification and blockers
Local verification: 5 metadata-audit tests passed; existing `npm test` passed (13 files, 33 tests); `npm run build` passed including existing PIN, guardian-link and 39 staging-journey checks. The existing vector-asset regression reports a skip because that optional swap is not installed on this branch. Existing module-format warnings remain. These checks use local/fake fixtures, not live Firebase or a deployed staging site.

Still blocked: owner-supplied project identity and Google IAM bootstrap; cloud metadata audit; rules/runtime/secrets inspection; isolated staging runtime and Hosting; session migration; deployed E2E/data-preservation and rollback verification. No production deployment, student-data write, DNS change or Vercel shutdown has been performed. PR remains draft and not ready to merge.
