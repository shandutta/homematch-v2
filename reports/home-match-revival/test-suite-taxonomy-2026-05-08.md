---
title: HomeMatch Test Suite Taxonomy
date: 2026-05-08
scope: Phase 0/1 quality slice. Classifies the existing test suites by execution shape, environment requirement, and worker-lane safety.
non_goals: Does not run a broad full-suite, mutate live Supabase, hit paid APIs, install packages, reset Docker, swarm browsers, change deploys, edit secrets, or alter remote/external dashboards.
---

# HomeMatch Test Suite Taxonomy, 2026-05-08

## Verdict

The repo has four distinct test families with different blast radii. Bounded HomeMatch P0/P1 workers should run only **Lane A: targeted unit/jest guards** without approval. Vitest integration, Playwright E2E, accessibility, performance, and remote/live probe lanes all need either approved environments (Docker + local Supabase + seeded users + dev server) or explicit owner approval.

Lane A is what the recent P0/P1 closure stream has been adding: small, hermetic guards that load no Supabase, no dev server, no Playwright. Lane B+ should not be invoked from a worker without explicit operator green-light.

## Lane A — Worker-safe targeted unit/jest guards (no approval needed)

Runner: `pnpm exec jest <path>` with `NODE_ENV=test`. Hermetic, no Docker, no dev server, no real Supabase, no network. These guards live mostly under `__tests__/unit/` and a few `__tests__/integration/*.test.ts` files that are pure module/static checks.

Safe in this lane (representative, not exhaustive):

| Guard family | Path | What it checks | External deps |
| --- | --- | --- | --- |
| RBAC/auth boundary guards | `__tests__/unit/auth/d1-rbac-authority-packet.test.ts`, `__tests__/unit/auth/password-config-alignment.test.ts`, `__tests__/unit/auth/signup-verification-policy-invariants.test.ts` | Static repo invariants for service-role gating, password config, signup verification policy | None |
| API route handler guards | `__tests__/unit/api/auth-boundary-consolidation.test.ts`, `__tests__/unit/api/cache-control.test.ts`, `__tests__/unit/api/error-standardization.test.ts`, `__tests__/unit/api/external-timeouts.test.ts`, `__tests__/unit/api/rate-limit-coverage.test.ts`, `__tests__/unit/api/maps-proxy-script.route.test.ts`, `__tests__/unit/api/status-refresh-route.test.ts`, `__tests__/unit/api/generate-vibes-route.test.ts`, `__tests__/unit/api/ingest-zillow-route.test.ts` | Pure handler invariants with mocked Supabase/Next | Mocked only |
| Service unit tests | `__tests__/unit/services/*.test.ts` (couples, interactions, PropertyFilterBuilder, property-stats-rpc, storytelling, supabase-rpc-types-cleanup, users-client.createHousehold, neighborhood-vibes, vibes) | Module-level logic with `setupSupabaseMock` | Mocked Supabase |
| Schema/middleware/security guards | `__tests__/unit/middleware.test.ts`, `__tests__/unit/security/search-injection.test.ts`, `__tests__/unit/schemas/*`, `__tests__/unit/data/*` | Zod, middleware, dashboard query/loader typing | None |
| App route policy guards | `__tests__/unit/app/seo-route-policy.test.ts`, `__tests__/unit/app/demo-surface-production-gate.test.ts`, `__tests__/unit/app/service-role-route-capability-guard.test.ts`, `__tests__/unit/app/protected-page-auth-redirects.test.tsx`, `__tests__/unit/app/metadata-routes.test.ts` | Static invariants over `src/app/**` | None |
| DB migration shape guards | `__tests__/unit/database/*.test.ts` (`admin-role-assignments-migration`, `migration-reset-readiness`, `rls-policy-closure`, `rollback-coverage`, `schema-safety-migration`, `security-definer-search-path-migration`, etc.) | Read migration SQL files and assert structural invariants. No DB connection. | Filesystem only |
| Routing/scripts guards | `__tests__/unit/routing/no-auth-traversal-smoke-guard.test.ts`, `__tests__/unit/scripts/guard-supabase-env.test.ts`, `__tests__/unit/docs/readme-local-dev.test.ts` | Doc/script repo invariants | None |
| Component/a11y unit | `__tests__/unit/components/**/*.test.tsx`, `__tests__/unit/accessibility/core-flow-matrix.test.ts` | RTL render against mocks | jsdom |

How to run safely from a worker (single targeted file):

```
systemd-run --scope --user --slice=hermes-claude-worker.slice \
  -- pnpm exec jest <single-test-path>
```

Worker rules for Lane A:
- Run by exact path. Never `pnpm test` (which fans out to integration + e2e via concurrently).
- One file per invocation; do not pass globs that would match Vitest specs (`*.spec.ts`).
- No environment edits. No `.env*` writes. No new `pnpm install`.
- Type-check (`pnpm exec tsc --noEmit`) is only required when source files are modified.

## Lane B — Vitest integration suite (environment-gated)

Runner: `pnpm run test:integration` → `node scripts/run-integration-tests.js`. Scripts confirm the runner: (1) starts Docker, (2) starts/seeds local Supabase, (3) provisions test users with JWTs, (4) launches `next dev` on port 3000, (5) runs `vitest`, (6) tears down. Any single Vitest spec under `__tests__/integration/**/*.test.ts` or `*.spec.ts` typically expects the same prerequisites unless it is a pure module test.

Approval gating:
- Needs Docker + local Supabase running. Worker is forbidden from Docker reset.
- Needs `next dev` on `:3000`. Worker is forbidden from broad server stand-up.
- Needs seeded users (`test:setup-users`) and `SUPABASE_SERVICE_ROLE_KEY` for an approved local instance.

Representative files: `__tests__/integration/api/*` (activity, auth-smoke-matrix, avatar-upload, couples-check-mutual, couples-stats, health, household-rpc, interactions-route, map-boundaries, mutual-likes), `__tests__/integration/auth/*`, `__tests__/integration/database/*` (e.g. `household-user-count-trigger`, `schema`), `__tests__/integration/security/rls-boundaries.test.ts`, `__tests__/integration/services/*`, `__tests__/integration/households/*`, `__tests__/integration/ui/*`, `__tests__/integration/migration/*`.

Lane B exception — module-only specs that *can* be safely run via Jest (not Vitest) when their imports are pure: e.g. `error-handling-patterns.test.ts`, `filter-builder-patterns.test.ts`, `supabase-client-patterns.test.ts`, `services-properties-facade-extended.test.ts`. These are referenced by `test:safety-net:quick` and `test:filter-patterns`/`test:supabase-patterns` scripts. Each of these still needs to be inspected before running — only run those that import nothing requiring the dev server or live Supabase. **Default is to treat all of `__tests__/integration/` as Lane B unless verified.**

## Lane C — Playwright E2E (approval + environment gated)

Runner: `pnpm run test:e2e:ui-tests` (default config) or `pnpm run test:e2e:no-auth-accessibility` (separate config on `:3100`).

Two sub-lanes:

| Sub-lane | Config | Auth/data | Approval shape |
| --- | --- | --- | --- |
| C1 No-auth public a11y/smoke | `playwright.no-auth-accessibility.config.ts` over `__tests__/e2e/no-auth-public-accessibility.spec.ts` | No auth, no real Supabase calls (anon key is a stub), forces local `127.0.0.1:3100` | Bounded **but still spawns `next dev` on port 3100**. Worker should not auto-launch — needs explicit operator approval to start the local server, or the server must already be running. |
| C2 Authenticated/full e2e | `playwright.config.ts` over the rest of `__tests__/e2e/*.spec.ts` (auth lifecycle, couples, properties, modal, settings, household clipboard, ui-regressions, performance-budgets, etc.) | Needs seeded users, real local Supabase, dev server on `:3000`, and in some cases `LOCAL_SEEDED_AUTH_LIFECYCLE=true` | Approval-gated. Forbidden from worker. |

Specifically forbidden from worker: `auth-lifecycle-local-seeded.spec.ts`, `auth-login-flow.spec.ts`, `auth-redirects.spec.ts`, `couples-*.spec.ts`, `properties-*.spec.ts`, `settings-*.spec.ts`, `property-modal-*.spec.ts`, `property-vibes-ui.spec.ts`, `household-clipboard.spec.ts`, `location-map-precomputed.spec.ts`, `ui-regressions.spec.ts`, `performance-budgets.spec.ts`, `smoke-min.spec.ts`, `fixtures-validation.spec.ts`, `error-simulation/*`.

## Lane D — Live probes, performance, and remote (explicit approval)

| Lane | Script | Why gated |
| --- | --- | --- |
| Local no-auth live probe harness | `pnpm run test:no-auth-live-probes` (`scripts/run-no-auth-live-probes.js`) | Refuses to run unless a local app is reachable on `127.0.0.1:3000`. Safe in shape (loopback enforced) but still requires the dev server to be already running, which is operator-approved territory. |
| Local seeded auth lifecycle | `pnpm run test:e2e:auth-lifecycle:local` | Pins Supabase to loopback, but stands up dev server, seeds users, runs Playwright; operator approval needed. |
| Performance/Lighthouse | `pnpm run perf:test`, `pnpm run perf:lighthouse` | Requires running app and produces external artifacts; operator approval needed. |
| Integration-remote and e2e-remote | `pnpm run test:integration:remote`, `pnpm run test:e2e:remote`, `pnpm run test:e2e:remote:seed`, `pnpm run dev:remote` | Targets a non-loopback project. Forbidden without explicit Shan approval and `ALLOW_REMOTE_SUPABASE=true` / `ALLOW_REMOTE_API_AUTH_SMOKE=1`. |
| RLS/schema CI validators | `pnpm run ci:validate:rls`, `pnpm run ci:validate:schema`, `pnpm run ci:test:database`, `pnpm run ci:test:api`, `pnpm run ci:test:integration` | All require a live Supabase reachable from the runner. |
| Refactoring safety-net | `pnpm run test:safety-net` (`__tests__/scripts/refactoring-safety-net.js`) | Wrapper around the integration runner. Same gating as Lane B. |
| Database reset/seed | `pnpm run db:reset`, `pnpm run test:db:reset`, `pnpm run test:setup-users`, `pnpm run test:infra:*` | Mutates local Supabase state; explicit operator step. |
| Build for tests | `pnpm run build:test`, `pnpm run build` | Heavy; not required for taxonomy or Lane A. |

## Worker decision matrix

| Scenario | Lane | Action |
| --- | --- | --- |
| Add or guard a new repo-static invariant | A | Run the single targeted Jest file under `systemd-run`. Commit. |
| Validate API handler error/cache/rate-limit shape | A | Run that single `__tests__/unit/api/*.test.ts` under `systemd-run`. |
| Validate migration SQL invariants | A | Run that single `__tests__/unit/database/*.test.ts` under `systemd-run`. |
| Validate auth flow against Supabase | C2/D | Stop. Request approval and a green-lit local seeded environment. |
| Validate API authenticated 2xx/401 matrix | B/D | Stop. Needs `API_AUTH_SMOKE_TOKEN` and approved local app. |
| Validate public no-credential UX | C1 | Stop unless dev server on `:3100` is already up under operator approval. |
| Run “the test suite” | n/a | Refuse; ask which targeted file. `pnpm test` is forbidden in worker. |

## Cross-references

- `reports/home-match-revival/p0-p1-remaining-blocker-taxonomy-2026-05-08.md` — owner taxonomy of remaining P0/P1 blockers; this report is the test-runner-shaped companion.
- `reports/home-match-revival/p0-site-traversal-acceptance-matrix-2026-05-08.md` — defines the public no-credential traversal expectations that map to Lane C1.
- `reports/home-match-revival/p0-p1-api-auth-smoke-matrix-2026-05-08.md` — defines the API auth smoke matrix that maps to Lane D.
- `reports/home-match-revival/p0-p1-credentialless-auth-lifecycle-verification-plan-2026-05-08.md` — auth-lifecycle plan that maps to Lane C2/D.
- `package.json` scripts and `scripts/run-integration-tests.js`, `scripts/integration-test-setup.js`, `scripts/run-no-auth-live-probes.js`, `scripts/guard-supabase-env.js` are the source of truth for per-lane prerequisites.

## Closure note

This report is documentation only. No source files were modified, no tests were executed, no environment was started, no remote system was contacted. Lane A invocation rules above are for future bounded workers to follow.
