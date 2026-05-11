# P6 Merge Readiness Report — autonomy/6h-business-hardening

Generated: 2026-05-09 (worktree `fix-t23e8fcaa`).
Task: `t_aeba612c` — Phase 0/1 merge gate review.
Integration HEAD: `75432f7` (`docs: add P2 production-safe UX/browser acceptance pass (t_d258ca31)`).
Base: `main` at `de497a3`.
Scope: 328 non-merge commits, 585 files, +48,477 / −8,837.

## Executive summary

**Verdict: CONDITIONAL-GO.**

- Repo-side Phase 0/1 hardening is broad, evidenced, and traceable to commit
  SHAs that exist on `autonomy/6h-business-hardening` (verified below).
- All 23 hardening categories from
  `p0-p1-launch-readiness-evidence-index-2026-05-08.md` are repo-closed; 26/26
  spot-checked anchor commits resolve on the integration branch.
- Closure-grade execution evidence (durable rate-limiter provisioning,
  production Supabase auth/CAPTCHA confirmation, `supabase db reset` /
  RLS / integration execution, full authenticated traversal matrix) remains
  owner- or environment-gated. These are tracked in the D2/D3/D6 decision
  register and do **not** block a `main` merge of the repo-side hardening; they
  block production launch.
- Branch hygiene is the largest residual risk: ~80 stale `autonomy/d*` scout
  branches (each 1 commit ahead of integration) appear to be already-merged
  scout reports kept as historical pointers, not unmerged work. They should be
  audited and pruned post-merge but do not block the merge itself.

Recommend: merge `autonomy/6h-business-hardening` → `main` after the pre-merge
checklist below; treat D2/D3/D6 as launch gates separate from the merge gate.

## Task-by-task evidence (Phase 0/1 hardening categories)

Cross-references the 23 categories in
`reports/home-match-revival/p0-p1-launch-readiness-evidence-index-2026-05-08.md`
and the closure rollups in
`reports/home-match-revival/phase0-phase1-closure-matrix.md`. All 26
representative commits referenced below were resolved against the integration
branch via `git log -1 --pretty=format:'%s' <sha>`.

| #   | Category                                                    | Anchor commit                                                                                           | Resolves? | Status                                              |
| --- | ----------------------------------------------------------- | ------------------------------------------------------------------------------------------------------- | --------- | --------------------------------------------------- |
| 1   | API auth boundary + service-role narrow helpers             | `1ef1bae` `fix: standardize api auth boundary`                                                          | yes       | repo-closed                                         |
| 2   | Service-role RBAC authority (D1)                            | `e7af71e` admin_role_assignments authority                                                              | yes       | repo-closed; live DB gated under D6                 |
| 3   | Durable rate limiter seam (D2)                              | `5c428b9` durable rate limiter approval gate                                                            | yes       | repo-closed; provisioning approval-gated            |
| 4   | Signup verification policy (D3)                             | `a24760d` launch-policy guard                                                                           | yes       | repo-closed; production Supabase config gated       |
| 5   | `.env.prod` handling + Supabase env guard (D4)              | `52697b1` env guard local-dev                                                                           | yes       | repo-closed                                         |
| 6   | Numeric constraint semantics (D5)                           | `018b5ba` numeric constraint decision                                                                   | yes       | repo-closed                                         |
| 7   | DB migration reset/rollback static readiness (D6)           | `1a55e73` DB reset readiness guards                                                                     | yes       | repo-closed; live reset gated                       |
| 8   | Disputed-route profile exposure (D7)                        | `7a24b38` limit disputed route profile exposure                                                         | yes       | repo-closed                                         |
| 9   | Schema safety + RLS hardening                               | `b67826c` schema safety constraints                                                                     | yes       | repo-closed; live RLS gated under D6                |
| 10  | Anonymous protected-route redirect (P0/P1)                  | `05ebfbe` no-auth traversal smoke guard, `92a6c35` middleware exposure, `a57ed3e` redirect preservation | yes       | repo-closed + live-evidenced (partial)              |
| 11  | No-credential live probe harness                            | `736f604` no-auth live probe harness                                                                    | yes       | repo-closed; local execution slice pending          |
| 12  | Authenticated traversal + remote Supabase seed              | `7c513d7` local auth lifecycle smoke gates                                                              | yes       | repo-closed + live-evidenced (partial)              |
| 13  | Public no-credential accessibility coverage                 | `4e93347` accessibility core-flow matrix guard                                                          | yes       | repo-closed                                         |
| 14  | Internal/demo surface gating                                | `3e5f510` gate remaining internal demo surfaces                                                         | yes       | repo-closed (default 404 in prod)                   |
| 15  | Public route metadata + SEO inventory                       | `be73555` route metadata coverage                                                                       | yes       | repo-closed                                         |
| 16  | Public performance metrics ingest hardening                 | `ca46903` standardize perf metrics payload error                                                        | yes       | repo-closed                                         |
| 17  | API error standardization + 429 reconciliation (M6/M10)     | `02d5bb0` reconcile M6 429 standardization guard                                                        | yes       | repo-closed                                         |
| 18  | External fetch timeout + middleware AbortController (M7/M8) | `cee25c5` close api external fetch timeout coverage                                                     | yes       | repo-closed                                         |
| 19  | Middleware fast paths + route deadline helper               | `9ab96ed` skip middleware auth for API routes                                                           | yes       | repo-closed                                         |
| 20  | Supabase factory + cookie hardening + refresh recovery      | `fc6069d` consolidate duplicate Supabase factory                                                        | yes       | repo-closed                                         |
| 21  | Maps + paid-provider auth hardening                         | `3fc00eb` use anon client for metro boundaries                                                          | yes       | repo-closed; positive paid execution gated          |
| 22  | Cron-secret admin/ingest endpoints opacity                  | `2abb027` reconcile phase0 live probe closure evidence                                                  | yes       | repo-closed; positive execution paid/external-gated |
| 23  | Test-suite taxonomy + worker lane discipline                | `6fbdc46` test suite taxonomy report; `528c769` blocker reconciliation                                  | yes       | repo-closed (documentation-only)                    |

All 26 spot-checked SHAs (rows above + follow-on SHAs `e7af71e 5c428b9 a24760d
52697b1 018b5ba 1a55e73 7a24b38 b67826c 05ebfbe 736f604 7c513d7 4e93347
3e5f510 be73555 ca46903 02d5bb0 cee25c5 9ab96ed fc6069d 3fc00eb 2abb027
6fbdc46 92a6c35 a57ed3e 528c769 1ef1bae`) resolve on
`autonomy/6h-business-hardening` to the subjects recorded in
`p0-p1-launch-readiness-evidence-index-2026-05-08.md`. Zero hash drift.

## Gaps and concerns

- **D2 durable rate limiter** — only the in-memory provider is executable;
  production launch needs a provisioned Redis/Upstash/KV adapter. Repo-side
  approval gate is in place and tested. Not a merge blocker; is a launch
  blocker.
- **D3 signup verification config** — repo-side launch policy file
  (`config/signup-verification-launch-policy.json`) and invariant guards exist;
  external Supabase project settings (email confirmation + CAPTCHA) must be
  verified by ops before launch.
- **D6 DB execution evidence** — `supabase db reset`, RLS execution, rollback
  replay, and integration-test execution still require an approved local
  Supabase/Docker or safeguarded remote-test path.
- **Authenticated browser/API traversal matrix** — partial live evidence
  exists (4 protected pages + API auth smoke against approved remote-seeded
  Supabase, `reports/home-match-revival/remote-supabase-test-seed-and-auth-probe-2026-05-08.md`).
  Full positive matrix gated.
- **Phase 2+ work in branch** — recent commits (`75432f7`, `6c6728b`,
  `30dd9b4`, `ff4261a`, `84f0835`) include P2 docs/specs and couples UI
  polish that exceed the strict P0/P1 scope. They are low-risk additive doc/UX
  changes but reviewers should confirm they were intended for this merge.
- **Stale local stash markers** — git log shows numerous `WIP on … / index on
…` entries from prior worker stashes; these are not commits on the
  integration ref but appear in `git log --all`. Confirm `git stash list` is
  empty before merging.

## Branch status summary

- Integration branch: `autonomy/6h-business-hardening` at `75432f7`,
  328 non-merge commits ahead of `main` (`de497a3`), 585 files changed.
- Active session worktree branches (per `git branch`): `autonomy/a11y`,
  `autonomy/a11y-fix`, `autonomy/api-scan`, `autonomy/bundle-audit`,
  `autonomy/component-scan`, `autonomy/config-scan`, `autonomy/design-tokens`,
  `autonomy/fix-broken-tokens`, `autonomy/fix-bundle-optimize`,
  `autonomy/fix-font-typography`, `autonomy/fix-framer-lazy`,
  `autonomy/fix-hex-hardcode`, `autonomy/fix-n1-batch`,
  `autonomy/fix-pagination`, `autonomy/fix-select-star`. These are the
  current-day worker fixups. Verify each has either been folded into
  integration or is intentionally parked before pruning.
- Stale scout branches: ~80 `autonomy/d63-…/d135-…` 2026-05-08 scout
  branches each carry 1 commit ahead of integration. Spot-checked content
  matches reports already on the integration branch (i.e. they are scout
  drafts whose final form was committed via integration). Audit + prune
  post-merge; treat as historical pointers, not unmerged work.
- No remote tracking refs were inspected in this worktree; assume
  `origin/main` matches local `main` for the purposes of this review.

## Merge conflict risk assessment

- **Low** for `main`-direction merge. `main` has only `ff4261a`,
  `84f0835`, `6c6728b`, `30dd9b4`, `75432f7` as recent integration tip
  context; the integration branch is a strict superset for the categories
  reviewed. Run a dry-run merge before pushing.
- **Medium** if outside contributors landed on `main` after `de497a3` —
  hot files most likely to conflict: `src/middleware.ts`,
  `src/lib/supabase/server.ts`, `src/lib/middleware/rateLimiter.ts`,
  `src/types/app-database.ts`, and the 2026-05-07/08 Supabase migrations.
- **Migration ordering** — confirm timestamp ordering is monotonic when
  combined with anything new on `main`; otherwise rename incoming migrations.
  Untracked `supabase/migrations/20260509000000_add_user_type_created_composite_indexes.sql`
  in the original primary worktree should be either committed or removed
  before merge.

## Recommended merge sequence

1. Confirm `main` is at `de497a3` and the only diff vs integration is the
   intended P0/P1 + light P2 additive set.
2. Rebase or merge `autonomy/6h-business-hardening` onto current `main` in a
   throwaway branch and resolve any migration-ordering or hot-file conflicts.
3. Run the pre-merge checklist below on the rebased/merged branch.
4. Open a single PR `autonomy/6h-business-hardening → main`. Do **not** ship
   in slices — the changes are interdependent (RBAC ↔ admin_role_assignments
   migration, factory consolidation ↔ middleware fast path, error
   standardization ↔ 429 reconciliation).
5. Post-merge, archive or delete the ~80 stale `autonomy/d*` scout branches
   and current-day worker fixups that are confirmed folded in.
6. Treat D2/D3/D6 closure as a separate launch-gate PR/configuration set,
   not part of this merge.

## Pre-merge checklist

- [ ] `git status` clean in the merge worktree; no untracked migrations.
- [ ] `pnpm install --frozen-lockfile` passes.
- [ ] `SKIP_SUPABASE_GUARD=true pnpm type-check` passes.
- [ ] `pnpm run lint` passes.
- [ ] `systemd-run --user --scope -p MemoryMax=2G -p CPUQuota=200% pnpm exec jest --runInBand` Lane-A guards green
      (per `test-suite-taxonomy-2026-05-08.md`).
- [ ] `pnpm test:no-auth-live-probes` exits 0 (skip OK when no local server).
- [ ] No `.env.prod` or service-role secrets staged; `config/supabase-production-hosts.json`
      contains hostnames only.
- [ ] Migration filenames are timestamp-monotonic vs `main`.
- [ ] `git stash list` empty (or contents intentionally preserved).
- [ ] Owner sign-off on inclusion of P2 docs/UX commits (`t_d258ca31`,
      `t_eab22374`, `t_fd311981`, MutualLikesBadge polish).

## Post-merge validation

- [ ] On `main` HEAD: rerun `pnpm type-check`, `pnpm run lint`, Lane-A Jest
      sweep.
- [ ] Re-run anonymous redirect live probe matrix (rows 10–11) against the
      merged HEAD and capture HTTP/1.1 307 + Location for `/dashboard`,
      `/couples`, `/dashboard?tab=liked`, `/profile`, `/settings`,
      `/household/create`, `/household/join`, `/properties/[id]`.
- [ ] Re-run authenticated traversal smoke (row 12) against approved
      remote-seeded Supabase to confirm `/dashboard`, `/couples`, `/settings`,
      `/profile` still pass.
- [ ] Confirm production Supabase signup verification + CAPTCHA settings
      against `config/signup-verification-launch-policy.json` (D3).
- [ ] D6 environment: schedule the approved `supabase db reset` / RLS /
      rollback / integration execution slice.
- [ ] D2: schedule durable rate-limiter provider provisioning before any
      production traffic.
- [ ] Prune confirmed-merged `autonomy/d*` scout branches and folded worker
      fixups.

## Source artifacts

- `reports/home-match-revival/phase0-phase1-closure-matrix.md`
- `reports/home-match-revival/p0-p1-launch-readiness-evidence-index-2026-05-08.md`
- `reports/home-match-revival/p0-p1-blocker-evidence-index-2026-05-08.md`
- `reports/home-match-revival/p0-p1-blocker-reconciliation-2026-05-08.md`
- `reports/home-match-revival/p1-decision-needed-register-2026-05-08.md`
- `reports/home-match-revival/test-suite-taxonomy-2026-05-08.md`
- `reports/home-match-revival/worker-merge-risk-inventory-2026-05-08.md`
- `reports/home-match-revival/phase0-phase1-final-gate-decision-2026-05-09.md`
- `reports/home-match-revival/p0-p1-gatekeeper-checklist-2026-05-08.md`

This document is a merge-gate review only. It does not authorize Phase 2+
implementation, deploys, paid APIs, production dashboards, browser swarms,
secret printing, or external mutations.
