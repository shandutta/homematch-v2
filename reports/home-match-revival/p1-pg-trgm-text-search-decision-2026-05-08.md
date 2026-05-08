# P1 pg_trgm text-search index decision — launch-path closure

Generated: 2026-05-08T10:19:06Z

## Decision

Do not add a `pg_trgm` extension/index migration for the Phase 0/1 launch gate.

The original open item was conditional: add the trigram index if launch-path text search still requires it. Current repo evidence shows that the only property text-search implementation is `PropertySearchService.searchPropertiesText()`, which uses a PostgREST `or(address.ilike.%query%,description.ilike.%query%)` pattern. That method is covered by tests, but no production `src/**` caller wires it into the dashboard, API routes, or public launch flow. The launch dashboard path calls `PropertyService.searchProperties()` through `loadDashboardData()`, using structured filters plus indexed sort/filter columns rather than free-text `address`/`description` search.

Because there is no launch-path caller for property free-text search, a new `pg_trgm` migration would add DB extension/index surface area without reducing a current Phase 0/1 launch risk. Keep this as a future optimization only when a product text-search UI/API is wired.

## Evidence inspected

- `src/lib/services/properties/search.ts`
  - `searchProperties()` filters active properties through `PropertyFilterBuilder`, optional `city_state_key`, sort, and pagination.
  - `searchPropertiesText()` is the only property free-text query and uses `.or("address.ilike.%...%,description.ilike.%...%")` against `properties`.
- Production caller scan in `src/**`
  - `searchPropertiesText(` appears only in its implementation under `src/lib/services/properties/search.ts`; production code does not call it.
  - `loadDashboardData()` in `src/lib/data/loader.ts` calls `propertyService.searchProperties(searchParams, searchOptions)` for the launch dashboard property list.
  - The only unrelated `ilike` production paths found are user email prefix search and neighborhood lookup, not property `address`/`description` free-text launch search.
- Migrations
  - Existing property indexes include `idx_properties_coordinates`, scalar property filter indexes, active/sort composite indexes, and JSONB GIN indexes.
  - No existing migration enables `pg_trgm` or creates GIN trigram indexes on `properties.address`/`properties.description`.
- Generated/static DB types
  - `src/types/database.ts` defines `properties.address: string` and `properties.description: string | null`, confirming the columns exist, but generated types do not imply any launch-path caller or index requirement.
- Historical source
  - `reports/home-match-revival/service-layer-audit.md` recorded Q3 as low severity and explicitly conditional: add `pg_trgm` or full-text search for `searchPropertiesText()` if that path matters.

## Verification commands

```bash
pwd && git rev-parse --show-toplevel && git branch --show-current && git status --short
# /home/shan/projects/homematch-v2
# /home/shan/projects/homematch-v2
# autonomy/6h-business-hardening

# Targeted static production caller scan:
# searchPropertiesText( appears in src only at src/lib/services/properties/search.ts implementation.
# address/description property ilike appears in src only in searchPropertiesText().
```

## Closure

Closed repo-side as "not required for launch path." Do not add a migration until a production property free-text search route/UI is wired; when that happens, pair the UI/API work with a `pg_trgm`/full-text migration and query-plan validation in an approved DB test environment.
