---
title: HomeMatch E2E / Live / Auth / API Probe Skip Policy
date: 2026-05-08
scope: Phase 0/1 hardening. Documents the default-safe skip behavior for live, E2E, auth, and API probe specs in the HomeMatch repo and the evidence required to flip a spec from skipped to executed.
non_goals: Does not change any test code, runner script, env file, or CI configuration. Does not start servers, browsers, Supabase, or remote dashboards. Does not implement Phase 2+ work.
---

# HomeMatch E2E / Live / Auth / API Probe Skip Policy, 2026-05-08

## Verdict

**Skip-by-default is the correct posture for every live, browser, authenticated, paid, or remote spec in this repo, and the existing skip gates are load-bearing — not technical debt.** A skip is acceptable when (1) the spec's prerequisite environment is not green-lit, (2) the gate is explicit and named, and (3) Lane A unit guards still cover the static invariant. A skip is blocking when the spec is the only check protecting a P0/P1 invariant and the gate has no plan to be flipped.

This policy is the companion to `test-suite-taxonomy-2026-05-08.md`. Taxonomy says **which lane a spec belongs to**; this policy says **when that spec is allowed to skip and what evidence is required to run it**.

## Default-safe skip behavior

The repo already encodes skip-by-default for everything that is not Lane A (worker-safe targeted unit/jest guards). The named gates are:

| Gate (env / signal)                                                                         | Specs guarded                                                                                                                                                                                                               | Default state                                                                                             | What "default-safe skip" means                                                                                         |
| ------------------------------------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------- |
| `NO_AUTH_LIVE_PROBES_RUN=1`                                                                 | `__tests__/integration/routing/no-auth-live-probe.spec.ts` (`describe.skipIf(!RUN_LIVE_PROBES)`)                                                                                                                            | Unset → entire describe skips                                                                             | No probe is fired against `127.0.0.1:3000`; no dev server is required; CI/worker runs are inert.                       |
| `SKIP_HEAVY_INTEGRATION` / `SKIP_HEAVY_TESTS`                                               | `__tests__/integration/database/schema.test.ts`, `__tests__/integration/migration/data-integrity.test.ts`, `__tests__/integration/error-handling-patterns.test.ts`, `__tests__/integration/filter-builder-patterns.test.ts` | Either flag truthy → describe skips                                                                       | Heavy integration suites collapse to a no-op when the local Supabase / dev server contract is not satisfied.           |
| `SKIP_RPC_TESTS=true`                                                                       | `__tests__/integration/services/geographic-service.test.ts`, `__tests__/integration/services/property-service-facade.integration.test.ts`                                                                                   | Set → RPC describes skip                                                                                  | RPC-shaped specs that need a live Postgres + RPC contract are bypassed; no DB connection is opened.                    |
| `ENABLE_PROD_AUTH_CHECK=true`                                                               | `__tests__/integration/auth/prod-credential-check.integration.test.ts` (`shouldRun ? test : test.skip`)                                                                                                                     | Unset → opt-in test skips                                                                                 | The prod credential probe never runs without an explicit operator opt-in; `.env.prod` is never read.                   |
| `LOCAL_SEEDED_AUTH_LIFECYCLE=true` + loopback Supabase                                      | `__tests__/e2e/auth-lifecycle-local-seeded.spec.ts` (`test.skip(!isLocalUrl(...))`)                                                                                                                                         | Non-local Supabase URL → spec skips                                                                       | The seeded auth lifecycle refuses to run against any non-loopback Supabase project even if the env flag is set.        |
| `PLAYWRIGHT_WORKERS=1`                                                                      | Same spec, asserted at runtime                                                                                                                                                                                              | Not set → spec hard-fails fast (intentional)                                                              | Prevents browser/Supabase swarms; the spec is designed to be a single-worker smoke, not a fan-out.                     |
| `MAP_VIEW_ENABLED`                                                                          | `__tests__/e2e/location-map-precomputed.spec.ts`, `__tests__/e2e/settings-location-map.spec.ts` (`test.skip(!MAP_VIEW_ENABLED, ...)`)                                                                                       | Feature flag off → suite skips                                                                            | Map-view E2E coverage is gated behind the same flag that gates the user-visible feature.                               |
| `API_AUTH_SMOKE_TOKEN` + `ALLOW_REMOTE_API_AUTH_SMOKE=1` (only when target is non-loopback) | `__tests__/integration/api/auth-smoke-matrix.spec.ts`                                                                                                                                                                       | Missing token → spec aborts with explicit error; non-loopback `TEST_API_URL` without allow-flag → refused | No authenticated API probe ever fires without an approved bearer; remote targets require a second explicit allow-flag. |
| `ALLOW_REMOTE_SUPABASE=true`                                                                | `pnpm run test:integration:remote`, `pnpm run test:e2e:remote*`, `pnpm run dev:remote`                                                                                                                                      | Unset → remote runner refuses to start                                                                    | Loopback enforcement is the default; remote requires an explicit, single-purpose unlock.                               |
| `SKIP_SUPABASE_GUARD=true` (dev only)                                                       | `scripts/guard-supabase-env.js`                                                                                                                                                                                             | Unset → guard blocks production-shaped Supabase URLs in dev/test                                          | Not a test skip; an env guard. Listed here because it is the same shape: opt-in unlock with a logged reason.           |

All of these gates are **read-only when unset**: the worker / CI run terminates without contacting Docker, Supabase, the dev server, paid Maps APIs, or any remote dashboard. That is the property worker lanes rely on.

## When a skip is acceptable (do not treat as blocking)

A skip is acceptable when **all** of the following hold:

1. **The gate is explicit and named.** The skip is wired through one of the env flags above (or an equivalent named flag), not a silently disabled spec, not a `.only`/commented block, not a `// TODO: re-enable`. The reason is visible in the spec source or the runner script.
2. **The static invariant is covered elsewhere.** A Lane A unit/jest guard already asserts the structural shape (route handler invariant, schema shape, migration SQL invariant, RBAC repo guard, RLS policy file shape, etc.). The live spec exists to confirm runtime behavior, not to introduce the invariant.
3. **The prerequisite environment is genuinely absent.** No approved local Supabase + dev server + seeded users, or no `API_AUTH_SMOKE_TOKEN`, or no green-lit feature flag. Spinning the prerequisite up is itself approval-gated (Lane B/C/D in the taxonomy), so absence is the expected steady state for a worker.
4. **The skip is reversible without code changes.** Setting the env flag (and meeting the prerequisite) flips the spec from skipped to executed without editing the spec file. If a code edit is required to re-enable, the skip is not acceptable — see below.

When all four hold, an acceptable skip should not be tracked as a P0/P1 blocker. It is design.

## When a skip is blocking (must be tracked and resolved)

A skip is blocking — and must be recorded as a remaining Phase 0/1 item — when **any** of the following hold:

1. **It is the only check protecting a P0/P1 invariant.** No Lane A static guard backs it up. Example: a live auth lifecycle spec being skipped while no static guard asserts that `protected route → /login redirect` is wired correctly.
2. **The gate has no documented path to be flipped.** No artifact in `reports/home-match-revival/` describes what the operator must do (which env, which seeding, which approval) to take the skip down. If the gate is permanent in practice, the spec is a corpse, not a guard.
3. **It is not actually skipping — it is silently passing.** The spec body does not assert anything (e.g. an empty `it.skip('enforces rate limiting responses', ...)` with no companion assertion), or it is bypassed by a non-named heuristic (CI auto-detection, hostname sniffing without a flag, `try/catch` swallowing the prerequisite failure). Inventory examples: `__tests__/integration/api/interactions-route.integration.test.ts:470` (rate-limit skip is a placeholder; ensure a Lane A rate-limit-coverage guard backs it up before treating as acceptable).
4. **The skip masks a known bug.** E.g. skipping `/api/maps/metro-boundaries?metro=bay-area` because it currently 500s in dev (`phase0-live-probe-auth-cron-env-closure-2026-05-08.md`) — the live probe is not the closure, the bug fix is.
5. **The skip has drifted past its owner.** Anything more than ~30 days old without an associated artifact should be re-examined; the prerequisite environment may have changed.

If a skip meets any of (1)–(5), it must be entered into `p0-p1-blocker-evidence-index-2026-05-08.md` (or its successor) with the gate name, the missing prerequisite, and the named owner.

## Evidence required to flip a spec from skipped to executed

The bar to take a gate down is the same shape as the lane gating in the test-suite taxonomy. Before any worker or CI run is allowed to set the env flag and execute, the following evidence must exist:

### For Lane B — Vitest integration (`SKIP_HEAVY_*`, `SKIP_RPC_TESTS`)

- Operator-approved local Supabase reachable on loopback (verified by `pnpm dlx supabase@latest start ...` standing).
- Seeded test users via `scripts/setup-test-users-admin.js` against the same loopback project.
- `next dev` running on `:3000`, started under approved guard bypass (`SKIP_SUPABASE_GUARD=true` only when the loopback Supabase URL is loopback-shaped — guard-supabase-env enforces this).
- The worker is **not** allowed to bring any of these up itself. Evidence is "operator confirmed environment is up, here is the timestamp", not "worker started Docker".

### For Lane C1 — Public no-credential E2E (`playwright.no-auth-accessibility.config.ts`)

- Dev server already running on `:3100` under operator approval.
- No real Supabase data dependency (anon key may be a stub; verified per spec).
- Browser binaries installed (Playwright); worker may not run `pnpm exec playwright install`.

### For Lane C2 — Authenticated/full Playwright (`auth-lifecycle-local-seeded`, `couples-*`, `properties-*`, `settings-*`, etc.)

- All Lane B prerequisites, plus:
- `LOCAL_SEEDED_AUTH_LIFECYCLE=true` (where the spec checks it).
- `PLAYWRIGHT_WORKERS=1` to prevent browser/Supabase swarms.
- Loopback-shaped `SUPABASE_LOCAL_PROXY_TARGET` / `SUPABASE_URL` / `NEXT_PUBLIC_SUPABASE_URL`. Non-loopback URLs cause the spec to skip even with the flag set, by design.
- Approved seeded credentials in `.env.local` (`TEST_USER_*`); the worker may not run the user-seed script itself.

### For Lane D — Live probes (`NO_AUTH_LIVE_PROBES_RUN=1`)

- Local app reachable on `127.0.0.1:3000` under operator approval; the runner script `scripts/run-no-auth-live-probes.js` already refuses otherwise. Worker should not start the dev server itself.
- No remote target. The probe harness is loopback-only; flipping `NO_AUTH_LIVE_PROBES_BASE_URL` to a non-loopback URL is out of scope for any worker.

### For authenticated API smoke (`API_AUTH_SMOKE_TOKEN`)

- Bearer token issued for an **approved local seeded** test user (not a real human user, never a prod token).
- `TEST_API_URL` resolves to a loopback host. Non-loopback target requires `ALLOW_REMOTE_API_AUTH_SMOKE=1` and explicit Shan approval, captured in an artifact under `reports/home-match-revival/`.
- Token is not committed; the worker does not print, log, or exfiltrate it.

### For prod credential probe (`ENABLE_PROD_AUTH_CHECK=true`)

- Existing `.env.local` and `.env.prod` are present and operator-confirmed to point at non-mutating, read-only auth flows (`grant_type=password` against a known test account).
- No worker may set this flag autonomously. It is operator-only because it touches a real upstream Supabase auth endpoint.

### For remote runners (`ALLOW_REMOTE_SUPABASE=true`, `ALLOW_REMOTE_API_AUTH_SMOKE=1`, `dev:remote`)

- Single-purpose, time-boxed approval recorded in an artifact (e.g. `shan-approval-and-test-credential-update-2026-05-08.md` shape).
- Target is explicitly non-production (staging or seeded test project), confirmed at the URL level.
- Worker is forbidden from these lanes even with the flag set; only an operator-driven session may use them.

## Worker decision matrix (skip-aware)

| Observed state                                                                       | What it means             | Worker action                                                                                               |
| ------------------------------------------------------------------------------------ | ------------------------- | ----------------------------------------------------------------------------------------------------------- |
| Spec uses a named env gate; gate is off                                              | Acceptable skip — design  | Do not treat as a blocker. Confirm Lane A static guard exists; if not, file under "blocking skip" and stop. |
| Spec uses a named env gate; gate is on but prerequisite missing                      | Spec will fail at runtime | Do not run. Stop. The prerequisite is operator-only.                                                        |
| Spec has `.skip` / `.skipIf` / `test.skip` with no named gate                        | Inspect                   | If there is no Lane A static guard backing it, file as a blocking skip.                                     |
| Spec has `it.skip('...', ...)` placeholder                                           | Likely a corpse or a TODO | Confirm Lane A static guard covers the invariant; otherwise file as a blocking skip.                        |
| Spec body short-circuits silently when env is missing (no `.skip`, just `return`)    | Hidden skip               | File as a blocking skip; the gate is not visible in test reporting.                                         |
| Spec hostname-sniffs to bypass without a named flag                                  | Hidden skip               | File as a blocking skip; gates must be explicit.                                                            |
| New live/E2E/auth/API spec proposed in a PR with no named gate and no Lane A backing | Reject in review          | Either add the named gate + Lane A backing, or do not land.                                                 |

## Cross-references

- `reports/home-match-revival/test-suite-taxonomy-2026-05-08.md` — lane definitions and worker-safe execution rules. This policy assumes that taxonomy.
- `reports/home-match-revival/p0-p1-blocker-evidence-index-2026-05-08.md` — index of remaining P0/P1 blockers; blocking skips must land here.
- `reports/home-match-revival/p0-no-auth-api-protected-redirect-probe-harness-2026-05-08.md` — the probe harness this policy applies to (`NO_AUTH_LIVE_PROBES_RUN`).
- `reports/home-match-revival/p0-p1-strict-anonymous-live-probe-rerun-2026-05-08.md` — example of evidence shape for a flipped Lane D run.
- `reports/home-match-revival/phase0-live-probe-auth-cron-env-closure-2026-05-08.md` — concrete example of an acceptable-skip → blocker transition (`/api/maps/metro-boundaries` 500 unmasked the skip into a real bug).
- `reports/home-match-revival/p0-p1-credentialless-auth-lifecycle-verification-plan-2026-05-08.md` — Lane C2/D evidence plan that maps to the auth-lifecycle skip gate.
- `reports/home-match-revival/shan-approval-and-test-credential-update-2026-05-08.md` — approval-evidence shape for credential-bearing flips.
- `__tests__/integration/routing/no-auth-live-probe.spec.ts`, `__tests__/integration/api/auth-smoke-matrix.spec.ts`, `__tests__/e2e/auth-lifecycle-local-seeded.spec.ts`, `__tests__/integration/auth/prod-credential-check.integration.test.ts` — source of truth for the named gates above.

## Closure note

This artifact is documentation only. No source files were modified, no tests were executed, no environment was started, no remote system was contacted. It records the rules under which skipped live/E2E/auth/API specs should be treated as design, vs the rules under which a skip is an open Phase 0/1 blocker that must be tracked and resolved.
