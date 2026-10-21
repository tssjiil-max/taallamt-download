# Web startup and permanent guardian links — Preview only

Base: PR #15 / 5c65447877ab4f45804cecda838962fdb12ee98d. Draft PR #16. Production/main untouched.

## Root cause and implementation
The teacher shared `location.origin`, so opening the teacher page on an immutable deployment hostname produced a deployment-specific guardian URL. This is a confirmed code defect; it does not establish that every reported link failure has the same cause. The server already reused each stored guardianInviteToken. No deployment-time token rotation was found in this path.

Server-generated sharing now uses an explicit STUDENT_PUBLIC_ORIGIN, configured only for this Preview branch to its automatic stable Vercel branch alias. It never derives the shared hostname from VERCEL_URL or the browser. Student IDs and invite tokens are preserved. Both invite and inviteToken legacy query names remain accepted. Old immutable deployments cannot be retroactively rewritten; their availability and historical tokens are not promised. Production needs its separately verified stable domain configured before release.

Teacher student files include copy, locally generated QR (no external QR service), authenticated status, and explicit revoke confirmation. Revocation and first-time token creation are blocked until STUDENT_ACCESS_BACKUP_ID references a completed, verified full backup. Revocation additionally snapshots the original profile transactionally before marking access revoked. No full database backup, revocation or live data migration has been performed by this change. Existing tokens remain server-only except for the teacher-authorized sharing response; all student APIs still authorize against the own-student token.

The supplied PNG is retained pixel-for-pixel, losslessly recompressed. RGBA, 1312×1199; alpha extrema 0–255, 902404 fully transparent pixels. No image generation or character redesign was performed. Only startup HTML/CSS uses it; lesson/chat/exam artwork is unchanged. The shared entry and legacy entry show complete contain-fit artwork on #e0f4ff. Startup ends when the destination has data/error/sign-in available, with a six-second fallback. Screenshot: verification-20261021/splash-desktop.jpg, captured from the actual first READY deployment in cloud Chrome.

## Validation
202 Vitest tests, 30 learning-core checks and full build/TypeScript passed before the second Preview update. Regression tests check identical authenticated URLs across three deployment hostnames, unchanged profile/portfolio fixture state, own-student authorization, revoked-token rejection, teacher-only access status and refusal to revoke before a backup. No real student achievements were manufactured.

Cloud Chrome: first deployment startup screenshot has a complete character and blue background, followed by the normal protected teacher login. Physical Android, tablet and a signed-in teacher's copy/QR/revoke controls are not yet verified. Local browser installation failed because the browser download was truncated; no mobile emulator success is claimed.

At initial review, live existing student-token checks were blocked by automatic approval review. The user subsequently explicitly authorized the previously supplied student link. The follow-up results below supersede that one-link blocker; the remaining class invitations still require separate validation.

No Production deployment, parent-link replacement, password change, Firebase configuration change, database export or data mutation was performed. Acceptance remains partial pending those live/device/backup checks.

## Deployment continuity evidence
Baseline 1320ba3 reached READY as dpl_AeNsmxQiSdLK7rEJvSKj614QMJzZ. First update fa933f0 reached READY as dpl_7u4D52p3zTdBrKa1YzAP9T4thamV. Vercel get_alias confirmed that the identical branch hostname automatically switched to the latter deployment without changing the URL. Both unauthenticated student-state and teacher-only access-status endpoints returned 401; the deployed PNG SHA-256 matched the tested asset. The second consecutive update contains this verification record only; its final deployment result is recorded in Draft PR #16. This proves public host continuity, not real-student token validity or achievement persistence across live deployments.

## Follow-up after explicit user authorization
Read-only checks of one previously supplied real student invite succeeded on the baseline, first update, second update and stable branch alias. Each returned the intended student, and equality hashes of the returned student/profile, stars, homework/evidence, portfolio, assessments and remediation matched across the four endpoints. These were contemporaneous reads of three deployed versions against the same staging database; they verify retained-token compatibility and identical returned data, not an independent historical backup comparison. The exact original shared deployment also accepted the unchanged token. Using the same token with a different student ID returned 403 STUDENT_ACCESS_DENIED.

Cloud Chrome loaded that student's correct home page and the existing achievements view; no answers, rewards or records were edited. No invite token, private student snapshot, or personal screenshot is included in this public repository. The user-facing counts were reported privately in the task conversation.

Acceptance remains partial: only this authorized real invite has been checked. All other class links, physical Android/tablet, signed-in teacher copy/QR controls, and full backup/restore are still unverified. Production remains unchanged, revocation/new token issuance remain backup-gated, and the PR stays Draft.
