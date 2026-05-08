# D136 — RLS / Migration Static Guard → DB Live-Proof Gap Index — 2026-05-08

**Scope:** Phase 0/1 only. Repo-side, no-secret index. Maps the existing
repo-side RLS / migration / static guards to the **specific** DB live /
reset / lint proof gaps they *cannot* close, and pins the approved
execution prerequisites that must be in place before an operator may run
the gated commands. Adds no new tests, runs no DB commands, prints no
secrets, and authorizes nothing on its own.

This index is a join — not a re-statement — of:

- [`d6-db-static-reset-readiness-closure-2026-05-08.md`](./d6-db-static-reset-readiness-closure-2026-05-08.md)
  — the repo-side reset-readiness closure.
- [`d6-db-execution-evidence-plan-2026-05-08.md`](./d6-db-execution-evidence-plan-2026-05-08.md)
  — E1–E4 execution evidence still owed.
- [`d22-migration-rollback-evidence-index-2026-05-08.md`](./d22-migration-rollback-evidence-index-2026-05-08.md)
  — per-migration DOWN block coverage matrix and residual gaps.
- [`rls-security-audit.md`](./rls-security-audit.md)
  — RLS coverage / risk baseline.
- [`security-evidence-index-2026-05-08.md`](./security-evidence-index-2026-05-08.md)
  — broader security-themed evidence set (this index is a DB-lane
  subset and is referenced from neither matrix nor gate; both remain
  unchanged).

## Mapping table — static guard → live-proof gap → prerequisite

Each row names a guard that is **already green in the repo** today, the
specific live-proof gap that guard cannot close on its own, and the
operator-side prerequisite required before the gated execution path may
run. Prerequisites are reproduced verbatim from the source documents to
keep this index drift-resistant.

| # | Repo-side guard (already green) | Live / reset / lint proof gap it does NOT close | Approved execution prerequisite |
|---|---------------------------------|------------------------------------------------|---------------------------------|
| 1 | `__tests__/unit/database/migration-reset-readiness.test.ts` (1 suite / 20 tests; asserts every 2026 Phase 1 migration carries `-- DOWN:` and avoids reset-replay-unsafe statements such as `CREATE INDEX CONCURRENTLY`, `DROP SCHEMA public CASCADE`, `DROP DATABASE`, `ALTER SYSTEM`, `COPY ... FROM PROGRAM`) | **E1 — `supabase db reset` clean replay.** Static guard proves text-level safety; it does not prove migrations actually replay end-to-end on an empty DB. | Operator runs `pnpm dlx supabase@latest start -x studio,mailpit,imgproxy,storage-api,logflare,vector,supavisor,edge-runtime` then `pnpm dlx supabase@latest db reset` (safe local) **or** `pnpm dlx supabase@latest db reset --linked` against a preview branch only. Never against a non-preview / production `--linked` target. (D6 plan §E1) |
| 2 | Same suite as #1 + `package.json` `db:reset` wrapper hygiene (script remains `node scripts/dev-supabase-reset.js`; `dev:db` keeps `ensure:docker` before reset; no `--db-url` or destructive `psql` reset is exposed) | **No `supabase db lint` enforcement.** Static guards do not run the Postgres advisor / lint catalogue. | `pnpm dlx supabase@latest db lint --schema public` against the locally-started stack **or** `--linked --schema public` against the preview branch from #1. Treat any `level=warning` / `level=error` as evidence to file, not silence (D6 plan §E2). |
| 3 | `__tests__/unit/database/rollback-coverage.test.ts` + `migration-reset-readiness.test.ts` (DOWN-block presence on 9/9 Phase 1 migrations; shape assertions on RPCs and policies) | **E3 — Apply-and-rollback dry-run.** D22 §"Residual / non-static gaps" item 1: DOWN intent is text-asserted only; no DOWN block has been executed against a live PostgreSQL instance. | Per migration row #1–#9 in D22 §"Coverage matrix": apply via reset (E1), execute the `-- DOWN:` block via `pnpm dlx supabase@latest db query` (local) or `--linked` against the preview branch, then re-apply via reset. Stop on migration #5 (`fix_interaction_uniqueness`) before DOWN if there is any production-like data — DOWN restores constraint shape but cannot recover rows deleted by duplicate compaction (D22 §3.5). Stop on migration #9 (`create_admin_role_assignments`) — DOWN must coordinate with the D1 service-role cutover before being run. |
| 4 | `__tests__/unit/database/property-rls-policy-migration.test.ts` + `rls-policy-closure.test.ts` (asserts `Anyone can view active properties` USING clause requires `is_active AND listing_status = 'active'`; asserts `Users can delete their own profile` policy text on `user_profiles`) | Static guards prove **policy SQL text**; they do not prove the policy actually denies a real anon/auth client at runtime. | Operator-run `__tests__/integration/security/rls-boundaries.test.ts` (Vitest) with `NEXT_PUBLIC_SUPABASE_URL` resolving to `127.0.0.1:54200` (local) or the preview-branch URL, plus `NEXT_PUBLIC_SUPABASE_ANON_KEY`, `SUPABASE_SERVICE_ROLE_KEY`, and `TEST_AUTH_TOKEN` populated by the operator in `.env.local`. Never against the remote/production project. (D6 plan §E4) |
| 5 | `__tests__/unit/database/security-definer-search-path-migration.test.ts` (asserts `search_path = pg_catalog, public` on all 13 SECURITY DEFINER functions in migration `20260508001000`) | Static guard proves the migration sets `search_path`; it does not prove the deployed function in a reset DB still has the locked path (e.g. after a manual `ALTER FUNCTION … RESET search_path` or follow-up migration). | E1 reset run + `\df+ <function>` capture for each SECURITY DEFINER function in the migration's list, into `reports/home-match-revival/evidence/d6-rollback-3-search-path-<date>.log`. (D6 plan §E3 row 3 + D22 §3.3) |
| 6 | `__tests__/unit/database/property-stats-rpc-migration.test.ts` + `admin-role-assignments-migration.test.ts` + `interaction-uniqueness-migration.test.ts` + `jsonb-gin-indexes-migration.test.ts` + `schema-safety-migration.test.ts` (per-migration shape: function signatures, GRANTs, table/column shape, CHECK constraint inventory) | Static guards verify migration **text** matches the intended shape. They do not verify the deployed objects exist with that shape after reset, nor that GRANTs survived an idempotent re-apply. | E1 reset + targeted `psql`-equivalent (`\d+ properties`, `\df get_property_stats`, `\df get_realtime_mutual_like_payload`, `\d+ admin_role_assignments`) issued via `pnpm dlx supabase@latest db query` against the local or preview-branch DB. Capture into the matching `d6-rollback-<seq>-<slug>-<date>.log` files (D6 plan §E3 "Output to capture"). |
| 7 | `__tests__/integration/database/schema.test.ts` + `__tests__/integration/database/household-user-count-trigger.spec.ts` (Vitest; behavioural cross-check of schema and trigger contract) | Suites are present in the repo but are **not executed** without an operator-provided local or preview-branch DB; they cannot prove themselves. | **E4 — `pnpm run test:integration`** under `systemd-run --user --scope -p MemoryMax=2G -p CPUQuota=200%` after E1 succeeds and `.env.local` is populated by the operator. Stop if `.env.local` is missing — do not synthesize secrets, fetch from a secret manager, or read another worktree. Stop if `NEXT_PUBLIC_SUPABASE_URL` resolves to a remote project URL. (D6 plan §E4) |
| 8 | `rls-security-audit.md` (1 CRITICAL / 3 HIGH / 4 MEDIUM / 4 LOW snapshot) + per-finding remediation migrations `20260508003500`, `20260508021000`, etc. | Audit is a **document**, not a runtime assertion. Critical/High findings whose remediation migration has not yet been replayed and probed against a live DB remain *evidenced as remediated in code*, not as remediated in a deployed schema. | Combination of E1 (reset proves the remediation migration replays) + E3 row #4 + #6 (DOWN-cycle proves the policy survives rollback/re-apply) + E4 (integration suite proves anon/auth/service clients see the intended deny/allow boundaries). |
| 9 | Phase 0/1 evidence indices: `security-evidence-index-2026-05-08.md`, `p0-p1-blocker-evidence-index-2026-05-08.md`, `phase0-phase1-closure-matrix.md` | Indices reference plans (`d6-db-execution-evidence-plan-…`) whose evidence files (`reports/home-match-revival/evidence/d6-*-<date>.log`) **do not yet exist** on disk. | When E1–E4 run, capture each log to the named `evidence/d6-*-<date>.log` path; then update D6 closure §"Remaining D6 boundary" to point at the captured logs (D6 plan §"Refresh policy"). This index does not need to change unless a new guard or gap is added. |

## Hard stop conditions inherited (do not weaken in any execution slice)

A worker that later executes any row above MUST stop and surface a
blocker if (verbatim from D6 plan §"Hard stop conditions"):

1. Docker is requested by a command and is not already running.
2. A command requires `SUPABASE_SERVICE_ROLE_KEY` or `SUPABASE_DB_PASSWORD`
   and the worker cannot read it from `.env.local` set by the operator.
3. A `--linked` flag would target a non-preview branch.
4. A migration error suggests editing the migration to make it pass.
5. The integration suite would write to a remote project URL.
6. The plan would print or commit a secret, log line, or env value
   containing `SUPABASE_…_KEY`, `SUPABASE_DB_PASSWORD`, or
   `SUPABASE_ACCESS_TOKEN`.

## What this index does NOT do

- Does not change any gate verdict; the canonical
  `phase0-phase1-strict-closure-gate.md` is unchanged.
- Does not authorize live execution of E1–E4; D6 plan stop conditions
  remain in force.
- Does not enumerate every Phase 0/1 evidence doc — only the DB
  live-proof subset. For broader coverage see
  `p0-p1-blocker-evidence-index-2026-05-08.md` and
  `security-evidence-index-2026-05-08.md`.
- Does not ingest secrets, anon keys, service-role keys, refresh
  tokens, or PKCE verifiers; none are present in this report.

## Refresh policy

- When a new Phase 1 DB remediation migration is added, append the
  matching guard / gap / prerequisite row above (mirroring the D22 and
  D6 plan refresh policies).
- When E1 / E2 / E3 / E4 evidence logs land under
  `reports/home-match-revival/evidence/`, replace the prerequisite
  text in rows #1–#7 with the captured log filename + date in addition
  to the prerequisite.
- This index itself runs no commands and ingests no secrets; refreshes
  must preserve those invariants.
