# HomeMatch Bundle Analysis — 2026-05-09

Build artifact: `.next-build/` (safe-build redirected because dev server held `.next`).
Next.js 15.5.9, app router. Build compiled successfully in 40s; lint phase failed
(one ESLint error in `src/lib/ingest/idempotency.ts`, unrelated to bundle output).

## Top-line numbers

| Metric                  | Value     |
|-------------------------|-----------|
| `.next-build/static`    | 3.5 MB    |
| `.next-build/server`    | 8.4 MB    |
| Client JS files         | 131       |
| Total client JS (sum)   | 2.26 MB   |
| `chunks/`               | 2.9 MB    |
| `css/`                  | 268 KB    |
| `media/` (fonts etc.)   | 280 KB    |

## Largest JS chunks (`.next-build/static/chunks/`)

| Size    | Chunk                                | Likely contents |
|---------|--------------------------------------|-----------------|
| 178 KB  | `framework-cd397c9612a6bcf9.js`      | Next.js framework runtime (react, react-dom, scheduler) |
| 169 KB  | `910ccfc4-667c09e979d690e1.js`       | react-dom shared chunk (confirmed: react-dom hits) |
| 169 KB  | `6579-54bd25f68d07a4d2.js`           | Next polyfills + PromiseQueue/image-loader runtime |
| 144 KB  | `3521-7a82319f4f9748ae.js`           | **@supabase/* stack** — gotrue (27), realtime (20), supabase (56), postgrest hits |
| 125 KB  | `main-08465fcdad5979ec.js`           | Next.js app shell |
| 120 KB  | `4576-feb5675e98531f6e.js`           | **framer-motion** (motion×18 references) |
| 110 KB  | `polyfills-42372ed130431b0a.js`      | Legacy-browser polyfills |
| 74 KB   | `app/settings/page-…js`              | settings route (largest route-specific chunk) |
| 58 KB   | `app/profile/page-…js`               | profile route |
| 55 KB   | `8004-…js`                           | Shared lib chunk |
| 52 KB   | `9247-…js`                           | Shared lib chunk |

Per-route page chunks (top): `settings` 74 KB, `profile` 58 KB, `dashboard` 36 KB, `couples` 36 KB, `dashboard/mutual-likes` 32 KB, `dashboard/vibes-test` 27 KB, `/` (landing) 21 KB.

## Largest CSS

| Size    | File                          | Notes |
|---------|-------------------------------|-------|
| 248 KB  | `css/0f6ff2c035353067.css`    | Single global Tailwind bundle — dominates CSS payload (>98%). Suggests one large `globals.css`/Tailwind output covering all utility classes used across the app. |
| 5.1 KB  | `css/ded341ceae2284c6.css`    | Route-scoped |
| 3.0 KB  | `css/8bfa1f3df6d94713.css`    | Route-scoped |

A 248 KB CSS file is large but typical for full-app Tailwind v4 output without
strict purge boundaries. Worth verifying the JIT scan globs (`content`) are not
over-broad (e.g. matching test fixtures, MD docs, or stories), and that no
unused Radix/shadcn primitives are pulled in via `components.json` registry
without being deleted from `src/components/ui/`.

## Public images — optimization candidates

| Size    | File                                 | Recommendation |
|---------|--------------------------------------|----------------|
| 211 KB  | `public/images/marketing/mock-home-3.jpg` | Re-encode WebP/AVIF; serve via `next/image`. Likely 60–80% smaller. |
| 200 KB  | `public/images/marketing/mock-home-2.jpg` | Same. |
| 165 KB  | `public/images/marketing/mock-home-1.jpg` | Same. |
| 151 KB  | `public/twitter-image.jpg`           | Required JPEG for OG/Twitter — keep as JPEG but verify it is not also imported by a client component. Consider mozjpeg re-encode. |
| 151 KB  | `public/og-image.jpg`                | Same. |

The three `mock-home-*.jpg` marketing assets total **577 KB raw**. Twin
`mock-home-*.svg` placeholders already exist in the same directory (~3 KB each)
— check whether the JPGs are still referenced; if yes, route them through
`next/image` so the build emits AVIF/WebP variants (already configured in
`next.config.ts`: `formats: ['image/avif', 'image/webp']`, `deviceSizes` tuned).
SVGs in `public/avatars/` are already <1.5 KB each — no action needed there.

OG/Twitter cards must be a real raster image at the requested social-card
dimensions; do not reroute those through `next/image` (crawlers fetch the
literal URL). They can still be re-compressed.

## Code splitting

`next/dynamic()` is used in only 4 places:

- `src/components/property/PropertyCardUI.tsx` → `PropertyMap` (saves ~150 KB on dashboard)
- `src/components/property/PropertyDetailProvider.tsx` → `PropertyDetailModal` (~645-line modal)
- `src/components/legal/AnalyticsGate.tsx` → `@vercel/speed-insights/next`
- `src/components/settings/PreferencesSection.tsx` → (preferences sub-component)

Gaps worth investigating:

1. **`app/settings/page` is 74 KB** — the largest route chunk. Likely pulling in
   the full Radix dialog/select/tabs/dropdown set + form schema synchronously.
   Lazy-load the destructive-action dialogs (delete account, sign-out-all, etc.)
   and any rarely-rendered admin panels behind `dynamic({ ssr: false })`.
2. **`app/profile/page` is 58 KB** — similar shape. Avatar picker and image
   upload UI are good candidates for dynamic import.
3. **framer-motion (120 KB chunk)** is in the shared graph rather than gated
   per-route. If it's only used on a handful of marketing/landing surfaces and
   the property card hover, consider importing the `m` (mini) component from
   `framer-motion` and using `LazyMotion` with a feature-loaded animation set
   (`domAnimation` is ~25 KB vs the full `domMax` ~120 KB). `optimizePackageImports`
   already lists `framer-motion` but cannot shrink the runtime itself.
4. **Supabase client (144 KB chunk)** — `@supabase/supabase-js` includes the
   realtime websocket client (`@supabase/realtime-js`, confirmed by 20 hits in
   the chunk). If realtime subscriptions are not used on every route, prefer
   `@supabase/postgrest-js` directly on read-only routes, or import the auth +
   realtime helpers dynamically only where they're needed (e.g. `vibes-test`,
   couples decision live updates).
5. **PostHog** is included via `posthog-js` — verify it is loaded via
   `AnalyticsGate` only after consent, not eagerly in the root layout.

## Heavy dependencies (`node_modules/.pnpm/` sizes — disk, not bundled size)

Disk size ≠ shipped JS, but it's a useful signal for "what's likely being imported".

| Disk size | Package                                              | Notes |
|-----------|------------------------------------------------------|-------|
| 42 MB     | `lucide-react`                                       | OK if `optimizePackageImports` does its job — confirmed enabled. Verify no `import * as Icons from 'lucide-react'` patterns. |
| 33 MB     | `date-fns`                                           | `optimizePackageImports` enabled. Confirm no `import * as df from 'date-fns'`; prefer named imports per function. |
| 23 MB     | `posthog-js`                                         | Defer behind consent gate. Use `posthog-js/dist/array` or lazy init. |
| 19 MB     | `@sentry/cli-linux-x64`                              | Build-time only — does NOT ship. |
| 7.2 MB    | `@sentry/core@9.44.0`                                | Sentry browser SDK — ensure tree-shaken; `@sentry-internal/replay` (3.3 MB) and `replay-canvas` (860 KB) ship only if Replay is enabled. |
| 4.7 MB    | `zod@3.25.76`                                        | Often tree-shakes well; verify schemas aren't bundled into client components needlessly. |
| 4.3 MB    | `@ai-sdk/provider-utils@2.2.8`                       | Should be server-only; check no client component imports `ai` or `@ai-sdk/openai`. |
| 3.3 MB    | `framer-motion@12.23.12`                             | See note above re: `LazyMotion`. |
| 2.7 MB    | `ai@5.0.101`                                         | Server-only — verify not pulled into client. |

Two versions of Sentry coexist (`@sentry/core@7.120.4` AND `@sentry/core@9.44.0`,
`@sentry/node@7.120.4` AND `@sentry/node@9.44.0`). The 7.x copies ship via
`@sentry-internal/tracing@7.120.4` (2.3 MB) and friends — likely a transitive
duplicate. Worth running `pnpm why @sentry/core` to identify the offender and
add a `pnpm.overrides` pin to collapse to 9.x.

## Configuration observations

- `experimental.optimizePackageImports` covers `lucide-react`, `framer-motion`,
  `date-fns`, and four Radix packages. **Not covered**: `@radix-ui/react-avatar`,
  `react-alert-dialog`, `checkbox`, `label`, `progress`, `slider`, `switch`,
  `slot`. Adding them is essentially free.
- `compiler.removeConsole` is on for production (good).
- `images` config is well-tuned (AVIF first, WebP fallback, sensible
  `deviceSizes`/`imageSizes`, 7-day cache TTL).
- No `@next/bundle-analyzer` HTML output was generated (build did not run with
  `ANALYZE=true`). Running `pnpm analyze` would produce per-chunk treemaps.

## Recommended next actions (ordered by ROI)

1. **Re-encode the three marketing JPGs** (mock-home-{1,2,3}) to AVIF/WebP and
   route through `next/image`. ~400–500 KB savings on first marketing page load.
2. **Collapse duplicate Sentry versions** via `pnpm.overrides`. Likely shaves
   tens-to-hundreds of KB from server bundles and removes ~2 MB of disk.
3. **Lazy-load the `settings` and `profile` route subtrees** behind
   `next/dynamic`. ~30–40 KB per route saved on first navigation.
4. **Switch framer-motion to `LazyMotion` + `domAnimation`** if `domMax`
   features (drag, layout) aren't used everywhere. ~80 KB chunk reduction.
5. **Add the remaining Radix packages to `optimizePackageImports`** (avatar,
   checkbox, label, etc.). Free, safe.
6. **Audit Supabase realtime usage** — gate the realtime client behind dynamic
   import on routes that don't need live channels.
7. **Run `pnpm analyze`** to get exact per-module bundle attribution before
   making structural changes; this report is based on heuristic chunk content
   analysis (string greps of minified output) and disk sizes, not symbol-level
   data.
8. **Re-check Tailwind `content` globs** to ensure the 248 KB CSS file isn't
   inflated by scanning unused source trees (tests, fixtures, docs).

## Caveats

- Lint failure prevented the post-compile size summary table Next.js normally
  prints. All sizes above come from filesystem inspection of the compiled
  `.next-build/static/` output, which is complete.
- Chunk-content attribution (e.g. "this chunk is Supabase") is based on string
  matching against minified code, not on a webpack stats file. For decisive
  numbers, run `pnpm analyze` and consult the treemap.
- Disk sizes in `node_modules/.pnpm/` over-count vs. shipped JS, especially for
  packages that are server-only or build-time only (`@sentry/cli`).
