# D134 — Accessibility static-coverage ↔ live-traversal gap index

Generated: 2026-05-08
Branch: `autonomy/hm-d134-accessibility-live-gap-index-2029`
Scope: bounded Phase 0/1 docs slice. This report does not run a browser, start the app, hit Supabase, call paid providers, mutate live data, install Playwright browsers, or open external dashboards. It indexes which accessibility acceptance categories already have repo-side static or no-credential coverage, which still require live/authenticated traversal, and the exact default-safe next check available today for each row.

## Why this index exists

Reviewers asked one question repeatedly across the existing accessibility artifacts: "Per A11Y category, what is already repo-side closed, and what specifically remains gated on the authenticated/live lane in row 1 / row 12 of the blocker evidence index?" `accessibility-core-flow-matrix.md`, `no-auth-public-accessibility-smoke.md`, and `no-credential-accessibility-route-taxonomy-2026-05-08.md` already carry the underlying facts. This index pulls them into one per-category table so the answer is one page, not three.

It does not change any gate, supersede any prior artifact, or authorize any new lane. Authority for the live/authenticated lane stays with rows 1, 2, 8, 11, and 12 of `p0-p1-blocker-evidence-index-2026-05-08.md`.

## Per-category gap matrix

Categories are the A11Y-1 … A11Y-8 acceptance set defined in `accessibility-core-flow-matrix.md` lines 17-24.

| ID | Repo-side coverage today | Remaining live/authenticated gap | Default-safe next check available now |
| --- | --- | --- | --- |
| A11Y-1 Keyboard-only navigation | Static classification guard (`__tests__/unit/accessibility/core-flow-matrix.test.ts`); bounded Playwright spec asserts public/no-auth shells render h1 + main + no unlabeled controls (`__tests__/e2e/no-auth-public-accessibility.spec.ts`); cookie preferences keyboard focus + Escape + return-focus path covered. | Authenticated keyboard traversal of `/dashboard`, `/dashboard/liked|passed|viewed|mutual-likes|activity`, `/profile`, `/settings`, `/couples`, `/couples/decisions`, `/properties/[id]`, `/household/create|join`, plus `/invite/[token]` acceptance. Gated on rows 1 + 11 + 12 of the blocker evidence index. | Repo-side: re-run the static matrix Jest guard under `systemd-run -p MemoryMax=2G -p CPUQuota=200%`. No browser, no auth. |
| A11Y-2 Visible focus | Static category presence in matrix; component-level conventions in shadcn/ui primitives. No browser-rendered focus-ring evidence. | Visible focus spot check across the public + protected route set requires a live browser pass; Playwright Chromium cache is not installed in the frontend-eng profile (see `no-auth-public-accessibility-smoke.md` Verification). | Repo-side: lint + config/list verification for the bounded smoke spec; do not install browsers in this slice. |
| A11Y-3 Heading and landmarks | Bounded smoke spec asserts `h1` and `main`/`role=main` on each public/no-auth page shell; static matrix declares the expectation per route. | Heading/landmark checks for each protected route must run after authenticated render; same auth/session gate as A11Y-1. | Repo-side: confirm new public routes added to the matrix continue to declare A11Y-3 metadata; no live render. |
| A11Y-4 Form labels and errors | Auth UI shells (`/login`, `/signup`, `/reset-password`, `/verify-email`, `/auth/auth-code-error`) covered by the no-auth smoke spec for label presence; `__tests__/unit/auth/*` and household clipboard tests cover related form behavior. No real credentials, tokens, email, or CAPTCHA exercised. | Settings, profile, household create/join, invite acceptance, and any protected mutation form (interactions, saved searches) need authenticated label + error-announcement traversal. Tied to row 11. | Repo-side: the existing public auth-form coverage stays valid without re-running. No-credential extension would be a focused RTL test, not a browser swarm. |
| A11Y-5 Current navigation state | Static metadata in the matrix declares which protected routes carry persistent navigation; component-level tests cover targeted nav primitives. | `aria-current` / equivalent state on the live nav (dashboard, couples, settings) needs an authenticated render; not exercised by the no-auth smoke. | Repo-side: keep the matrix entry per route; no live render in this slice. |
| A11Y-6 Images / icons | Conventions enforced by static matrix and existing component tests; no seeded property data rendered. | Property image alt text against representative seeded listings (no production Zillow data) is gated on row 1 (auth/session) and row 10 (paid/external). | Repo-side: confirm the matrix continues to attribute A11Y-6 to property detail and dashboard list rows; do not call Zillow/RapidAPI. |
| A11Y-7 Dialog focus management | Cookie preferences focus trap / Escape / return-focus is covered by the bounded smoke spec plus `src/components/legal/CookieConsentBanner.tsx`. | Property detail modal, household/invite dialog, and any settings dialog need authenticated render. Tied to rows 1 + 11. | Repo-side: targeted RTL test for cookie focus already exists; protected dialogs stay gated. No live render. |
| A11Y-8 Color contrast | Risk acknowledged in the static matrix only; no contrast tooling output committed. | Visual contrast spot check across light/dark surfaces requires a live browser pass + visual tooling. Same browser-cache gap as A11Y-2. | Repo-side: leave the static matrix risk flag in place; do not install visual-tooling deps in this slice. |

## What is explicitly default-safe and runnable today

These are the only repo-local checks this index relies on; none mutate state, hit network, or require credentials.

- `pnpm exec jest __tests__/unit/accessibility/core-flow-matrix.test.ts` — static matrix guard (5/5 prior pass under resource limits).
- `pnpm exec eslint __tests__/e2e/no-auth-public-accessibility.spec.ts playwright.no-auth-accessibility.config.ts src/components/legal/CookieConsentBanner.tsx` — bounded smoke spec + config + cookie banner static lint.
- `pnpm exec playwright test --config=playwright.no-auth-accessibility.config.ts --list` — config/list verification only; no browser launch.
- `git diff --check` — sufficient for docs-only changes in this worktree per the worker rules.

Anything beyond this list (Playwright browser install, app boot, Supabase, Zillow/RapidAPI/Maps, email/CAPTCHA, external dashboards, real users, real invite tokens) stays out of scope for this slice.

## Pointers to existing live-evidence gates

These remain canonical. This index only references them.

- Authenticated traversal lane decision: row 1 of `p0-p1-blocker-evidence-index-2026-05-08.md`.
- E2E auth lifecycle environment: row 2 of the same index, with policy in `d3-signup-verification-policy-decision-2026-05-08.md` and machine guard `config/signup-verification-launch-policy.json`.
- Public no-credential local execution artifact: row 8 of the index, harness `__tests__/e2e/no-auth-public-accessibility.spec.ts` + `playwright.no-auth-accessibility.config.ts`.
- Authenticated mutation/storage/invite/account flows: row 11 of the index.
- Protected positive accessibility traversal: row 12 of the index.
- Route taxonomy single source: `src/lib/routing/protected-routes.ts` plus `__tests__/unit/lib/routing/protected-routes.test.ts`.
- Per-category acceptance list and route matrix: `accessibility-core-flow-matrix.md`.
- Bounded smoke artifact + browser-cache blocker note: `no-auth-public-accessibility-smoke.md`.
- One-page route ↔ a11y crosswalk: `no-credential-accessibility-route-taxonomy-2026-05-08.md`.

## What this index does NOT do

- Does not change Phase 0/1 closure verdict; rows 1, 2, 8, 11, and 12 of `p0-p1-blocker-evidence-index-2026-05-08.md` stay where they are.
- Does not authorize a live browser run, an authenticated traversal, an external service call, a Playwright browser install, or any new fixture/secret.
- Does not duplicate the matrix, the smoke artifact, or the crosswalk; it only indexes them per A11Y category for reviewer ergonomics.
- Does not introduce new code, tests, migrations, or scripts. This is a docs-only Phase 0/1 artifact.
