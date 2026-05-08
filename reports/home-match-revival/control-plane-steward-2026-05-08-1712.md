# Control-plane steward update — 2026-05-08 17:12Z

Board: `home-match-revival`
Repo: `/home/shan/projects/homematch-v2`
Mode: Phase 0/1 closure only; Phase 2+ held.

## Reconciled Claude workers

- `hm-probe-1702` / task `t_0ce9ff93`: already reconciled before this report. Integrated as commit `5b974f7` with no-auth probe evidence extension.
- `hm-demo-1702` / task `t_90d363ad`: worktree commit `69aeaa9` integrated to main as `3e5f510` (`fix: gate remaining internal demo surfaces`). Verification on integration branch:
  - `systemd-run --user --wait --collect ... pnpm exec jest __tests__/unit/app/demo-surface-production-gate.test.ts __tests__/unit/app/seo-route-policy.test.ts --runInBand` passed.
  - `systemd-run --user --wait --collect ... pnpm type-check` passed.
- `hm-rbac-1702` / task `t_b22ddbd5`: worktree commit `c57e20e` integrated to main as `e7af71e` (`feat(security): replace user_profiles.role service-role gate with admin_role_assignments authority table`). Verification on integration branch:
  - `systemd-run --user --wait --collect ... pnpm exec jest __tests__/unit/app/service-role-route-capability-guard.test.ts __tests__/unit/database/admin-role-assignments-migration.test.ts __tests__/unit/lib/supabase/server-service-role-authorization.test.ts --runInBand` passed.
  - `systemd-run --user --wait --collect ... pnpm type-check` passed.
- `hm-db-1702` / task `t_e4d71eb4`: exited at Claude max-turns during migration audit research without a commit or worktree diff. Useful finding preserved here: Phase 1 policy migrations with bare `CREATE POLICY` were checked and already use preceding `DROP POLICY IF EXISTS`; broader D6 live reset/lint/integration remains open.

## Resource state after reconciliation

- RAM green: ~13.8 GiB available, swap 0 used.
- Memory PSI: avg10/avg60/avg300 all 0.00.
- Load: acceptable on CX43-class box.
- Integration worktree: clean after commits except this steward report/matrix update before its own commit.

## Gate verdict

- Phase 0: still not 100%; remaining gaps are live/browser/API execution evidence and external/paid/mock boundaries.
- Phase 1: improved but still not 100%; D1 and internal/demo surfaces are now repo-side closed, but D2/D3/D6 and live/integration-backed proof remain open.
- Phase 2+: held.
