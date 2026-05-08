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

| # | Surface | Artifact | Lane |
|---|---|---|---|
| 1 | Cookie/session helper hardening + live-auth gates | `reports/home-match-revival/d79-cookie-session-security-index-2026-05-08.md` | Repo-side index; live gates remain environment-gated |
| 2 | Auth audit (legacy snapshot) | `reports/home-match-revival/auth-audit.md` | Repo-side reference |
| 3 | Auth boundary consolidation | `reports/home-match-revival/auth-boundary-consolidation-2026-05-08.md` | Repo-side closed |
| 4 | Auth provider replacement decision | `reports/home-match-revival/p1-auth-provider-replacement-decision-memo-2026-05-08.md` | Decision, owner-approval-gated |
| 5 | RLS security audit | `reports/home-match-revival/rls-security-audit.md` | Repo-side reference |
| 6 | D1 service-role RBAC authority packet | `reports/home-match-revival/d1-service-role-rbac-authority-implementation-packet-2026-05-08.md` | Repo-side closed; live integration D6-gated |
| 7 | D2 durable rate limiter approval-gate guard | `reports/home-match-revival/d2-durable-rate-limiter-approval-gate-guard-2026-05-08.md` | External-approval-gated |
| 8 | D2 rate limit provider readiness map | `reports/home-match-revival/d2-rate-limit-provider-readiness-map-2026-05-08.md` | External-approval-gated |
| 9 | D2 rate limit gap scout | `reports/home-match-revival/rate-limit-gap-scout.md` | Repo-side reference |
| 10 | D2 route-scoped limiter key closure | `reports/home-match-revival/p1-route-scoped-limiter-key-closure-2026-05-08.md` | Repo-side closed |
| 11 | D3 signup verification policy decision | `reports/home-match-revival/d3-signup-verification-policy-decision-2026-05-08.md` | Decision, owner-approval-gated |
| 12 | D3 signup verification repo invariant guard | `reports/home-match-revival/d3-signup-verification-repo-invariant-guard-2026-05-08.md` | Repo-side closed |
| 13 | CSP and external origin policy inventory | `reports/home-match-revival/p0-p1-csp-and-external-origin-policy-inventory-2026-05-08.md` | Repo-side reference |
| 14 | No-auth public traversal smoke guard | `reports/home-match-revival/p0-no-auth-traversal-smoke-guard-2026-05-08.md` | Repo-side closed |
| 15 | No-auth API protected redirect probe harness | `reports/home-match-revival/p0-no-auth-api-protected-redirect-probe-harness-2026-05-08.md` | Repo-side harness; local-only execution |
| 16 | Strict anonymous protected route closure | `reports/home-match-revival/p0-p1-strict-anonymous-protected-route-closure-2026-05-08.md` | Repo-side closed |
| 17 | Strict anonymous live probe rerun | `reports/home-match-revival/p0-p1-strict-anonymous-live-probe-rerun-2026-05-08.md` | Live evidence |
| 18 | Credentialless auth lifecycle verification plan | `reports/home-match-revival/p0-p1-credentialless-auth-lifecycle-verification-plan-2026-05-08.md` | Plan, environment-gated |
| 19 | API auth smoke matrix | `reports/home-match-revival/p0-p1-api-auth-smoke-matrix-2026-05-08.md` | Repo-side closed; live execution gated |
| 20 | Auth credential recovery + tiny probe plan | `reports/home-match-revival/p0-auth-credential-recovery-and-tiny-probe-plan-2026-05-08.md` | Plan, environment-gated |

## What this index does NOT do

- Does not change any gate verdict; the canonical matrix is unchanged.
- Does not authorize live execution of any of the above plans/probes.
- Does not enumerate every Phase 0/1 evidence doc — only the
  security-themed subset. For the full P0/P1 blocker → proof mapping,
  see `p0-p1-blocker-evidence-index-2026-05-08.md`.
- Does not ingest secrets, anon keys, service-role keys, refresh tokens,
  or PKCE verifiers; none are present in this report.
