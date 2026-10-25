# Firebase keyless audit implementation plan

**Goal:** Enable GitHub Actions to identify the educational Firebase project through a restricted, keyless, metadata-only identity before implementing deployment.

**Scope:** Only `tssjiil-max/taallamt-download`, branch `migration/firebase-hosting-staging-20261025`, PR #22. The owner must supply the existing project's ID, number and web app ID from the current deployment. No inferred project IDs, document access, credential changes, deployment or production cutover.

1. Add Python tests for repository/ref restrictions, project/app/provider identity checks, paginated metadata reads, error redaction and exclusion of document operations. Run red, implement `scripts/firebase-project-audit.py`, run green.
2. Extend `.github/workflows/firebase-staging-check.yml` to run these tests, existing unit tests and the complete build. Add a separate protected OIDC audit job only on the authorized branch and only after explicit owner configuration. Archive only sanitized metadata, never credentials.
3. Document exact environment variables, custom read-only permissions, WIF claim conditions, bootstrap commands, revocation and the branch-only workflow activation path. Do not execute IAM changes without the owner's account.
4. Run local checks, update PR #22 with actual files and results, and observe remote checks. Stop at owner account/IAM setup if unavailable.

**Remaining migration gates:** Independently compare the returned project/web-app identity with Vercel's existing configuration; inspect deployed Firestore rules and runtime settings without logging secrets; isolated staging database/IAM; fail-closed write guard; Firebase Hosting-compatible session cookies; port all API handlers and cron jobs; teacher/student/guardian E2E; data-preservation evidence; rollback rehearsal; approved production release; then unified login.
