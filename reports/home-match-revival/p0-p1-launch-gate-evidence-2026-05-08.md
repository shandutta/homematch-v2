# P0/P1 Launch Gate Evidence Note — 2026-05-08

Generated: 2026-05-08 (worktree `d110-launch-gate-evidence-2019`).
Scope: a single concise launch-gate evidence note. It states the launch
gate criteria, lists the residual blockers, and pins the do-not-claim-
closure conditions that must hold for Phase 0/1 to be marked 100% closed.
This is a docs-only slice. It does not touch code, secrets, dashboards,
paid APIs, live Supabase, or browser swarms; it does not advance the gate
verdict and does not authorize Phase 2+.

## Verdict (no change)

Phase 0 and Phase 1 remain **not 100% closed**. The strict OG gate stays
active per `phase0-phase1-strict-closure-gate.md` and the verdict in
`phase0-phase1-closure-matrix.md`. Phase 2/3/4/5/6 remain held until each
blocker below is closed in its required lane or Shan signs a written gate
exception.

## Launch gate criteria (what must be true to claim closure)

1. **Public no-credential traversal**: full local execution of the
   no-auth probe harness across the documented public route set
   (including `/about`, `/contact`, `/privacy`, `/terms`,
   `/sponsor-mockups`, `/reset-password`, `/verify-email`,
   `/auth/auth-code-error`, `/robots.txt`, `/sitemap.xml`, and one
   synthetic missing route). No browser swarms, no real form submissions,
   no auth, no external dashboards, no secrets, no paid APIs.
2. **Authenticated traversal**: a single approved auth lane exercised
   against the protected route matrix and the protected positive
   accessibility matrix, using disposable seeded fixtures (no production
   accounts/sessions, no real invite tokens, no real email/CAPTCHA).
3. **E2E auth lifecycle**: signup/login/verify/logout/session clearing
   and `redirectTo` round-trip executed against an approved non-
   production environment with a local email sink.
4. **API auth smoke live execution**: `__tests__/integration/api/
   auth-smoke-matrix.spec.ts` run with an approved
   `API_AUTH_SMOKE_TOKEN` against `127.0.0.1:3000` (or an explicitly
   approved non-production remote with `ALLOW_REMOTE_API_AUTH_SMOKE=1`).
5. **DB reset/lint/rollback/integration validation (D6)**: executed
   against an approved local Supabase/Docker (or safeguarded remote-
   test) DB; this also unblocks the live D1 authority-table
   integration leg.
6. **Durable rate limiter (D2)**: one provider chosen and provisioned
   *or* the in-memory-only launch risk explicitly accepted in writing.
7. **Production email confirmation + CAPTCHA (D3)**: external Supabase
   project settings confirmed/provisioned to match the repo-local
   launch policy; the local E2E leg has a live execution under (3).
8. **Authenticated mutation/storage/invite/account positive flows**:
   household, interactions, saved searches, avatar storage, invite
   tokens, and account states exercised under the same auth lane as
   (2).
9. **Paid/external surfaces**: every paid/external route check
   (Google Maps, Zillow/RapidAPI, OpenRouter/LLM, email/notification
   side effects, cron/admin ingestion or generation) explicitly
   approved or explicitly mocked before any positive execution.

The canonical row-by-row mapping of these criteria to their latest
proof artifacts and unresolved decisions is
`reports/home-match-revival/p0-p1-blocker-evidence-index-2026-05-08.md`;
this note does not restate it.

## Residual launch blockers (concise)

Each row below corresponds to a row in the master blocker index. Lane
labels: **R** = repo-side, **L** = live-evidenced (environment-gated),
**X** = external-approval-gated.

| # | Blocker | Lane |
| - | --- | --- |
| 1 | Authenticated browser traversal (full protected matrix; partial live evidence exists for 4 core protected pages via the remote disposable seed) | L |
| 2 | E2E auth lifecycle (signup/login/verify/logout/session clearing, `redirectTo`) | L |
| 3 | API auth smoke live token + server | L |
| 4 | D1 service-role RBAC authority — repo-side closed; live integration D6-gated | R/L |
| 5 | D2 durable production rate limiter | X |
| 6 | D3 production email confirmation + CAPTCHA execution | X |
| 7 | D6 DB reset/lint/rollback/integration validation | L |
| 8 | Final public no-credential traversal artifact (Playwright/local-smoke); harness already exists | R |
| 9 | Internal/demo surface disposition — repo-side closed for the launch gate; future product decision only | R |
| 10 | Paid/external route checks (Maps/Zillow/RapidAPI/OpenRouter/LLM, email/notification, cron/admin) | X |
| 11 | Authenticated mutation/storage/invite/account positive flows | L |
| 12 | Protected positive accessibility traversal | L |

## Do-not-claim-closure conditions

Phase 0/1 may **not** be claimed as 100% closed while any of the
following is true. These are the gate's explicit refuse-to-close
predicates; each one is sufficient on its own to keep the gate held.

1. Any blocker in the table above remains in its non-R-closed lane
   without an in-writing Shan approval that names the row, the lane,
   and the deviation.
2. Public no-credential traversal lacks a single end-to-end local
   execution artifact covering the documented public route set
   (criterion 1 above). Static guards alone do not satisfy this.
3. Authenticated traversal, protected positive accessibility, and the
   authenticated mutation/storage/invite/account positive flows have
   not all been executed under one approved auth lane against
   disposable seeded fixtures. Partial coverage of four core
   protected pages is *not* full coverage.
4. The API auth smoke matrix has not been run live with an approved
   token against an approved non-production server. Handler-level
   matrix passes alone are insufficient.
5. The signup/login/verify/logout/session-clearing E2E lifecycle has
   not been executed against a non-production auth environment with
   a local email sink. Static repo-side D3 invariants alone are
   insufficient.
6. D6 DB reset/lint/rollback/integration validation has not been
   executed against an approved local Supabase/Docker (or
   safeguarded remote-test) DB. Static reset-readiness guards alone
   are insufficient. The live D1 authority-table integration leg is
   not closed until D6 runs.
7. D2 has neither (a) a chosen and provisioned durable provider
   wired through the `RATE_LIMIT_STORAGE_PROVIDER` adapter seam, nor
   (b) an explicit written acceptance of the in-memory-only launch
   risk with multi-instance behavior documented.
8. D3 production Supabase project settings have not been verified
   or provisioned to match `config/signup-verification-launch-
   policy.json` (email confirmation required, CAPTCHA required,
   Turnstile preferred, no pre-verification app session).
9. Any paid/external surface is exercised against a real provider
   without explicit per-provider approval covering budget, target
   environment, side-effect scope, and credentials path. This
   includes Google Maps, Zillow/RapidAPI, OpenRouter/LLM, email/
   notification side effects, and cron/admin ingestion or
   generation endpoints.
10. Closure is asserted from documentation alone for any
    L- or X-lane row. A row is closed only when its required lane
    actually executes; repo-side static guards keep the gate honest
    but do not close live or external lanes.
11. Any production credential, real user account, real invite token,
    real CAPTCHA call, or real email send was used to produce
    closure evidence. Such evidence is rejected and the gate stays
    held.
12. The closure claim is made by a worker rather than by Shan after
    review. Workers may produce evidence; only Shan signs the gate
    exception or marks Phase 0/1 closed.

## What this note does NOT do

- Does not advance Phase 0/1 closure or change the gate verdict.
- Does not authorize spending money, calling paid/external APIs,
  mutating live Supabase, or running broad browser swarms.
- Does not replace the canonical artifacts. Those remain authoritative:
  - `reports/home-match-revival/phase0-phase1-strict-closure-gate.md`
  - `reports/home-match-revival/phase0-phase1-closure-matrix.md`
  - `reports/home-match-revival/p0-p1-blocker-evidence-index-2026-05-08.md`
  - `reports/home-match-revival/p0-p1-blocker-reconciliation-2026-05-08.md`
  - `reports/home-match-revival/p0-p1-remaining-blocker-taxonomy-2026-05-08.md`
  - `reports/home-match-revival/p1-decision-needed-register-2026-05-08.md`
- Does not duplicate `security-evidence-index-2026-05-08.md` or
  `d79-cookie-session-security-index-2026-05-08.md`; both remain the
  canonical security-themed indexes.
