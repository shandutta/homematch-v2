# Worker Branch Merge-Risk Inventory — 2026-05-08

**Reference HEAD:** `2170964` (autonomy/d116-merge-risk-inventory-2022, base branch)
**Base:** `main`
**Total `autonomy/*` branches:** 138 (excluding this branch: 137)

## Snapshot

| Bucket                             | Count | Description                                                                 |
| ---------------------------------- | ----: | --------------------------------------------------------------------------- |
| Stale (tip already in HEAD)        |    98 | Safe to retire — work already integrated                                    |
| Active w/ unique commits           |    39 | Hold real work to land                                                      |
| Active w/ textual conflict vs HEAD |     1 | Needs reconciliation before merge                                           |
| Active w/ HEAD-superseded files    |    10 | Review for staleness; may need rebase, not conflict                         |
| Active w/ pairwise file overlap    |     2 | Both touch `__tests__/unit/middleware.test.ts`; additive — auto-merge clean |

## Conflict zones

### Real textual conflict (1)

| Branch                                   | File                                                                    | Type    |
| ---------------------------------------- | ----------------------------------------------------------------------- | ------- |
| `autonomy/hm-report-evidence-index-1738` | `reports/home-match-revival/p0-p1-blocker-evidence-index-2026-05-08.md` | add/add |

HEAD (commit `528c769`) added the same artifact path with different content. **Action:** drop branch (HEAD already has the file), or rebase + diff to confirm new evidence is captured.

### Pairwise additive overlap (1 file, 2 branches)

`__tests__/unit/middleware.test.ts` is touched by:

- `autonomy/hm-middleware-proxy-regression-1744` (+69 lines)
- `autonomy/hm-security-header-policy-guard-1744` (+101 lines)

Both append to the file (different test blocks). `git merge-tree` between the pair returns `rc=0` — auto-merges. **Action:** land in either order; no manual reconciliation expected.

### HEAD-superseded files (10 branches re-touch files HEAD already updated)

These all auto-merge clean today, but their evidence content may already be on HEAD via a sibling worker. Spot-check before landing.

| Branch                                    | File overlapping HEAD-recent                                                                                                                       |
| ----------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------- |
| `hm-accessibility-route-taxonomy-1748`    | `reports/home-match-revival/no-credential-accessibility-route-taxonomy-2026-05-08.md`                                                              |
| `hm-admin-tooling-gap-index-1748`         | `reports/home-match-revival/admin-tooling-gap-index-2026-05-08.md`                                                                                 |
| `hm-api-rate-limit-adoption-scan-1948`    | `__tests__/unit/api/route-rate-limit-adoption-scan.test.ts`                                                                                        |
| `hm-cookie-session-security-index-1948`   | `reports/home-match-revival/d79-cookie-session-security-index-2026-05-08.md`                                                                       |
| `hm-csp-policy-inventory-1748`            | `reports/home-match-revival/p0-p1-csp-and-external-origin-policy-inventory-2026-05-08.md`                                                          |
| `hm-env-example-doc-guard-1744`           | `__tests__/unit/docs/env-example-guard.test.ts`                                                                                                    |
| `hm-property-card-trust-copy-1748`        | `reports/home-match-revival/p1-property-card-trust-copy-audit-2026-05-08.md`                                                                       |
| `hm-public-demo-data-boundary-guard-1948` | `reports/home-match-revival/public-demo-listing-fixture-boundary-2026-05-08.md`, `__tests__/unit/app/public-demo-listing-fixture-boundary.test.ts` |
| `hm-report-evidence-index-1738`           | (true conflict — see above)                                                                                                                        |
| `hm-storage-upload-policy-guard-1748`     | `__tests__/unit/app/storage-upload-policy-guard.test.ts`                                                                                           |

## Active branches (39) — recommended integration order

Order chosen by: (a) source-touching branches before docs-only, (b) isolated-file branches before pairs, (c) HEAD-superseded branches last (lowest priority, may be redundant).

### Wave 1 — source/test edits, isolated files (15)

```
autonomy/hm-public-route-metadata-guard-1742         src/lib/seo/route-policy.ts (+test)
autonomy/hm-next15-proxy-guard-1738                  __tests__/unit/routing/next15-middleware-proxy-guard.test.ts
autonomy/hm-supabase-proxy-loopback-1739             __tests__/unit/app/supabase-proxy-route.test.ts
autonomy/hm-error-envelope-route-family-1744         __tests__/unit/api/error-standardization.test.ts
autonomy/hm-api-timeout-policy-guard-1744            __tests__/unit/api/external-timeouts.test.ts
autonomy/hm-robots-sitemap-policy-1742               __tests__/unit/app/seo-route-policy-surface-guard.test.ts
autonomy/hm-dashboard-data-dedupe-guard-1742         __tests__/unit/data/dashboard-query-dedupe.test.ts
autonomy/d87-query-key-dedupe-index-2013             __tests__/unit/data/couples-query-key-dedupe.test.ts
autonomy/hm-env-secret-redaction-guard-1742          __tests__/unit/scripts/guard-supabase-env.test.ts
autonomy/d75-cookie-session-security-index-1943      docs/cookie-session-security-evidence.md
autonomy/hm-env-example-doc-guard-1744               (HEAD-superseded — verify before landing)
autonomy/hm-storage-upload-policy-guard-1748         (HEAD-superseded — verify before landing)
autonomy/hm-public-demo-data-boundary-guard-1948     (HEAD-superseded — verify before landing)
autonomy/hm-api-rate-limit-adoption-scan-1948        (HEAD-superseded — verify before landing)
```

### Wave 2 — pairwise overlap (2; land in either order)

```
autonomy/hm-middleware-proxy-regression-1744         __tests__/unit/middleware.test.ts (+69)
autonomy/hm-security-header-policy-guard-1744        __tests__/unit/middleware.test.ts (+101)
```

### Wave 3 — docs-only artifacts (22; alphabetical, parallel-safe)

```
autonomy/d103-query-dedupe-smoke-doc-2019
autonomy/d104-timeout-policy-evidence-2019
autonomy/d105-error-envelope-evidence-2019
autonomy/d106-route-boundary-evidence-2019
autonomy/d107-rate-limit-evidence-2019
autonomy/d108-cookie-session-evidence-2019
autonomy/d109-probe-safety-evidence-2019
autonomy/d110-launch-gate-evidence-2019
autonomy/d111-phase-closure-matrix-audit-2022
autonomy/d99-supabase-inactive-health-doc-2017
autonomy/hm-accessibility-route-taxonomy-1748        (HEAD-superseded)
autonomy/hm-admin-tooling-gap-index-1748             (HEAD-superseded)
autonomy/hm-cookie-session-security-index-1948       (HEAD-superseded)
autonomy/hm-csp-policy-inventory-1748                (HEAD-superseded)
autonomy/hm-decision-register-freshness-1742
autonomy/hm-fixture-seed-user-doc-1746
autonomy/hm-migration-rollback-index-1739
autonomy/hm-property-card-trust-copy-1748            (HEAD-superseded)
autonomy/hm-protected-page-redirect-doc-1746
autonomy/hm-ratelimit-local-provider-doc-1748
autonomy/hm-test-command-taxonomy-guard-1744
autonomy/hm-test-suite-taxonomy-1739
```

### Wave 4 — conflict-resolution required (1)

```
autonomy/hm-report-evidence-index-1738               add/add on p0-p1-blocker-evidence-index-2026-05-08.md
```

Likely already obsolete (HEAD `528c769` landed the same artifact path). Diff before landing; default action is to retire.

## Stale branches (98) — already in HEAD

All 98 branches whose tip commit is an ancestor of HEAD `2170964` are integration-complete. Their tips repeat one of these merged commits, in descending frequency: `2170964` (security-evidence-index), `260c6fa` (rate-limit adoption scan), `ffdbf0e` (public/demo fixture), `08459c7` (cookie/session index), `a39107e` (env-example guard), and earlier. Safe to retire from the active worker pool. Full enumeration available via:

```
for b in $(git for-each-ref --format='%(refname:short)' refs/heads/ | grep '^autonomy/'); do
  tip=$(git rev-parse "$b")
  git merge-base --is-ancestor "$tip" HEAD && echo "$b"
done
```

## Method

- `git merge-tree --write-tree HEAD <branch>` to detect 3-way conflicts (rc=1 means conflict).
- `git merge-base --is-ancestor` to identify stale branches.
- `git diff --name-only $(merge-base)..$branch` to enumerate per-branch file deltas.
- File-overlap counts derived by aggregating per-branch deltas across the 39 active branches.

## Integration risk summary

- **Conflict surface is small.** Only 1 of 39 active branches conflicts textually with HEAD; only 1 file is touched by more than one active branch (and that pair auto-merges).
- **Largest hidden risk is duplicate evidence.** 10 branches re-add files HEAD already updated; ~98 stale branches still appear in `git branch` output and inflate the queue.
- **Recommended sequencing** is Wave 1 → 2 → 3 → 4 above, but waves 1 and 3 are largely parallel-safe — a single landing operator can fast-forward most of them in one pass.
