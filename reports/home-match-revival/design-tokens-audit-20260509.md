# HomeMatch Design Token Audit — 2026-05-09

Read-only audit of token definitions in `src/app/globals.css` and their usage across `src/components/**`. There is no `tailwind.config.ts` (Tailwind v4; theme is declared via `@theme inline` in `globals.css`).

Scope: 111 component files under `src/components/`.

## TL;DR

HomeMatch has **three competing color systems** layered on top of each other, with the newest one (`--color-token-*`) defined comprehensively but barely adopted, the middle one (`--hm-*` Warm Obsidian) used heavily but only as text utilities, and **raw Tailwind palette classes** (slate/amber/sky/pink/etc.) doing the bulk of real work. On top of that, there are at least **8 hardcoded near-black hex values** that drift between components, and `EnhancedPropertyCard.tsx` references **4 design tokens that don't exist** in the theme — so those classes silently render as nothing.

## 1. The three color systems

### 1a. `--hm-*` "Warm Obsidian" theme — heavily used as text, sparsely as bg

Defined in `globals.css:31–55`. Adoption (counts from grep of `*.tsx`):

| Class | Count |
| --- | ---: |
| `text-hm-stone-500` | 118 |
| `text-hm-stone-200` | 94 |
| `text-hm-stone-400` | 74 |
| `text-hm-stone-300` | 40 |
| `text-hm-stone-100` | 26 |
| `text-hm-amber-400` | 22 |
| `bg-hm-obsidian-800` | 11 |
| `text-hm-success` / `text-hm-error` | 9 / 9 |
| `bg-hm-amber-400` | 9 |
| `bg-hm-obsidian-900` | 7 |

Strong as a **text** scale. Backgrounds are weaker — only `obsidian-800/900` (~18 calls) are routinely used; `obsidian-950` and `obsidian-700` are defined but never referenced as bg. `stone-600` is defined and only used twice.

### 1b. `--color-token-*` "Dashboard Design Tokens" — defined but mostly unused

Defined `globals.css:91–153` with full 50–900 ramps for primary/secondary/success/error/warning/accent/info. There are also hundreds of lines of utility classes (`globals.css:451–1182`) wrapping these. Actual adoption is shallow:

| Class | Count |
| --- | ---: |
| `text-token-sm` / `text-token-xs` | 15 / 13 |
| `bg-token-primary` | 6 |
| `bg-token-secondary-900` | 5 ← **token does not exist** |
| `bg-token-primary-dark` | 3 |
| `border-token-primary` | 3 |
| `text-token-error`, `text-token-xl`, etc. | 1 each |

Almost all `bg-token-*` and `text-token-*` semantic classes have zero or one usage. The infrastructure is built; the components don't call into it.

### 1c. Raw Tailwind palette — the de-facto color system

Despite the two systems above, the most-used colors in the codebase are raw Tailwind utilities:

| Class | Count |
| --- | ---: |
| `text-pink-400` | 28 |
| `bg-emerald-500` | 26 |
| `bg-slate-900` | 22 |
| `text-slate-400` | 21 |
| `bg-amber-500` | 21 |
| `text-sky-400` | 20 |
| `text-purple-400` | 20 |
| `text-emerald-400` | 19 |
| `text-red-400` | 19 |
| `bg-sky-500` | 18 |
| `text-slate-900` | 16 |
| `text-amber-400` | 16 |
| `bg-red-500` | 16 |

There is overlap with the HM scale (e.g. `text-amber-400` raw vs `text-hm-amber-400` token — both exist with the same value, used 16 and 22 times respectively). Same story for emerald/success and slate/stone.

**Inconsistency:** `text-slate-*` (15+14+11+11+7…) competes directly with `text-hm-stone-*` for the neutral text role. `bg-emerald-500` (26) competes with `bg-hm-success`. The "Warm Obsidian" intent is being undermined by routine reaches into Tailwind cool slate/blue.

## 2. Hardcoded hex colors — 60 unique values, 79 occurrences

The "luxury dark" backdrop is implemented as **eight different near-black hex codes**, none of which equal the token `--hm-obsidian-950` (`#0c0a09`) or `--hm-obsidian-900` (`#1c1917`):

| Hex | Count | Notes |
| --- | ---: | --- |
| `#0f172a` | 12 | Slate-900; appears in maps, property image gradient, providers |
| `#030712` | 6 | Different near-black |
| `#07132b` | 3 | Header / MobileBottomNav background |
| `#063A9E` | 3 | Marketing gradient endpoint, **uppercase** |
| `#021A44` | 3 | Marketing gradient start, **uppercase** (siblings are lowercase) |
| `#0a1628` | 2 | UserAvatar border, ProfileMenu bg |
| `#0a0f1d` | 1 | Button focus ring offset |
| `#0b0f1a`, `#0f131b`, `#0c0a09`, `#020617` | 1 each | More near-blacks |
| `#ffffff` vs `#fff` | 4 vs 2 | Inconsistent shorthand |
| `#000` (no `#000000`) | 2 | Inconsistent shorthand |

Notable hardcoded clusters:

- **`src/components/providers/CouplesProgressProvider.tsx:78–205`** — every toast variant (info/warning/success/celebration/error/loading/default) is built from raw hex gradients and borders. None go through `--color-couples-*` or `--color-token-*` even though both systems define the relevant colors.
- **`src/components/property/PropertyMap.tsx:32–146`** — marker SVG and info window use raw `#fbbf24/#d97706/#0f172a/#64748b/#b45309` instead of `--hm-amber-400/600`, `--hm-stone-500`, etc.
- **`src/components/settings/LocationMapSelector.tsx:97–108`** — Google Maps polygon styles hardcode `#64748b/#1f2937/#f59e0b`, the third of which is exactly `--hm-amber-500`.
- **`src/components/shared/home-match-logo.tsx:76–89`** — brand gradient uses `#3B82F6/#7C3AED/#EC4899/#E0F2FE/#C4B5FD/#FBCFE8` (mixed-case) and is the only place these brand colors live; not a token.
- **`src/components/layouts/Header.tsx:123` + `MobileBottomNav.tsx:74` + `shared/ProfileMenu.tsx:52,82`** — share the `#07132b` / `#0a1628` pair as "the chrome surface color" but it lives nowhere as a token.

## 3. Broken token references — these classes render nothing

`EnhancedPropertyCard.tsx` (lines 129, 134, 146, 160, 168, 177, 203, 204) uses tokens that are **not defined** in the `@theme inline` block:

| Class | Status |
| --- | --- |
| `bg-token-secondary-900`, `from-token-secondary-900`, `text-token-secondary-900` | `--color-token-secondary-900` is **not defined**; only 100, 200, 300, 500, 600, 700, 800 exist (`globals.css:103–109`). The dark-mode override at line 1172 references it but the source variable is missing. |
| `bg-token-background-primary` | `--color-token-background-primary` not defined anywhere. |
| `text-token-text-inverse`, `bg-token-text-inverse` | `--color-token-text-inverse` not defined anywhere. |
| `rounded-token-full` | `--border-radius-full` not defined; only sm/md/lg/xl/2xl exist (`globals.css:257–261`). |

Tailwind v4 silently no-ops unknown utilities, so these elements likely fall back to transparent / default. **Bug, not a style issue.**

## 4. Border radius — 6 systems running in parallel

Defined: `--radius` (0.625rem) plus shadcn-style derived `--radius-sm/md/lg/xl`, plus `--border-radius-sm/md/lg/xl/2xl` (`globals.css:257–261`), plus `rounded-token-*` utilities. Usage:

| Class | Count |
| --- | ---: |
| `rounded-full` | 188 |
| `rounded-xl` | 121 |
| `rounded-lg` | 76 |
| `rounded-2xl` | 27 |
| `rounded-md` | 17 |
| `rounded-token-md` | 10 |
| `rounded-sm` | 5 |
| `rounded-token-full` | 4 ← does not exist |
| `rounded-3xl` | 1 |

Plus arbitrary values that do not match any token:

```
rounded-[24px]   (4×)
rounded-[3rem]   (2×)
rounded-[2.1rem] (1×)
rounded-[2.2rem] (1×)
rounded-[32px]   (1×)
rounded-[4px]    (1×)
```

`rounded-[24px]` is `1.5rem` — between `xl` (`0.75rem`) and `2xl` (`1rem`) and `3xl` (`1.5rem` in default Tailwind). It would round-trip cleanly to `rounded-3xl` but is hand-coded.

`rounded-[2.1rem]` and `rounded-[2.2rem]` are within 0.1rem of each other and used a single time each. Almost certainly a designer eyeballing pixels.

## 5. Shadows — heavy use of arbitrary values

Token shadows (`--shadow-token-sm/md/lg/xl/2xl`, `globals.css:239–246`) exist. Usage:

| Class | Count |
| --- | ---: |
| `shadow-lg` (Tailwind default) | 46 |
| `shadow-sm` | 15 |
| `shadow-token-lg` | 9 |
| `shadow-token-sm` | 7 |
| `shadow-md`, `shadow-xl`, `shadow-2xl`, `shadow-token-*` | 2–5 each |

Plus **23 distinct arbitrary `shadow-[…]` values**, including five inset highlights and many bespoke RGBA stacks like:

```
shadow-[0_25px_60px_-12px_rgba(0,0,0,0.6),0_0_40px_rgba(7,19,43,0.4)]
shadow-[0_24px_60px_rgba(0,0,0,0.4),0_0_60px_rgba(56,189,248,0.12)]
shadow-[0_18px_44px_rgba(0,0,0,0.3),0_0_40px_rgba(56,189,248,0.08)]
```

Two of these match the spirit of `--glow-cyan-medium` / `--glow-cyan-subtle` defined in `globals.css:220–222` — but neither glow token is referenced anywhere in `src/components/`. Same story for `--glow-couples-subtle`.

There are also **color-tinted Tailwind shadows** (`shadow-amber-500` ×12, `shadow-sky-500` ×2, `shadow-pink-500` ×2, `shadow-emerald-500` ×2, etc.) — these are Tailwind's `shadow-color` pattern but in this codebase they appear without a corresponding `shadow-lg`/`shadow-md` companion, so they typically have no effect. Worth verifying in a follow-up.

## 6. Spacing — token system mostly bypassed

Spacing tokens (`--spacing-xs/sm/md/lg/xl/2xl/3xl`, `globals.css:230–236`) exist, with `p-token-*`, `gap-token-*`, `m-token-*`, `mt-token-*`, `mb-token-*` utilities defined. Adoption:

| Family | Token usage | Raw Tailwind usage |
| --- | ---: | ---: |
| `gap-*` | 8 | 164 (`gap-2`) + 116 (`gap-3`) + 61 (`gap-4`) + 32 (`gap-1`) + … |
| `p-*` | 23 | 52 (`p-4`) + 35 (`p-3`) + 25 (`p-6`) + 21 (`p-8`) + … |
| `m-*` | 0–1 | hundreds |

The token spacing scale jumps `0.25 → 0.5 → 1 → 1.5 → 2 → 3 → 4 rem`, matching Tailwind's `1 → 2 → 4 → 6 → 8 → 12 → 16` (×0.25rem). So token names don't add new values, only alias existing ones — which probably explains low adoption: there is no benefit to typing `gap-token-md` over `gap-4`. If consolidation is the goal, the tokens should add semantic value (e.g. `gap-stack`, `gap-inline`) rather than re-aliasing the numeric scale.

## 7. Typography — token scale defined but rarely chosen

Typography tokens (`--font-size-xs … --font-size-5xl`, `globals.css:264–272`) and `text-token-xs … text-token-5xl` utilities are defined. Adoption:

| Class | Count |
| --- | ---: |
| `text-sm` (Tailwind) | 209 |
| `text-xs` | 165 |
| `text-xl` | 48 |
| `text-2xl` | 38 |
| `text-lg` | 32 |
| `text-base` | 19 |
| `text-3xl` | 17 |
| `text-token-sm` | 15 |
| `text-token-xs` | 13 |
| `text-4xl` | 14 |
| `text-token-lg` | 4 |
| `text-token-base` / `text-token-xl` / `text-token-3xl` | 2 / 1 / 1 |
| `text-7xl` | 1 |

Same pattern as spacing: the token scale is an alias of Tailwind's, so no incentive to migrate.

The `--font-display` and `--font-body` referenced in `.font-display` / `.font-body` / heading selectors are font CSS variables that must come from the Next.js `next/font` setup — not visible from this audit but worth confirming both are wired up; otherwise headings fall back to `Georgia` and body to `system-ui`.

## 8. Other quirks worth flagging

- **shadcn `--radius` scale duplicates the design-token radius scale.** `--radius-sm/md/lg/xl` (lines 85–88) and `--border-radius-sm/md/lg/xl/2xl` (lines 257–261) both exist with different formulas and overlapping names. Only the latter has corresponding `rounded-token-*` utilities; the former is what `rounded-sm/md/lg/xl` (Tailwind v4 `@theme`) actually pulls from. This means `rounded-md` and `rounded-token-md` resolve to **different values** (`calc(0.625rem - 2px) ≈ 0.5rem` vs `0.375rem`).
- **`--gradient-token-hero`** is defined as cyan `#29e3ff → #1ecfea` (`globals.css:156`), which is off-brand for the rest of the design (warm amber/obsidian). It is also referenced by `.hero-cta-primary` and `.bg-gradient-token-hero`, both of which appear unused in components — worth verifying or removing.
- **Marketing palette** (`--color-marketing-*` and `--gradient-marketing-*`) and **couples palette** (`--color-couples-*`) are defined and have utility classes, but most actual marketing/couples pages use raw hex (see CouplesProgressProvider above) or raw Tailwind, not these tokens.
- **Z-index scale** (`--z-index-dropdown/overlay/modal/tooltip/toast`) is defined and `z-token-*` utilities exist, but no usage was found in `src/components/`. Components use raw `z-50` (from `MobileBottomNav.tsx:74` and elsewhere) instead.
- **Animation duration tokens**: `--duration-fast/normal/slow/smooth` exist; `smooth` and `slow` are both `500ms` — duplicate.
- **Breakpoint tokens** (`--breakpoint-sm/md/lg/xl/2xl`, lines 292–296) are defined but Tailwind v4 already exposes these natively; the redeclaration is redundant and risks drift.

## Recommendations (no code changes were made)

1. **Pick one neutral text scale.** Choose either `--hm-stone-*` or Tailwind `slate-*` and migrate the other. Current state has both at near-equal adoption, with overlapping but slightly different shades.
2. **Define the missing tokens used by `EnhancedPropertyCard.tsx`** (`--color-token-secondary-900`, `--color-token-text-inverse`, `--color-token-background-primary`, `--border-radius-full`) or rewrite that component to use the HM scale. The current state is broken — those classes don't render.
3. **Consolidate the dark-chrome hex.** Pick one of `#07132b / #0a1628 / #0f172a` and put it on `--hm-obsidian-900` (or a new `--hm-chrome`); migrate the seven files that hand-code variants.
4. **Move CouplesProgressProvider toast colors into tokens.** Each of the 7 toast variants is a candidate for a `--toast-{variant}-bg/border/fg` triplet (or, ideally, just reuse the existing `--color-couples-*` and `--color-token-success/error/warning`).
5. **Decide whether `--color-token-*` is still the strategic system.** It has the deepest definition but lowest adoption, and it duplicates Tailwind's spacing/typography scales without adding semantic value. Either invest in migrating to it (and add the missing semantic names — `bg-surface-1`, `text-on-surface`, etc.) or delete the unused half.
6. **Audit the 23 arbitrary `shadow-[…]` values.** Several are within rounding error of each other and most can collapse into 3–4 tokens (one of which already exists as `--glow-cyan-medium`).
7. **Reconcile the two radius scales.** `--radius-md ≠ --border-radius-md` is a foot-gun. Rename or merge.
8. **Replace arbitrary `rounded-[2.1rem]` / `rounded-[2.2rem]` / `rounded-[24px]`** with the closest token (`rounded-3xl` covers all three within visual tolerance).

## Inputs reviewed

- `src/app/globals.css` (1518 lines)
- `src/components/**/*.tsx` (111 files), grepped for `#`-hex, `rounded-*`, `shadow-*`, `bg-*`, `text-*`, `border-*`, `gap-*`, `p-*`, `m-*`, `text-token-*`, `*-hm-*`.
- `tailwind.config.ts` does not exist (Tailwind v4 inline theme).

No code was modified during this audit.
