# Phase 0/1 Security Evidence Index

Generated: 2026-05-08
Scope: read-only static index of the canonical Phase 0/1 **security** evidence
artifacts under `reports/home-match-revival/`. No secrets read, no live
sessions or dashboards touched, no paid APIs invoked, no production data
inspected. This file does not authorize Phase 2+, deploys, or any external
execution; it only collects the security-themed proof artifacts in one
place so a reviewer can find them without digging through the broader 80+
revival reports.

This index is **not** a re-statement of:

- `phase0-phase1-strict-closure-gate.md` (the gate itself).
- `phase0-phase1-closure-matrix.md` (the canonical matrix).
- `p0-p1-blocker-evidence-index-2026-05-08.md` (the broader Phase 0/1
  blocker → proof index).

It also does not duplicate the focused
`d79-cookie-session-security-index-2026-05-08.md`; that index remains
canonical for cookie/session helper details and is referenced as one row
below.

## Discovery model

Every row points to an artifact that is tracked in the repo today. A
companion Jest static guard
(`__tests__/unit/docs/security-evidence-index-freshness.test.ts`) loads
this index and asserts that:

1. each artifact path listed here resolves to a real file under
   `reports/home-match-revival/`,
2. the canonical security-evidence set named below is fully covered by
   this index (so a future move/rename surfaces as a test failure rather
   than a silently broken cross-reference), and
3. this index is itself referenced from the broader
   `p0-p1-blocker-evidence-index-2026-05-08.md` source-artifact list, so
   a reviewer following the master index is one click from the security
   subset.

## Index

The "P0/P1 blocker row" column points at the row number(s) in
`reports/home-match-revival/p0-p1-blocker-evidence-index-2026-05-08.md`
that the listed artifact contributes evidence to. "—" means the artifact
is reference/context (an inventory, scout, or decision memo) that is not
tagged to a specific blocker row in the broader index. The mapping is
strictly for navigation; it does not change any blocker's lane or
verdict.

| #   | Surface                                           | Artifact                                                                                         | Lane                                                 | P0/P1 blocker row                   |
| --- | ------------------------------------------------- | ------------------------------------------------------------------------------------------------ | ---------------------------------------------------- | ----------------------------------- |
| 1   | Cookie/session helper hardening + live-auth gates | `reports/home-match-revival/d79-cookie-session-security-index-2026-05-08.md`                     | Repo-side index; live gates remain environment-gated | 1, 2                                |
| 2   | Auth audit (legacy snapshot)                      | `reports/home-match-revival/auth-audit.md`                                                       | Repo-side reference                                  | —                                   |
| 3   | Auth boundary consolidation                       | `reports/home-match-revival/auth-boundary-consolidation-2026-05-08.md`                           | Repo-side closed                                     | 1, 2                                |
| 4   | Auth provider replacement decision                | `reports/home-match-revival/p1-auth-provider-replacement-decision-memo-2026-05-08.md`            | Decision, owner-approval-gated                       | —                                   |
| 5   | RLS security audit                                | `reports/home-match-revival/rls-security-audit.md`                                               | Repo-side reference                                  | 4                                   |
| 6   | D1 service-role RBAC authority packet             | `reports/home-match-revival/d1-service-role-rbac-authority-implementation-packet-2026-05-08.md`  | Repo-side closed; live integration D6-gated          | 4 (with row 7 for live integration) |
| 7   | D2 durable rate limiter approval-gate guard       | `reports/home-match-revival/d2-durable-rate-limiter-approval-gate-guard-2026-05-08.md`           | External-approval-gated                              | 5                                   |
| 8   | D2 rate limit provider readiness map              | `reports/home-match-revival/d2-rate-limit-provider-readiness-map-2026-05-08.md`                  | External-approval-gated                              | 5                                   |
| 9   | D2 rate limit gap scout                           | `reports/home-match-revival/rate-limit-gap-scout.md`                                             | Repo-side reference                                  | 5                                   |
| 10  | D2 route-scoped limiter key closure               | `reports/home-match-revival/p1-route-scoped-limiter-key-closure-2026-05-08.md`                   | Repo-side closed                                     | 5                                   |
| 11  | D3 signup verification policy decision            | `reports/home-match-revival/d3-signup-verification-policy-decision-2026-05-08.md`                | Decision, owner-approval-gated                       | 2, 6                                |
| 12  | D3 signup verification repo invariant guard       | `reports/home-match-revival/d3-signup-verification-repo-invariant-guard-2026-05-08.md`           | Repo-side closed                                     | 2, 6                                |
| 13  | CSP and external origin policy inventory          | `reports/home-match-revival/p0-p1-csp-and-external-origin-policy-inventory-2026-05-08.md`        | Repo-side reference                                  | 10                                  |
| 14  | No-auth public traversal smoke guard              | `reports/home-match-revival/p0-no-auth-traversal-smoke-guard-2026-05-08.md`                      | Repo-side closed                                     | 8                                   |
| 15  | No-auth API protected redirect probe harness      | `reports/home-match-revival/p0-no-auth-api-protected-redirect-probe-harness-2026-05-08.md`       | Repo-side harness; local-only execution              | 8                                   |
| 16  | Strict anonymous protected route closure          | `reports/home-match-revival/p0-p1-strict-anonymous-protected-route-closure-2026-05-08.md`        | Repo-side closed                                     | 1, 8                                |
| 17  | Strict anonymous live probe rerun                 | `reports/home-match-revival/p0-p1-strict-anonymous-live-probe-rerun-2026-05-08.md`               | Live evidence                                        | 1                                   |
| 18  | Credentialless auth lifecycle verification plan   | `reports/home-match-revival/p0-p1-credentialless-auth-lifecycle-verification-plan-2026-05-08.md` | Plan, environment-gated                              | 2                                   |
| 19  | API auth smoke matrix                             | `reports/home-match-revival/p0-p1-api-auth-smoke-matrix-2026-05-08.md`                           | Repo-side closed; live execution gated               | 3                                   |
| 20  | Auth credential recovery + tiny probe plan        | `reports/home-match-revival/p0-auth-credential-recovery-and-tiny-probe-plan-2026-05-08.md`       | Plan, environment-gated                              | 2                                   |

## Adjacent (non-security) blocker artifacts referenced for integration

These rows are not security artifacts themselves but are listed here so a
reviewer reading the security subset can see the immediate DB/API
neighbors a security-themed blocker depends on. They are repeated from
`p0-p1-blocker-evidence-index-2026-05-08.md` for navigation only and do
not extend the canonical security-evidence subset enforced by the
companion freshness guard.

| Surface                                                                | Artifact                                                                            | P0/P1 blocker row |
| ---------------------------------------------------------------------- | ----------------------------------------------------------------------------------- | ----------------- |
| D6 DB reset/lint/rollback static readiness (gates D1 live integration) | `reports/home-match-revival/d6-db-static-reset-readiness-closure-2026-05-08.md`     | 7                 |
| Authenticated traversal probe (live)                                   | `reports/home-match-revival/remote-supabase-test-seed-and-auth-probe-2026-05-08.md` | 1, 2              |
| Site traversal acceptance matrix                                       | `reports/home-match-revival/p0-site-traversal-acceptance-matrix-2026-05-08.md`      | 1, 8, 11          |

## What this index does NOT do

- Does not change any gate verdict; the canonical matrix is unchanged.
- Does not authorize live execution of any of the above plans/probes.
- Does not enumerate every Phase 0/1 evidence doc — only the
  security-themed subset. For the full P0/P1 blocker → proof mapping,
  see `p0-p1-blocker-evidence-index-2026-05-08.md`.
- Does not ingest secrets, anon keys, service-role keys, refresh tokens,
  or PKCE verifiers; none are present in this report.
