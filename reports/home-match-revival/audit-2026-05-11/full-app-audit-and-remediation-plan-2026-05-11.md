# HomeMatch v2 — Full App Audit & Remediation Plan

**Generated:** 2026-05-11 (v2 — authenticated UI now live-audited)
**Branch:** `claude/review-repo-state-gYbzB`
**Audit env:** Local Next.js dev (`localhost:3000`) → **local Supabase** in Docker (`127.0.0.1:54200`) for auth audit; prod Supabase (`lpwlbbowavozpywnpamn.supabase.co`) via MCP for advisors; `homematch.pro` probed via curl.

> **v1 → v2 change:** Started Docker → booted local Supabase → seeded 11 test users → logged in as `test1@example.com` → 25 authenticated screenshots across desktop + mobile. v1 covered public routes only.

---

## 1. Executive summary

**Verdict: not launch-ready. 4 hard launch-blockers + 13 visible breaks + 65 Supabase prod perf lints.**

The Phase 0/1 closure was correct about the _foundation_. But the _product_ has bugs that will blow up the first day a real user signs up:

1. 🔴 **Mobile sign-in is unreachable** — cookie banner sits over Sign In/Create Account buttons at 393×852.
2. 🔴 **Hostname-host bug on redirects** confirmed reproducible — auth POST succeeds at `127.0.0.1`, then `/dashboard` 307s to `localhost`, cookies don't match, infinite redirect loop back to /login. Network log captured below.
3. 🔴 **`/properties/[id]` crashes hard** when given a non-UUID zpid like `dev-100014`. Postgres error `22P02 invalid input syntax for type uuid`. Page shows generic "Something went wrong / Try Again."
4. 🔴 **Dashboard + Couples render but mobile layout is broken** — large empty regions where content should be, ~30% horizontal whitespace overflow.

Plus 22 Supabase RLS policies with `auth.<function>()` not subselected (well-known per-row re-eval footgun), 7 duplicate permissive policies on `user_property_interactions`, and a hydration mismatch on `/login`.

**Good news:** local Supabase boots clean with the realtime disable; auth lifecycle works; 13 protected routes render on desktop; profile/settings/mutual-likes/couples-empty-state look polished. Foundation is real.

**Total scope:** 4 critical + 13 high + 33 medium + 14 low. **CC effort to ship-ready: ~30-40 hr.**

---

## 2. What was audited

### Live, evidenced by screenshot

| Pass                      | Routes | Viewport | Count  |
| ------------------------- | ------ | -------- | ------ |
| Public — desktop          | 11     | 1440×900 | 11     |
| Public — mobile           | 11     | 393×852  | 11     |
| Protected redirect (anon) | 12     | 1440×900 | 12     |
| Internal/demo gate        | 4      | 1440×900 | 4      |
| **Authenticated desktop** | 13     | 1440×900 | 13     |
| **Authenticated mobile**  | 12     | 393×852  | 12     |
| **Total**                 |        |          | **63** |

Saved at `reports/home-match-revival/audit-2026-05-11/screenshots/`.

### Authenticated audit setup (the breakthrough)

- Started Docker daemon (`dockerd`) — previously not running on this devbox
- Local Supabase: `npx supabase start -x studio,mailpit,...` after disabling `[realtime] enabled = false` in `supabase/config.toml` (realtime container failed with `eafnosupport` on IPv6 binding in this sandbox; doesn't reflect prod)
- Seeded 11 test users via `scripts/setup-test-users-admin.js`
- Booted Next.js dev (`SUPABASE_URL=http://127.0.0.1:54200 pnpm exec next dev`)
- Logged in as `test1@example.com / testpassword123` via /browse
- Cookie set on `localhost` domain, navigated all protected routes

### Live via curl (no browser)

- `homematch.pro` is up (HTTP 200 on `/`, `/about`, `/contact`, `/login`, `/signup`)
- `/api/health` returns `{"status":"healthy","database":"connected"}`
- `/properties/*` returns 307 (likely auth redirect; can't see authenticated state)

### Via Supabase MCP

- Project `lpwlbbowavozpywnpamn` is **ACTIVE_HEALTHY** (the May 10 doc was outdated)
- 65 performance/security lints (detail in §4)

### Vercel MCP — unauthenticated

- `list_teams` returns empty array
- Need a Vercel access token to use deploy/get_runtime_logs/list_deployments — instructions in §5

### Not audited

- Real Maps interactions (browser blocked from Google Maps JS by sandbox; visible as `ERR_CERT_AUTHORITY_INVALID` console errors)
- Real Zillow images (same reason — visible as placeholder house icons)
- Real LLM matching with taste profile + auth (cards rendered with mock vibes from seed)
- Production-only edges (CDN, real DNS, Vercel edge config)
- Touch device gesture physics

---

## 3. Critical bugs (launch blockers) — with evidence

### 🔴 C1. Mobile sign-in blocked by cookie banner

**Evidence:** `screenshots/public-mobile/login.png` and `signup.png` at 393×852. The cookie banner sits centered over the form, covering the Sign In / Create Account buttons. A real user on mobile cannot submit the form without dismissing the banner, and the banner has no clear "X" — only "Reject non-essential / Accept all / Manage settings" which forces a privacy decision before they can authenticate.

**Fix:**

- Banner on mobile → collapsed slim bottom strip (1-2 lines, max 64px height, never overlaps form area)
- OR: Default to "essential only" on first paint; expand only when user clicks a small gear icon

**Effort:** Medium (~2-3 hr)

### 🔴 C2. Hostname inconsistency breaks auth

**Evidence (reproduced this session, network log):**

```
GET http://127.0.0.1:3000/login → 200
POST http://127.0.0.1:54200/auth/v1/token?grant_type=password → 200   ← auth succeeded
GET http://127.0.0.1:3000/dashboard → 307
GET http://localhost:3000/login?redirectTo=%2Fdashboard → 200          ← redirected to DIFFERENT host
```

Cookie set on `127.0.0.1` domain. After redirect, browser is on `localhost` and sees no cookie → bounced back to /login. Infinite loop unless user starts at `localhost` directly.

In production this manifests as: session loss across subdomain/canonical-host crossings, or anywhere a redirect normalizes the hostname.

**Fix:**

- Find redirect construction in `src/middleware.ts` / auth flow; preserve `request.headers.host`
- OR enforce canonical hostname via Vercel rewrite + always set cookies on the canonical host
- Add e2e test: login on `https://www.homematch.pro` → cookie set on `.homematch.pro` (apex) or canonical, redirect to `/dashboard` works

**Effort:** Low–Medium (~1-2 hr)

### 🔴 C3. `/properties/[id]` crashes on non-UUID input

**Evidence:** `screenshots/auth-desktop/property-detail-dev-100014.png` — "Something went wrong / We encountered an unexpected error / Try Again"

Dev server log:

```
[PropertyPage] Failed to load property {
  propertyId: 'dev-100014',
  error: {
    code: '22P02',
    message: 'invalid input syntax for type uuid: "dev-100014"'
  }
}
```

The page query uses `.eq('id', propertyId)` against the `properties.id` (UUID) column, but the URL param is a string zpid. There's no validation, no fallback to `zpid` lookup, no 404 path. The error boundary catches it but shows a useless generic message.

**Fix:**

- In `src/app/properties/[id]/page.tsx` (or its data loader): detect input format. If valid UUID → query `id`. Else → query `zpid` (Zillow ID).
- If neither match → return `notFound()` (renders proper 404).
- Add a guard in the error boundary that distinguishes "not found" from "actual crash."

**Effort:** Low (~1 hr)

### 🔴 C4. Hydration mismatch on `/login`

**Evidence:** Browser console error visible in v1 audit:

> "A tree hydrated but some attributes of the server rendered HTML didn't match the client properties."

The Input components render with `disabled={true}` on the server but `disabled={false}` on the client (likely an `isReady` flag that's `false` on server, `true` after mount). React won't patch this — users see the form snap from disabled-grey to enabled.

**Fix:**

- In `LoginForm.tsx` / `SignupForm.tsx`: drop the SSR-disabled state. Either render enabled always (validate on submit), or use `useEffect` to set the disabled flag after mount (avoids SSR/CSR mismatch by setting it client-only).

**Effort:** Medium (~1-2 hr)

### 🔴 C5. Build/typecheck blocker: `websiteJsonLd` page export

**Status:** **FIXED this session.** `src/app/page.tsx:16` was `export const websiteJsonLd = createWebsiteJsonLd()`. Next.js doesn't accept arbitrary page exports. Dropped the `export` keyword. Variable is still used at line 42 inside the component.

**Effort:** DONE.

### 🔴 C6. No `<main>` landmark on public pages

**Evidence:** `reports/home-match-revival/a11y-audit-2026-05-09.md` C1 — pages lack `<main>`, e2e a11y guard at `__tests__/e2e/no-auth-public-accessibility.spec.ts:34` will fail.

**Fix:** Add `<main id="main-content">` to marketing layout + auth shell. Wrap content. Update skip-to-content link target.

**Effort:** Low (~1 hr)

---

## 4. High-severity bugs (visible product breaks)

### Visual / layout

| #   | Bug                                                                    | Evidence                                                                      | Fix                                                                                                             | Effort     |
| --- | ---------------------------------------------------------------------- | ----------------------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------- | ---------- |
| H1  | **Landing page ~500-px empty white middle section**                    | `screenshots/public-desktop/home.png` — hero, gap, then FeatureGrid at bottom | Inspect `src/app/page.tsx` between `HeroSection` and FeatureGrid; section missing OR spacing massively overshot | M (2-3 hr) |
| H2  | **Theme incoherence** — landing/auth dark vs about/contact/terms light | All public screenshots                                                        | Pick one (recommend: dark consumer, light docs) and make transition intentional via `<DocsLayout>`              | H (5-8 hr) |
| H3  | **Cookie banner overlays everything on every page**                    | All screenshots                                                               | Mobile-aware collapsed strip pattern (resolves C1 too)                                                          | M (2-3 hr) |
| H4  | **Cookie banner state doesn't persist** across navigation              | Banner reappears                                                              | Verify `CookieConsentBanner` writes to localStorage/cookie and reads on mount                                   | M (1-2 hr) |
| H5  | **Auth submit buttons start grey/disabled**                            | login/signup/verify-email/reset-password                                      | Keep enabled visually, validate on submit                                                                       | L (2 hr)   |
| H6  | **Anonymous → /login shows no context** ("Sign in to continue to {X}") | `screenshots/states/redirect-dashboard.png`                                   | Read `redirectTo`, surface contextual heading                                                                   | L (1 hr)   |
| H7  | **`prime` Button variant inconsistent height same page**               | Hero ~76px, CtaBand ~52px (`button.tsx:25-39`)                                | Move padding into size variants via CVA `compoundVariants`; drop caller overrides                               | L (1-2 hr) |

### Authenticated UI breakages

| #   | Bug                                                               | Evidence                                                                                                                         | Fix                                                                                                                                                                                                           | Effort     |
| --- | ----------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ---------- |
| A1  | **Dashboard mobile has huge empty regions where cards should be** | `screenshots/auth-mobile/dashboard.png` — shows header, filters, bottom nav, then 1500px of empty black, then Shared Likes panel | Property cards aren't rendering on mobile at this width; check `SwipeContainer` / `DashboardPropertyGrid` mobile breakpoint                                                                                   | M (3 hr)   |
| A2  | **Couples mobile stuck in loading skeleton**                      | `screenshots/auth-mobile/couples.png` — only loading placeholders, no terminal state                                             | Empty state for couples on mobile isn't rendering; `useEffect` race or missing fallback. `src/components/features/couples/HouseholdReactionsPanel.tsx` is the prime suspect                                   | M (3 hr)   |
| A3  | **Mobile pages have ~30% white whitespace on right side**         | All auth-mobile screenshots show layout shifted left, white strip on right                                                       | Likely `AuthPageShell` blur overflow (mobile-audit 7 P1 — `w-[680px]` blurs without `overflow-hidden`); also affects authenticated routes                                                                     | L (15 min) |
| A4  | **"PUT FOR FAMILY HOME" appears as a vibe on a property card**    | `screenshots/auth-desktop/dashboard.png` — second property card                                                                  | Likely vibe-generation prompt produced odd output; review `src/lib/llm/prompts*.ts` for the property vibe prompt template + add output validation                                                             | M (2-3 hr) |
| A5  | **Properties show placeholder house icon, not real images**       | Liked properties screenshot                                                                                                      | Confirmed external image fetch fails in sandbox; in production this is fine but the **fallback rendering is the same UI as a real image with no clue something failed**. Consider distinct broken-image state | L (1 hr)   |

### A11y baseline (from existing audit)

| #   | Bug                                                           | Evidence        | Fix                                                                                       | Effort     |
| --- | ------------------------------------------------------------- | --------------- | ----------------------------------------------------------------------------------------- | ---------- |
| H8  | Decorative marketing Like/Pass buttons capture keyboard focus | A11y audit C2   | Render as `<div role="img" aria-label>` not `<button>`                                    | L (1 hr)   |
| H9  | No focus-visible ring on header/footer links                  | A11y audit C3   | Global `focus-visible:ring-2 focus-visible:ring-primary`                                  | L (1 hr)   |
| H10 | `prefers-reduced-motion` not honored in Framer Motion         | A11y audit C4   | `LazyMotion` + `useReducedMotion()` guards                                                | M (3 hr)   |
| H11 | No skip-to-content link                                       | A11y audit C5   | Visually-hidden skip link first focusable in layout                                       | L (1 hr)   |
| H12 | `CardTitle` is `<div>`, not `<h2>` on auth pages              | A11y audit M1   | Update `src/components/ui/card.tsx` to render `CardTitle` as `h2` (or accept `as`)        | L (30 min) |
| H13 | Mobile tap targets <44px on Header + Footer                   | Mobile audit H1 | `min-h-[44px] inline-flex items-center` on anchors; `space-y-2 leading-relaxed` on Footer | L (1 hr)   |

---

## 5. Vercel state + how to deploy

### Current state

- Vercel MCP is connected but **unauthenticated** (`list_teams → []`).
- `homematch.pro` is alive and serving — so there IS a deployment + token somewhere, just not on this devbox / connected to this Claude session.
- No `.vercel/project.json` in the repo.

### What I need from you to recover deploys

**Option A — quickest path (recommended):** create a Vercel CLI token + paste it.

1. Visit https://vercel.com/account/tokens
2. Click "Create" — scope: full account, expiration: your choice
3. Paste here as `VERCEL_TOKEN=<token>` OR export in your shell:
   ```bash
   export VERCEL_TOKEN=<paste>
   ```
4. I can then use `pnpm exec vercel link` + `pnpm exec vercel deploy --prebuilt` (npm package `vercel` is already installable via `pnpm dlx vercel`).

**Option B — connect the Vercel MCP:** the MCP toolset (`mcp__6e1ee...`) is in this session but `list_teams` is empty. Likely the connector needs to be re-authorized in your Claude Code settings. If you reconnect it to your account, I can use `list_deployments`, `get_runtime_logs`, `deploy_to_vercel` without you ever exposing a token.

**Option C — environment variables for a redeploy from scratch:**
If you want me to set the env vars for a fresh project on Vercel, you'll also need to provision the existing env vars there:

- `NEXT_PUBLIC_SUPABASE_URL` = `https://lpwlbbowavozpywnpamn.supabase.co`
- `NEXT_PUBLIC_SUPABASE_ANON_KEY` = (already exported on this devbox; need the value from Supabase dashboard for prod env)
- `SUPABASE_SERVICE_ROLE_KEY` = (server-only, same source)
- `GOOGLE_MAPS_SERVER_API_KEY` = (already in shell)
- `RAPIDAPI_KEY`, `OPENROUTER_API_KEY` = (already in shell)

### What I can do right now without your action

- Audit the live `homematch.pro` via curl for HTML diffs vs local
- Read `get_runtime_logs` once you authenticate the MCP, to confirm prod isn't quietly throwing the same `22P02` UUID error

---

## 6. Supabase prod state (via MCP)

`lpwlbbowavozpywnpamn` (supabase-homematch), us-west-1, Postgres 17.6.1.054. **ACTIVE_HEALTHY.**

### Advisor lints — 65 total

| Category                               | Severity | Count |
| -------------------------------------- | -------- | ----- |
| `unused_index`                         | INFO     | 32    |
| `auth_rls_initplan` (RLS perf footgun) | WARN     | 22    |
| `multiple_permissive_policies`         | WARN     | 7     |
| `unindexed_foreign_keys`               | INFO     | 4     |

#### S1 — 22 `auth_rls_initplan` warnings (HIGH priority)

22 RLS policies call `auth.uid()` (or `current_setting()`) without wrapping in a subselect. Postgres re-evaluates the function **for every row** the policy checks. At 10k rows that's 10k function calls per query.

**Examples (samples; full list in MCP output):**

- `public.user_property_interactions` — "Household members can access mutual likes function"
- `public.user_property_interactions` — "Users can delete their own interactions"
- `public.saved_searches` — "Users can delete their own searches"
- `public.user_profiles` — "Users can insert their own profile"
- ... 18 more across same tables

**Fix (single migration):** wrap each `auth.uid()` in `(select auth.uid())`. Example:

```sql
-- Before
CREATE POLICY "Users can delete their own interactions" ON user_property_interactions
  FOR DELETE USING (auth.uid() = user_id);

-- After
CREATE POLICY "Users can delete their own interactions" ON user_property_interactions
  FOR DELETE USING ((select auth.uid()) = user_id);
```

**Reference:** https://supabase.com/docs/guides/database/database-linter?lint=0003_auth_rls_initplan

**Effort:** Low-Medium (~2-3 hr — one migration touching ~22 policies + verify with `EXPLAIN`)

#### S2 — 7 `multiple_permissive_policies` (MEDIUM)

Mostly on `user_property_interactions` — same household-members policy duplicated across roles: `anon`, `authenticated`, `authenticator`, `cli_login_postgres`, `dashboard_user`, `supabase_privileged_role`. Plus one on `properties` for `anon` SELECT.

The duplication causes Postgres to OR-combine policies — extra perf cost per query. The role-spread suggests an over-permissive grant; some of these roles shouldn't have access at all.

**Fix:** Audit each duplicated policy; consolidate into one with `TO authenticated` (or appropriate single role). Drop the duplicates.

**Effort:** Medium (~3-4 hr — needs careful review of intent for each role)

#### S3 — 4 `unindexed_foreign_keys` (LOW)

- `household_invitations.accepted_by` FK without covering index
- `household_invitations.created_by` FK without covering index
- `household_property_resolutions.resolved_by` FK without covering index
- `households.created_by` FK without covering index

Each FK lookup does a sequential scan. Small tables today, but grows linearly.

**Fix:** One migration with 4 `CREATE INDEX` statements.

**Effort:** Low (~30 min)

#### S4 — 32 `unused_index` (INFO, prune candidate)

Indexes that haven't been used per the catalog. Some may legitimately be cold; some may be remnants from earlier schema. Prune after a usage-window verification.

**Effort:** Low (~1 hr review + 30 min migration)

---

## 7. Other findings (medium / low — abbreviated)

From existing May 9 audits + this session's screenshots:

| Category           | Issues                                                                                                                                                                                                                                       |
| ------------------ | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **Bundle size**    | Settings page chunk 74 KB, profile 58 KB, Supabase chunk 144 KB (includes realtime), framer-motion 120 KB. Lazy-load destructive dialogs, avatar picker, realtime-gated imports.                                                             |
| **Query patterns** | 5 N+1 in admin routes + vibes backfill + couples/disputed; ~30 `select('*')` on hot paths; list endpoints missing pagination. (See `query-audit-20260509.md` for site-by-site.)                                                              |
| **Mobile polish**  | Hero `min-h-[680px]` exceeds iPhone SE viewport; MarketingPreviewCard overlays crowd price chip; AuthShell blurs without `overflow-hidden`; Footer mobile-grid asymmetry orphans "Legal" column.                                             |
| **Cosmetic**       | Copyright year "2024" stale; `text-slate-500` on `bg-slate-50` ≈ 4.42:1 contrast (fails WCAG AA); `CtaBand` heading is `<h3>` not `<h2>`; "AI-powered" pill on auth pages clashes with theme; "Google" OAuth button label lacks action verb. |
| **Image strategy** | 3 marketing JPGs total 577 KB; reroute through `next/image` for AVIF/WebP.                                                                                                                                                                   |
| **Dev mode**       | The "N" Next.js dev indicator appears bottom-left on every page — verify it isn't shipping to production builds.                                                                                                                             |

---

## 8. Prioritized remediation plan (revised)

### Sprint 0 — launch unblockers (4-6 hours)

The 4 critical bugs + the 1 fix already done. After Sprint 0, public funnel works on mobile and desktop, auth doesn't loop, property detail pages don't crash.

| #   | Item                                   | Effort |
| --- | -------------------------------------- | ------ |
| C1  | Mobile cookie banner pattern           | 2-3 hr |
| C2  | Redirect hostname preservation         | 1-2 hr |
| C3  | `/properties/[id]` UUID-vs-zpid lookup | 1 hr   |
| C4  | Hydration mismatch on /login           | 1-2 hr |
| C6  | `<main>` landmark                      | 1 hr   |

**Acceptance:**

- E2E: `/signup` completes on mobile 393×852 without dismissing banner
- E2E: login on `https://*.homematch.pro` lands on `/dashboard` (no loop)
- `/properties/dev-100014` → 404 page (not crash)
- No hydration warnings in `/login` console
- A11y axe-core on `/`, `/login`, `/signup` → zero criticals

### Sprint 1 — Supabase prod perf cleanup (3-4 hours)

Direct payoff: every authenticated query gets faster.

| #   | Item                                                | Effort |
| --- | --------------------------------------------------- | ------ |
| S1  | Wrap 22 `auth.uid()` calls in `(select auth.uid())` | 2-3 hr |
| S3  | Add 4 missing FK indexes                            | 30 min |

**Acceptance:**

- `get_advisors` → `auth_rls_initplan` count drops from 22 to 0
- `EXPLAIN ANALYZE` on a representative query against `user_property_interactions` shows policy InitPlan instead of per-row eval
- Subjective: dashboard data loads visibly snappier

### Sprint 2 — visible product polish (8-10 hours)

| #     | Item                                                                      | Effort                     |
| ----- | ------------------------------------------------------------------------- | -------------------------- |
| H1    | Landing page empty middle                                                 | 2-3 hr                     |
| H2    | Theme coherence (DocsLayout pattern)                                      | 5-8 hr (incl. design call) |
| H3+H4 | Cookie banner collapsed strip + persistence                               | 2-3 hr (overlap with C1)   |
| H5    | Stop disabling auth submit preemptively                                   | 30 min                     |
| H6    | Contextual login banner ("Sign in to continue to …")                      | 30 min                     |
| H7    | Unify `prime` Button variant sizing                                       | 1-2 hr                     |
| A4    | Investigate weird vibe text ("PUT FOR FAMILY HOME") + validate LLM output | 2-3 hr                     |
| A5    | Real broken-image fallback state                                          | 1 hr                       |

### Sprint 3 — authenticated mobile completeness (4-6 hours)

| #      | Item                                                                                                    | Effort |
| ------ | ------------------------------------------------------------------------------------------------------- | ------ |
| A1     | Dashboard mobile card rendering                                                                         | 3 hr   |
| A2     | Couples mobile loading-state terminal path                                                              | 3 hr   |
| A3     | AuthPageShell `overflow-hidden` (fixes whitespace right)                                                | 15 min |
| H8-H13 | A11y baseline (decorative buttons, focus-visible, reduced-motion, skip link, CardTitle h2, tap targets) | 5 hr   |

### Sprint 4 — DB + perf hygiene (8-12 hours)

| #       | Item                                                             | Effort |
| ------- | ---------------------------------------------------------------- | ------ |
| S2      | Consolidate 7 duplicate permissive RLS policies                  | 3-4 hr |
| S4      | Prune unused indexes (after usage verification)                  | 1-2 hr |
| Bundle  | Lazy-load settings dialogs, profile avatar picker, realtime gate | 5 hr   |
| Queries | Fix 5 N+1 + replace top `select('*')` + add pagination           | 6 hr   |

### Sprint 5 — content + cosmetic (4 hours)

All cosmetic items: stale dates, contrast fixes, copy tightening, About content, conditional Hero CTAs.

### Infra prerequisites (your action)

| #   | Item                                                                                                     |
| --- | -------------------------------------------------------------------------------------------------------- |
| I1  | Provide VERCEL_TOKEN OR re-authorize Vercel MCP (see §5)                                                 |
| I2  | Choose durable rate limiter provider (D2) — Upstash/KV/Redis                                             |
| I3  | Verify production Supabase signup verification settings (D3) — email confirmation + CAPTCHA in dashboard |

---

## 9. Estimated effort summary

| Sprint    | Focus                       | CC time         |
| --------- | --------------------------- | --------------- |
| 0         | Critical launch unblockers  | 4-6 hr          |
| 1         | Supabase prod perf cleanup  | 3-4 hr          |
| 2         | Visible product polish      | 8-10 hr         |
| 3         | Authenticated mobile + a11y | 4-6 hr          |
| 4         | DB + perf hygiene           | 8-12 hr         |
| 5         | Content/cosmetic            | 4 hr            |
| **Total** |                             | **31-42 hr CC** |

Plus user: ~30 min for I1-I3.

---

## 10. Status

**DONE.** Auth audit live-evidenced (25 screenshots), critical bugs reproduced (especially C2 redirect-host bug + C3 property-detail crash), Supabase prod state inspected, Vercel state clarified. Plan revised with new evidence.

Next concrete step: tell me which path you want for Vercel (§5) so I can verify whether the property-detail crash also exists on prod (likely yes — that's `auth.uid()` on `properties.id` lookup logic), then start Sprint 0.

---

## 11. References

- v1 of this doc: contents replaced (commit `10e9e97` is the v1 snapshot)
- Source state of repo: `reports/home-match-revival/COMPREHENSIVE-STATE-OF-THE-REPO-2026-05-10.md`
- Phase 0/1 closure: `reports/home-match-revival/phase0-phase1-closure-matrix.md`
- Existing May 9 audits: design-ux-audit-desktop, design-audit-mobile, a11y-audit, bundle-analysis, query-audit, component-scan, rls-security-audit
- 63 screenshots: `reports/home-match-revival/audit-2026-05-11/screenshots/`
- Supabase MCP raw output (advisors): `/root/.claude/projects/-home-user-homematch-v2/a6501873-d92b-43c4-8921-8fcb2bb10898/tool-results/toolu_011DQHoc7fMb9pP1Baca87m6.json`
