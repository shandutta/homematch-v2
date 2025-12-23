# QA Protocol: Filters + Catalog Coverage (Prod)

## Purpose

- Verify settings filters (locations, price, beds/baths, property types, must-haves) change dashboard results as expected.
- Sample enough properties across the catalog to build confidence the frontend can surface the 7k+ listings.

## Prereqs

- Prod test user that matches `scripts/setup-test-users-admin.js` (do not use ad-hoc creds).
- Supabase access (SQL editor or CLI) to sample addresses/ids by city/type/amenity.
- Optional: screen recording or notes to capture timing and anomalies.

## Baseline Setup

1. Log in to prod.
2. Go to `Settings → Preferences`.
3. Click `Reset filters` and wait for auto-save to complete.
4. Open `/dashboard` in a new tab and confirm cards load.

## Data Sampling (SQL)

Use these queries to pick _known_ properties for spot checks. Adjust limits as needed.

```sql
-- Sample by city/state
select id, address, city, state, price, bedrooms, bathrooms, property_type
from properties
where city is not null and state is not null
order by random()
limit 50;

-- Sample by property type
select id, address, city, state, price, property_type
from properties
where property_type in ('single_family','condo','townhome','multi_family','land')
order by random()
limit 50;

-- Sample by amenities
select id, address, city, state, price, amenities
from properties
where amenities @> array['Pool']::text[]
order by random()
limit 20;

-- Sample by price bands
select id, address, city, state, price
from properties
where price between 250000 and 400000
order by random()
limit 20;
```

## Filter Checks (Manual)

For each step below, verify a sampled address appears (or disappears) in `/dashboard`.

### Locations

1. Pick 5–10 cities from the sample list.
2. In `Settings`, select each city one at a time; verify at least one sampled address appears in `/dashboard`.
3. Select 2–3 neighborhoods within a city and verify results narrow accordingly.
4. Clear neighborhoods and ensure city-level results return.

### Price Range

1. Pick 3–5 properties across low/mid/high price bands.
2. Set price range to include each target property; verify it appears.
3. Set a range that excludes the target property; verify it disappears.

### Bedrooms/Bathrooms

1. Pick 3–5 properties with known beds/baths.
2. Set min beds/baths to include; verify appear.
3. Set min beds/baths higher than property; verify disappear.

### Property Types

1. Pick at least one property for each type: `single_family`, `condo`, `townhome`, `multi_family`, `land`.
2. Toggle off all types except the target type; verify only that type remains (at least one sampled address appears).

### Must-Have Amenities

1. Pick properties that include `Pool`, `Gym`, `Parking`, `Pet Friendly`.
2. Toggle each amenity one at a time and confirm at least one sampled property appears.
3. Verify a known property without that amenity is excluded.

### Clear Filters

1. Click `Reset filters`.
2. Confirm locations cleared, price/beds/baths restored to defaults.
3. Reload `/dashboard` and verify results are broad again.

## Catalog Coverage Sampling

Goal: validate a few hundred properties across the catalog.

- Choose 8–12 cities, 5 price bands, and 3 property types.
- For each combination (at least 20–30 total), sample 3–5 properties and verify they can be surfaced by adjusting filters.
- Document any properties that never appear and capture the active filters used.

## Notes / Known Limitations

- The dashboard currently loads a single page of results (no pagination). Full-catalog validation requires iterating filters and refreshing.
- If you need to see new properties, use `Settings → Account → Clear all likes, passes, and views`, then reload `/dashboard`.

## Report Template

- Filters tested:
- Sample size:
- Properties not surfaced:
- Performance observations (load times, hangs):
- UI/UX issues:
