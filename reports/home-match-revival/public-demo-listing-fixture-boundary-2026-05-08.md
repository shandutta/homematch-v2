---
date: 2026-05-08
phase: P0/P1 closure (static guard)
scope: public/demo listing fixture source boundaries — read-only inventory
authors: hermes-claude (worktree d80-public-demo-data-boundary-guard-1948)
status: GUARDED — locked down by static Jest test
related:
  - reports/home-match-revival/p1-internal-demo-surface-disposition-2026-05-08.md
  - reports/home-match-revival/no-credential-accessibility-route-taxonomy-2026-05-08.md
  - reports/home-match-revival/p0-no-auth-traversal-smoke-guard-2026-05-08.md
  - __tests__/unit/app/public-demo-listing-fixture-boundary.test.ts
---

# Public/Demo Listing Fixture Source Boundary

## 0. Purpose & boundary

This document inventories every file that ships listing-shaped fixtures
to the **unauthenticated** marketing/landing surface, names which fields
those fixtures are allowed to carry, and pins the boundary with a static
Jest guard.

It does **not** authorize new public listing surfaces and does **not**
move any data. It is a read-only inventory plus a static field/source
guard.

## 1. Fixture source inventory (locked)

The four files below are the entire surface area of public/demo listing
data shown to anonymous visitors. The guard test fails if any of them is
removed without an inventory update, or if a new file joins the surface
without explicit review.

| # | File | Role | Fixture content |
| - | --- | --- | --- |
| 1 | `src/app/api/properties/marketing/route.ts` | Public GET endpoint backing the landing-page card stack | Three hardcoded `MarketingCard` entries with `zpid: 'mock-N'`, city-level address strings, synthetic price/bed/bath, and Bay-Area centroid lat/lng |
| 2 | `src/components/marketing/MarketingPreviewCard.tsx` | Animated landing hero card (anonymous) | Hardcoded `1200 Lakeview Dr, Oakland, CA 94610`, `$975,000`, copy-only badges; no data fetch |
| 3 | `src/components/marketing/MarketingPreviewCardStatic.tsx` | Static fallback variant of the hero card (anonymous) | Same hardcoded synthetic listing as `MarketingPreviewCard.tsx` |
| 4 | `src/components/marketing/PhoneMockup.tsx` | Phone-frame card stack on landing (anonymous) | `placeholderProperties` array with `Palo Alto`, `Mountain View`, `Sunnyvale` location strings + local mock images; optionally swaps in cards from `/api/properties/marketing` |

Notes:

- All four files render to anonymous viewers; the `/demo/ads`,
  `/sponsor-mockups`, `/validation`, and `/dashboard/vibes-test` surfaces
  are separately gated behind `requireInternalPreviewAccess()` and are
  not in scope here.
- The `PhoneMockup` runtime fetch path narrows to the marketing endpoint
  in this same file. There are no other client fetches into the public
  fixture set.

## 2. Allowed fixture field shape

Public/demo fixtures may carry only the keys below. They are
intentionally close to a Zillow-style read model **without** any
relationship to a real user/customer record:

- `zpid` (must use the synthetic `mock-N` prefix)
- `imageUrl` (local `/images/marketing/*` asset)
- `price` (number, synthetic)
- `bedrooms`, `bathrooms` (number, synthetic)
- `address` (city-level string, e.g. `Palo Alto, CA`)
- `latitude`, `longitude` (city-level centroid)

## 3. Forbidden field tokens (static guard)

The Jest guard at
`__tests__/unit/app/public-demo-listing-fixture-boundary.test.ts`
fails if any of the four files contains tokens that imply a real
user/customer/private record:

- Identity / contact: `owner_email`, `agent_email`, `owner_phone`,
  `agent_phone`, `owner_name`, `agent_name`, `phone_number`,
  `date_of_birth`, `birth_date`, `dob`, `ssn`, `tax_id`.
- Identifiers: `owner_id`, `agent_id`, `account_id`, `household_id`,
  `profile_id`, `auth_id`, `auth_user_id`, `user_id`, `session_id`.
- Credentials / secrets: `password`, `access_token`, `refresh_token`,
  `bearer ` prefix, `SUPABASE_SERVICE_ROLE_KEY`, `SUPABASE_ANON_KEY`,
  `cron_secret`, `api_key`.

The guard matches on word-boundary identifiers, not free prose, so
synthetic landing copy (e.g. "Built for households") does not trip it.

## 4. Forbidden data sources (static guard)

The same guard fails if any of the four files attempts to read from a
non-fixture data source:

- `createClient(...)` calls
- `from '@/lib/supabase/...'` imports
- `PropertyService` / `UserService` references
- `from '@/lib/services/...'` imports
- `rapidapi` or `zillow.*\.com` strings
- `process.env.*KEY` / `process.env.*TOKEN` reads

The marketing API route is additionally pinned to:

- Declaring an inline `const MARKETING_CARDS: MarketingCard[] = [...]`
- Using only `mock-N` zpids
- Containing no `await fetch(...)` and no `await supabase` calls

`PhoneMockup` is pinned so every `fetch(...)` call points at
`/api/properties/marketing` and nowhere else.

## 5. Why this boundary matters

1. **PII / customer-record leakage**: the public landing surface is
   reachable without auth and is indexable for some routes. A static
   listing fixture that picks up an `owner_email` or `household_id`
   field from a refactor would expose a real customer record to anyone.
2. **Data-source drift**: replacing the static fixture with a Supabase
   or Zillow read is a non-trivial trust-boundary change. It must come
   with rate limits, RLS, sanitization, and product approval — not as a
   quiet edit to a marketing component.
3. **Secret hygiene**: the marketing surface must never be a place where
   service-role keys, cron secrets, or bearer tokens are referenced,
   even in dead branches.
4. **Inventory honesty**: gating tests like
   `__tests__/unit/app/demo-surface-production-gate.test.ts` already
   guard the *internal* preview surfaces. This guard closes the
   complementary gap on the *public* listing fixture surface.

## 6. Out of scope (deliberately)

- Removing or renaming any of the four files.
- Authorizing new public listing surfaces.
- Adjusting middleware, robots, or sitemap.
- Touching any live Supabase data, Zillow integration, or external
  provider.
- Implementing operator/admin tooling.

This document plus the static Jest guard are the entire deliverable.
