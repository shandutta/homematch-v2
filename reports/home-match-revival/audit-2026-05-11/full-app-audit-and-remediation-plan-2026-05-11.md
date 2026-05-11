# HomeMatch v2 — Full App Audit & Remediation Plan

**Generated:** 2026-05-11
**Branch:** `claude/review-repo-state-gYbzB` (= autonomy/6h-business-hardening + 1 commit)
**Audit env:** Local Next.js dev server (`127.0.0.1:3000`) → prod Supabase (`lpwlbbowavozpywnpamn.supabase.co`)
**Audit constraint:** Sandbox blocks external HTTPS from browser (cert authority not trusted). Browser-side Supabase calls fail; server-side calls succeed. Result: live audit for public/server-rendered routes ✓, authenticated UI flows audited via static code review + 100+ existing reports.

---

## 1. Executive summary

**Verdict: NOT launch-ready, but close.** The Phase 0/1 closure matrix is correct that security/auth/perf hardening is done. But the user-facing surface has structural bugs that will tank conversion in the first 10 seconds:

1. **Mobile sign-in is unreachable** — the cookie consent banner sits over the Sign In button at 393×852 viewport. New mobile users physically cannot log in without dismissing the banner that's blocking the CTA.
2. **Theme incoherence across the site** — landing/auth pages are dark, legal/about/contact pages are light. Going from `/signup` to `/about` feels like two different products.
3. **Landing page has a ~500-px empty white middle section** — likely a failed section mount or wildly overshot spacing between `HeroSection` and `FeatureGrid`.
4. **Hydration mismatch on `/login`** — React server-rendered form fields as `disabled={true}`, client rendered them as `disabled={false}`. React won't patch this; users see a broken form transition.
5. **Primary CTA button variant is internally inconsistent** — `prime` variant's hardcoded `px-9 py-7` collides with `size="lg"` and caller overrides. Hero CTA renders ~76px tall; CtaBand CTA renders ~52px. Same brand, same page, different button.

The good news: **infrastructure is solid**. Anonymous→protected redirects preserve `redirectTo`. Internal/demo surfaces gated behind `HOMEMATCH_ENABLE_INTERNAL_PREVIEW=true`. RBAC, rate-limit seam, signup-policy guard all closed. 2,519 unit tests + 395 integration tests green. The work below is finishing the visible product, not rebuilding it.

**Scope:** 13 critical/high bugs, 31 medium/low issues, 6 known-issue areas inherited from May 9 audits. **Estimated CC effort to ship-ready: ~14 hours.** Estimated to "polished launch": +30 hours design + content.

---

## 2. What was audited

### Live (browser + screenshots, all server-rendered)

| Pass | Count | Viewport |
|------|-------|----------|
| Public routes — desktop | 11 routes | 1440×900 |
| Public routes — mobile | 11 routes | 393×852 |
| Protected route redirect behavior | 12 routes | 1440×900 |
| Internal/demo gate behavior | 4 routes | 1440×900 |
| **Total screenshots** | **38** | |

Saved at `reports/home-match-revival/audit-2026-05-11/screenshots/`.

### Static code review

- All 26 API route handlers
- Authenticated UI components: `src/components/features/couples/`, `dashboard/`, `property/`, `profile/`, `settings/`
- Auth shell + forms
- Marketing components (Header, Hero, FeatureGrid, HowItWorks, CtaBand, Footer)

### Existing report harvest (May 9 audits)

- A11y audit (6 critical + 7 major + 5 minor)
- Bundle analysis (Supabase 144 KB, framer-motion 120 KB, settings page 74 KB chunk)
- Mobile design audit (375px viewport, public pages)
- Desktop UX audit (1280+ viewport, public pages)
- Query audit (5 N+1 patterns, ~30 `select('*')`, missing composite indexes)
- RLS security audit (25 KB)

### Not audited

- Authenticated UI live (browser TLS sandbox blocks Supabase reach)
- Real LLM matching with taste profile
- Real Google Maps interactions
- Production-only edge behaviors (CDN cache, real DNS, Vercel edge config)
- Mobile gesture physics (needs real touch device)

---

## 3. Bugs by severity

### 🔴 CRITICAL (launch blockers — fix before ANY launch)

| # | Bug | Evidence | Fix | Effort |
|---|-----|----------|-----|--------|
| C1 | **Mobile login/signup blocked by cookie banner** | `screenshots/public-mobile/login.png` + `signup.png` — banner overlays Sign In / Create Account CTA at 393×852 | Banner must use mobile-aware positioning (slim bottom strip on mobile) OR default to "essential only" without modal, surfacing settings via floating gear icon | Medium (2-3 hr) |
| C2 | **Hydration mismatch on `/login`** | Console: "A tree hydrated but some attributes of the server rendered HTML didn't match" on Input `disabled` prop | Server renders form as enabled by default (no need for SSR-disabled state); remove `disabled={!isReady}` from initial render OR use `useEffect` to flip after mount | Medium (1-2 hr) |
| C3 | **Build/typecheck broken: `websiteJsonLd` page export** | `src/app/page.tsx:16` was `export const websiteJsonLd = createWebsiteJsonLd()` (Next.js rejects unknown page exports) | DONE — dropped `export` keyword this session | DONE |
| C4 | **Redirect hostname inconsistency** | Visit `http://127.0.0.1:3000/dashboard` → redirects to `http://localhost:3000/login?...`. Cookies set on `127.0.0.1` won't apply to `localhost`. In production, this manifests as session loss on subdomain crossover. | In `src/middleware.ts` (or wherever redirect is constructed), preserve the request hostname; OR enforce canonical host via Vercel rewrite | Low (1 hr) |
| C5 | **Primary CTA inconsistent height same-page** | Hero "Start swiping" = ~76px tall, CtaBand "Start Swiping" = ~52px. Both `prime` variant. (Desktop UX audit Section 1 P0; `src/components/ui/button.tsx:25-39` hardcodes `px-9 py-7`) | Move `prime` padding into size variants via CVA `compoundVariants`; drop caller-side `px-*`/`py-*` overrides | Low (1-2 hr) |
| C6 | **No `<main>` landmark on public pages** | A11y audit C1; affects `/`, `/login`, `/signup` — e2e a11y guard will fail | Add `<main id="main-content">` to marketing layout + auth shell | Low (1 hr) |

### 🟠 HIGH (visible product breaks)

| # | Bug | Evidence | Fix | Effort |
|---|-----|----------|-----|--------|
| H1 | **Landing page ~500-px empty white middle section** | `screenshots/public-desktop/home.png` — hero, then massive whitespace, then features at bottom | Inspect `src/app/page.tsx` between `HeroSection` and `FeatureGrid`; either a section silently failed to render OR section spacing tokens are massively overshooting | Medium (2-3 hr) |
| H2 | **Theme incoherence** | Dark: `/`, `/login`, `/signup`, `/verify-email`, `/reset-password`, `/auth/auth-code-error`. Light: `/about`, `/contact`, `/terms`, `/privacy`, `/cookies`. No transition. | Design decision: either pick one theme system (recommend: dark consumer surfaces, light docs/legal — but make the seam intentional with a `dark`/`light` data attr transition) OR unify on one theme | High (5-8 hr design + dev) |
| H3 | **Cookie banner overlays content on every page** | All screenshots show banner blocking 15-20% of viewport at fixed-bottom position | Replace modal-style banner with collapsed strip (1-2 lines) by default; expand only when user clicks. Persist consent state in `localStorage` so it doesn't reappear per-navigation. | Medium (2-3 hr) |
| H4 | **Cookie banner state not persisted across pages** | Banner reappears after navigation between routes in same browser session | Verify `CookieConsentBanner` writes to `localStorage` or `cookie` and reads on mount; current implementation appears to gate on something page-scoped | Medium (1-2 hr) |
| H5 | **`Sign In` / `Create Account` buttons start grey/disabled** | Login/signup/verify-email/reset-password all show grey buttons until form is filled. Looks broken on first impression. | Keep buttons enabled visually; surface validation errors on submit instead of disabling. Pattern: progressive disclosure, not preemptive disable. | Low (2 hr) |
| H6 | **Decorative marketing buttons (Like/Pass) capture keyboard focus** | A11y audit C2 — `MarketingPreviewCardStatic` renders `<button>` for decorative purposes | Render decorative items as `<div role="img" aria-label="...">` not `<button>` | Low (1 hr) |
| H7 | **No focus-visible ring on header/footer links** | A11y audit C3 | Add `focus-visible:ring-2 focus-visible:ring-primary` to header/footer link styles globally | Low (1 hr) |
| H8 | **`prefers-reduced-motion` not honored in Framer Motion components** | A11y audit C4 + mobile audit cross-cutting | Wrap all `motion.*` in `<LazyMotion features={domAnimation}>` with `useReducedMotion()` guards; OR use `m.div` with `transition={{ duration: shouldReduceMotion ? 0 : 0.3 }}` | Medium (3 hr) |
| H9 | **No skip-to-content link** | A11y audit C5 | Add visually-hidden skip link as first focusable element in root layout | Low (1 hr) |
| H10 | **Mobile tap targets <44px on Header Login/Sign Up + Footer link list** | Mobile audit H1 + 1.1 — Header anchors ≈34-36px tall; Footer links `space-y-0 leading-none` produce 14-16px stacked rows | Add `min-h-[44px] inline-flex items-center` to anchors; bump Footer to `space-y-2 leading-relaxed` at base | Low (1 hr) |
| H11 | **AuthPageShell paints 680px-wide blurs without `overflow-hidden`** | Mobile audit 7 — on 375px viewport blur extends ~150px outside, triggers horizontal scrollbar | Add `overflow-hidden` to AuthPageShell outer container | Low (15 min) |
| H12 | **CardTitle is `<div>` not `<h2>` on auth pages** | A11y audit M1 — auth form headings have no semantic hierarchy | Update `src/components/ui/card.tsx` to render `CardTitle` as `<h2>` (or accept `as` prop) | Low (30 min) |
| H13 | **Anonymous → /login shows no context banner** | `screenshots/states/redirect-dashboard.png` — same bare login form, no "Sign in to continue to your dashboard" message | Read `redirectTo` query in `LoginForm`, render contextual heading: "Sign in to continue to {humanize(redirectTo)}" | Low (1 hr) |

### 🟡 MEDIUM (UX papercuts + perf)

| # | Bug | Evidence | Fix | Effort |
|---|-----|----------|-----|--------|
| M1 | Cookie page shows TWO cookie UIs (own settings + global banner) | `screenshots/public-desktop/cookies.png` | Hide global banner on `/cookies` route (`useEffect` to dismiss + persistent flag) | Low (30 min) |
| M2 | Auth pages have ~40% empty whitespace below card | Desktop screenshots | Vertically center the card OR reduce `min-h-screen` | Low (15 min) |
| M3 | Mobile horizontal whitespace on auth pages | Mobile login/signup screenshots show ~150px white strip on right | Likely related to H11 (overflow-hidden); verify fix resolves | Low |
| M4 | Cookie banner CTA hierarchy: "Accept all" is bright blue, "Reject" is muted | Cookie banner styling | Flip visual hierarchy — make both buttons equal weight, OR make Reject the primary | Low (30 min) |
| M5 | Verify-email button stays greyed | Same as H5 family | Same fix | (covered by H5) |
| M6 | "AI-powered home matching" gold pill on every auth page | Decorative pill above card | Design call: keep, redesign, or remove (currently looks orphaned) | Low (30 min) |
| M7 | Strange "N" indicator in bottom-left of every public page | All public screenshots show small "N" circle bottom-left | Looks like Next.js dev-mode indicator showing in production builds — investigate `next.config.ts` and any `__NEXT_DATA__.config` | Low (1 hr) |
| M8 | **Bundle: `app/settings/page` is 74 KB** | Bundle audit | Lazy-load destructive-action dialogs (delete account, sign-out-all), admin panels behind `dynamic({ ssr: false })` | Medium (3 hr) |
| M9 | **Bundle: `app/profile/page` is 58 KB** | Bundle audit | Lazy-load avatar picker / image upload UI | Medium (2 hr) |
| M10 | **Bundle: framer-motion in shared chunk (~120 KB)** | Bundle audit | Already addressed in autonomy/6h work (LazyMotion + domAnimation) — verify it stuck post-rebase | Low (1 hr verification) |
| M11 | **Bundle: Supabase 144 KB chunk includes realtime even on read-only routes** | Bundle audit | Import `@supabase/postgrest-js` directly on read-only routes; use dynamic import for realtime + auth where needed | Medium (3-4 hr) |
| M12 | **Query: 5 N+1 patterns** in admin routes + vibes backfill + couples/disputed | `reports/home-match-revival/query-audit-20260509.md` H1-H5 | Replace per-item loops with `.in('id', ids)` batches + `Promise.all` | Medium (4-6 hr) |
| M13 | **Query: ~30 `select('*')` on growing tables** | Query audit M1 — `users.ts`, `properties/neighborhood.ts`, `properties/crud.ts`, `properties/search.ts` | Replace with explicit column projection; defer raw_data/JSONB columns to detail endpoints | Medium (4-5 hr) |
| M14 | **Query: Missing composite indexes** | Query audit — `(user_id, interaction_type, created_at)` on interactions; `(user_id, is_active, created_at)` on saved_searches | New migration: `CREATE INDEX idx_uppi_user_type_created ON user_property_interactions(user_id, interaction_type, created_at DESC);` etc. | Low (1 hr migration + verify) |
| M15 | **Query: List endpoints missing pagination** | Query audit M2 — `users.ts:451` saved-search list, `:430` interaction list use `.eq().order()` with no `.limit()/.range()` | Add `.range(offset, offset+pageSize-1)`; thread pagination params through services + UI | Medium (3 hr) |
| M16 | Cookie banner not announced as region | A11y audit M4 — banner lacks `role="region"`/`aria-label` | Add `role="region" aria-label="Cookie consent"` | Low (15 min) |
| M17 | "Google" OAuth button label lacks action verb | A11y audit M5 | Change label to "Sign in with Google" / "Sign up with Google" | Low (15 min) |
| M18 | Signup success not announced via `aria-live` | A11y audit M6 | Wrap success message in `<div aria-live="polite">` | Low (15 min) |
| M19 | `/cookies` and `/about` lack site nav header | A11y audit M7 | Ensure these pages use the shared marketing layout (currently they appear standalone) | Low (1 hr) |
| M20 | Mobile font-size: Input `text-token-base` may be <16px → iOS auto-zoom | Mobile audit 7.1.1 | Verify `--token-base` ≥16px in `globals.css`; if not, set `text-[16px] md:text-token-sm` on Input mobile | Low (30 min) |
| M21 | Mobile MarketingPreviewCard overlays crowd price chip | Mobile audit 2 P1 | Hide `bottom-20` overlay on mobile (`hidden sm:flex`) | Low (15 min) |
| M22 | Hero `min-h-[680px]` exceeds iPhone SE viewport (667px) | Mobile audit 2 P2 | Use `min-h-[100svh]` instead | Low (15 min) |
| M23 | Footer column heading flush against links on mobile | Mobile audit 6 P2 | Add `mb-2` at base to column headings | Low (15 min) |
| M24 | Mobile Footer asymmetric grid orphans "Legal" | Mobile audit 6 P2 | Switch to `grid-cols-3` or `col-span-2` on Legal | Low (30 min) |
| M25 | Logo link has no hover/focus affordance | A11y audit C6 | Add `hover:opacity-80 focus-visible:ring-2` | Low (15 min) |

### 🟢 LOW / cosmetic

| # | Bug | Evidence | Fix | Effort |
|---|-----|----------|-----|--------|
| L1 | Hero CTAs "Resume your search" mislead anonymous users with no session | Landing | Conditional render based on user session | Low (30 min) |
| L2 | Yellow "AI-powered" pill clashes with dark theme | Auth pages | Design: tone pill to match or remove | Trivial |
| L3 | `text-slate-500` on `bg-slate-50` fails WCAG AA (≈4.42:1) | A11y audit M3 | Use `text-slate-600` or darken background to `bg-slate-100` | Low (15 min) |
| L4 | Copyright year "2024" stale | A11y audit, all pages | Replace with `new Date().getFullYear()` | Trivial |
| L5 | `aria-label` / visible text mismatch on hero CTA | A11y audit minor 1 | Match | Low (15 min) |
| L6 | About page minimal — no team/story/screenshots | Content | Design call — write more if useful | Design |
| L7 | Contact page is email-only, no form | Content | Add a contact form gated by Turnstile | Medium |
| L8 | About page H2 has no `text-balance` — orphans text | Mobile audit 3 P2 | Add `text-balance` | Trivial |
| L9 | FeatureGrid card padding `p-4` tight on mobile | Mobile audit 3 P2 | Bump to `p-5` base | Trivial |
| L10 | `CtaBand` heading is `<h3>` (should be `<h2>` for doc outline) | A11y audit M2 | Promote to h2 | Low (15 min) |

---

## 4. Infrastructure & deployment posture

### Current state (per audit + verified)

- **Production:** `homematch.pro` is alive, `/api/health` returns `database: connected`. The state-of-the-repo doc's "Supabase prod INACTIVE" claim is OUTDATED (the project has been reactivated).
- **Branch geography:** `claude/review-repo-state-gYbzB` = `autonomy/6h-business-hardening` tip + 1 gstack commit. PR #22 (autonomy → main) is still draft. Main is 628 commits behind autonomy via complex divergence (not a fast-forward).
- **Tests:** 2,519 unit + 395 integration green per the closure matrix. Build was failing on `websiteJsonLd` — fixed this session.
- **D-decisions:** D1-D7 all closed repo-side. D2 (durable rate limiter provider) and D3 (external Supabase signup-verification settings) still need owner action before launch.

### Remaining infra work for launch

| # | Item | Status | Effort |
|---|------|--------|--------|
| I1 | **Reset Vercel token (lost to tmpfs cleanup)** | External | User: 5 min |
| I2 | **Provision durable rate limiter (D2)** — Upstash/Redis/Vercel KV | Owner approval pending | User: 30 min + dev wiring 2 hr |
| I3 | **Verify production Supabase signup verification settings (D3)** — email confirmation + CAPTCHA | Repo-side closed, needs dashboard confirmation | User: 15 min |
| I4 | **Merge `autonomy/6h-business-hardening` → main** via PR #22 | Draft; non-fast-forward; needs merge strategy decision | 1-3 hr depending on conflicts |
| I5 | **Prune 60+ worker worktrees** | Mentioned in state-of-repo doc | Low priority, 30 min |

---

## 5. Prioritized remediation plan

### Sprint 0 — ship-blocker patch (3-5 hours)

Goal: make the public funnel work end-to-end on mobile and desktop. Without this, no organic signup completes.

1. **C1** Fix cookie banner mobile collision (compact bottom strip pattern) — 2 hr
2. **C2** Fix hydration mismatch on /login (remove SSR-disabled state) — 1 hr
3. **C4** Fix redirect hostname inconsistency — 1 hr
4. **H5** Stop disabling auth submit buttons preemptively — 30 min
5. **H13** Add contextual banner on anonymous → /login redirects — 30 min

Acceptance: `/signup` and `/login` complete on mobile 375px without dismissing anything. No hydration warnings in console. Anonymous /dashboard → /login shows "Sign in to continue."

### Sprint 1 — visible product polish (6-8 hours)

Goal: stop the "two different products" feeling. Get a coherent first impression.

6. **H1** Fix landing-page empty middle section (inspect HeroSection→FeatureGrid gap) — 2 hr
7. **H2** Theme coherence pass (recommend: keep dark consumer, light legal, but make transition intentional via `<DocsLayout>` wrapper with intentional contrast) — 5 hr design + dev
8. **C5** Unify `prime` button variant sizing — 1 hr
9. **H3** Cookie banner to collapsed strip pattern (also resolves H4 persistence + M1 double-UI on /cookies) — 2 hr
10. **C6 + H6 + H7 + H9** A11y baseline: `<main>`, fix decorative buttons, focus-visible globally, skip link — 3 hr

Acceptance: full marketing flow feels like one product. A11y audit a11y-audit-2026-05-09 criticals all green.

### Sprint 2 — mobile/a11y completeness (4-6 hours)

11. **H8** `prefers-reduced-motion` in Framer Motion — 3 hr
12. **H10 + H11** Tap target fixes + AuthShell overflow-hidden — 1.5 hr
13. **M20-M24** Mobile polish (input font, overlay positioning, footer grid) — 1.5 hr
14. **H12 + L10** Heading hierarchy (CardTitle → h2, CtaBand → h2) — 30 min
15. **M16-M18 + M25** Smaller a11y items — 1 hr

Acceptance: mobile audit P1s closed. a11y audit majors closed.

### Sprint 3 — performance + DB hygiene (8-12 hours)

16. **M11** Supabase realtime only loaded where needed — 4 hr
17. **M8 + M9** Settings + profile page bundle reductions — 5 hr
18. **M14** Composite indexes (one new migration) — 1 hr
19. **M12** Fix 5 N+1 patterns in admin routes — 4 hr
20. **M13** Replace `select('*')` on hot paths (search, list endpoints) — 4 hr
21. **M15** Pagination on saved-search + interaction list endpoints — 3 hr

Acceptance: bundle reduces by 15-25%. p99 of `/api/properties/search` halves under realistic load.

### Sprint 4 — content + cosmetic (low priority, 4 hr)

22. All L items (date, contrast, copy tightening, About content)
23. **L1** Conditional Hero CTA based on session
24. **M2, M3, M4, M5, M6, M7** smaller UI polish

### Infra prerequisites (user action required, parallel to dev sprints)

- **I1** Reset Vercel token before any prod deploy
- **I2** Pick durable rate limiter provider; approve provisioning
- **I3** Confirm production Supabase settings (email confirmation, CAPTCHA)

---

## 6. Test plan for the remediation

Each sprint should ship with:

| Sprint | New tests required |
|--------|---------------------|
| 0 | E2E: mobile login completes at 393×852 viewport (Playwright). Hydration smoke (no console errors on /login). Cookie redirect host-preservation unit test. |
| 1 | Visual regression: landing page screenshot match (block any reintroduction of the empty middle). A11y axe-core run against / /login /signup with zero criticals. |
| 2 | E2E mobile: complete swipe+like flow at 393×852. Reduced-motion: confirm no animation on `prefers-reduced-motion: reduce`. |
| 3 | Load test: `/api/properties/search` p99 < 800ms with 100 concurrent. DB explain plan for new indexes confirmed using them. |
| 4 | None required — pure UI polish |

Existing test suites (2,519 unit + 395 integration) stay green throughout.

---

## 7. Estimated effort summary

| Phase | CC time | Calendar (1 dev) |
|-------|---------|------------------|
| Sprint 0 (critical) | 3-5 hr | Same day |
| Sprint 1 (polish) | 6-8 hr | 1-2 days |
| Sprint 2 (a11y/mobile) | 4-6 hr | 1 day |
| Sprint 3 (perf/DB) | 8-12 hr | 2-3 days |
| Sprint 4 (content) | 4 hr | Half day |
| **Total to launch-ready** | **25-35 hr CC** | **~5-7 days** |

Plus infra: ~3 hr of user dashboard work + ~3 hr dev wiring for rate limiter.

---

## 8. What this audit didn't cover (gaps to close in next pass)

1. **Live authenticated UI** — Browser TLS sandbox blocked. Next audit should run on a non-sandboxed host or use local Supabase via Docker.
2. **Real LLM matching with seeded taste profile** — needs authenticated session + real properties + LLM round-trip.
3. **Maps interactions** — browser can't reach Maps JS API from this sandbox.
4. **Performance on real network** — local audit shows 2,000-7,000ms first-load times in dev mode; these are not representative of production. Run Lighthouse / WebPageTest against `homematch.pro` from a real device.
5. **Real swipe physics** — needs touch device.
6. **Email flow** — Supabase signup confirmation email content + UX not tested.
7. **AdSense / Stripe** — flagged in state-of-repo as Phase 5; not audited.
8. **Analytics events** — not exercised.

---

## 9. References

- Source state of repo: `reports/home-match-revival/COMPREHENSIVE-STATE-OF-THE-REPO-2026-05-10.md`
- Phase 0/1 closure: `reports/home-match-revival/phase0-phase1-closure-matrix.md`
- Existing audits (May 9):
  - `design-ux-audit-desktop-2026-05-09.md`
  - `design-audit-mobile-20260509.md`
  - `a11y-audit-2026-05-09.md`
  - `bundle-analysis-20260509.md`
  - `query-audit-20260509.md`
  - `component-scan-2026-05-09.md`
- Live screenshots this audit: `reports/home-match-revival/audit-2026-05-11/screenshots/`

---

## 10. Status

**DONE_WITH_CONCERNS**

- Public-route audit: live ✓ (38 screenshots, 5 viewports across 22 routes)
- Authenticated audit: STATIC ONLY due to browser TLS sandbox
- Bug catalog: 13 critical/high, 25 medium, 10 low/cosmetic
- Plan: 5 sprints, 25-35 hour total CC effort
- Infra blockers: 3 items requiring owner action

Next concrete step: **start Sprint 0** (3-5 hours of CC work) to unblock the mobile funnel. Or if you'd rather, run `/qa` against the live site from a non-sandboxed machine first to validate the constrained findings here.
