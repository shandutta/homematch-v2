# D6 — DB Execution Evidence Plan (no-secret) — 2026-05-08

**Scope:** Phase 0/1 only. Static guards already closed in
[`d6-db-static-reset-readiness-closure-2026-05-08.md`](./d6-db-static-reset-readiness-closure-2026-05-08.md)
and indexed in
[`d22-migration-rollback-evidence-index-2026-05-08.md`](./d22-migration-rollback-evidence-index-2026-05-08.md).
This packet enumerates the exact **execution-side** evidence still required
to fully close D6, the **safe local vs remote-test** options for capturing
each piece, and the **stop conditions** that prevent an autonomous worker
from straying into Docker, live Supabase mutations, secret printing, or
remote/destructive paths.

## What is NOT in scope here

- Running `supabase db reset`, `supabase db start`, or any Docker container.
- Live remote DB writes, paid APIs, deploy actions, or external dashboard mutations.
- Printing or echoing `SUPABASE_SERVICE_ROLE_KEY`, `SUPABASE_DB_PASSWORD`,
  `SUPABASE_ACCESS_TOKEN`, or any secret material.
- Adding new Phase 2+ behavioral coverage; only Phase 1 DB remediation
  migrations (`20260507…`–`20260508…`) are in scope.

## Evidence still owed to close D6 (E1–E4)

Each item below is **gated** — a separate Shan/operator approval is required
before the matching commands are run. The plan only describes the commands;
this worker does not execute them.

### E1 — `supabase db reset` clean replay

**Why owed:** static guards assert reset-replay-safe statements but do not
prove the migrations actually replay end-to-end on an empty DB.

| Path                                  | Command (operator-run, not by autonomous worker)                                                                                                        | Output to capture                                                                                             |
| ------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------- |
| Safe local (preferred)                | `pnpm dlx supabase@latest start -x studio,mailpit,imgproxy,storage-api,logflare,vector,supavisor,edge-runtime` then `pnpm dlx supabase@latest db reset` | Full stdout/stderr → `reports/home-match-revival/evidence/d6-db-reset-<date>.log` (redacted of any URLs/keys) |
| Remote-test (Supabase preview branch) | `pnpm dlx supabase@latest branches create d6-reset-evidence` then `pnpm dlx supabase@latest db reset --linked` against the **preview branch only**      | Same log, plus `branches list` snapshot before/after                                                          |

**Stop conditions:**

- Stop and surface the log if any migration logs `ERROR`, `permission denied`,
  or non-zero exit. Do not retry with `--db-url`, `psql`, or by editing
  migrations to silence the error.
- Stop if Docker is unavailable on the operator's machine — fall back to
  the preview-branch path; do not install Docker autonomously.
- Stop before running any reset against `--linked` production or any
  non-preview branch.

### E2 — `supabase db lint` clean run

**Why owed:** the static guard suite enforces `-- DOWN:` and reset-replay
hygiene only; it does not enforce the Postgres advisor / lint catalogue.

| Path        | Command (operator-run)                                                                          | Output to capture                                           |
| ----------- | ----------------------------------------------------------------------------------------------- | ----------------------------------------------------------- |
| Safe local  | `pnpm dlx supabase@latest db lint --schema public` against the locally-started stack            | `reports/home-match-revival/evidence/d6-db-lint-<date>.log` |
| Remote-test | `pnpm dlx supabase@latest db lint --linked --schema public` against the **preview branch only** | Same log                                                    |

**Stop conditions:**

- Treat any `level=warning` or `level=error` as evidence to file, not to
  silence — suppressing a lint warning is a Phase 2 follow-up, not part
  of D6 closure.
- Do not run lint against production. The `--linked` form must target a
  preview branch created for E1.

### E3 — Apply-and-rollback dry-run for each Phase 1 DOWN block

**Why owed:** D22 §"Residual / non-static gaps" item 1 — DOWN intent is
text-asserted only. Each of the 9 Phase 1 DB remediation migrations needs
a verified UP→DOWN→UP cycle.

For each migration in
[`d22-migration-rollback-evidence-index-2026-05-08.md`](./d22-migration-rollback-evidence-index-2026-05-08.md)
§"Coverage matrix" rows 1–9, the operator runs (against the same local or
preview-branch DB used for E1):

1. Apply migration via `supabase db reset` (E1 already covers this).
2. Extract the `-- DOWN:` block from the migration file and execute it via
   `pnpm dlx supabase@latest db query` (local) or `--linked` against the
   preview branch.
3. Re-apply by replaying the UP via `supabase db reset` again.

**Output to capture:** one log per migration, named
`reports/home-match-revival/evidence/d6-rollback-<seq>-<slug>-<date>.log`,
recording the schema diff before and after each DOWN (e.g. `\d+ properties`
for #1, `\df get_property_stats` for #2).

**Stop conditions:**

- Stop on **migration #5** (`fix_interaction_uniqueness`) before running DOWN
  if there is any production-like data — the DOWN restores constraint shape
  but **cannot** recover rows deleted by duplicate compaction (D22 §3.5,
  D22 residual gap #2). Use a freshly-reset DB only.
- Stop on **migration #9** (`create_admin_role_assignments`) — its DOWN must
  coordinate with the D1 service-role cutover
  ([`d1-service-role-rbac-authority-implementation-packet-2026-05-08.md`](./d1-service-role-rbac-authority-implementation-packet-2026-05-08.md));
  do not roll it back without an explicit operator decision recorded in
  the log.

### E4 — Integration evidence: Vitest DB suite green against the reset stack

**Why owed:** the unit suite (Jest) is text-static; the Vitest integration
suite (`pnpm run test:integration`, 36/36 passing per CLAUDE.md) is the
behavioural cross-check that the reset stack actually satisfies the
remediation migrations' contract (RLS, RPC signatures, CHECK constraints).

**Path:** after E1 succeeds and the local/preview-branch DB is reachable
via the standard `NEXT_PUBLIC_SUPABASE_URL` / `NEXT_PUBLIC_SUPABASE_ANON_KEY`
/ `SUPABASE_SERVICE_ROLE_KEY` env vars in `.env.local`:

```
systemd-run --user --scope -p MemoryMax=2G -p CPUQuota=200% \
  pnpm run test:integration
```

**Output to capture:** Vitest summary line + any failing-test diffs into
`reports/home-match-revival/evidence/d6-integration-<date>.log`. Do not
copy `.env.local` contents into the log.

**Stop conditions:**

- Stop if `.env.local` is missing — do **not** synthesize secrets, fetch
  them from a secret manager, or read them from another worktree. Surface
  the missing-env condition as the blocker.
- Stop if the integration suite hits the **remote** project URL — confirm
  `NEXT_PUBLIC_SUPABASE_URL` resolves to `127.0.0.1:54200` (local) or the
  preview-branch URL before running.
- Stop on any suite-level timeout > 60s; record the slow test rather than
  raising the timeout.

## Safe local vs remote-test decision matrix

| Constraint                                                       | Safe local   | Remote-test (preview branch)                               |
| ---------------------------------------------------------------- | ------------ | ---------------------------------------------------------- |
| Docker available on operator host                                | ✅ preferred | optional                                                   |
| Docker unavailable / Windows-without-WSL2                        | ❌           | ✅                                                         |
| Operator wants zero remote footprint                             | ✅           | ❌ (creates a preview branch)                              |
| Need to share evidence with reviewers without sharing local logs | ❌           | ✅ (preview-branch URL is shareable, secrets are not)      |
| Risk of mutating production                                      | none         | none, **iff** `--linked` always targets the preview branch |

Both paths satisfy the D6 closure criterion; pick whichever the operator
can run without secret leakage.

## Hard stop conditions for any autonomous worker on this packet

A worker tasked with executing E1–E4 (not this packet) MUST stop and
surface a blocker in its log if **any** of the following holds:

1. Docker is requested by a command and is not already running.
2. A command requires `SUPABASE_SERVICE_ROLE_KEY` or `SUPABASE_DB_PASSWORD`
   and the worker cannot read it from `.env.local` set by the operator.
3. A `--linked` flag would target a non-preview branch.
4. A migration error suggests editing the migration to make it pass.
5. The integration suite would write to a remote project URL.
6. The plan would print or commit a secret, log line, or env value
   containing `SUPABASE_…_KEY`, `SUPABASE_DB_PASSWORD`, or
   `SUPABASE_ACCESS_TOKEN`.

In any of these cases the worker writes a one-paragraph blocker into its
report under `reports/home-match-revival/` and exits cleanly.

## Refresh policy

- Update §E1–E4 if a new Phase 1 migration is added (mirror the D22 refresh
  policy).
- Once E1 evidence lands, replace the table cells with the actual log
  filename and date and update
  [`d6-db-static-reset-readiness-closure-2026-05-08.md`](./d6-db-static-reset-readiness-closure-2026-05-08.md)
  §"Remaining D6 boundary" to point at the captured logs.
- This packet itself is static; it does not run any of the commands it
  describes.
