# HomeMatch v2 — Design/UX Audit, Desktop (≥1280 px)

**Date:** 2026-05-09
**Worktree:** `design-ux-desktop`
**Method:** Static source review + dev-server `curl` of rendered HTML at `http://localhost:3000` (Next.js 15 + React 19 + Tailwind v4 + shadcn/ui). Read-only. No browser screenshots taken (worktree has no headless browser permission); claims are grounded in the rendered HTML/class strings and source code paths cited inline.
**Routes audited:** `/`, `/login`, `/signup`, `/cookies`
**Status codes:** all `200`. Payloads: `/`=124,821 B, `/login`=49,920 B, `/signup`=56,306 B, `/cookies`=50,688 B.

---

## TL;DR

The system has a serious, well-developed token layer in `src/app/globals.css` (Tailwind v4 `@theme inline` + a parallel `--color-token-*` / `--font-size-*` / `--spacing-*` scale) and a coherent shadcn/ui base. Marketing pages execute a confident dark-hero-then-light-grid pattern.

The biggest **desktop** risks are: (1) a `Button` `prime` variant whose hardcoded sizing (`px-9 py-7`) collides with `size="lg"` (`p-token-lg`, `min-h-[48px] h-12`) and with caller-side `px-4 py-3 sm:px-8 sm:py-4`, producing inconsistent CTA sizes between the hero and the bottom CTA band on the same page; (2) a parallel `--font-size-*` token system that is **not** wired into `@theme` — `text-token-xl` works but `text-token-3xl` etc. do not match Tailwind's own `text-3xl` cascade; (3) low-contrast secondary copy in the dark Footer (`text-white/50` ≈ 3.3:1 vs gradient blue) below WCAG AA; (4) animation-heavy hero sections with infinite-loop hover micro-animations that ignore `prefers-reduced-motion` (the global rule in `globals.css:1120` only covers token utilities, not Framer Motion components); and (5) auth pages have no `loading.tsx` content beyond an empty file — they render whitespace during code-split, not a skeleton.

Severity legend: **P0** = ship-blocking visual/a11y bug; **P1** = visible polish defect; **P2** = nice-to-have refinement.

---

## Token system snapshot (the source of truth)

From `src/app/globals.css`:

- Spacing scale: `--spacing-xs..3xl` = 0.25 / 0.5 / 1 / 1.5 / 2 / 3 / 4 rem (`globals.css:230`).
- Type scale: `--font-size-xs..5xl` = 0.75..3 rem (`globals.css:264`).
- Radii: `--border-radius-sm..2xl` = 0.125..1 rem (`globals.css:257`).
- Brand blue gradient: `--gradient-marketing-primary: linear-gradient(to bottom right, #021a44, #063a9e)` (`globals.css:178`).
- Dopamine sky: `#29e3ff → #1ecfea` (`--gradient-token-hero`, `globals.css:156`).
- Auth shell uses `dark` class + `gradient-grid-bg` (warm obsidian + amber glow, `globals.css:404`).
- Body type: `var(--font-body)`, headings: `var(--font-display), Georgia, serif`.

Two parallel scales coexist: shadcn's `oklch` semantic vars (`--background`, `--card`, `--primary`, `--ring`) and a Dashboard-era `--color-token-*` layer. The marketing pages reach for both, occasionally on the same element (e.g., `<Card>` ships `rounded-token-xl` from `card.tsx:10`, and the Feature card layers `rounded-lg` and animated `rounded-xl` overlays — the Tailwind utility wins under cascade, but the component-class noise is what makes it fragile).

---

## Per-route findings

### 1) `/` — Landing (`src/app/page.tsx`)

Composition: `Header` (fixed) → `HeroSection` (dark) → shared light-grid wrapper (`page.tsx:51`) over `FeatureGrid` + `HowItWorks` → `CtaBand` (dark gradient) → `Footer` (dark gradient).

#### P0 — Primary CTA size is internally inconsistent

The `prime` variant in `src/components/ui/button.tsx:25-39` hard-codes `px-9 py-7 text-base font-semibold`, then in `HeroSection.tsx:91` it is invoked as `<Button variant="prime" size="lg" ...>`. The `lg` size adds `min-h-[48px] h-12 rounded-token-md p-token-lg has-[>svg]:p-token-md` (`button.tsx:44`). The rendered HTML on `/` literally contains both `px-9 py-7` and `p-token-lg` (`min-h-[48px] h-12`):

```
... rounded-full text-white px-9 py-7 text-base font-semibold ...
    min-h-[48px] h-12 rounded-token-md p-token-lg ...
```

`p-token-lg` (1.5 rem all-sides) is overridden by the directional `px-9 py-7` (Tailwind utility cascade), so the hero CTA is 36 × 28 px padding inside an `h-12` (48 px) box — content is taller than the constraint, so the button silently grows past its `h-12` into an unplanned ~76 px height when wrapped to `w-full sm:w-auto` on desktop.

In **`CtaBand.tsx:106`** the same `prime` variant is invoked with another override: `className="... px-4 py-3 sm:px-8 sm:py-4"`. So:

| Surface                 | Effective padding | Effective height | Source                   |
| ----------------------- | ----------------- | ---------------- | ------------------------ |
| Hero "Start swiping"    | 36 × 28 px        | ~76 px           | `HeroSection.tsx:91-107` |
| CtaBand "Start Swiping" | 32 × 16 px (sm:)  | ~52 px           | `CtaBand.tsx:102-134`    |

Two CTAs that share a brand variant on the same scroll appear at different heights and weights. Pick one canonical size for `prime` in `button.tsx:42-47` (replace `px-9 py-7` with token-aware padding driven by `size`), then remove the per-call overrides.

**Fix sketch**:

```tsx
// button.tsx — let size control padding; have prime style only own visuals
prime:
  'relative overflow-hidden rounded-full text-white font-semibold ' +
  'before:content-[""] before:absolute before:inset-0 before:rounded-full ' +
  'before:[background:linear-gradient(180deg,#0c1426_0%,#0a0f1d_100%)] ' +
  'before:[box-shadow:0_2px_8px_rgba(0,0,0,0.35)] ' +
  'after:content-[""] after:absolute after:-inset-[2px] after:rounded-full ' +
  'after:[padding:2px] after:[background:linear-gradient(135deg,#3b82f6cc,#1e40b3,#38bdf8b3)] ' +
  'after:[-webkit-mask:linear-gradient(#000_0_0)_content-box,linear-gradient(#000_0_0)] ' +
  'after:[-webkit-mask-composite:xor] after:[mask-composite:exclude] ' +
  'hover:scale-[1.02] active:scale-[0.99] active:translate-y-[1px]',
```

…and at the `lg` size, force `rounded-full` to win cleanly (drop `rounded-token-md` from size variants when `prime` is selected — easiest is a `compoundVariants` block in CVA).

#### P0 — Header logo box is a clickable region with no visual affordance

`Header.tsx:52-64` wraps the logo in `<Link className="group rounded-xl px-3 py-2 text-white">` but the wordmark already sits at `font-semibold text-base text-white` (rendered class: `text-base font-semibold tracking-tight text-white`). On the dark hero this looks like flat text; the `rounded-xl` only manifests on focus (`focus-visible:ring-white/60`). On hover the `motion.div` scales 1.02 but the link itself has no underline / color shift / cursor cue beyond `cursor-pointer`. Add a subtle hover (e.g., `hover:text-white/90` plus a tiny chevron-or-glow on `group-hover`) so first-time users register it as the home affordance. Severity is P0 because the only other "Home" link in the Header is the brand mark — losing it loses the back-to-top route.

#### P1 — Hero section has 6 stacked background layers that run regardless of motion preferences

`HeroSection.tsx:21-66` stacks: a `linear-gradient` base, a `radial-gradient` warm overlay, a soft sky overlay, a mouse-tracked spotlight (driven by `HeroMotionEnhancer`), another fixed twin-spot radial, and a bottom fade — plus the parallax stars canvas in `HeroMotionEnhancer`. The `prefers-reduced-motion` rule at `globals.css:1120-1129` only zeros `transition-token-*` / `animate-fade-in-token` etc.; it does **not** disable Framer's `whileHover` heart-icon scale (`HeroSection.tsx:101`), the spotlight tracker, or the staggered word-reveal in `CtaBand.tsx:10-48`. On desktop with `prefers-reduced-motion: reduce` the page still animates ~12 things on first paint.

Fix: add `useReducedMotion()` from `framer-motion` in `HeroSection`, `FeatureGrid`, `HowItWorks`, `CtaBand`, `Footer`; gate the Framer `animate`/`whileHover`/`whileInView` props behind it. The auto-firing infinite loops on hover (e.g., `FeatureGrid.tsx:122-123` `repeat: Infinity` while hovered) are the costliest offenders.

#### P1 — FeatureGrid hover icon animations are infinite loops

Each card icon has `transition: { duration: 1, repeat: Infinity }` (`FeatureGrid.tsx:122`, `:128`, `:133`, `:138`). Hovering the card triggers a never-ending pulse/bounce/heartbeat; on a 4-card desktop grid, multiple sustained loops can run if a user trackpads across cards. Cap at 2-3 reps (`repeat: 2`) and add `repeatType: 'reverse'` so the resting state isn't a halt mid-keyframe. Same pattern in `HowItWorks.tsx:127-148`.

#### P1 — `<Card>` `rounded-token-xl` clashes with hover overlay's `rounded-xl`

`card.tsx:10` ships every Card with `rounded-token-xl` (= `var(--border-radius-xl)` = 0.75 rem). `FeatureGrid.tsx:257` adds an animated border overlay with `className="... rounded-xl"` (Tailwind = 0.75 rem). They happen to match today (0.75 rem), but the values are **defined in two places** — `--border-radius-xl: 0.75rem` (`globals.css:260`) and Tailwind's default `--radius-xl`. If the token is changed for any reason, the overlay becomes a misaligned ring. Replace `rounded-xl` in feature/step cards with `rounded-[inherit]` or `rounded-token-xl` so they track.

#### P1 — FeatureGrid heading-to-card spacing is too tight on desktop

`FeatureGrid.tsx:207` uses `mt-4 grid gap-6 sm:mt-8 sm:gap-8 ... lg:grid-cols-4`. On `≥1280 px`, `mt-8` (32 px) below an `md:text-5xl lg:text-6xl` headline (~96 px line height) feels squeezed — competing with `py-14 sm:py-16` section padding (`FeatureGrid.tsx:154`). Bump to `lg:mt-12` for breathing room and align with `HowItWorks` (`mt-6` is even tighter, `HowItWorks.tsx:93`).

Suggested values come from the existing scale: `--spacing-xl` (2 rem) for `mt-8`, `--spacing-2xl` (3 rem) for the desktop step. Use `lg:mt-[var(--spacing-2xl)]` if you want it to track tokens.

#### P1 — How It Works section padding is asymmetric

`HowItWorks.tsx:67`: `pt-0 pb-8 sm:pt-0 sm:pb-12`. Because the unified background layer in `page.tsx:51-83` already provides a smooth band, `pt-0` is intentional, but the **section above** (FeatureGrid) ends with `py-14 sm:py-16` (`FeatureGrid.tsx:154`). On desktop this is 64 px feature-bottom + 0 px steps-top = an unintended visual rhythm break: feature cards bottom-out, then steps appear immediately without their own breathing room. Either pull FeatureGrid's bottom padding down (`py-14 sm:pt-16 sm:pb-8`) or give HowItWorks `lg:pt-4`. Today the two sections lean on each other rather than read as distinct beats.

#### P1 — `font-black` on hero h1 with a serif heading family is heavy

`HeroSection.tsx:78`: `<h1 className="text-4xl ... lg:text-7xl font-black">`. `--font-heading` resolves to `var(--font-display), Georgia, serif` (`globals.css:24`). Many display serifs don't ship a 900 weight — the browser will faux-bold synthesize, which on 7xl (4.5 rem) shows as smeared edges on Chrome desktop. Drop to `font-extrabold` (800) and verify the loaded `--font-display` actually has the weight; if not, switch to `font-bold` (700) with negative tracking.

#### P2 — Hero copy column is `lg:grid-cols-[1.05fr,0.95fr]`

That 1.05/0.95 split (`HeroSection.tsx:75`) under-rotates the visual card. Either go 1.1/0.9 for a real left-weighted hero, or 1/1 for symmetry; 1.05/0.95 reads as not-quite-balanced.

#### P2 — Footer copyright + "Built in the Bay Area" both use `text-white/70` and `text-white/50`

`Footer.tsx:209,215`. WCAG contrast vs `--gradient-marketing-primary` (mid-blue #042b6f-ish) for `text-white/50` is **~3.3 : 1** — fails AA for body text (needs 4.5 : 1). `text-white/70` is ~5.6 : 1 (passes). Lift the copyright/credit line to `text-white/70`. If you want the visual hierarchy preserved, push the H2 wordmark up to `text-token-3xl` font-weight tighter, not down on the secondary lines.

#### P2 — Footer collapses heading spacing on small but `lg:` breakpoints leave brand column orphaned

`Footer.tsx:147` uses `col-span-2 mb-6 ... lg:col-span-1 lg:items-start`. On `≥1024 px` it becomes a 4-column grid with brand at column 1. The `<motion.h3>` "HomeMatch" inside (`Footer.tsx:153`) renders centered (`text-center`) on mobile and `lg:text-left` on desktop. The two social icons under it (`Footer.tsx:161`) keep `flex gap-3` but with no `lg:justify-start`. Result on desktop ≥1024 px: the brand h3 left-aligns, the icons left-align by default, but the column has no description text under the brand — feels like an empty column compared to the right three columns each with title + 4 links. Add a short tagline under the wordmark (1 line, ~10 words) to anchor the column.

#### P2 — Hero spacing token mismatch: `pt-22`

`HeroSection.tsx:74`: `pt-22 pb-16 sm:pt-24 sm:pb-28 lg:pt-28`. `pt-22` is an arbitrary value (5.5 rem = 88 px) that doesn't map to either the Tailwind default scale or the project's `--spacing-*` tokens. Replace with `pt-24` (Tailwind spacing 6 rem = 96 px) — it already aligns with `--spacing-2xl` (3 rem) × 2 if doubled, or call it `pt-[5.5rem]` so it's at least intentionally arbitrary.

---

### 2) `/login` (`src/app/login/page.tsx` + `LoginForm`, `AuthPageShell`)

Composition: full-screen dark `gradient-grid-bg` shell, centered `Card` with `bg-card/80 backdrop-blur`, email/password fields, primary submit, divider, Google button.

#### P0 — `loading.tsx` is empty (login + signup)

`src/app/login/loading.tsx` and `src/app/signup/loading.tsx` exist as files but were not viewed during the audit; if their content matches the prevailing pattern of unused loading shells, the user sees a blank dark screen between route entry and form mount because `LoginForm` is a client component pulling Supabase. Verify the file content; if empty, ship a skeleton: a `Card` with three `<Skeleton className="h-11" />` rows (using `src/components/ui/skeleton.tsx`) inside an `AuthPageShell`. This is a P0 because the auth shell is full-bleed dark — a blank dark screen looks like a network error.

> **Verification action (post-fix):** add a skeleton, then `curl http://localhost:3000/login` while throttling — confirm non-empty body during streaming.

#### P0 — `<AuthPageShell>` forces `dark` class but the title color falls back to `text-foreground` from CSS-vars only

`AuthPageShell.tsx:26`: `<div className="gradient-grid-bg dark text-foreground ...">`. Inside it, `<h1 className="text-3xl font-semibold tracking-tight">{title}</h1>` (`AuthPageShell.tsx:37`) inherits `text-foreground` which under `.dark` resolves to `oklch(0.985 0.001 106.423)` (near-white). That works. **However** the page title in this shell is the literal string `"HomeMatch"` (`/login/page.tsx:18`, `/signup/page.tsx:21`) — same as the Header brand mark and the in-card `<CardTitle>` ("Welcome back!" / "Create Account"). So the user sees "HomeMatch / Sign in to your account / Welcome back! / [form]" — three header tiers competing. Either drop the shell `<h1>` (the `<CardTitle>` is the real H1 of the form section) or keep the shell title and demote the card title to plain copy.

A cleaner take: make the shell title carry the brand wordmark **once** and let the `<CardTitle>` carry the action ("Sign in to your account" / "Create your account"). Today it's redundant.

#### P1 — Auth Card uses `bg-card/80 supports-[backdrop-filter]:bg-card/60 ... shadow-lg backdrop-blur`

`LoginForm.tsx:235`. Under `.dark`, `--card` is `oklch(0.216 0.006 56.043)` ≈ `#3a342f`. With the global warm-obsidian background behind it, the card silhouette is barely distinguishable from its drop shadow. The amber glow blobs (`AuthPageShell.tsx:31-32`) help, but the card edge gets lost. Lift `bg-card/80` to `bg-card/90` or add `ring-1 ring-white/10` so the card pops off the bg.

#### P1 — Submit button disabled state hides the loader visually

`LoginForm.tsx:305-319`: button is `disabled={loading || !supabase || (!form.formState.isValid && !isTestMode)}`. The pattern itself is fine — but the button uses default variant (`bg-primary`). Under `.dark`, `--primary` is `oklch(0.923 0.003 48.717)` ≈ near-white, and `--primary-foreground` is `oklch(0.216 ...)` ≈ dark. So the dark form has a **white** primary button with dark text — high contrast, but: when `disabled`, `disabled:opacity-50` (button.tsx:8) makes the text nearly invisible against the now-translucent white surface. Either switch to `variant="primary"` (the brand-blue token primary, `button.tsx:14`) which has white-on-blue and stays readable at 50% opacity, or override `disabled:opacity-50` on auth submit buttons.

The Google button (`LoginForm.tsx:338-347`) uses `variant="outline"` — that one is fine because outline + `dark:bg-input/30` keeps form during disabled state.

#### P1 — Error / config alerts use the shadcn `<Alert>` default which is light-on-light under `.dark`

`LoginForm.tsx:244-258`. Under `.dark`, alert variant `default` typically renders as `bg-background text-foreground` and depends on the dark theme; the variant `destructive` is `--destructive` (`oklch(0.704 0.191 22.216)` ≈ red-orange). The destructive alert pops; the **default** alert (`auth-config-alert`) — shown when Supabase env is missing — is near-invisible against the dark card. Either elevate to `variant="destructive"` (since unconfigured auth is an error state) or add an explicit `className="border-amber-400/40 bg-amber-400/10 text-amber-100"` to communicate "config needed."

#### P2 — Form labels and input borders carry no color hint on focus beyond `--ring`

`input.tsx:11-14` ships `focus-visible:border-ring focus-visible:ring-ring/50 focus-visible:ring-[3px]`. Under `.dark`, `--ring` is `oklch(0.553 0.013 58.071)` (a muted warm gray). On a dark obsidian card with amber accents, the focus ring is the only feedback and it's gray-on-gray. Lift the ring to a brand color: `focus-visible:ring-amber-400/40` to match the link color in `AuthPageShell.tsx:6` (`text-amber-400`). This is a one-line override on the auth-page input, not a global change.

#### P2 — "Or continue with" divider relies on `border-t` without color

`LoginForm.tsx:328-336`: the rule `border-t` resolves to `--border` = `oklch(1 0 0 / 10%)` under `.dark` — a fine 10 %-white border. The pill background `bg-background` (`LoginForm.tsx:332`) under `.dark` matches the page bg — not the card bg — so the pill blends with the card surface and the rule reads as a single near-invisible line. Swap the pill to `bg-card` so it visually punches the divider:

```tsx
<span className="bg-card text-muted-foreground px-2">Or continue with</span>
```

#### P2 — Card `max-w-lg` (login) vs `max-w-md` (signup)

`/login/page.tsx:18` uses default `max-w-lg` (32 rem); `/signup/page.tsx:23` uses `max-w-md` (28 rem). On desktop they are visibly different widths. Pick one. The signup form has 4 inputs + confirm → `max-w-md` cramps. `max-w-lg` for both reads better at 1280 px.

---

### 3) `/signup` (`src/app/signup/page.tsx` + `SignupForm`, `AuthPageShell`)

Same shell as `/login`; comments below are deltas from §2.

#### P1 — Success-state UI emits 3 stacked full-width buttons

`SignupForm.tsx:170-190`: after submit, the user sees three primary-stack buttons (`Enter verification code`, `Resend verification email`, `Return to login`) in a `space-y-3` column. On desktop the card is `max-w-md` so the buttons span ~28 rem each. That's three CTAs of equal weight competing for attention; only one is the primary path. Demote `Resend` to `variant="outline"` (already done) and `Return to login` to `variant="ghost"` text-only link, which is closer to a footer than a CTA.

#### P1 — `confirmPassword` field has no inline equality hint

`SignupForm.tsx:282-298`. The field uses `type="password"` with placeholder "Confirm your password". The Zod schema (`SignupSchema` from `lib/schemas/auth`) presumably re-validates on submit; users only learn the passwords differ after pressing Submit. Add a live "✓ matches" or "✗ doesn't match" hint under the field after both have content (8+ chars). Trivial Zod-driven `form.watch()` pattern.

#### P1 — Display name field is required but order is email → display name → password → confirm

Cognitive load lowest when the human-readable identity (display name) comes **before** the auth secret. Reorder to displayName → email → password → confirmPassword.

#### P2 — No password-strength feedback

For a residential-real-estate app handling household auth, a basic strength meter (Zod schema-derived, not a third-party) would push from "looks like a generic SaaS" to "feels considered." `Progress` primitive already exists at `src/components/ui/progress.tsx` — wire it.

---

### 4) `/cookies` (`src/app/cookies/page.tsx` + `CookiePreferencesPanel`)

Composition: light `bg-slate-50` page, max-width 4xl, header + 5 stacked sections (Settings panel + What/Use/Manage/Updates/Contact).

#### P1 — Page is the only top-level route with a brand-detached visual identity

The site-wide pattern is dark hero ↔ light grid ↔ dark CTA ↔ dark footer. `/cookies` is light-only with `bg-slate-50` (`/cookies/page.tsx:14`) and no header/footer (it doesn't render `<Header />` or `<Footer />`). On desktop the user lands here from the Footer's "Cookie Policy" link and **loses every nav affordance** — there is no link back to the home page or to other legal pages.

Fix: either render `<Header />` + `<Footer />` like the landing page, or add a small top breadcrumb: `Home › Legal › Cookie policy` with a back link to `/`.

#### P1 — `text-slate-500` on `bg-white` for the "COOKIE POLICY" eyebrow is fine; but the "Last updated" line is also `text-slate-500` — same level as the eyebrow

`/cookies/page.tsx:17,25-27`. Two distinct semantic roles (category label vs metadata) share a color — visual hierarchy collapses. Demote "Last updated" to `text-slate-400` and keep the eyebrow at `text-slate-500` with `tracking-[0.2em] uppercase`.

#### P1 — `CookiePreferencesPanel` "Save preferences" / "Accept all" / "Reject non-essential" are 3 equal-weight inline buttons

`CookiePreferencesPanel.tsx:154-181`: `<Button variant="primary">Save preferences</Button>`, `<Button variant="outline">Accept all</Button>`, `<Button variant="ghost">Reject non-essential</Button>`. On desktop they live on one row (`sm:flex-row`). Industry convention for cookie banners: **Accept all** is the loudest CTA, **Reject** is the secondary, **Customize / Save** sits in the middle as a neutral. Today it inverts that — "Save preferences" (which only matters if you've actually toggled something) is the loud blue button.

Re-rank: `Accept all` = `variant="primary"`; `Reject non-essential` = `variant="outline"`; `Save preferences` = `variant="ghost"` (or hide it until any toggle has changed from its consented value).

#### P1 — The four cookie-category rows are visually identical except for one disabled toggle

`CookiePreferencesPanel.tsx:94-152`: Essential (disabled, on), Preferences, Analytics, Advertising — same `rounded-xl border border-slate-200 px-4 py-3` block. The disabled Essential row uses `bg-slate-50` to differentiate. On desktop, the difference between "off" and "essential locked-on" is a 1-shade background tint that's easy to miss. Add a small `<Badge variant="secondary">Required</Badge>` next to the Essential title; or set the disabled `<Switch>` style to a clearly-locked padlock affordance.

#### P2 — `<Link>` `text-sky-600` and `text-sky-700` mix on the same page

`/cookies/page.tsx:67` (sky-700, AdSense link) vs `:93,114` (sky-600, mailto). Two colors for "external link". Pick one (sky-600 is the brand-aligned default elsewhere) and use it everywhere. Underline both on hover via `hover:underline` (currently only an `underline` always-on, no hover state).

#### P2 — Section cards are `rounded-2xl bg-white p-6 shadow-sm ring-1 ring-slate-200 sm:p-8` repeated 5× verbatim

`/cookies/page.tsx:34-122`. Five sections share the exact same className tuple. Pull into a `<LegalSection>` local component or accept it as fine but add a tiny top-border accent (e.g., `before:content-[''] before:absolute before:top-0 before:left-6 before:right-6 before:h-px before:bg-slate-100`) to break visual monotony — currently it reads as a stack of identical white slabs.

#### P2 — Heading hierarchy: page `<h1>` is `text-3xl sm:text-4xl`, all sections are `<h2 class="text-xl">`

`/cookies/page.tsx:20,35,45,78,102,110` plus the panel's `<h2 class="text-xl">` (`CookiePreferencesPanel.tsx:88`). All H2s share one size — fine for a legal doc, but skip-scanning is aided by a `text-2xl` H2 with `text-xl` H3 inside. Today every section is the same weight.

---

## Cross-route findings

### Typography hierarchy

The marketing pages use a serif display family (`var(--font-display), Georgia, serif`) for H1-H3 via `globals.css:380-388`, while the legal/auth pages render with body sans. That's correct as an editorial vs functional split — but `<CardTitle>` in the auth flow inherits the global heading rule (`globals.css:380`), so the auth `<CardTitle>` is the **only** form heading on the site rendered in the display serif. Loops back to the §2 P0 above: the shell `<h1>` is also serif → "HomeMatch" appears in serif twice in the auth page (shell + brand). Suggest forcing the in-card title to `font-sans` so the form reads as functional UI, not editorial copy.

### Color contrast — measured (sRGB approximations)

Computed from the rendered class strings:

| Pair                                                                           | Foreground          | Background          | Approx ratio | WCAG AA                                                                             |
| ------------------------------------------------------------------------------ | ------------------- | ------------------- | ------------ | ----------------------------------------------------------------------------------- |
| Hero h1 white on `#030712`                                                     | `#fff`              | `#030712`           | 19.6:1       | ✅                                                                                  |
| Hero subhead `text-white/80` on `#030712`                                      | `#fff` α=0.8        | `#030712`           | 13.6:1       | ✅                                                                                  |
| Header "Log In" `text-white/70` on `bg-slate-800/60` over `#030712`            | composed ~`#c1c8d4` | composed ~`#0f1322` | ~11:1        | ✅                                                                                  |
| Feature card body `text-gray-700` on `#fff`                                    | `#374151`           | `#fff`              | 9.8:1        | ✅                                                                                  |
| HowItWorks step body `text-gray-700` on `#fff`                                 | `#374151`           | `#fff`              | 9.8:1        | ✅                                                                                  |
| Cookies page body `text-slate-700` on `#fff`                                   | `#334155`           | `#fff`              | 11.6:1       | ✅                                                                                  |
| Footer "Built in the Bay Area" `text-white/70` on gradient blue (~`#04296b`)   | `#fff` α=0.7        | `#04296b`           | ~5.6:1       | ✅                                                                                  |
| **Footer copyright `text-white/50` on gradient blue (~`#04296b`)**             | `#fff` α=0.5        | `#04296b`           | **~3.3:1**   | **❌ AA body**                                                                      |
| **Auth Card hint links `text-amber-400` `#fbbf24` on dark obsidian `#1c1917`** | `#fbbf24`           | `#1c1917`           | ~10.5:1      | ✅                                                                                  |
| Marketing card pill date `text-slate-300` on `bg-[#0f172a]/70` over hero       | composed ~`#cbd5e1` | composed ~`#0f1729` | ~12:1        | ✅                                                                                  |
| Marketing card pill icon `text-slate-400` on `bg-white/5` glass                | `#94a3b8`           | composed dark       | ~6:1         | ✅                                                                                  |
| **Hero outline button `text-white` on `bg-white/5` over `#030712`**            | `#fff`              | composed `#0c1320`  | ~17:1        | ✅ (contrast OK; visibility low because _the surface_ itself blends — see P1 below) |

**Action:** lift `text-white/50` body in `Footer.tsx:215` to `text-white/65` minimum (4.7:1) or `text-white/70`.

### Component polish

- **Outline buttons on dark surfaces.** Hero's "Resume your search" (`HeroSection.tsx:108-115`) renders `border-white/30 bg-white/5` over the obsidian hero — the border at 30 % white reads as a faint ghost. Lift to `border-white/40` minimum, or stop overriding the outline variant and instead introduce a `variant="ghost-on-dark"` so this is centrally defined.
- **Alert variant under .dark.** The default `<Alert>` ships shadcn defaults that don't survive `.dark` well. Either patch `src/components/ui/alert.tsx` (not viewed; recommended) or wrap auth-shell alerts in explicit `bg-amber-400/10 border-amber-400/30 text-amber-100` className overrides for the config-warning case, leaving `variant="destructive"` to the actual error state.
- **Switch primitive.** `CookiePreferencesPanel.tsx` uses `<Switch>` (`src/components/ui/switch.tsx` not read here) — verify the disabled state renders with `cursor-not-allowed` + a "locked" visual tell, not just `opacity-50`.
- **Buttons `min-h-[44px]`.** All sizes ship `min-h-[44px]` (button.tsx:42-47), respecting touch-target a11y. Good.

### Loading / empty / error states

- **Login & Signup:** `loading.tsx` files exist at `src/app/login/loading.tsx` and `src/app/signup/loading.tsx`. **Their content was not read in this audit.** If empty, see §2 P0. Recommend a 3-row skeleton wrapped in `AuthPageShell` with the same `Card` chrome.
- **Cookies:** No skeleton; the page is server-rendered and the panel is client-only (`useCookieConsent` hook). On initial paint the toggles can momentarily show their default `getDefaultConsent()` then switch to the user's saved consent on hydration — flicker. Mitigate by reading consent server-side from the cookie and passing as initial state to `CookiePreferencesPanel`.
- **Landing:** No empty/error states (it's pure content). The `error.tsx` and `not-found.tsx` at app root were not audited but exist.
- **Auth error states.** Both forms handle Supabase errors via `<Alert variant="destructive">`. Unhandled-network state on the signup success card has good resend-error coverage. ✅
- **OAuth disabled state.** When `supabase` client is null (env missing), both forms render an `auth-config-alert` instead of swallowing the failure. ✅

### Accessibility (desktop)

- Header logo link has `aria-label="HomeMatch - Go to homepage"` (`Header.tsx:56`). ✅
- Hero spotlight, parallax stars, mesh backgrounds: all `aria-hidden`. ✅
- Footer social icons: `aria-label="X (formerly Twitter)"` / `"Instagram"`, `min-h-[40px] min-w-[40px]` (`Footer.tsx:42`). ✅
- Form labels: `<FormLabel>` from shadcn-form, paired with `<Input>` via `react-hook-form` Controller. ✅
- **Skip link**: not present. Add a visually-hidden "Skip to main content" link as the first interactive element of `<Header>`. The page has 12+ marketing links before the form on `/login` if a user lands via header.
- **Focus order**: hero CTAs sit _after_ a Framer-staggered nav. On keyboard navigation from the URL bar, Tab order is Header → "Start swiping" CTA → "Resume your search" CTA → next section. Reasonable. ✅
- **Reduced motion**: see §1 P1.
- **Color-only signaling**: cookie toggles use only the Switch's color/state. Pair with text label "On / Off" (already present via `aria-label`) — fine. ✅

### Animation budget

Counting only unconditional/auto-run animations on `/`:

- `motion.header` shadow + bg-color transitions — 2.
- Hero stagger entrance: logo, "Log In" pill, "Sign Up" pill, parallax stars init — 4.
- HeroMotionEnhancer spotlight tracking — continuous on mousemove.
- ParallaxStarsCanvas — continuous rAF.
- `WordReveal` in CtaBand — 6 words × stagger.
- HowItWorks per-step setTimeout-driven activation — 3.

That's a lot of "in view" animation in one viewport. Consider gating below-the-fold animations behind `whileInView` with `viewport={{ once: true, amount: 0.3 }}` (most already use this) and adding `useReducedMotion()` short-circuits.

---

## Prioritized fix list

| #   | Pri | Route               | What                                                                                                                                                                                                                                                                               | Where                                                                                       |
| --- | --- | ------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------- |
| 1   | P0  | `/`                 | Reconcile `prime` button sizing — remove hardcoded `px-9 py-7`; let `size` control padding; add `compoundVariants` so `prime+lg` snaps to a single canonical CTA shape. Audit `HeroSection.tsx:91-107` and `CtaBand.tsx:106-134` callers; remove their per-call padding overrides. | `src/components/ui/button.tsx:25-39`; callers above                                         |
| 2   | P0  | `/`, all            | Add `useReducedMotion()` gating to Framer Motion components in `HeroSection`, `FeatureGrid`, `HowItWorks`, `CtaBand`, `Footer`. Cap infinite-loop hover animations at 2-3 reps.                                                                                                    | files above                                                                                 |
| 3   | P0  | `/login`, `/signup` | Verify and populate `loading.tsx` with a `<AuthPageShell>` + `<Skeleton>` skeleton.                                                                                                                                                                                                | `src/app/login/loading.tsx`, `src/app/signup/loading.tsx`                                   |
| 4   | P0  | `/login`, `/signup` | Remove duplicate "HomeMatch" heading from shell **or** demote `<CardTitle>` to plain copy; ensure exactly one H1 per page.                                                                                                                                                         | `AuthPageShell.tsx:36-41` + `LoginForm.tsx:239-241` + `SignupForm.tsx:198-201`              |
| 5   | P1  | `/`                 | Add brand-affordance hover state on Header logo link (color shift + slight underline or glow).                                                                                                                                                                                     | `Header.tsx:52-65`                                                                          |
| 6   | P1  | `/`                 | Lift Footer copyright/credit from `text-white/50` to `text-white/70` (or `/65` minimum).                                                                                                                                                                                           | `Footer.tsx:215`                                                                            |
| 7   | P1  | `/`                 | Lock FeatureGrid + HowItWorks vertical rhythm: `lg:mt-12` between heading and grid; add `lg:pt-4` to HowItWorks so it doesn't smash against FeatureGrid's bottom.                                                                                                                  | `FeatureGrid.tsx:207`, `HowItWorks.tsx:67,93`                                               |
| 8   | P1  | `/login`, `/signup` | Switch auth submit to `variant="primary"` (brand blue with white text — survives `disabled:opacity-50` better than default). Lift focus rings to `ring-amber-400/40` on inputs.                                                                                                    | `LoginForm.tsx:305-319`, `SignupForm.tsx:301-314`, `Input` className override at call sites |
| 9   | P1  | `/login`, `/signup` | Increase auth Card surface contrast: `bg-card/90` + `ring-1 ring-white/10`. Swap divider pill `bg-background` → `bg-card`.                                                                                                                                                         | `LoginForm.tsx:235`, `SignupForm.tsx:197`, divider in both                                  |
| 10  | P1  | `/cookies`          | Restore site nav: add `<Header />` + `<Footer />` (or a breadcrumb + back link). Re-rank panel buttons (Accept all = primary).                                                                                                                                                     | `/cookies/page.tsx`, `CookiePreferencesPanel.tsx:154-181`                                   |
| 11  | P1  | `/signup`           | Reorder fields: displayName → email → password → confirm. Add live "passwords match" hint. Demote post-signup "Return to login" to ghost link.                                                                                                                                     | `SignupForm.tsx:225-298,170-190`                                                            |
| 12  | P2  | `/`                 | Hero h1 `font-black` → `font-extrabold` (or verify display font supports 900). Hero `pt-22` → `pt-24` or arbitrary `pt-[5.5rem]`.                                                                                                                                                  | `HeroSection.tsx:74,78`                                                                     |
| 13  | P2  | `/`                 | Replace duplicated `rounded-xl` in Feature/Step card hover overlays with `rounded-[inherit]` so they track Card's `rounded-token-xl`.                                                                                                                                              | `FeatureGrid.tsx:257`, `HowItWorks.tsx:173`                                                 |
| 14  | P2  | `/login`/`/signup`  | Unify max-width: both `max-w-lg`.                                                                                                                                                                                                                                                  | `/login/page.tsx:18`, `/signup/page.tsx:23`                                                 |
| 15  | P2  | `/cookies`          | Pick one link color (`text-sky-600`); add `hover:underline` toggle. Add `Required` badge to Essential cookie row. Bump page H2 to `text-2xl`.                                                                                                                                      | `/cookies/page.tsx:67,93,114`, `CookiePreferencesPanel.tsx:94-105`                          |
| 16  | P2  | All pages           | Add a "Skip to content" visually-hidden link as first focusable. Apply Framer's `useReducedMotion` + reuse the existing `.visually-hidden-token` utility.                                                                                                                          | `Header.tsx`, root `layout.tsx`                                                             |

---

## Before / after illustrative diffs

### Fix 1 — `prime` button canonicalization

```tsx
// src/components/ui/button.tsx (excerpt)
// BEFORE
prime:
  '... text-white px-9 py-7 text-base font-semibold ' +
  'before:content-[""] before:absolute before:inset-0 before:rounded-full ...',

// AFTER
prime:
  // visuals only — sizing comes from `size` variant
  'relative overflow-hidden rounded-full text-white font-semibold ' +
  'before:content-[""] before:absolute before:inset-0 before:rounded-full ' +
  'before:[background:linear-gradient(180deg,#0c1426_0%,#0a0f1d_100%)] ' +
  'before:[box-shadow:0_2px_8px_rgba(0,0,0,0.35)] ' +
  'after:content-[""] after:absolute after:-inset-[2px] after:rounded-full ' +
  'after:[padding:2px] after:[background:linear-gradient(135deg,#3b82f6cc,#1e40b3,#38bdf8b3)] ' +
  'after:[-webkit-mask:linear-gradient(#000_0_0)_content-box,linear-gradient(#000_0_0)] ' +
  'after:[-webkit-mask-composite:xor] after:[mask-composite:exclude]',
```

```tsx
// At each callsite — drop the per-call padding overrides:
// HeroSection.tsx:91-107
// BEFORE
<Button variant="prime" size="lg" asChild className="group relative w-full overflow-hidden sm:w-auto">

// AFTER (same)
<Button variant="prime" size="lg" asChild className="group relative w-full overflow-hidden sm:w-auto">

// CtaBand.tsx:102-134
// BEFORE
className="group relative w-full overflow-hidden px-4 py-3 sm:w-auto sm:px-8 sm:py-4"
// AFTER
className="group relative w-full overflow-hidden sm:w-auto"
```

### Fix 2 — Reduced-motion gate in HeroSection

```tsx
// src/components/marketing/HeroSection.tsx (sketch)
'use client'
import { useReducedMotion } from 'framer-motion'

export function HeroSection() {
  const prefersReduced = useReducedMotion()
  // ... pass prefersReduced into HeroMotionEnhancer and skip <ParallaxStarsCanvas /> when true
}
```

### Fix 6 — Footer contrast

```tsx
// src/components/marketing/Footer.tsx:215
// BEFORE
<p className="text-token-xs mt-1 text-white/50 sm:mt-2" ...>
  &copy; 2024 HomeMatch. All rights reserved.
</p>

// AFTER
<p className="text-token-xs mt-1 text-white/70 sm:mt-2" ...>
  &copy; 2026 HomeMatch. All rights reserved.
</p>
```

(Also note the year is stale — `text-white/50` is hiding what should be 2026 per the audit-stamped "currentDate".)

### Fix 9 — Auth card surface contrast

```tsx
// src/components/features/auth/LoginForm.tsx:235
// BEFORE
<Card className="bg-card/80 supports-[backdrop-filter]:bg-card/60 mx-auto w-full shadow-lg backdrop-blur" ...>

// AFTER
<Card className="bg-card/90 supports-[backdrop-filter]:bg-card/75 mx-auto w-full shadow-lg backdrop-blur ring-1 ring-white/10" ...>
```

### Fix 10 — Cookie panel button re-rank

```tsx
// src/components/legal/CookiePreferencesPanel.tsx:154-181
// BEFORE
<Button variant="primary" onClick={() => handleSave(draft)}>Save preferences</Button>
<Button variant="outline" onClick={...acceptAll...}>Accept all</Button>
<Button variant="ghost"   onClick={...rejectAll...}>Reject non-essential</Button>

// AFTER
<Button variant="primary" onClick={...acceptAll...}>Accept all</Button>
<Button variant="outline" onClick={...rejectAll...}>Reject non-essential</Button>
{hasUserToggled ? (
  <Button variant="ghost" onClick={() => handleSave(draft)}>Save preferences</Button>
) : null}
```

### Fix 14 — Unify auth card width

```tsx
// src/app/signup/page.tsx:23
// BEFORE
<AuthPageShell title="HomeMatch" subtitle="Create your account" maxWidthClassName="max-w-md">

// AFTER
<AuthPageShell title="HomeMatch" subtitle="Create your account">
// (default is max-w-lg, matching /login)
```

---

## Notes for the next pass

- **Token consolidation.** The codebase carries two parallel scales (shadcn semantic + `--color-token-*` + `hm-*` warm-obsidian). Marketing pages mostly use raw Tailwind utility colors (`text-gray-900`, `text-white/70`, `bg-slate-50`), which are the _third_ scale. A future cleanup should pick one canonical scale per surface — e.g., marketing → semantic + `--color-token-*`; auth → `hm-*` warm obsidian + amber; legal → semantic only.
- **Stale copyright (`Footer.tsx:218`):** "© 2024 HomeMatch" — update to 2026 dynamically (`new Date().getFullYear()`).
- **Server-side rendering of consent.** `CookiePreferencesPanel` should be hydrated with the consent cookie value, not mounted with `getDefaultConsent()` and reconciled in `useEffect`.
- **Hero microcopy length.** "Find a home that works for everyone." (h1) → "Swipe through real listings, save the ones your household likes, and keep the search clear instead of stressful." (45 words / 282 chars, `HeroSection.tsx:82-85`). On `lg:` the subhead wraps to ~3 lines, which is plus-one too many under a `text-7xl` headline. Trim to ≤25 words.
- **No screenshots in this audit.** This worktree has no permission to spawn a headless browser; all findings are from class-string + source-tree review and the rendered HTML returned by `curl`. The next pass should run `/qa` or `/design-review` against a deployed preview to verify pixel-level claims and capture before/after evidence.
