# D124 Integration Queue Priority, 2026-05-08

Generated: 2026-05-08T20:30:00Z
Scope: strict Phase 0/1 control-plane slice. This is a read-only inventory built from `git` metadata only. It does not authorize merges, cherry-picks, deploys, secret reads, paid APIs, dashboard mutations, or Phase 2+ work. No branch was checked out, merged, rebased, or pushed to produce this artifact.

## Method

- Base: `HEAD` of `autonomy/hm-d124-integration-queue-priority-2026` at `2170964 test: index security evidence and service role boundaries`.
- Universe: every local `refs/heads/autonomy/*` branch (147 total).
- For each branch with `git rev-list --count HEAD..<branch> > 0`, captured tip subject, committer date, total `git diff --stat` shape, and the set of files that the branch _adds_ (`git diff --diff-filter=A --name-only`).
- "Adds" matters: when a branch's tip predates HEAD, a naive cherry-pick of the tip can _revert_ files that HEAD has since updated. Salvaging only the unique adds avoids that regression.
- Sibling branches that point exactly at HEAD (already integrated) are excluded. Branches with `--diff-filter=A` empty AND a diff dominated by deletions of files HEAD now contains are flagged as superseded.

47 branches are ahead of HEAD. They split as follows: **17 safe pure-add picks (Tier 1)**, **2 single-file index updates needing review (Tier 2)**, **5 partial-salvage branches whose only unique value is one file each (Tier 3)**, **23 superseded branches that must NOT be cherry-picked whole (Tier S)**.

## Tier 1 — Safe pure-add cherry-picks

Each of these touches exactly one file, and the file is a _new_ path that does not exist on HEAD. Cherry-picking the tip commit cannot conflict, cannot revert HEAD work, and adds a single evidence artifact. Recommended order is by topical proximity (auth/session, then envelope/rate-limit, then closure indices), not by date.

| #   | Branch                                                     | Tip       | Adds (single file)                                                                     | Lane                  |
| --- | ---------------------------------------------------------- | --------- | -------------------------------------------------------------------------------------- | --------------------- |
| 1   | `autonomy/d108-cookie-session-evidence-2019`               | `92a17a8` | `reports/home-match-revival/d108-cookie-session-evidence-note-2026-05-08.md`           | Auth/session          |
| 2   | `autonomy/d109-probe-safety-evidence-2019`                 | `5e89e09` | `reports/home-match-revival/probe-safety-dry-run-and-redaction-evidence-2026-05-08.md` | Probe safety          |
| 3   | `autonomy/d106-route-boundary-evidence-2019`               | `205c052` | `reports/home-match-revival/route-boundary-evidence-2026-05-08.md`                     | Route boundary        |
| 4   | `autonomy/d105-error-envelope-evidence-2019`               | `ed1983a` | `reports/home-match-revival/api-error-envelope-evidence-2026-05-08.md`                 | Error envelope        |
| 5   | `autonomy/d104-timeout-policy-evidence-2019`               | `1551dea` | `reports/home-match-revival/p1-timeout-deadline-policy-evidence-2026-05-08.md`         | Timeouts              |
| 6   | `autonomy/d107-rate-limit-evidence-2019`                   | `26e5abe` | `reports/home-match-revival/d107-rate-limit-helper-adoption-evidence-2026-05-08.md`    | Rate limit            |
| 7   | `autonomy/d103-query-dedupe-smoke-doc-2019`                | `d014783` | `reports/home-match-revival/d103-query-dedupe-smoke-evidence-2026-05-08.md`            | Query dedupe          |
| 8   | `autonomy/d87-query-key-dedupe-index-2013`                 | `f40ed7f` | `__tests__/unit/data/couples-query-key-dedupe.test.ts`                                 | Query dedupe (test)   |
| 9   | `autonomy/d99-supabase-inactive-health-doc-2017`           | `cb1d2ec` | `reports/home-match-revival/d99-supabase-inactive-health-evidence-index-2026-05-08.md` | DB readiness          |
| 10  | `autonomy/hm-d118-db-execution-evidence-plan-2025`         | `34675e6` | `reports/home-match-revival/d6-db-execution-evidence-plan-2026-05-08.md`               | DB execution evidence |
| 11  | `autonomy/hm-d121-signup-verification-prod-checklist-2025` | `116b790` | `reports/home-match-revival/d121-signup-verification-prod-checklist-2026-05-08.md`     | Signup verification   |
| 12  | `autonomy/d113-test-guard-index-2022`                      | `63a78d5` | `reports/home-match-revival/p0-p1-test-guard-index-2026-05-08.md`                      | Test guard index      |
| 13  | `autonomy/d110-launch-gate-evidence-2019`                  | `a6d0f65` | `reports/home-match-revival/p0-p1-launch-gate-evidence-2026-05-08.md`                  | Launch gate           |
| 14  | `autonomy/d117-gatekeeper-checklist-2022`                  | `16f268d` | `reports/home-match-revival/p0-p1-gatekeeper-checklist-2026-05-08.md`                  | Gatekeeper checklist  |
| 15  | `autonomy/d116-merge-risk-inventory-2022`                  | `0569816` | `reports/home-match-revival/worker-merge-risk-inventory-2026-05-08.md`                 | Merge risk            |
| 16  | `autonomy/d115-dev-domain-blocker-log-2022`                | `3414a06` | `reports/home-match-revival/dev-domain-blocker-log-2026-05-08.md`                      | Blocker log (dev)     |
| 17  | `autonomy/d114-prod-health-blocker-log-2022`               | `a02e17c` | `reports/home-match-revival/prod-health-blocker-log-2026-05-08.md`                     | Blocker log (prod)    |

## Tier 2 — Single-file index update; review for conflict before pick

These each modify a _single_ existing index/matrix file. HEAD has touched neither file (for d111) or the same file (for d112). Tier 2 pickers must `git diff <branch>~1..<branch>` against HEAD before cherry-pick, accept either textual merge conflict, and re-run `pnpm run test:unit` for any test that consumes those indexes.

| #   | Branch                                          | Tip       | File                                                               | Shape                  | Conflict risk                                                                           |
| --- | ----------------------------------------------- | --------- | ------------------------------------------------------------------ | ---------------------- | --------------------------------------------------------------------------------------- |
| 18  | `autonomy/d111-phase-closure-matrix-audit-2022` | `be38a27` | `reports/home-match-revival/phase0-phase1-closure-matrix.md`       | +29 lines, 0 deletions | Low. HEAD has not touched this file in the d124 series.                                 |
| 19  | `autonomy/d112-security-index-crosslinks-2022`  | `15224f7` | `reports/home-match-revival/security-evidence-index-2026-05-08.md` | +45 / −22              | Medium. HEAD `2170964` and earlier `08459c7` both edit this file; expect a 3-way merge. |

## Tier 3 — Partial salvage only; do NOT cherry-pick the whole tip

These branches predate the HEAD convergence and their tips therefore _delete_ test files and reports that HEAD now owns. The only non-revert content is one new file per branch. Salvage with `git checkout <branch> -- <single path>` followed by a fresh focused commit; never `cherry-pick` the tip.

| #   | Branch                                         | Tip       | Salvage path (only)                                                                         |
| --- | ---------------------------------------------- | --------- | ------------------------------------------------------------------------------------------- |
| 20  | `autonomy/hm-test-command-taxonomy-guard-1744` | `8e30369` | `reports/home-match-revival/test-command-taxonomy-2026-05-08.md`                            |
| 21  | `autonomy/hm-protected-page-redirect-doc-1746` | `6caaf23` | `reports/home-match-revival/p0-protected-page-redirect-static-proxy-evidence-2026-05-08.md` |
| 22  | `autonomy/hm-fixture-seed-user-doc-1746`       | `82bd66e` | `reports/home-match-revival/d53-disposable-seed-user-authority-2026-05-08.md`               |
| 23  | `autonomy/hm-robots-sitemap-policy-1742`       | `2bb63ed` | `__tests__/unit/app/seo-route-policy-surface-guard.test.ts`                                 |
| 24  | `autonomy/hm-next15-proxy-guard-1738`          | `e6f8769` | `__tests__/unit/routing/next15-middleware-proxy-guard.test.ts`                              |

## Tier S — Superseded; do NOT cherry-pick (whole or partial)

For each of these the `--diff-filter=A` set against HEAD is empty _and_ the diff is dominated by deletions of files HEAD now owns (typical shape: hundreds of lines removed across `__tests__/unit/api/route-rate-limit-adoption-scan.test.ts`, `__tests__/unit/app/public-demo-listing-fixture-boundary.test.ts`, `__tests__/unit/docs/security-evidence-index-freshness.test.ts`, `__tests__/unit/lib/supabase/service-role-capability-boundary.test.ts`, `reports/home-match-revival/d79-cookie-session-security-index-2026-05-08.md`, `reports/home-match-revival/security-evidence-index-2026-05-08.md`, `reports/home-match-revival/admin-tooling-gap-index-2026-05-08.md`). Cherry-picking these would revert HEAD's converged work. Their contents are already represented on HEAD via later commits `08459c7`, `ffdbf0e`, `260c6fa`, and `2170964`. After Tier 1–3 land, these branches should be deleted, not merged.

Also-superseded branches that are close-name duplicates of newer, already-integrated work:

- `autonomy/d75-cookie-session-security-index-1943` — superseded by HEAD `08459c7 docs: index cookie/session security helpers and live-auth gates`.
- `autonomy/hm-cookie-session-security-index-1948` — same logical task; tip pre-dates HEAD's converged version of that report.
- `autonomy/hm-public-demo-data-boundary-guard-1948` — superseded by HEAD `ffdbf0e test: guard public/demo listing fixture field + source boundary`.
- `autonomy/hm-api-rate-limit-adoption-scan-1948` — superseded by HEAD `260c6fa test: scan rate-limit helper adoption across mutation API routes`.

Full Tier S list (23):

`autonomy/d75-cookie-session-security-index-1943`, `autonomy/hm-public-demo-data-boundary-guard-1948`, `autonomy/hm-api-rate-limit-adoption-scan-1948`, `autonomy/hm-cookie-session-security-index-1948`, `autonomy/hm-storage-upload-policy-guard-1748`, `autonomy/hm-property-card-trust-copy-1748`, `autonomy/hm-csp-policy-inventory-1748`, `autonomy/hm-admin-tooling-gap-index-1748`, `autonomy/hm-accessibility-route-taxonomy-1748`, `autonomy/hm-ratelimit-local-provider-doc-1748`, `autonomy/hm-api-timeout-policy-guard-1744`, `autonomy/hm-env-example-doc-guard-1744`, `autonomy/hm-middleware-proxy-regression-1744`, `autonomy/hm-error-envelope-route-family-1744`, `autonomy/hm-security-header-policy-guard-1744`, `autonomy/hm-decision-register-freshness-1742`, `autonomy/hm-dashboard-data-dedupe-guard-1742`, `autonomy/hm-public-route-metadata-guard-1742`, `autonomy/hm-env-secret-redaction-guard-1742`, `autonomy/hm-test-suite-taxonomy-1739`, `autonomy/hm-supabase-proxy-loopback-1739`, `autonomy/hm-migration-rollback-index-1739`, `autonomy/hm-report-evidence-index-1738`.

## Likely duplicate clusters (sanity check before deleting Tier S)

Worker re-runs produced near-identical task names across timestamps. Each cluster's newest converged content is on HEAD; older sibling tips can be removed once the integrator confirms.

- Cookie/session evidence: `d75-cookie-session-security-index-1943` ↔ `hm-cookie-session-security-index-1948` ↔ HEAD `08459c7`. HEAD wins.
- Public/demo fixture boundary: `d76-public-demo-data-boundary-guard-1752` (== HEAD), `d76-public-demo-data-boundary-guard-1943` (== HEAD), `hm-public-demo-data-boundary-guard-1948` (Tier S). HEAD wins via `ffdbf0e`.
- Rate-limit adoption scan: `d77-api-rate-limit-adoption-scan-1752` (== HEAD), `d77-api-rate-limit-adoption-scan-1943` (== HEAD), `hm-api-rate-limit-adoption-scan-1948` (Tier S). HEAD wins via `260c6fa`.
- Service-role / security-index: `d78-security-report-index-freshness-1752` (== HEAD), `d78-security-report-index-freshness-1943` (== HEAD), `hm-security-index-freshness-2000` (== HEAD), `hm-service-role-boundary-2000` (== HEAD). HEAD wins via `2170964`. Tier 2 entry `d112` is the only legitimate add-on to that index.
- D86–D97 paired suffixes (`-2013` / `-2016`): every pair already points at HEAD (`2170964`); both members are integrated. No action.

## Safe review order (low-risk-first)

1. Land Tier 1 entries 1–17 in the listed order. Each is an isolated `cherry-pick` that adds one file and cannot conflict.
2. Land Tier 2 entry 18 (`d111-phase-closure-matrix-audit-2022`) — single-file matrix update, low conflict risk.
3. Land Tier 2 entry 19 (`d112-security-index-crosslinks-2022`) — manual 3-way merge against HEAD's `security-evidence-index-2026-05-08.md`.
4. Land Tier 3 entries 20–24 via `git checkout <branch> -- <single path>` + fresh commit per file. Do not run a full `cherry-pick` for any of them.
5. Re-run `pnpm run check` and `pnpm run test:unit` only after Tier 3 lands (Tier 1–2 are doc-only or single-test additions and pass on their own).
6. Delete Tier S branches once integrators have confirmed the duplicate-cluster table above. Deletions are out of scope for this artifact.

## Out of scope

- Phase 2+ work (no implementation, refactor, schema, or service changes).
- Real cherry-picks, merges, rebases, branch deletions, force-pushes, or remote pushes.
- Dependency installs, Docker resets, browser swarms, paid API calls, deploys, secret reads, dashboard writes.
- Reordering by speculative business value: order is conflict-risk only.
- Any cross-branch test execution; this is a queue, not a CI gate.

## References

- `reports/home-match-revival/phase0-phase1-closure-matrix.md` — canonical P0/P1 closure ledger that Tier 1–2 evidence feeds.
- `reports/home-match-revival/p0-p1-blocker-evidence-index-2026-05-08.md` — current blocker → evidence map; Tier 1 entries should be cross-linked here once landed.
- `reports/home-match-revival/security-evidence-index-2026-05-08.md` — index that Tier 2 entry 19 augments.
- `reports/home-match-revival/p0-p1-remaining-blocker-taxonomy-2026-05-08.md` — guidance on which lanes are repo-closeable vs. approval-gated; queue order respects that gating.
