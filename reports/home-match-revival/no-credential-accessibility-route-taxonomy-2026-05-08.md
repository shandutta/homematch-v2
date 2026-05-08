# No-credential accessibility ↔ route taxonomy crosswalk

Generated: 2026-05-08
Branch: autonomy/hm-accessibility-route-taxonomy-1748
Scope: bounded Phase 0/1 docs slice. This report does not run a browser, start the app, hit Supabase, call paid providers, mutate live data, or open external dashboards. It only ties existing no-credential accessibility coverage to the existing public/protected route taxonomy and restates how live browser/auth evidence remains gated.

## Why this crosswalk exists

`accessibility-core-flow-matrix.md` and `no-auth-public-accessibility-smoke.md` already enumerate accessibility acceptance categories (A11Y-1 … A11Y-8) and the bounded smoke harness. `p0-full-route-api-endpoint-inventory-matrix-2026-05-08.md` and `src/lib/routing/protected-routes.ts` already enumerate the route taxonomy (public, protected, token-public, internal-preview-gated). What is missing for reviewers is a single page that maps each route class to the no-credential accessibility coverage it gets today versus the live evidence it still needs. This crosswalk is that page.

## Route taxonomy classes

Single source of truth for protected prefixes is `src/lib/routing/protected-routes.ts`:

```
PROTECTED_PATH_PREFIXES = [
  '/dashboard', '/profile', '/household', '/settings',
  '/validation', '/couples', '/properties',
]
```

Classes used in this crosswalk:

- **Public no-credential** — anonymous traversal is the intended posture. `isProtectedPath()` returns `false`.
- **Protected** — middleware redirects anonymous requests to `/login` with a safe `redirectTo`. `isProtectedPath()` returns `true`.
- **Token-public, auth-gated acceptance** — the page can render anonymously for an invite token, but mutation/acceptance still requires auth. `isProtectedPath('/invite/test-token') === false`. Only synthetic tokens may be used in repo-side tests.
- **Internal-preview-gated** — the route only renders when `requireInternalPreviewAccess()` / `HOMEMATCH_ENABLE_INTERNAL_PREVIEW=true`; otherwise it returns 404. Production posture defaults to "not exposed."

## Crosswalk

| Route class | Routes | No-credential accessibility coverage today | Live browser/auth evidence still gated |
| --- | --- | --- | --- |
| Public no-credential — marketing/legal | `/`, `/about`, `/contact`, `/terms`, `/privacy`, `/cookies` | Static page existence + classification guard via `__tests__/unit/accessibility/core-flow-matrix.test.ts`; bounded Playwright smoke spec `__tests__/e2e/no-auth-public-accessibility.spec.ts` (lang attribute, body visible, h1 present, `main`/`role=main` present, no unlabeled controls); cookie focus/Escape/return-focus path covered by the same spec plus existing component-level tests | Live Playwright run requires installed Chromium browser cache for the frontend-eng profile (see `no-auth-public-accessibility-smoke.md` Verification section). No browser run authorized in this slice. |
| Public no-credential — auth UI shells | `/login`, `/signup`, `/reset-password`, `/verify-email`, `/auth/auth-code-error` | Same static guard + smoke spec coverage as above for unauthenticated form rendering and labeling. No real credentials, tokens, or email/CAPTCHA paths exercised. | Successful login/signup/verify/reset traversal and OAuth callback success remain gated on approved non-production auth/session, local Supabase/Docker, and a non-production email sink (rows 2 and 6 of `p0-p1-blocker-evidence-index-2026-05-08.md`). |
| Public no-credential — metadata/error | `/robots.txt`, `/sitemap.xml`, synthetic missing route | Anonymous availability + 404 document shell verified by the bounded smoke spec. | None additional needed for these surfaces. |
| Protected — anonymous redirect coverage | `/dashboard`, `/dashboard/liked`, `/dashboard/passed`, `/dashboard/viewed`, `/dashboard/mutual-likes`, `/dashboard/activity`, `/profile`, `/settings`, `/household/create`, `/household/join`, `/couples`, `/couples/decisions`, `/properties/[id]`, `/validation` | Static guard asserts `isProtectedPath(...)` is `true` for each concrete representative; smoke spec asserts anonymous request lands on `/login` with `redirectTo` preserved when present. No production sessions used. | Authenticated positive accessibility traversal (A11Y-1 keyboard, A11Y-5 active nav state, A11Y-6 image alt for seeded listings, A11Y-7 modal/dialog focus trap on property detail and household/invite, A11Y-8 contrast spot check) remains gated on row 1 and row 12 of `p0-p1-blocker-evidence-index-2026-05-08.md`: approved non-production auth/session plus seeded household/profile/property/interactions/invite/settings fixtures. No credentialed browser swarm authorized here. |
| Token-public, auth-gated acceptance | `/invite/[token]` | Static guard asserts `isProtectedPath('/invite/test-token') === false` and that the matrix labels the route Token-public; A11Y-1 / A11Y-4 / A11Y-7 acceptance categories are documented but not exercised against real tokens. Only synthetic tokens are used. | Positive invite render + acceptance flow remains gated on a seeded non-production invite token plus approved auth/session (row 11 of the blocker evidence index). No real invite tokens may be used. |
| Internal-preview-gated | `/dashboard/vibes-test`, `/validation`, `/demo/ads`, `/sponsor-mockups` | Production posture is 404 unless `HOMEMATCH_ENABLE_INTERNAL_PREVIEW=true`; treat as out of the public a11y smoke set in production. `/validation` also appears in the protected anonymous-redirect set under middleware behavior. See `p1-internal-demo-surface-disposition-2026-05-08.md`. | Any visible-in-production reintroduction is a separate product decision (row 9 of the blocker evidence index); not authorized here. |

## What is explicitly gated in this slice

- No browser/Playwright execution. The bounded smoke spec is config/list/lint verified only (see `no-auth-public-accessibility-smoke.md` Verification section).
- No application boot, no Supabase calls (local or remote), no Google Maps / Zillow / RapidAPI / OpenRouter calls, no email send, no CAPTCHA call, no external dashboards.
- No authenticated traversal of any protected route. Authenticated positive a11y coverage stays linked to rows 1, 2, 11, and 12 of `p0-p1-blocker-evidence-index-2026-05-08.md`; nothing in this slice changes their gate.
- No real invite tokens, no production user sessions, no production household/listing data.
- No paid-API surfaces. Paid/external accessibility (e.g., property image alt with seeded Zillow data) stays under row 10 of the blocker evidence index.

## Where evidence already lives

- Static accessibility ↔ route classification guard: `__tests__/unit/accessibility/core-flow-matrix.test.ts` (5/5 Jest, repo-side closed under `systemd-run -p MemoryMax=2G -p CPUQuota=200%`).
- Bounded no-credential smoke spec: `__tests__/e2e/no-auth-public-accessibility.spec.ts` + `playwright.no-auth-accessibility.config.ts` (config/list/lint verified; live run blocked on browser cache install only).
- Cookie preferences focus/escape/return-focus behavior: `src/components/legal/CookieConsentBanner.tsx` plus the cookie scenario inside the smoke spec.
- Route taxonomy source of truth: `src/lib/routing/protected-routes.ts` + `__tests__/unit/lib/routing/protected-routes.test.ts`.
- Endpoint/page taxonomy: `reports/home-match-revival/p0-full-route-api-endpoint-inventory-matrix-2026-05-08.md`.
- Accessibility acceptance categories and per-route gate: `reports/home-match-revival/accessibility-core-flow-matrix.md`.
- Smoke artifact + browser-cache blocker note: `reports/home-match-revival/no-auth-public-accessibility-smoke.md`.
- Blocker linkage with live-evidence gates: rows 1, 2, 8, 11, 12 of `reports/home-match-revival/p0-p1-blocker-evidence-index-2026-05-08.md`.

## What this report does NOT do

- Does not change the Phase 0/1 verdict. The strict OG closure gate stays where `phase0-phase1-strict-closure-gate.md` and `p0-p1-blocker-evidence-index-2026-05-08.md` leave it.
- Does not authorize any live browser run, any authenticated traversal, any external service call, or any new fixture/secret.
- Does not duplicate or supersede `accessibility-core-flow-matrix.md`, `no-auth-public-accessibility-smoke.md`, or the blocker evidence index. It is a one-page reviewer crosswalk that points at them.
