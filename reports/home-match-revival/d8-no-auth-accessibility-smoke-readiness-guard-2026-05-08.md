# D8 — No-credential accessibility smoke readiness static guard

Generated: 2026-05-08
Scope: repo-local Phase 0/1 closure slice for the OG backlog P1 accessibility item.
Branch: claude/d8-accessibility-1731

## Summary

This slice adds one static Jest guard that locks in the readiness posture of the existing no-credential accessibility smoke harness. It does not start a browser, call external services, hit Supabase, or use credentials.

## What changed

- Added `__tests__/unit/accessibility/no-auth-smoke-readiness.test.ts`. It reads three repo-local artifacts and asserts repository-state invariants:
  - `reports/home-match-revival/accessibility-core-flow-matrix.md` (the static accessibility matrix).
  - `__tests__/e2e/no-auth-public-accessibility.spec.ts` (the bounded Playwright spec, never executed by this guard).
  - `playwright.no-auth-accessibility.config.ts` (the Playwright config used by the bounded spec).
  - `reports/home-match-revival/no-auth-public-accessibility-smoke.md` (the prior reconciliation report describing why live browser runs remain blocked).

## Invariants enforced

1. The bounded e2e spec and its Playwright config still exist; the reconciliation report still exists. The guard fails fast if any are renamed without updating coverage.
2. Every public no-credential route named in the accessibility matrix (`/`, `/about`, `/contact`, `/login`, `/signup`, `/verify-email`, `/reset-password`, `/auth/auth-code-error`, `/terms`, `/privacy`, `/cookies`) is also enumerated as a `path` entry in the no-auth spec's `publicPageRoutes`.
3. The protected anonymous-redirect routes the spec exercises (`/dashboard`, `/dashboard/liked`, `/profile`, `/settings`, `/household/create`, `/household/join`, `/couples`, `/couples/decisions`) all return `true` from `isProtectedPath`, so the spec cannot drift to expecting a redirect for a route the middleware does not consider protected.
4. The no-auth spec uses `storageState: { cookies: [], origins: [] }` and contains no references to service-role keys, password env vars, or session env vars; it cannot silently start carrying credentials.
5. The Playwright config is pinned to `127.0.0.1`, sets `NEXT_PUBLIC_TEST_MODE`, supplies the placeholder `no-credential-smoke-key` for `NEXT_PUBLIC_SUPABASE_ANON_KEY`, and contains no service-role key, no `sk_live_` token, and no JWT-shaped string. A future edit that pastes a real key into the config will fail this guard before it can land.
6. The reconciliation report still records that the live browser run is blocked on the local Playwright Chromium cache (not on test code) and that the verified fallback was config/list/lint only — i.e., live/browser/auth evidence remains explicitly gated and skippable.
7. The matrix continues to advertise readiness for no-credential smoke (`Ready for no-credential`) while still stating that browser swarms are out of scope and authenticated positive traversal remains approval-gated.

## Out of scope (intentionally)

- No live browser run. No `pnpm exec playwright test` invocation. No Playwright Chromium install.
- No real Supabase project, real session, real invite token, real listing, or real household.
- No mutation of remote services, no deploy, no secret access.

## Verification

- Targeted Jest run (under `systemd-run --user --scope`): `pnpm jest __tests__/unit/accessibility/no-auth-smoke-readiness.test.ts --runInBand`.
- TypeScript compile (under `systemd-run --user --scope`): `pnpm run type-check`.

Live browser/RTL coverage of the same surfaces remains a follow-up backlog item already documented in `accessibility-core-flow-matrix.md` and `no-auth-public-accessibility-smoke.md`.
