# D5 Numeric Constraint Semantics Closure

Generated: 2026-05-08T11:17Z

## Decision

D5 is closed repo-side for Phase 0/1 by keeping bedroom and bathroom constraints non-negative (`>= 0`) instead of changing them to the original audit target of `1-50`.

## Semantics

- `bedrooms = 0` is intentional and represents studio/loft-style listings.
- `bathrooms = 0` is intentionally preserved as the current unknown/missing-value sentinel used by external listing ingestion and defensive API fallbacks.
- Negative values remain unsafe and are blocked by DB/schema guards.
- A future product/data-model change may replace the bathroom sentinel with a nullable/explicit-unknown field, but that is outside this strict Phase 0/1 repo-local closure slice.

## Evidence inspected

- DB migration `supabase/migrations/20260507225000_add_schema_safety_constraints.sql` already uses `CHECK (bedrooms >= 0)` and `CHECK (bathrooms >= 0)` with `NOT VALID`; comments now document why this is not a missed positive check.
- App schema `src/lib/schemas/property.ts` accepts bedroom/bathroom values from 0 through 20, and search filters accept min/max values from 0 through 10.
- API query schema `src/lib/schemas/api.ts` preserves string query bounds such as `bedrooms_min=0` and `bathrooms_min=0` by parsing them to numeric zero.
- External-ingestion/admin fallback path `src/app/api/admin/generate-vibes-zillow/route.ts` maps missing Zillow bedroom/bathroom values to `0`, so a positive-only DB constraint would currently reject existing repo behavior rather than just harden invalid data.
- Defensive disputed-property fallback `src/app/api/couples/disputed/route.ts` also uses `0` for missing property bedroom/bathroom data.

## Guards added/updated

- `__tests__/unit/database/schema-safety-migration.test.ts` now asserts non-negative DB constraints, documents the zero semantics, and rejects positive-only bedroom/bathroom checks.
- `__tests__/unit/schemas/property.test.ts` now asserts `propertySchema` accepts `bedrooms: 0` and `bathrooms: 0`.
- `__tests__/unit/schemas/api.test.ts` now asserts API query parsing preserves zero bedroom/bathroom bounds.

## Verification

Targeted/resource-limited verification was run after the changes; see the kanban handoff for exact command output.
