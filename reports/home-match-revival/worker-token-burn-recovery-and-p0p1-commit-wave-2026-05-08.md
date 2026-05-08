# Worker Token-Burn Recovery + P0/P1 Commit Wave — 2026-05-08

## Operator verdict

This run treated max-turn/no-commit lanes as orchestration failures, not progress. The useful lesson from the aborted logs was not hidden implementation detail — most max-turn logs contained only the terminal error — but the **scope names** correctly identified the next narrow P0/P1 seams:

- auth redirect regression guards
- direct outbound API `fetch` timeout coverage
- safe no-auth live probe coverage expansion
- D6 DB execution evidence runner / remote reset refusal

The fix was to stop broad refills, reconcile pending clean commits first, then launch a small higher-turn batch where every lane had to produce one clean commit or a blocker.

## Reconciliation before refill

Integrated all clean pending worker output before launching the new batch.

### Previously completed documentation/evidence commits integrated

- `2c8a9ed` — live probe gap index
- `adf893e` — rate-limit provider gate checklist
- `3440b94` — P0/P1 artifact crosslink audit
- `75c4eef` — secret redaction evidence index
- `a2df685` — integration queue priority
- `d31bf3c` — E2E live skip policy
- `08010b5` — production config no-secret guards
- `1c40397` — Maps paid surface gates
- `b3a446a` — admin cron side-effect gates
- `41105bd` — canonical blocker-name dictionary
- `ca75449` — auth fixture source evidence
- `2df7185` — protected redirect evidence
- `73a9944` — API timeout and error coverage index
- `316143a` — launch blocker burnup snapshot
- `3ecef91` — accessibility live gaps
- `7f016a8` — demo surface publication gate
- `3ca0e1c` — RLS DB live proof gaps
- `0eab411` — worker output recovery checklist

## Higher-turn useful worker batch

Launched four bounded Claude Code worktree lanes with `--max-turns 96`, all strict Phase 0/1, no external side effects, no dependency installs, no Docker, no Supabase mutations, no paid APIs, and a hard one-commit target.

### Integrated code/test commits

1. `9094dbf` — `test: strengthen auth redirect regression guards`
   - Normalizes `/profile`, `/settings`, `/household/create`, and `/household/join` anonymous redirects to preserve canonical `redirectTo`.
   - Extends protected-page redirect regression coverage from the prior narrow set to 10 cases, including profile/settings/household/property routes and a sweep guard against bare `/login` regressions.

2. `527d91c` — `test: guard api outbound fetch timeout coverage`
   - Upgrades `external-timeouts.test.ts` from a hardcoded route allowlist to an auto-discovery scan over every `src/app/api/**/route.ts`.
   - Fails if a route contains direct global `fetch(` instead of the timeout wrapper, with an explicit exception mechanism currently empty.

3. `4e90e4e` — `test: expand safe no-auth live probe route coverage`
   - Expands loopback-only no-auth live probe data for protected redirect preservation, public marketing API, method-not-allowed route boundaries, and cron-secret/admin denial checks.
   - Preserves default safe SKIP when no local server is running.

4. `243ffd9` — `test: add db validation evidence runner guard`
   - Adds `scripts/db-validation-evidence-runner.js` and `pnpm run db:validate:plan`.
   - Default dry-run only; enumerates D6 reset/lint/rollback/integration proof commands without executing destructive steps.
   - Classifies Supabase targets, refuses tracked production hosts and production-shaped remote DB targets, and redacts secret-shaped environment values.
   - Adds 20 targeted unit tests covering target classification, migration enumeration, remote-production refusal, package-script safety, and redaction.

## Verification after integration

Ran from the integration worktree after cherry-picking all four code/test commits:

- `git diff --check HEAD~4..HEAD` — pass
- Targeted Jest via `systemd-run` — pass
  - `__tests__/unit/app/protected-page-auth-redirects.test.tsx`
  - `__tests__/unit/middleware.test.ts`
  - `__tests__/unit/routing/no-auth-traversal-smoke-guard.test.ts`
  - `__tests__/unit/lib/routing/protected-routes.test.ts`
  - `__tests__/unit/api/external-timeouts.test.ts`
  - `__tests__/unit/scripts/db-validation-evidence-runner.test.ts`
  - `__tests__/unit/database/migration-reset-readiness.test.ts`
  - `__tests__/unit/scripts/guard-supabase-env.test.ts`
- `pnpm type-check` via `systemd-run` — pass

## Resource and worker state

- Active `hm-d134..d137` tmux sessions: 0 after completion.
- Swap used: 0.
- Memory pressure: `full avg10=0.00`.
- Integration tree: clean after commit wave.

## Phase gate impact

This wave meaningfully improved repo-side Phase 0/1 closure, especially by turning aborted-run topics into committed guardrails. It still does **not** make Phase 0/1 100% closed:

- D6 now has an operator-proof dry-run evidence runner, but actual DB reset/lint/rollback/integration execution still needs an approved environment.
- D2 still needs durable provider choice/provisioning or explicit in-memory risk acceptance.
- D3 still needs external Supabase/project settings verification for email confirmation + CAPTCHA.
- Full live/auth/browser proof still depends on approved local/test server/session paths for the remaining lanes.

Phase 2+ remains held.
