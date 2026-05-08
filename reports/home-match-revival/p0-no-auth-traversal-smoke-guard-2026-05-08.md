# P0 No-Auth Traversal Smoke Guard

Task: t_b5bb49f8
Generated: 2026-05-08T13:15:16Z
Scope: repo-local static/targeted Jest guard only. No browser swarm, no deploy, no secrets, no paid APIs, no external dashboards, no real user data, and no authenticated traversal.

## What changed

Added `__tests__/unit/routing/no-auth-traversal-smoke-guard.test.ts` as the smallest repo-local no-auth traversal guard for the current P0 route surface.

The guard preserves these expectations without credentials:

- Public no-credential pages remain outside middleware protection: `/`, `/about`, `/contact`, `/cookies`, `/demo/ads`, `/invite/synthetic-invalid-token`, `/login`, `/privacy`, `/reset-password`, `/signup`, `/sponsor-mockups`, `/terms`, `/verify-email`, and `/auth/auth-code-error`.
- Protected pages remain inside middleware protection: `/dashboard`, dashboard subpages, `/dashboard/vibes-test`, `/profile`, `/settings`, `/household/create`, `/household/join`, `/couples`, `/couples/decisions`, `/properties/synthetic-property-id`, and `/validation`.
- Anonymous public routes return middleware pass-through status `200`, keep security headers, and do not instantiate the Supabase middleware client.
- Anonymous protected routes redirect to `/login?redirectTo=<original path>`, including query-string preservation for `/couples?tab=activity`, and do not instantiate the Supabase middleware client when no auth cookie is present.
- The P0 traversal and inventory matrices still document the route expectations plus the approved-test-auth/session block.

## Evidence

Command run from `/home/shan/projects/homematch-v2`:

```bash
systemd-run --user --scope -p MemoryMax=2G -p CPUQuota=200% pnpm exec jest __tests__/unit/routing/no-auth-traversal-smoke-guard.test.ts --runInBand
```

Result:

- Test Suites: 1 passed, 1 total
- Tests: 5 passed, 5 total
- Time: 1.38 s

## Explicit non-closure notes

This is a repo-local no-auth smoke guard, not live traversal closure.

Still blocked / not executed in this task:

- Full browser public traversal matrix.
- Authenticated browser traversal.
- Authenticated API smoke execution.
- Positive invite/account/session flows.
- Paid/external paths involving Google Maps, Zillow/RapidAPI, OpenRouter/LLM, email/notification side effects, or cron/admin endpoints.

Authenticated/live execution remains blocked until Shan approves a non-production seeded auth/session path and safe local/test data environment.
