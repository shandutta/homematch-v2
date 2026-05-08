# Route Boundary Evidence — Public / Private / Protected — 2026-05-08

Generated: 2026-05-08
Scope: read-only Phase 0/1 docs slice. No browser run, no app boot, no
Supabase mutation, no paid API, no secrets read, no external dashboards.
Only tracked source under this worktree was inspected.

Worktree: `/home/shan/projects/homematch-v2.claude-workers/d106-route-boundary-evidence-2019`
Branch: `autonomy/d106-route-boundary-evidence-2019`
Base integration HEAD at launch: `2170964`

## Purpose

A single concise crosswalk that pins every Phase 0/1 route boundary
class — public no-credential, protected (auth-required), token-public
auth-gated, internal-preview-gated — to the canonical source-of-truth
file, the static repo guard that protects the boundary today, and the
live-auth gate row that still blocks closure-grade live evidence. This
note intentionally does not restate the full taxonomy
(`no-credential-accessibility-route-taxonomy-2026-05-08.md`,
`p0-full-route-api-endpoint-inventory-matrix-2026-05-08.md`) or reopen
the strict closure gate; it cross-references them.

## 1. Source of truth

### 1.1 Protected page prefixes

`src/lib/routing/protected-routes.ts:1`:

```
PROTECTED_PATH_PREFIXES = [
  '/dashboard', '/profile', '/household', '/settings',
  '/validation', '/couples', '/properties',
]
```

`isProtectedPath(pathname)` is the only function that classifies a
page path as protected. Middleware and page-level fallbacks both call
it.

### 1.2 Middleware enforcement

`middleware.ts:96` — `middleware(request)`:

- Public bypass for `/api/performance/metrics` and `/api/health`
  (`middleware.ts:21,107`).
- API routes get security headers and skip page redirect logic
  (`middleware.ts:111`).
- When Supabase public config is missing, anonymous protected pages
  still redirect to `/login?redirectTo=...`
  (`middleware.ts:126`).
- When no Supabase auth cookie is present, anonymous protected pages
  redirect to `/login?redirectTo=...` without instantiating a Supabase
  client (`middleware.ts:139`).
- When the auth cookie is present but `getUser()` returns no user,
  protected pages redirect to `/login?redirectTo=...` preserving the
  original path and query string (`middleware.ts:297`).
- Authenticated users hitting `/login` or `/signup` are redirected to
  `/dashboard` or to a safe `redirectTo` (`middleware.ts:310`).

### 1.3 Page-level fallback

`src/app/dashboard/page.tsx` and `src/app/couples/page.tsx` both
preserve `redirectTo` when the page-level anonymous fallback fires —
covered by `__tests__/unit/app/protected-page-auth-redirects.test.tsx`
(see `p0-p1-strict-anonymous-protected-route-closure-2026-05-08.md`).

## 2. Boundary class crosswalk

| Class | Representative routes | Static guard (canonical) | Live-auth gate row |
| --- | --- | --- | --- |
| Public no-credential — marketing / legal | `/`, `/about`, `/contact`, `/terms`, `/privacy`, `/cookies` | `__tests__/unit/routing/no-auth-traversal-smoke-guard.test.ts` (5/5 Jest); `__tests__/unit/lib/routing/protected-routes.test.ts`; `__tests__/unit/middleware.test.ts` | Row 8 — local public-traversal artifact (`p0-p1-blocker-evidence-index-2026-05-08.md` row 8) |
| Public no-credential — auth UI shells | `/login`, `/signup`, `/reset-password`, `/verify-email`, `/auth/auth-code-error` | Same guards as above; `__tests__/unit/middleware.test.ts` covers authenticated-user redirect off `/login` and `/signup` | Rows 2 + 6 — E2E auth lifecycle and D3 production confirmation/CAPTCHA |
| Public no-credential — metadata / error | `/robots.txt`, `/sitemap.xml`, synthetic missing route | `__tests__/e2e/no-auth-public-accessibility.spec.ts` (config/list/lint verified; live run gated on browser cache) | Row 8 |
| Protected — anonymous redirect | `/dashboard*`, `/profile`, `/settings`, `/household/*`, `/couples*`, `/properties/[id]`, `/validation` | `__tests__/unit/routing/no-auth-traversal-smoke-guard.test.ts`; `__tests__/unit/middleware.test.ts`; `__tests__/unit/app/protected-page-auth-redirects.test.tsx` | Rows 1 + 11 + 12 — authenticated browser traversal, mutation/storage/invite flows, protected positive a11y |
| Token-public, auth-gated acceptance | `/invite/[token]` | `__tests__/unit/routing/no-auth-traversal-smoke-guard.test.ts` asserts `isProtectedPath('/invite/synthetic-invalid-token') === false` | Row 11 — seeded non-production invite token + approved auth |
| Internal-preview-gated | `/dashboard/vibes-test`, `/validation`, `/demo/ads`, `/sponsor-mockups` | `requireInternalPreviewAccess()` / `HOMEMATCH_ENABLE_INTERNAL_PREVIEW=true`; default 404 in production (`p1-internal-demo-surface-disposition-2026-05-08.md`) | Row 9 — closed for the launch gate; reintroduction is product-decision-gated |
| API — public bypass | `/api/performance/metrics`, `/api/health` | `middleware.ts:21,107`; `__tests__/unit/middleware.test.ts`; `__tests__/integration/api/performance-metrics.spec.ts`; `__tests__/integration/api/health.spec.ts` | Row 8 (no-auth) |
| API — auth-required mutations | All `/api/couples/*`, `/api/interactions*`, `/api/maps/{geocode,places/autocomplete}`, `/api/users/*`, `/api/properties/vibes`, `/api/neighborhoods/vibes` | `requireUserFromRequest`; `__tests__/integration/api/auth-smoke-matrix.spec.ts` (handler matrix; refuses non-local targets) | Row 3 — API auth smoke live token + server |
| API — admin/cron secret | `/api/admin/*` | `x-cron-secret` / `cron_secret`; `rateLimitAdminRoute`; per-route unit tests | Row 10 — paid/external surfaces |
| API — public paid-provider proxies | `/api/maps/proxy-script`, `/api/maps/script`, `/api/zillow/random-image` | Per-route unit tests; `fetchWithTimeout` 10s; `__tests__/unit/api/maps-proxy-script.route.test.ts`; `__tests__/unit/app/api/zillow/random-image/route.test.ts` | Row 10 |

## 3. Remaining live-auth gates (no change in this slice)

The strict OG gate stays where `phase0-phase1-strict-closure-gate.md`
and `p0-p1-blocker-evidence-index-2026-05-08.md` leave it. Specific
gates referenced by this crosswalk:

- Row 1 — Authenticated browser traversal for protected pages.
- Row 2 — E2E auth lifecycle (signup / login / verify / logout /
  session clearing, `redirectTo` round-trip).
- Row 3 — API auth smoke live token + server (`API_AUTH_SMOKE_TOKEN`
  from a seeded non-production user, local `127.0.0.1:3000` or
  approved non-production remote with
  `ALLOW_REMOTE_API_AUTH_SMOKE=1`).
- Row 6 — D3 production email confirmation + CAPTCHA execution.
- Row 8 — Final public no-credential traversal artifact (Playwright /
  local-smoke). Repo-side actionable today; no approval beyond a
  local app target.
- Row 11 — Authenticated mutation / storage / invite / account
  positive flows.
- Row 12 — Protected positive accessibility traversal.

## 4. What this note does NOT do

- Does not change the Phase 0/1 verdict or move any blocker row.
- Does not authorize a live browser run, authenticated traversal,
  external service call, new fixture, or new secret.
- Does not duplicate or supersede
  `no-credential-accessibility-route-taxonomy-2026-05-08.md`,
  `p0-full-route-api-endpoint-inventory-matrix-2026-05-08.md`,
  `p0-p1-blocker-evidence-index-2026-05-08.md`, or
  `auth-boundary-consolidation-2026-05-08.md`. It is a one-page
  reviewer crosswalk that points at them.

## 5. Source artifacts (canonical)

- `src/lib/routing/protected-routes.ts`
- `middleware.ts` and `src/middleware.ts`
- `__tests__/unit/lib/routing/protected-routes.test.ts`
- `__tests__/unit/routing/no-auth-traversal-smoke-guard.test.ts`
- `__tests__/unit/middleware.test.ts`
- `__tests__/unit/app/protected-page-auth-redirects.test.tsx`
- `reports/home-match-revival/no-credential-accessibility-route-taxonomy-2026-05-08.md`
- `reports/home-match-revival/p0-full-route-api-endpoint-inventory-matrix-2026-05-08.md`
- `reports/home-match-revival/p0-p1-blocker-evidence-index-2026-05-08.md`
- `reports/home-match-revival/p0-p1-strict-anonymous-protected-route-closure-2026-05-08.md`
- `reports/home-match-revival/auth-boundary-consolidation-2026-05-08.md`
- `reports/home-match-revival/p1-internal-demo-surface-disposition-2026-05-08.md`
- `reports/home-match-revival/d79-cookie-session-security-index-2026-05-08.md`
