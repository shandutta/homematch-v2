# P1 Decision-Needed Register

Generated: 2026-05-08T07:35Z
Scope: strict Phase 0/1 gate fan-in. This is a decision register only; no implementation was performed.

## Gate position

Phase 2+ remains held. Repo-side Phase 0/1 closure has advanced, but the items below require Shan/product/security/ops decisions or an approved execution environment before Phase 0/1 can honestly be called 100% closed.

## Decisions required

| ID | Decision needed | Current evidence | Options to choose from | Blocks |
| --- | --- | --- | --- | --- |
| D1 | Service-role RBAC authority | `auth-audit.md` A3 and `phase1-remediation-closure-scout.md` show `checkServiceRoleAuthorization()` still depends on `user_profiles.role === 'admin'`. `service-role-client.ts` is gated through `createServiceClient()`, but the authority model is not fixed. | A) Supabase custom claims as admin source of truth. B) Dedicated admin/roles table with RLS and migrations. C) Keep `user_profiles.role` explicitly as the accepted authority and document/administer it. | Any route or helper allowed to create service-role clients, plus public-route failures where service-role use is invoked outside an authorized context. |
| D2 | Durable production rate limiter | M5/M10 repo coverage is closed on the single `src/lib/middleware/rateLimiter.ts` path, but `rate-limit-gap-scout.md`, `middleware-api-audit.md`, and `phase1-remediation-closure-scout.md` keep durable storage as an unresolved production decision. | A) Accept in-memory limiter as dev/best-effort only and document production risk. B) Move to Upstash Redis. C) Move to Vercel KV/Redis-compatible store. | Production abuse control, admin/user mutation throttling, and any security signoff that assumes multi-instance enforcement. |
| D3 | Production email confirmation and signup CAPTCHA policy | `supabase/config.toml` still has email confirmations disabled and CAPTCHA commented; `auth-audit.md` A12/A13 and `phase1-remediation-closure-scout.md` mark both blocked. | A) Enable email confirmation and Turnstile/hCaptcha in production with dev/test overrides. B) Intentionally launch without one or both controls and document compensating controls. | Auth hardening closure, signup abuse posture, and production Supabase config. |
| D4 | `.env.prod` handling model | Phase 0 live probe found `.env.prod` absent. Guard fallback host detection works for current `.env.local`, but `phase0-closure-scout.md`, `vercel-localdev-docker-decision.md`, and the closure matrix keep guard precision open. | A) Create a sanitized non-secret `.env.prod` baseline for exact guard comparisons. B) Keep `.env.prod` untracked/secret-managed and document fallback host-pattern policy. C) Use a separate secrets manager/export process for production env baselines. | Local-dev guard precision, safe startup docs, and confidence that production Supabase usage is intentionally gated. |
| D5 | Numeric constraint semantics | DB P0.5 added partial schema safety constraints, but bedrooms/bathrooms allow `>= 0` while the audit target said `1-50`. `phase1-remediation-closure-scout.md` marks this as blocked. | A) Allow zero-bed/zero-bath listings and document semantics. B) Tighten to `1-50` to match the original audit. C) Use nullable/unknown semantics instead of zero. | DB migration finalization and validation against real/current rows. |
| D6 | DB reset/lint/integration environment | Multiple DB fixes are repo-side closed with static tests, but `supabase db reset`, DB lint, rollback rehearsal, and integration tests remain environment-blocked. | A) Use local Supabase/Docker as the required validation path. B) Approve a safeguarded remote-test path. C) Defer DB reset/lint with an explicit deploy exception. | Phase 0 integration-test closure, DB migration confidence, and production deploy readiness. |
| D7 | Disputed-route email/profile field exposure | `rls-security-audit.md` flagged `/api/couples/disputed` service-role profile exposure; `phase1-remediation-closure-scout.md` DB P1.6 shows route still selects `id, display_name, email` and returns `user_email`. | A) Email is required for UX; document and constrain output through a scoped RPC. B) Email is not required; restrict to `id`/display name. C) Hide partner identity until a product-reviewed disputed UX is designed. | RLS/security closure for disputed-route profile exposure and any downstream couples UX assumptions. |

## Recommended next unblock order

1. D6 DB reset/lint/integration environment, because many repo-side DB fixes are waiting on the same validation lane.
2. D1 service-role RBAC authority, because it affects admin/service-role safety and the metro-boundaries public-route failure class.
3. D2 durable rate limiter, because M5/M10 are closed only repo-side, not production-durable.
4. D3 auth production policy and D4 `.env.prod` handling, because both are ops/security decisions with secret-handling implications.
5. D5 numeric semantics and D7 disputed-route exposure, because both can become small implementation slices once product/security chooses the intended behavior.

## Matrix update

The Phase 0/1 closure matrix should continue to say: Phase 2+ is held until these decisions are resolved or Shan explicitly approves a written gate exception.
