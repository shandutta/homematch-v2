# D10 DB Integration Environment Guard Follow-up — 2026-05-08

Task: `t_da4a0bcb`
Scope: Phase 0/1 only. Repo-local guard/report that clarifies when DB reset, DB lint, rollback execution, and integration environment validation may run after the D6 static reset-readiness guard. No Docker reset, live Supabase, remote DB URL, paid API, secret, dependency install, deploy, or subagent action was run in this slice.

## Verdict

D10 is repo-side/static closed for environment execution criteria. It does not execute DB reset, DB lint against a live database, rollback execution, or integration suites. Those actions remain gated until the run has an approved local/disposable environment or an explicitly approved non-production remote test path.

## What changed

- Added `config/db-integration-execution-policy.json` as the machine-readable fail-closed policy for post-D6 execution.
- Added `__tests__/unit/database/db-integration-execution-policy.test.ts` to enforce the criteria in the policy and report.
- Preserved the D6 boundary: `__tests__/unit/database/migration-reset-readiness.test.ts` remains the static reset-readiness guard; this slice clarifies when execution proof may happen.

## Environment execution criteria

### DB reset

Allowed only when all of the following are true:

1. Supabase points to loopback/local infrastructure (`http://127.0.0.1`, `http://localhost`, `supabase.local`) or a documented local proxy.
2. Docker/local Supabase reset is intentionally approved for that run.
3. The reset stays routed through `scripts/dev-supabase-reset.js` or an equivalent local-only wrapper.
4. No remote `--db-url` reset path is used.

Must not run when the environment points at hosted `*.supabase.co`, remote Postgres variables, live user data, or a task scope that prohibits Docker, live Supabase, remote DB URLs, or secrets.

### DB lint

Allowed only as static migration-file review or against an approved disposable local/non-production project. Remote linting is not production approval: any remote DB lint path needs explicit human approval plus a documented non-production target.

### Rollback execution

Allowed only against a disposable local database or approved non-production clone, with explicit `-- DOWN:` notes and captured before/after evidence. Rollback execution must not expose secrets or PII.

### Integration environment

Allowed only for local Supabase plus local seeded test users, or for a safeguarded non-production remote test path with explicit human approval. ALLOW_REMOTE_SUPABASE=true / SUPABASE_ALLOW_REMOTE=true is never sufficient production approval by itself; it is only a guard bypass signal for a separately approved non-production path.

## RED/GREEN evidence

RED expectation for this slice: without `config/db-integration-execution-policy.json` and this report, the new Jest guard would fail because the execution criteria and fail-closed approvals were not present in repo-local evidence.

GREEN command:

```bash
systemd-run --user --scope -p MemoryMax=2G -p CPUQuota=200% pnpm exec jest __tests__/unit/database/db-integration-execution-policy.test.ts __tests__/unit/database/migration-reset-readiness.test.ts --runInBand
```

Additional hygiene:

```bash
pnpm type-check
```

## Deliberately not run

- No supabase db reset (no Docker/Supabase reset, no local stack reset, no remote reset).
- No Docker/Supabase local stack startup.
- No live Supabase or hosted \*.supabase.co mutation.
- No remote DB URL, paid API, deploy, dependency install, secret read/write, or real-user-data action.
