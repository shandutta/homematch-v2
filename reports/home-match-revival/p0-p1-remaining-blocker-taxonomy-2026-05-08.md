# P0/P1 Remaining Blocker Taxonomy, 2026-05-08

Generated: 2026-05-08T13:27:22Z
Scope: strict Phase 0/1 control-plane slice. This report classifies remaining blockers only. It does not authorize Phase 2+, deploys, secrets, paid APIs, production dashboards, browser swarms, real users, or customer data.

## Verdict

Phase 0 and Phase 1 are still not fully closed. The remaining work is mostly gated on approved auth/test environments and owner decisions, not more broad repo exploration.

The single next safe repo-local leaf is:

`P0 public no-credential Playwright smoke matrix`

Implement a bounded Playwright/local-smoke artifact for public pages and metadata routes only: `/`, `/about`, `/contact`, `/cookies`, `/demo/ads`, `/invite/synthetic-invalid-token`, `/login`, `/privacy`, `/reset-password`, `/signup`, `/sponsor-mockups`, `/terms`, `/verify-email`, `/auth/auth-code-error`, a synthetic missing route, `/robots.txt`, and `/sitemap.xml`. Run only against a local safe app target, do not submit real forms, do not use auth, do not touch external dashboards or paid APIs, and record status/final URL/console/network failures. This is the cleanest remaining repo-closeable P0 evidence because the canonical traversal matrix explicitly allows local public no-credential checks, while authenticated/API/DB closure is gated.

## Taxonomy

### A. Repo-closeable now

These can be advanced with bounded repo-local tests or reports, without Shan approval, credentials, dashboards, paid APIs, deploys, or customer data.

| Blocker | Current status | Safe repo-local closure shape | Evidence |
| --- | --- | --- | --- |
| Final public no-credential traversal artifact | Open | Add/run a bounded public Playwright smoke matrix for public pages and metadata routes. Validation-only for forms. Synthetic invalid invite only. No auth, external calls, or paid APIs. | `p0-site-traversal-acceptance-matrix-2026-05-08.md` lines 27-39 and 156-163 require the public no-credential pass and allow local browser-checks. |
| Public page direct e2e coverage gaps | Open | Cover `/about`, `/contact`, `/privacy`, `/terms`, `/sponsor-mockups`, `/reset-password`, `/verify-email`, `/auth/auth-code-error` in the same public smoke matrix. | `p0-site-traversal-acceptance-matrix-2026-05-08.md` lines 178-183 list these gaps. |
| Metadata and missing-route public checks | Open | Include `/robots.txt`, `/sitemap.xml`, and one synthetic missing route in the public smoke matrix. | `p0-site-traversal-acceptance-matrix-2026-05-08.md` lines 67-70 and 163. |
| Safe API/code-only denial gaps | Partly open | Only add narrow local/static tests for missing-code or denial behavior that cannot trigger external providers or mutations, for example `/auth/callback` missing-code and cron-secret denial. Do not run admin, Zillow, Google, OpenRouter, notification, upload, reset, or mutation positive paths. | `p0-site-traversal-acceptance-matrix-2026-05-08.md` lines 102-131 and 192-193. |

### B. Approval-gated

These need Shan/product/security/ops approval before implementation or external execution.

| Blocker | Required decision | Why it is gated | Evidence |
| --- | --- | --- | --- |
| D1 service-role RBAC authority | Choose custom claims, dedicated admin/roles table, or accepted/administered `user_profiles.role`. | The repo has an implementation packet, but changing service-role authority is a security/product authority decision. | `phase0-phase1-closure-matrix.md` lines 47-50 and `d1-service-role-rbac-authority-implementation-packet-2026-05-08.md`. |
| D2 durable production rate limiter | Accept in-memory launch risk, or choose/provision Upstash Redis or Vercel KV/Redis-compatible storage. | The adapter seam exists, but provider choice, credentials, and production risk acceptance are owner/ops decisions. | `phase0-phase1-closure-matrix.md` lines 50 and 62; `p1-decision-needed-register-2026-05-08.md` lines 15 and 26. |
| D3 production email confirmation and CAPTCHA execution | Approve Supabase production config/runbook, CAPTCHA provider, secret path, and whether a worker may execute dashboard/config changes. | Repo policy and static invariants are closed, but dashboard/secrets/config execution cannot be done without approval. | `phase0-phase1-closure-matrix.md` lines 51 and 63; `d3-signup-verification-policy-decision-2026-05-08.md`; `d3-signup-verification-repo-invariant-guard-2026-05-08.md`. |
| Internal/demo surface disposition | Approve or override restrict/delete/hide policy for `/dashboard/vibes-test`, `/validation`, `/demo/ads`, and `/sponsor-mockups`. | Repo-side packet exists, but keep/hide/delete is a product launch decision. | `phase0-phase1-closure-matrix.md` lines 39-43 and 64. |
| Paid/external route checks | Approve mocks, budget, and target environment before any Google Maps, Zillow/RapidAPI, OpenRouter/LLM, email/notification, cron/admin ingestion, or generation checks. | Positive execution can spend money, call third-party systems, write data, or trigger side effects. | `phase0-phase1-closure-matrix.md` line 65; `p0-site-traversal-acceptance-matrix-2026-05-08.md` lines 41-45 and 110-131. |
| External dashboards/accounts | Approve any Vercel, Supabase, Google, AdSense, Analytics, Stripe, email, or production settings change. | The operating plan forbids these changes without explicit approval. | `home-match-business-revival-operating-plan.md` lines 18-19 and 214-218. |

### C. Environment-gated

These require an approved local/non-production environment, seeded fixtures, tokens, sessions, Docker/Supabase, or a safeguarded remote-test path.

| Blocker | Required environment | Why it is gated | Evidence |
| --- | --- | --- | --- |
| Authenticated browser traversal for protected pages | Approved seeded local/test auth session with fixture users A-D and safe household/property/interactions data. | Positive protected UX cannot be proven without a non-production session and data fixtures. | `phase0-phase1-closure-matrix.md` lines 23, 26-29, 59; `p0-site-traversal-acceptance-matrix-2026-05-08.md` lines 133-152 and 171-176. |
| E2E auth lifecycle | Local Supabase/Docker or equivalent non-production auth environment, seeded confirmed users, and local email sink if signup verification is tested. | Signup/login/verify/logout/session clearing cannot use production accounts, real email, real CAPTCHA, or real invite tokens. | `p0-p1-blocker-reconciliation-2026-05-08.md` lines 22 and 42-44. |
| API auth smoke live execution | Approved local app server plus approved non-production bearer token in `API_AUTH_SMOKE_TOKEN`. Remote test target needs explicit approval and `ALLOW_REMOTE_API_AUTH_SMOKE=1`. | Checked-in smoke matrix exists, but live 2xx/401 proof needs a safe token and server. | `p0-p1-api-auth-smoke-matrix-2026-05-08.md` lines 9-12 and 63-74; `phase0-phase1-closure-matrix.md` line 27. |
| D6 DB reset/lint/rollback/integration validation | Local Supabase/Docker, safeguarded remote-test DB, or explicit written deferral/gate exception. | DB reset and integration validation can be destructive or environment-dependent and must not touch production data. | `phase0-phase1-closure-matrix.md` lines 54 and 60; `p1-decision-needed-register-2026-05-08.md` lines 19 and 24. |
| Positive mutation/storage/invite/account flows | Approved disposable fixtures and reset/teardown path for household, interactions, saved searches, avatar storage, invite tokens, and account states. | These paths write data or depend on storage/email/session state. | `p0-site-traversal-acceptance-matrix-2026-05-08.md` lines 85-91, 121-125, and 140-152. |
| Protected positive accessibility traversal | Same approved authenticated traversal environment. | Static/accessibility matrix exists, but positive protected accessibility cannot be proven without auth/session. | `accessibility-core-flow-matrix.md`; `phase0-phase1-closure-matrix.md` lines 36-37. |

### D. Already closed or stale for Phase 0/1

These should not be re-opened unless new evidence or a product/security decision changes the contract.

| Item | Closure/stale reason | Evidence |
| --- | --- | --- |
| D4 `.env.prod` handling model | Repo-side closed: `.env.prod` remains untracked/secret-managed; non-secret production host metadata lives in `config/supabase-production-hosts.json`; docs forbid tracked secrets/URLs. | `phase0-phase1-closure-matrix.md` lines 28 and 52. |
| D5 numeric constraint semantics | Repo-side closed: zero bedrooms supports studios/lofts; zero bathrooms remains the current unknown/missing-value sentinel; static guards preserve non-negative semantics. | `phase0-phase1-closure-matrix.md` lines 53 and 96; `d5-numeric-constraint-semantics-closure-2026-05-08.md`. |
| D7 disputed-route email/profile exposure | Repo-side closed: partner email removed from DTO/query; current route returns only id/display name plus interaction metadata needed by UX. | `phase0-phase1-closure-matrix.md` lines 55 and 97; `d7-disputed-route-exposure-closure-2026-05-08.md`. |
| No-auth protected redirect static guard | Repo-side static guard closed; browser execution can still be included later, but the prior `protected no-credential redirect matrix` leaf from the blocker packet is stale as the next best leaf. | `phase0-phase1-closure-matrix.md` line 29; `p0-no-auth-traversal-smoke-guard-2026-05-08.md`. |
| D2 adapter seam | Repo-side closed; only provider choice/provisioning remains. | `phase0-phase1-closure-matrix.md` lines 37 and 50. |
| D3 policy and repo invariants | Repo-side closed; only external production config execution and local E2E environment remain. | `phase0-phase1-closure-matrix.md` lines 37 and 51. |
| D1 authority packet | Planning packet complete; implementation remains approval-gated. | `phase0-phase1-closure-matrix.md` line 37 and source artifact line 101. |
| Local dev guard, Supabase proxy guard, metro-boundaries no-credential service-role fix, M6/M10 429 reconciliation, and broad P1 repo-local remediation slices | Already recorded as closed in the canonical closure matrix. Do not spend another leaf rediscovering them. | `phase0-phase1-closure-matrix.md` lines 19-29 and 31-37. |

## Recommended next Kanban child

Title: `P0 public no-credential Playwright smoke matrix`

Assignee: implementation/web worker, not a broad planner.

Acceptance:
1. Add the smallest local Playwright or equivalent smoke matrix for the public no-credential routes listed above.
2. It must fail safe if the target is not local or approved non-production.
3. It must avoid real form submission, login, paid APIs, external dashboards, mutations, secrets, and real user/customer data.
4. It must record an evidence artifact under `reports/home-match-revival/` with route, final URL/status, console/network failures, and explicit skips.
5. It must not claim P0 full closure. Authenticated traversal, API auth smoke, DB integration, and owner decisions remain gated.

## Matrix update decision

No change to `reports/home-match-revival/phase0-phase1-closure-matrix.md` is needed from this taxonomy alone. The canonical matrix already says Phase 0/1 remain blocked and identifies the same approval/environment blockers. This report only sharpens the classification and updates the next safe leaf now that the no-auth traversal smoke guard exists.
