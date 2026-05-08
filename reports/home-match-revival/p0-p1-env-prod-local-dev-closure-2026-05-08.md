# P0/P1 env-prod guard and local-dev docs closure — 2026-05-08

## Scope

Strict Phase 0/1 closure slice for `.env.prod` guard precision, README/local-dev validation cleanup, and local-dev no-secret documentation. No secrets were inspected, copied, printed, or committed; `.env.prod` was not created.

## Changes

- `scripts/guard-supabase-env.js`
  - Loads `.env.local` before the explicit `SKIP_SUPABASE_GUARD=true` check, matching the script comment and local-dev documentation.
  - Uses `config/supabase-production-hosts.json` as a tracked non-secret production-host baseline when `.env.prod` is absent.
  - Normalizes hosts before comparison and keeps suffix-based Supabase host-pattern detection to avoid lookalike-domain bypasses.
  - Error output reports offender categories only (`SUPABASE_URL_HOST`, `SUPABASE_HOST_PATTERN`, etc.), not env values.
- `config/supabase-production-hosts.json`
  - Adds the known production Supabase hostname as non-secret guard metadata only.
  - Documents that API keys, service-role keys, passwords, and database URLs must never be stored there.
- `README.md`, `docs/DEVELOPMENT_WORKFLOWS.md`, `docs/SETUP_GUIDE.md`
  - Document that `.env.prod` is intentionally untracked and not required for routine local development.
  - Document the non-secret production-host guard policy and the read-only-only `SKIP_SUPABASE_GUARD=true pnpm dev` escape hatch.

## Verification evidence

- Workspace precheck:
  - `pwd` -> `/home/shan/projects/homematch-v2`
  - `git rev-parse --show-toplevel` -> `/home/shan/projects/homematch-v2`
  - `git branch --show-current` -> `autonomy/6h-business-hardening`
- Targeted Jest:
  - `systemd-run --user --scope -p MemoryMax=2G -p CPUQuota=200% pnpm exec jest __tests__/unit/scripts/guard-supabase-env.test.ts __tests__/unit/docs/readme-local-dev.test.ts --runInBand`
  - Result: 2 suites passed, 6 tests passed.
- Guard bypass:
  - `SKIP_SUPABASE_GUARD=true pnpm run guard:supabase`
  - Result: exit 0 with explicit bypass log.
- Guard block without bypass:
  - `pnpm run guard:supabase`
  - Result: exit 1 with offender categories only: `SUPABASE_URL_HOST, SUPABASE_HOST_PATTERN`.

## Closure impact

- `.env.prod` guard precision: closed for repo-local Phase 0/1 purposes by accepting an untracked `.env.prod` policy plus a tracked non-secret production-host baseline.
- README/local-dev validation cleanup: closed with README static test coverage updated.
- Local-dev no-secret documentation: closed in README, setup guide, and development workflows.

Remaining Phase 0/1 blockers are unchanged: API live probe execution, browser traversal execution, E2E/auth lifecycle with approved credentials/session, integration/DB validation environment, and other owner decisions unrelated to this slice.
