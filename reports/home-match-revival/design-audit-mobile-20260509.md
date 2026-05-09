# Mobile Design Audit — HomeMatch Public Pages

**Date:** 2026-05-09
**Viewport:** 375px (iPhone SE / mobile baseline)
**Scope:** `/` (landing), `/login`, `/signup` and their imported components.
**Mode:** Read-only static source review (no browser instrumentation).

Severity scale: **P1** = visible breakage / a11y violation • **P2** = polish / heuristic miss • **P3** = nit.

---

## 1. `Header` — `src/components/marketing/Header.tsx`

**P1 — Tap targets <44px on mobile.** Login (line 92) and Sign Up (line 109) anchors use `px-5 py-2 text-sm` at base (only `sm:py-2.5 sm:text-base` upgrades them). Effective height ≈34–36px — below WCAG 2.5.5 / Apple HIG (44×44). Fix: `min-h-[44px] inline-flex items-center` or `py-3` at base.

**P2 — Hero clearance under fixed header.** Header is `fixed top-0` and at expanded state ≈80–84px tall (`py-4` + logo). Hero uses `pt-22` (88px) → only ~4–8px gap before H1 on a fresh scroll. Bump to `pt-24` mobile.

**P2 — No mobile nav menu / no in-product links.** Marketing surface only exposes Login/Sign Up. Footer carries Features/How-It-Works/About — header has no parity. Acceptable but worth noting.

---

## 2. `HeroSection` — `src/components/marketing/HeroSection.tsx` + `MarketingPreviewCardStatic.tsx`

**P1 — Floating preview-card overlay badges overlap on mobile.** `MarketingPreviewCardStatic` paints three absolute overlays. Two render on mobile (the middle one is `hidden sm:flex`):
- "Built for households" — `left-2 top-2`, `max-w-[210px]`
- "Real listings, quick swipes" — `right-2 bottom-20`, `max-w-[210px]`
- Price chip `$975,000` — `bottom-4 left-4`

At 375px viewport the preview card is ~343px wide; a 210px overlay consumes ~61% of card width. The `bottom-20` overlay (5rem = 80px above the image bottom) sits right above the price chip on a 4:3 image (~257px tall) and crowds the viewport. Recommendation: hide the `bottom-20` badge on mobile (`hidden sm:flex`) or shrink to `max-w-[160px]`.

**P2 — Hero `min-h-[680px]` exceeds iPhone SE viewport (667px).** With 88px top padding the user must scroll to see the CTAs. Convert to `min-h-[100svh]` or reduce on mobile.

**P2 — H1 not balanced.** `text-4xl leading-[1.05] font-black` — "Find a home that works for everyone." wraps to 3 lines at 375px without `text-balance`/`text-pretty`. Last line orphans "everyone."

**P2 — CTA spacing.** `gap-3` between stacked buttons is fine; the `gap-10` between CTA stack and preview card feels thin given the heavy card weight — consider `gap-12` mobile.

---

## 3. `FeatureGrid` — `src/components/marketing/FeatureGrid.tsx`

**P2 — H2 wrap is awkward.** "House Hunting, But Make It **Actually Fun**" with gradient `<span>` spans 24–28ch at `text-3xl` on 375px. Add `text-balance` to the H2.

**P2 — Card padding `p-4` tight.** With icon block + heading + paragraph, 16px padding feels cramped. Bump to `p-5` at base, keep `sm:p-6`.

**P3 — Hover-only spotlight effects.** No-op on mobile (no pointer hover), so cards render as flat white. Acceptable.

---

## 4. `HowItWorks` — `src/components/marketing/HowItWorks.tsx`

**P3 — Step cards stack at `gap-4` (16px).** Adequate. `gap-5` would breathe better.

**P3 — Title "1. Tell Us Your Vibe" at `text-xl`** — none of the current titles wrap, but layout has no width fallback if titles grow.

---

## 5. `CtaBand` — `src/components/marketing/CtaBand.tsx`

**P1 — Primary CTA dwarfs secondary on mobile (variant + size collision).**
The `prime` button variant (button.tsx:25–39) hard-codes `px-9 py-7 text-base font-semibold`. CtaBand applies `size="lg"` AND `className="… px-4 py-3 sm:px-8 sm:py-4"`. Class merging via `cn()` only overrides `px-*` (more specific class wins) — `py-7` from the variant **stays**. Result: primary button is ≈84px tall on mobile while the outline CTA is ≈56–60px (`px-8 py-4 text-lg`). Visual hierarchy is lopsided. Fix: drop `size="lg"` (the variant already controls size), or override with `!py-3` / use a `prime` variant that lacks padding.

**P2 — `WordReveal` may force wraps in inconvenient spots.** Each word is `inline-block`; `House-Hunting` is ~13ch and at `text-3xl` may push "Your" to a new line. Tolerable, but consider `text-balance` on the wrapper.

**P3 — Top fade `from-gray-50 to-transparent` band.** Incoming section is light, CtaBand is dark — confirm the fade blends rather than bands at the seam on retina mobile.

---

## 6. `Footer` — `src/components/marketing/Footer.tsx`

**P1 — Footer link list has unsafe tap targets on mobile.** Line 103: `text-token-sm space-y-0 leading-none ... lg:space-y-3 lg:leading-normal`. With `space-y-0 leading-none`, links stack with ~14–16px row height — well below 44px tap target and visually adjacent. Mis-tap risk is high. Fix: `space-y-2 leading-relaxed` at base, or wrap each `<li>` with `min-h-[44px] flex items-center`.

**P2 — Column heading flush against links.** `mb-0 ... lg:mb-4` — at base the uppercase column title sits glued to its first link. Add `mb-2` at base.

**P2 — Asymmetric mobile grid orphans "Legal".** Mobile uses `grid-cols-2`; layout becomes:
- Row 1: Brand (col-span-2)
- Row 2: Product · Company
- Row 3: Legal · (empty)

Legal sits alone in column 1 of row 3. Fix: switch to `grid-cols-3` for the link cluster on mobile, or `col-span-2` Legal, or move Legal under Brand.

**P3 — `text-token-3xl` brand wordmark over two small social icons** — visually unbalanced on small screens.

---

## 7. `/login` and `/signup` — `AuthPageShell.tsx`, `LoginForm.tsx`, `SignupForm.tsx`

### `AuthPageShell.tsx`

**P1 — Decorative blurs without `overflow-hidden`.** The shell paints two absolute blurs at `w-[680px]` and `w-[520px]` centered with `-translate-x-1/2`. Outer container is `min-h-screen flex … px-6 py-12` — **no `overflow-hidden`**. On 375px viewport the 680px-wide blur paints ≈150px outside each side. If the layout chain doesn't enforce `overflow-x: hidden`, this triggers a horizontal scrollbar. Add `overflow-hidden` to the shell's outer div.

**P2 — `valueProp` pill is `w-fit text-xs` with no `max-w-full`.** Current copy fits, but any growth becomes a horizontal ribbon. Add `max-w-full whitespace-normal text-center`.

### `LoginForm.tsx` / `SignupForm.tsx`

**P1 — Verify `text-token-base` ≥16px on `Input`.** Input (input.tsx:11) sets `text-token-base` and `md:text-token-sm`. If `--token-base` is <16px, iOS Safari auto-zooms on focus (classic mobile bug). Confirm in `globals.css`. Input height `h-11 min-h-[44px]` and `touch-manipulation` are correct.

**P2 — Inline auth-link tap targets.** "Have a verification code? **Verify email**", "Don't have an account? **Sign up**", "**Forgot password?**" — all rendered as inline `<a>` inside `text-sm` paragraphs. Anchor height ≈20px → undersized. Either bump containing `<p>` line-height or wrap link in `inline-flex min-h-[44px] items-center`.

**P3 — Signup form length.** 4 inputs + Create Account + divider + Google = ~720px content height. "Or continue with / Google" is below the fold on iPhone SE. Consider hoisting Google above email signup, or placing the OAuth button first.

**P3 — `Card` width.** `max-w-lg` (login) / `max-w-md` (signup) — both collapse to viewport on 375px (effective ≈327px after `px-6`). Fine.

---

## 8. Cross-cutting

**P2 — Reduced motion.** Header, FeatureGrid, HowItWorks, CtaBand all use `framer-motion` entrance/hover animations without `prefers-reduced-motion` guards. Mobile users with reduced-motion enabled still receive the staggered reveals.

**P3 — Static `min-h-[…]px` instead of `100svh` patterns.** Hero (`min-h-[680px]`) and AuthShell blurs anchor pixel heights — small-viewport phones (320px–360px) get over-tall layouts.

---

## Summary Table

| # | Severity | Surface | Issue |
|---|---|---|---|
| 1 | P1 | Header | Login/Sign Up anchors ~34px tall (<44px) |
| 2 | P1 | Hero / PreviewCard | Floating overlay badges crowd price chip on mobile |
| 3 | P1 | CtaBand | `prime` variant `py-7` survives override — primary CTA ~84px tall, dwarfs outline |
| 4 | P1 | Footer | `space-y-0 leading-none` on link list = unsafe tap targets |
| 5 | P1 | AuthPageShell | 680px blur with no `overflow-hidden` (scroll risk) |
| 6 | P1 | Inputs | Verify `--token-base` ≥16px to prevent iOS auto-zoom |
| 7 | P2 | Header | `pt-22` leaves ~4–8px clearance under expanded fixed header |
| 8 | P2 | Hero | `min-h-[680px]` > iPhone SE viewport |
| 9 | P2 | Hero / FeatureGrid | H1/H2 lack `text-balance` |
| 10 | P2 | CtaBand | "House-Hunting" can force-wrap in `WordReveal` |
| 11 | P2 | Footer | Mobile `grid-cols-2` orphans Legal column |
| 12 | P2 | Footer | Column titles flush against links (`mb-0`) |
| 13 | P2 | AuthPages | Inline auth links `Forgot password?` / `Sign up` <44px tap |
| 14 | P2 | AuthShell | `valueProp` pill needs `max-w-full whitespace-normal` |
| 15 | P2 | All marketing | No `prefers-reduced-motion` guards on framer-motion entrances |
| 16 | P3 | Hero / FeatureGrid | `gap-10` and `p-4` mobile spacing tight; consider `gap-12` / `p-5` |
| 17 | P3 | Footer | Brand wordmark oversized vs social icons on mobile |
| 18 | P3 | SignupForm | Form runs below fold on 375×667; consider OAuth-first |

---

## Quick Wins (no design system changes)

1. Header anchors → `min-h-[44px] inline-flex items-center` + `py-3` base.
2. Footer link columns → `space-y-2 leading-relaxed mb-2` at base.
3. `AuthPageShell` outer div → add `overflow-hidden`.
4. Hide the `bottom-20` preview-card badge on mobile (`hidden sm:flex`).
5. CtaBand primary CTA → drop `size="lg"` (or `!py-3` mobile) so the `prime` variant doesn't render at 84px.
6. Hero → `min-h-[100svh]` (or remove pixel min-height).
7. H1/H2 on hero + FeatureGrid → `text-balance`.
8. Confirm `--token-base` resolves to ≥16px in `globals.css`.

---

## Files reviewed

- `src/app/page.tsx`
- `src/app/login/page.tsx`
- `src/app/signup/page.tsx`
- `src/components/marketing/Header.tsx`
- `src/components/marketing/HeroSection.tsx`
- `src/components/marketing/MarketingPreviewCardStatic.tsx`
- `src/components/marketing/FeatureGrid.tsx`
- `src/components/marketing/HowItWorks.tsx`
- `src/components/marketing/CtaBand.tsx`
- `src/components/marketing/Footer.tsx`
- `src/components/features/auth/AuthPageShell.tsx`
- `src/components/features/auth/LoginForm.tsx`
- `src/components/features/auth/SignupForm.tsx`
- `src/components/ui/input.tsx`
- `src/components/ui/button.tsx`
