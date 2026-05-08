# Phase 0 Closure Scout — HomeMatch

Generated: 2026-05-07
Lane: `/home/shan/projects/homematch-v2.worktrees/p2-frontend`
Scope: Strict OG Phase 0 baseline caveats only. No Phase 2/3/4/5 dispatch. No code changes. No network/browser/external API use in this scout.

## Verdict

Phase 0 **cannot honestly be called 100% complete**.

Reason: the two immediate Phase 0 blockers from the original synthesis were repaired later, but core Phase 0 baseline coverage caveats remain unresolved: browser/auth-flow traversal is still incomplete, API live probing is still mostly code-expectation-only, and integration tests remain unexecuted in the recorded baseline.

## Baseline evidence reviewed

- OG plan: `/home/shan/.hermes/plans/home-match-kanban-goal-template.md`
- Phase 0 artifacts: `repo-snapshot.json`, `routes-and-endpoints.json`, `command-baseline.json`, `startup-baseline.json`, `browser-traversal.json`, `api-probe-matrix.json`, `phase0-synthesis.md`
- Gate/reconciliation artifacts: `phase0-phase1-strict-closure-gate.md`, `phase0-phase1-reconciliation.json`, `p1-repair-gates.json`
- Spot-checked current repo evidence for the Phase 0 blocker repairs only: `scripts/guard-supabase-env.js`, Maps geocode/autocomplete route files, AGENTS/docs references. Sensitive env values were not copied here.

## Close / block matrix

### 1. `pnpm dev` guard blocked local development

- Evidence present:
  - `phase0-synthesis.md` documented this as Critical defect #1.
  - `startup-baseline.json` showed documented `pnpm dev` blocked; direct `next dev` fallback served `/` and `/api/health` on port 3000.
  - Current `scripts/guard-supabase-env.js` has `SKIP_SUPABASE_GUARD === 'true'` bypass at the top.
  - `p1-repair-gates.json` records `SKIP_SUPABASE_GUARD=true pnpm run guard:supabase` as pass.
- Closure status: **closed**
- Exact next action: none for Phase 0 closure; keep documented default `SKIP_SUPABASE_GUARD=true pnpm dev` visible in contributor docs.

### 2. Maps geocode/autocomplete accepted unauthenticated POSTs to paid Google APIs

- Evidence present:
  - `phase0-synthesis.md` documented this as Critical defect #2.
  - Current `src/app/api/maps/geocode/route.ts` imports `requireUserFromRequest`, creates an API Supabase client, requires auth before rate limiting and before Google fetch, and rate-limits by authenticated user id.
  - Current `src/app/api/maps/places/autocomplete/route.ts` does the same.
  - `p1-repair-gates.json` records focused Maps route tests as pass: 33/33, plus type-check/lint/build/unit pass.
- Closure status: **closed**
- Exact next action: none for Phase 0 closure; avoid live paid API probes unless explicitly approved.

### 3. Integration tests skipped / not baseline-verified

- Evidence present:
  - `command-baseline.json` shows `pnpm test:integration` status `skip`, exit code 1, because integration tests expected local Supabase at `127.0.0.1:54200` while local env pointed at a remote Supabase host.
  - `phase0-synthesis.md` documented this as High defect #3 and Phase 0 coverage `0%`.
  - `phase0-phase1-reconciliation.json` keeps this as a known Phase 0 gap.
  - `vercel-localdev-docker-decision.md` says integration tests still require local Supabase/Docker unless remote support is fully wired and verified.
- Closure status: **block**
- Exact next action: run and record `pnpm test:integration` against an approved local Supabase/Docker environment, or implement/verify a safeguarded `ALLOW_REMOTE_SUPABASE=true` path and then run the integration suite. Do not treat Phase 0 as closed until a fresh artifact captures the result.

### 4. API probe coverage was only 4/28 live-safe candidates; 24/28 endpoints code-reviewed only

- Evidence present:
  - `api-probe-matrix.json` summary: 28 total API routes, 4 safe-local-live candidates, 24 code-expectation-only.
  - `phase0-synthesis.md` documented API live probing at 14% and High defect #4.
  - `phase0-phase1-reconciliation.json` keeps conservative API probing as a known Phase 0 gap.
  - 2026-05-08 live slice `phase0-live-probe-auth-cron-env-closure-2026-05-08.md` ran 22 local no-secret/no-auth probes: public health/marketing/script/proxy-script passed; user-auth endpoints and paid Maps POSTs rejected anonymous requests; cron/admin endpoints rejected missing secrets; `/api/maps/metro-boundaries?metro=bay-area` returned 500 because the public route calls a service-role client outside an authorized context.
- Closure status: **partial; still open**
- Exact next action: fix/reclassify the metro-boundaries service-role behavior; then run a local-only Phase 0 probe harness with an approved test session cookie for safe read-only user-auth endpoints; keep mutation, cron/admin-with-secret, external-paid, and real-data-risk endpoints code-reviewed or explicitly skipped; update `api-probe-matrix.json` or a new closure artifact with actual statuses.

### 5. Browser traversal incomplete; no authenticated flow verified

- Evidence present:
  - `browser-traversal.json` verified only `/` and `/cookies`; worker exceeded 15m SLA before broad traversal.
  - `phase0-synthesis.md` documented Browser traversal at 7%, Auth flow verification at 0%, and Medium defect #5.
  - `phase0-phase1-strict-closure-gate.md` specifically says Phase 0 is not 100% closed because browser traversal and auth-flow verification have documented gaps.
  - 2026-05-08 live slice verified `/`, `/cookies`, `/about`, `/contact`, and unauthenticated `/dashboard` redirect to login with clean browser console. Default local test login failed, and `.env.local` has no approved `TEST_USER_1_EMAIL` / `TEST_USER_1_PASSWORD`; running the setup script would mutate auth/profile data and was out of scope.
- Closure status: **browser public/redirect smoke partial; authenticated traversal blocked**
- Exact next action: provide an approved existing test account/session cookie or local Supabase/Docker environment; then run a short authenticated smoke traversal with a test user/session: login → dashboard → couples → properties or a representative property detail → settings/profile; capture rendered/error/console evidence in a Phase 0 closure artifact. Full UX refinement remains held until later phases.

### 6. Docker/local-Supabase dependency was undocumented/unclear

- Evidence present:
  - `phase0-synthesis.md` documented Medium defect #6.
  - `vercel-localdev-docker-decision.md` clarifies Docker is optional for app dev, required only for local DB/integration paths, and recommends documentation.
  - Current `AGENTS.md` documents fast dev, local DB dev, test commands, and says Docker is optional except for `pnpm dev:db` and `pnpm test:integration`.
  - Current docs search shows README/setup/testing docs mention Docker/Supabase CLI expectations.
- Closure status: **closed for documentation clarity; still tied to integration-test block above**
- Exact next action: no separate Phase 0 action beyond closing integration-test execution; keep README/AGENTS aligned if integration runner behavior changes.

### 7. Test suite large but untriaged

- Evidence present:
  - `phase0-synthesis.md` documented Medium defect #7: 368 test files / 1541 tests at baseline, quality unknown.
  - `command-baseline.json` shows unit tests passed at baseline: 138 suites, 1541 tests.
  - `p1-repair-gates.json` shows later unit count 1547/1547 pass after Maps auth repairs.
  - 2026-05-08 focused triage ran 8 API/auth suites: 7 suites passed, 1 suite failed; `error-standardization.test.ts` expects `ApiErrorHandler.tooManyRequests` in admin-rate-limit/interactions/Maps routes while current code returns raw `checkRateLimit(...)` responses.
- Closure status: **partial; still open**
- Exact next action: classify the failing static guard as stale after M10 consolidation or as a real M6 429 standardization regression; then update code/tests in the Phase 1/M6 lane. Broader stale/vacuous/redundant test triage remains a later quality backlog item; do not dispatch Phase 4 now.

### 8. Cron-secret admin endpoints were opaque

- Evidence present:
  - `phase0-synthesis.md` documented Low-Medium defect #8 for five cron-secret admin endpoints.
  - `api-probe-matrix.json` deliberately marked these endpoints code-expectation-only and skipped live probing to avoid mutation/admin/external-paid/API-risk side effects.
  - 2026-05-08 live slice verified no-secret route opacity without printing/copying secrets: all five admin route families returned 401 without a cron secret; static scan confirmed `x-cron-secret` header, `cron_secret` query fallback, missing-secret rejection, and `rateLimitAdminRoute(...)` hook.
- Closure status: **closed for no-secret endpoint opacity; rotation/storage policy still decision-needed**
- Exact next action: decide/document secret strength, storage, rotation, and leak-response policy through approved ops/security channels; do not print or copy actual secret values.

### 9. Missing `.env.prod` reduced guard precision

- Evidence present:
  - `phase0-synthesis.md` documented Low defect #9.
  - Current file search found no `.env.prod` in this repo.
  - Current guard has fallback host detection and warns when `.env.prod` is missing or empty.
  - 2026-05-08 guard verification: `pnpm run guard:supabase` exits 1 because `.env.local` points at a fallback production/Supabase host; `SKIP_SUPABASE_GUARD=true pnpm run guard:supabase` exits 0 for explicit bypass.
- Closure status: **partial; still open**
- Exact next action: create a sanitized `.env.prod` baseline or explicitly document that production host matching is maintained through fallback detection. This requires care not to commit secrets.

### 10. Worker SLA failures indicated broad tasks were too large

- Evidence present:
  - `phase0-synthesis.md` documented Low defect #10 for P0.5/P0.6 SLA overrun.
  - `phase0-phase1-strict-closure-gate.md` restricts the next wave to focused Phase 0/1 closure work only.
  - This closure scout itself is a small artifact-bound task, consistent with the corrected gate.
- Closure status: **closed as a process correction for Phase 0 closure scouting**
- Exact next action: keep remaining closure work chunked into small artifact-bound tasks; do not dispatch broad traversal/probe workers unchanged.

## 100% completion check

- Repo/config/package/framework/env/Vercel/Docker/test-command inventory: **closed enough for Phase 0 baseline**
- Local startup: **closed after guard bypass repair, with documented command**
- Full site/browser traversal: **open**
- Auth-flow verification: **open**
- Known endpoint probing: **open**
- Integration-test execution: **blocked**
- Baseline bug/perf/test matrix: **present but caveated; not closure-grade**

Final Phase 0 verdict: **not 100% complete**. Phase 2/3/4/5 must remain held until the open/block Phase 0 items above are closed or explicitly downgraded by Shan with a written gate exception.
