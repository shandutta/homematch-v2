---
date: 2026-05-08
phase: P0/P1 closure (decision-gate index)
scope: internal/demo surface default-hidden evidence + product-decision gate before any public sponsor/admin publication
authors: hermes-claude (worktree d135-demo-surface-publication-gate-2029)
status: REPO-SIDE GATE CLOSED — public reintroduction remains external-approval-gated
related:
  - reports/home-match-revival/p1-internal-demo-surface-disposition-2026-05-08.md
  - reports/home-match-revival/public-demo-listing-fixture-boundary-2026-05-08.md
  - reports/home-match-revival/p0-p1-blocker-evidence-index-2026-05-08.md
  - reports/home-match-revival/phase0-phase1-closure-matrix.md
  - __tests__/unit/app/demo-surface-production-gate.test.ts
  - __tests__/unit/app/seo-route-policy.test.ts
  - __tests__/unit/app/public-demo-listing-fixture-boundary.test.ts
  - src/lib/routing/internal-preview.ts
---

# Demo Surface Publication Gate

## 0. Purpose & boundary

This artifact is a **read-only index** that pins, in one place:

1. The current default-hidden state of every internal/demo surface that
   has been considered for sponsor/admin publication.
2. The static repo evidence that proves the gate.
3. The product-decision gate that must clear **before** any of these
   surfaces is reintroduced as a public sponsor-sales surface or as an
   admin/operator console.

It does not change routes, middleware, robots, sitemap, or any tests.
It does not authorize a publication decision; it only documents the
preconditions for one.

## 1. Surfaces in scope (default hidden)

| Surface | Gate seam | Default behavior | Public/marketing exposure |
| --- | --- | --- | --- |
| `/dashboard/vibes-test` | `src/app/dashboard/vibes-test/layout.tsx` calls `requireInternalPreviewAccess()` | `notFound()` (HTTP 404) unless `HOMEMATCH_ENABLE_INTERNAL_PREVIEW=true` | None (also under `/dashboard` middleware, robots disallow) |
| `/validation` | `src/app/validation/page.tsx` calls `requireInternalPreviewAccess()` | `notFound()` (HTTP 404) unless flag is set | None (also middleware-protected, robots disallow via `PROTECTED_PATH_PREFIXES`) |
| `/demo/ads` | `src/app/demo/ads/page.tsx` calls `requireInternalPreviewAccess()` | `notFound()` (HTTP 404) unless flag is set | Page-level `robots: { index: false, follow: false }`; `/demo` excluded from sitemap and listed in robots disallow |
| `/sponsor-mockups` | `src/app/sponsor-mockups/page.tsx` calls `requireInternalPreviewAccess()` | `notFound()` (HTTP 404) unless flag is set | Page-level `robots: { index: false, follow: false }`; excluded from sitemap and listed in robots disallow |

The gate helper itself is the single seam every surface depends on:

- `src/lib/routing/internal-preview.ts` — `isInternalPreviewEnabled()`
  reads `process.env.HOMEMATCH_ENABLE_INTERNAL_PREVIEW === 'true'`;
  `requireInternalPreviewAccess()` calls `notFound()` from
  `next/navigation` when the flag is absent. There is no other code
  path. Production builds without that env var return 404 for all four
  surfaces.

## 2. Static evidence the gate is real

- `__tests__/unit/app/demo-surface-production-gate.test.ts` —
  asserts: (a) `isInternalPreviewEnabled()` defaults to `false`;
  (b) it flips to `true` only when the env var equals `'true'`;
  (c) the helper imports from `next/navigation` and calls `notFound()`;
  (d) `/demo/ads`, `/sponsor-mockups`, and `/validation` page sources
  contain `requireInternalPreviewAccess` and **do not** contain
  `process.env.NODE_ENV` (no quiet `NODE_ENV !== 'production'` escape);
  (e) `src/app/dashboard/vibes-test/layout.tsx` gates the entire vibes
  subtree the same way; (f) no surface relies on
  `process.env.NODE_ENV === 'production'` for gating.
- `__tests__/unit/app/seo-route-policy.test.ts` — pins the SEO posture
  that complements the gate: sitemap stays on the public allowlist and
  excludes `/demo`, `/demo/ads`, `/sponsor-mockups`, `/validation`,
  `/dashboard/*`; robots disallow contains `/dashboard`, `/demo`,
  `/demo/ads`, `/sponsor-mockups`, plus legacy `/account` and `/admin`.
  Query strings and hash fragments are stripped before matching.
- `__tests__/unit/app/public-demo-listing-fixture-boundary.test.ts` and
  `reports/home-match-revival/public-demo-listing-fixture-boundary-2026-05-08.md` —
  pin the **public** marketing fixture surface (the four files behind
  the unauthenticated landing page) so a future "publish a sponsor
  preview" change cannot quietly reach for real Supabase rows, real
  user identifiers, or paid provider data through the marketing card
  stack. This is the complementary boundary to the internal-preview
  gate above.
- `reports/home-match-revival/p1-internal-demo-surface-disposition-2026-05-08.md` —
  the canonical inventory and disposition packet for the four surfaces
  (route, current exposure, recommendation, rationale, follow-on tests).
- `reports/home-match-revival/phase0-phase1-closure-matrix.md` lines
  43–47 — closure-matrix entry stating the surfaces are gated behind
  `requireInternalPreviewAccess()`/`HOMEMATCH_ENABLE_INTERNAL_PREVIEW=true`,
  default 404 in production, integration commit `3e5f510`, with
  targeted demo-surface and SEO route policy Jest guards passing and
  resource-limited type-check passing.
- `reports/home-match-revival/p0-p1-blocker-evidence-index-2026-05-08.md`
  row 9 — classifies internal/demo surface disposition as
  **repo-side closed for the launch gate** and reintroduction as
  external-approval-gated.

## 3. The product-decision gate

A future change that **publishes** any of these surfaces — for example,
turning `/sponsor-mockups` into a public sponsor-sales page, exposing
`/demo/ads` as a marketing route, putting `/validation` or
`/dashboard/vibes-test` behind admin-only RBAC and shipping a console —
must clear all of the following **before** any production code or
config change:

1. **Owner/product approval** (Shan): explicit written keep / hide /
   restrict / delete decision per surface, including the intended
   audience, lifecycle, and exit criteria.
2. **D1 service-role / admin RBAC authority must be live-evidenced**
   for any surface reintroduced as admin/operator tooling. Repo-side
   D1 is closed (`reports/home-match-revival/d1-service-role-rbac-authority-implementation-packet-2026-05-08.md`,
   `supabase/migrations/20260508024000_create_admin_role_assignments.sql`),
   but live DB integration remains D6-gated. No admin-only
   reintroduction may ship before that integration leg is closed.
3. **Secret hygiene plan**: any reintroduced surface that calls
   admin/cron/paid-provider endpoints must drop the legacy URL-carried
   `cron_secret` query-string pattern and use server-side credentials
   or `x-cron-secret` headers only. The current `/dashboard/vibes-test`
   client UX appends `cron_secret` as a query param; that pattern must
   not be promoted to production.
4. **Acceptance tests** for the new posture: anonymous, authenticated
   non-admin, and admin behavior must be covered by route-level tests;
   robots/sitemap/metadata tests must cover the new visibility (public
   indexable, public noindex, admin-only, or removed).
5. **Public listing fixture boundary** stays intact: a new sponsor
   surface must not bypass the four-file public fixture inventory by
   silently introducing a new fetch path or component that pulls real
   listing/owner/agent data into the unauthenticated landing.
6. **Phase 0/1 strict closure stays intact**: this gate may not be
   used to short-circuit any of the remaining live-evidenced or
   external-approval-gated rows in
   `reports/home-match-revival/p0-p1-blocker-evidence-index-2026-05-08.md`
   (D2 durable rate limiter, D3 production email/CAPTCHA execution,
   D6 DB reset/lint/integration, authenticated traversal lane, paid
   external surfaces). Reintroduction is product scope, not a
   substitute for those decisions.

If any of conditions 1–6 is not satisfied, the surface stays
default-hidden and the publication request is rejected at this gate.

## 4. What this artifact is not

- It is **not** a publication decision. No surface is being unhidden
  by this document, and no env var change is being authorized.
- It is **not** a Phase 2+ admin/sponsor/monetization product spec.
  Phase 2+ remains held per the strict closure gate.
- It is **not** a substitute for the canonical disposition packet,
  the closure matrix, the evidence index, or the public listing
  fixture boundary; it cross-links them so a future reviewer can
  reconstruct the gate from a single page.
- It changes no routes, middleware, robots, sitemap, or tests.

## 5. Closure status

- Default-hidden state: closed repo-side; four surfaces 404 by default
  in production with a single explicit env-var override.
- Static evidence: closed repo-side; gate, SEO posture, and public
  fixture boundary each carry their own Jest guard.
- Publication decision: held; remains owner/product approval-gated
  with the preconditions above. No public sponsor or admin surface is
  authorized to ship until those preconditions are satisfied in
  writing.
