# D6 DB Static Reset Readiness Closure — 2026-05-08

Task: `t_ce71b702`
Scope: Phase 0/1 only. Static DB/migration reset-readiness guards only; no Docker, live Supabase, paid APIs, remote mutations, secrets, or subagents.

## Verdict

D6 is now **repo-side/static closed for reset-readiness guards**. It is **not live/integration closed**: actual `supabase db reset`, DB lint, rollback execution, and integration validation still require an approved local Supabase/Docker environment or a safeguarded remote-test path.

## What changed

- Added `__tests__/unit/database/migration-reset-readiness.test.ts`.
- Added a `-- DOWN:` rollback companion to `supabase/migrations/20260507225000_add_schema_safety_constraints.sql`, which was the only 2026 Phase 1 DB remediation migration missing explicit rollback notes.
- Guarded all 2026 Phase 1 DB remediation migrations for:
  - explicit `-- DOWN:` rollback notes,
  - no reset-replay-unsafe statements such as `CREATE INDEX CONCURRENTLY`, `DROP SCHEMA public CASCADE`, `DROP DATABASE`, `ALTER SYSTEM`, or `COPY ... FROM PROGRAM`,
  - package-script safety: `db:reset` remains the local wrapper (`node scripts/dev-supabase-reset.js`), `dev:db` keeps `ensure:docker` before reset, and package scripts do not expose a remote `supabase db reset --db-url` or destructive `psql` reset command.

## RED/GREEN evidence

RED:

```bash
systemd-run --user --scope -p MemoryMax=2G -p CPUQuota=200% pnpm exec jest __tests__/unit/database/migration-reset-readiness.test.ts --runInBand
```

Failed because `20260507225000_add_schema_safety_constraints.sql` did not contain `-- DOWN:`.

GREEN:

```bash
systemd-run --user --scope -p MemoryMax=2G -p CPUQuota=200% pnpm exec jest __tests__/unit/database/migration-reset-readiness.test.ts --runInBand
```

Passed: 1 suite / 20 tests.

Additional hygiene:

```bash
git diff --check
```

Passed.

## Remaining D6 boundary

This slice deliberately does not run Docker, local Supabase, live Supabase, remote DB reset, DB lint, rollback execution, or integration tests. D6 remains environment-gated for execution proof until Shan approves a safe local/test database reset path or explicit deferral/gate exception.
