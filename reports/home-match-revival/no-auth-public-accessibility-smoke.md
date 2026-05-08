# No-credential public accessibility smoke

Generated: 2026-05-08T14:39:38Z
Task: t_9d0e1a2d reconciling paused t_f2f16860 artifacts
Branch: autonomy/6h-business-hardening

## Scope

Phase 0/1 repo-local harness only. No credentials, production sessions, paid APIs, provider-positive mutations, real invite tokens, real listing data, or external dashboards.

## Reconciled artifacts

- Preserved and adapted `__tests__/e2e/no-auth-public-accessibility.spec.ts` as a bounded Playwright smoke suite.
- Preserved `playwright.no-auth-accessibility.config.ts` with one worker, no retries, local loopback base URL, dummy Supabase public env, and short middleware timeout for anonymous redirect checks.
- Updated `src/components/legal/CookieConsentBanner.tsx` so the cookie preferences panel is focusable, Escape closes it, and focus returns to the Manage settings trigger.
- Added `test:e2e:no-auth-accessibility` to `package.json` for the bounded harness.

## Coverage

Public/no-auth page shells:

- `/`
- `/about`
- `/contact`
- `/terms`
- `/privacy`
- `/cookies`
- `/login`
- `/signup`
- `/reset-password`
- `/verify-email`
- `/auth/auth-code-error`

Other no-auth surfaces:

- Cookie preferences keyboard focus, Escape close, and return focus.
- `/robots.txt` and `/sitemap.xml` anonymous availability.
- Synthetic missing route returns 404 with a visible document body.
- Anonymous protected redirects for `/dashboard`, `/dashboard/liked`, `/profile`, `/settings`, `/household/create`, `/household/join`, `/couples`, `/couples/decisions`, `/properties/synthetic-property-id`, and `/validation`.

## Verification

Passed static/config fallback:

- `pnpm exec eslint __tests__/e2e/no-auth-public-accessibility.spec.ts playwright.no-auth-accessibility.config.ts src/components/legal/CookieConsentBanner.tsx`
- `pnpm exec playwright test --config=playwright.no-auth-accessibility.config.ts --list`
  - Listed 14 tests in 1 file.

Live browser run blocked by local Playwright browser cache, not by the test code:

- Command: `NO_AUTH_ACCESSIBILITY_BASE_URL=http://127.0.0.1:3100 pnpm exec playwright test --config=playwright.no-auth-accessibility.config.ts`
- Result: 14 failed immediately before navigation because Playwright could not find Chromium headless shell at `/home/shan/.hermes/profiles/frontend-eng/home/.cache/ms-playwright/chromium_headless_shell-1194/chrome-linux/headless_shell`.
- Playwright suggested `pnpm exec playwright install`. That install was not run in this repo-local Phase 0/1 reconciliation because it is an environment-level browser download rather than a bounded code verification step.

## Status

Harness is ready for a live no-credential smoke run once the frontend-eng profile has the matching Playwright Chromium browser installed. Until then, the verified fallback is config/list/lint only.
