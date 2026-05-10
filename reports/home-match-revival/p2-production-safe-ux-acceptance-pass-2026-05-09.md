# P2 Production-safe UX / Browser Acceptance Pass

Task: `t_d258ca31` (reviewer)
Parent: `t_1009b931` — P2 maps/images/metadata/SEO fixes
Sibling: `t_aa04c086` — maps/images/metadata/SEO implementation slice
Date: 2026-05-09
Author: reviewer worker

## Scope and guardrails

This is a **read-only, code-evidence-first acceptance pass**. No browser
swarm, no production traffic, no paid API calls, no user-data access, and
no production mutations occur as part of this artifact. The intent is to
freeze the acceptance criteria for Phase 2 maps/images/metadata/SEO so a
later Shan-supervised browser pass can sign off mechanically.

Allowed without further approval:

- Read source, tests, and existing report artifacts.
- Run `pnpm type-check` and unit/integration suites locally with safe env.
- Inspect HTML/metadata produced by `next build` or local `pnpm dev`
  against unauthenticated routes only.

Not allowed without explicit Shan approval:

- Logging into production, real Supabase prod, or real auth providers.
- Hitting Google Maps, Zillow, OpenRouter, or any paid surface even once.
- Browser swarms, deploys, mutation endpoints, cron/admin endpoints, or
  any path that creates/deletes interactions, households, invites, or
  user data.
- Capturing real user PII into reports, logs, screenshots, or fixtures.

## Acceptance criteria — Phase 2 maps/images/metadata/SEO

Anchored on `phase2-phase6-execution-roadmap.md` Phase 2 acceptance
criteria. Restated here so the implementation slice (`t_aa04c086`) and
this reviewer pass share one definition of done.

1. **Public metadata is correct.** Every public route returns a title,
   description, canonical URL, OpenGraph card, and Twitter card. Defaults
   come from `src/lib/seo/route-metadata.ts` and resolve a stable
   `siteUrl` (no localhost leaks in production builds).
2. **Private metadata is non-indexable.** Every protected route
   (`/dashboard/*`, `/profile`, `/household/*`, `/settings`, `/couples/*`,
   `/properties/[id]`, `/login`, `/reset-password`, `/verify-email`,
   `/auth/*`, `/invite/[token]`) renders `robots: { index:false,
follow:false }` via `createNoindexRouteMetadata`.
3. **`robots.txt` and `sitemap.xml` agree.** `ROBOTS_DISALLOW_PATHS`
   covers every protected prefix in `PROTECTED_PATH_PREFIXES`,
   `LEGACY_PRIVATE_PREFIXES`, and the `EXACT_AND_SLASH_PRIVATE_PATHS`
   list. `SEO_PUBLIC_ROUTES` is the only set of paths emitted in the
   sitemap. No protected path appears in the sitemap.
4. **Structured data is privacy-safe.** WebSite, Organization, and
   WebApplication JSON-LD render on the marketing landing only.
   `createPropertyJsonLd` is only emitted on noindex `/properties/[id]`
   and contains no owner/contact PII; address fields come from listing
   data, not from authenticated user data.
5. **OpenGraph imagery is real and stable.** `/og-image.jpg` and
   `/twitter-image.jpg` exist in `/public`, are 1200x630 / 1200x600
   compatible, and load over the canonical `siteUrl`. No third-party
   tracker is required to render them.
6. **Listing imagery is safe.** Property images render through
   `next/image` (or an explicit safe loader) with sized intrinsic
   dimensions and alt text derived from listing fields, never from
   user free-text without sanitization.
7. **Maps are gated and degrade gracefully.** Google Maps is only
   loaded inside authenticated/approved surfaces via
   `src/components/shared/SecureMapLoader.tsx` and the
   `/api/maps/script` proxy. Without the API key, the page must show a
   non-broken fallback (placeholder, address text, or static map
   description) and emit no console errors.
8. **No public surface fans out to paid APIs.** A clean unauthenticated
   visit to `/`, `/about`, `/contact`, `/signup`, `/privacy`, `/terms`,
   `/cookies` must not request `maps.googleapis.com`,
   `places.googleapis.com`, Zillow, OpenRouter, or any other paid
   endpoint.
9. **No console errors on first paint.** Marketing and legal pages
   render with no `console.error` and no uncaught promise rejections in
   a clean Chromium profile (already verified for `/` and `/cookies`;
   to extend to the rest in the supervised pass).
10. **Mobile sanity holds.** `/`, `/signup`, `/login`, `/privacy`,
    `/terms`, `/cookies` render without horizontal scroll at 360x780,
    cookie banner is reachable, primary CTAs are tappable.

## Public no-credential acceptance matrix

| Route                           | Metadata source                                | Public?               | Indexable?        | In sitemap                         | OG image                    | Privacy / paid-API risk                           | Acceptance check (no creds)                                                             |
| ------------------------------- | ---------------------------------------------- | --------------------- | ----------------- | ---------------------------------- | --------------------------- | ------------------------------------------------- | --------------------------------------------------------------------------------------- |
| `/`                             | `createPublicRouteMetadata` (page.tsx)         | yes                   | yes               | yes (priority 1.0)                 | default                     | none — uses defaults                              | header, hero, features, footer, CTAs link to `/signup` and `/login`, no console errors. |
| `/about`                        | `createPublicRouteMetadata` (about/page.tsx)   | yes                   | yes               | yes (0.7)                          | default                     | none                                              | renders, header/footer, canonical+OG present, no console errors.                        |
| `/contact`                      | `createPublicRouteMetadata` (contact/page.tsx) | yes                   | yes               | yes (0.5)                          | default                     | mailto/contact links must be inert; do not submit | renders, links inert, no external POST on first paint.                                  |
| `/signup`                       | (verify)                                       | yes                   | yes               | yes (0.8)                          | default                     | must noindex if it transitions to auth            | form fields render, validation works locally with synthetic input.                      |
| `/privacy`                      | `createPublicRouteMetadata` (privacy/page.tsx) | yes                   | yes               | yes (0.3, lastModified 2026-01-04) | default                     | legal text, AdSense disclosures present           | full render, no console errors.                                                         |
| `/terms`                        | `createPublicRouteMetadata` (terms/page.tsx)   | yes                   | yes               | yes (0.3, lastModified 2026-01-04) | default                     | none                                              | full render, no console errors.                                                         |
| `/cookies`                      | (verify)                                       | yes                   | yes               | yes (0.3, lastModified 2026-01-04) | default                     | cookie banner state                               | accept/reject/manage all work locally; persistence across reload.                       |
| `/login`                        | `createNoindexRouteMetadata`                   | yes                   | no                | no                                 | n/a                         | redirectTo preservation from protected routes     | renders, redirectTo carried across deep links.                                          |
| `/reset-password`               | (verify)                                       | yes                   | no                | no                                 | n/a                         | reset token entry only                            | renders, no real email sent locally.                                                    |
| `/verify-email`                 | (verify)                                       | yes                   | no                | no                                 | n/a                         | verify code only                                  | renders, error states obvious without real code.                                        |
| `/auth/auth-code-error`         | (verify)                                       | yes                   | no                | no                                 | n/a                         | terminal error state                              | renders, no infinite redirect.                                                          |
| `/invite/[token]`               | `createNoindexRouteMetadata`                   | yes (synthetic token) | no                | no                                 | n/a                         | must reject invalid synthetic gracefully          | renders invalid/expired state, no DB writes.                                            |
| `/properties/[id]`              | `createNoindexRouteMetadata`                   | partial               | no                | no                                 | property images via JSON-LD | listing-only, no authed user fields in JSON-LD    | renders skeleton/empty for unknown id, JSON-LD shape valid for fixture id.              |
| `/demo/ads`, `/sponsor-mockups` | (private/demo)                                 | demo                  | should be noindex | no                                 | n/a                         | placeholder ads only                              | renders demo, no real ad network calls.                                                 |

Protected anchors below redirect to `/login?redirectTo=...` for any
unauthenticated visit (covered by P0 acceptance matrix
`p0-site-traversal-acceptance-matrix-2026-05-08.md`):

`/dashboard`, `/dashboard/viewed`, `/dashboard/liked`, `/dashboard/passed`,
`/dashboard/mutual-likes`, `/dashboard/activity`, `/dashboard/vibes-test`,
`/profile`, `/household/create`, `/household/join`, `/settings`,
`/validation`, `/couples`, `/couples/decisions`.

Each must keep its `createNoindexRouteMetadata` so even a leaked URL
returns `index:false, follow:false` to crawlers.

## Maps acceptance checks (read-only)

Source: `src/components/shared/SecureMapLoader.tsx`,
`src/lib/maps/config.ts`, `src/app/api/maps/{script,proxy-script,places/autocomplete}/route.ts`.

- Confirm Maps script loads only via `/api/maps/script`, never via a
  hardcoded `https://maps.googleapis.com/...` tag in any client bundle.
  Grep result during this pass: no direct `maps.googleapis.com` use in
  `src/components/**`; only loader and proxy own the URL.
- Confirm a missing/empty `GOOGLE_MAPS_SERVER_API_KEY` does not throw
  from public pages. The loader is only mounted by property/profile
  surfaces, all of which are protected; public pages must not trigger
  it. Acceptance: in a clean unauth load of `/`, `/about`, `/contact`,
  `/signup`, no request to `/api/maps/*` is made.
- Confirm `EnhancedPropertyMap` and `PropertyMap` always render a
  textual address fallback if the loader errors; no blank gray box, no
  console error escape.
- Confirm `LocationMapSelector` (settings) is reachable only from a
  protected surface and is gated behind `SecureMapLoader`.

## Imagery acceptance checks

- `next/image` is the default for property thumbnails and detail
  galleries; raw `<img>` is only acceptable for tiny inline icons or
  test fixtures.
- All `alt` text comes from listing fields (address, room) or static
  copy — never from raw user-generated free text without sanitization.
- `/public/og-image.jpg` and `/public/twitter-image.jpg` are present and
  load with content-type `image/jpeg`. If either is missing, the OG
  card silently degrades to text-only — that is acceptable but should
  be flagged so design can supply assets.
- Listing image arrays passed to `createPropertyJsonLd` fall back to
  `defaultOpenGraphImage` when the listing has no images, so the
  schema.org payload is always valid.

## Metadata / SEO acceptance checks

- Unit tests already cover `createPublicRouteMetadata`,
  `createNoindexRouteMetadata`, `createPropertyJsonLd`,
  `createBreadcrumbJsonLd`, and JSON-LD helpers
  (`__tests__/unit/lib/seo/*`). Re-run with `pnpm test:unit -- seo`
  during the supervised pass.
- Verify `siteUrl` resolves from `NEXT_PUBLIC_BASE_URL` in the prod
  build. In a sandbox build with `NEXT_PUBLIC_BASE_URL` unset, fallback
  is `https://homematch.pro`. Accept either; reject any URL containing
  `localhost`, `127.0.0.1`, or `vercel.app` preview hosts in the
  production-built sitemap/robots output.
- Confirm `SEO_PUBLIC_ROUTES` and `ROBOTS_DISALLOW_PATHS` do not
  intersect; a path cannot be both indexable and disallowed.
- Confirm protected page metadata never embeds user identifiers
  (email, supabase user id, household id) in the page title or
  description.

## Browser pass execution plan (run only when Shan approves)

Single Chromium profile, clean cache. No login. Tabs in order:

1. `/` — verify hero, CTAs, structured data tags in `<head>`, no
   console errors, no Maps network calls.
2. `/about`, `/contact`, `/privacy`, `/terms`, `/cookies` — render,
   metadata, no console errors, no external paid calls.
3. `/signup`, `/login`, `/reset-password`, `/verify-email`,
   `/auth/auth-code-error` — render, noindex meta tag present, no
   real email/SMS dispatched.
4. `/invite/INVALIDSYNTHETIC` — renders an invalid/expired branch
   without DB writes.
5. `/properties/00000000-0000-0000-0000-000000000000` — renders
   not-found or empty state, JSON-LD present only for valid fixture id.
6. Protected anchors (`/dashboard`, `/profile`, `/household/*`,
   `/settings`, `/couples*`, `/validation`) — each redirects to
   `/login?redirectTo=...` with the original path preserved.
7. Mobile re-run at 360x780 for `/`, `/signup`, `/login`, `/privacy`,
   `/terms`, `/cookies`.

For each step capture: HTTP status, final URL, presence of canonical/OG
tags, robots meta, console error count, and any 4xx/5xx network calls.
Store under `reports/home-match-revival/p2-browser-pass-evidence/` when
the supervised pass runs.

## Outstanding evidence to collect during supervised pass

- [ ] Verify `/og-image.jpg` and `/twitter-image.jpg` exist in
      `/public` and serve 1200x630 / 1200x600 assets.
- [ ] Capture HEAD of every public route in production build and
      diff against expected metadata fields.
- [ ] Confirm `sitemap.xml` only contains `SEO_PUBLIC_ROUTES`.
- [ ] Confirm `robots.txt` disallow list matches `ROBOTS_DISALLOW_PATHS`.
- [ ] Confirm no Maps network call from public pages.
- [ ] Confirm protected pages emit `noindex,nofollow` even when
      reached via direct URL.

## Sign-off

This artifact freezes the Phase 2 maps/images/metadata/SEO acceptance
contract. Implementation slice `t_aa04c086` should resolve any failing
items above before requesting fan-in review on `t_1009b931`. The
supervised browser pass that consumes this checklist will produce its
own evidence sub-report alongside this file.
