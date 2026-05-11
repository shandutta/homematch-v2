# HomeMatch V2 — Schema Column & Constraint Audit

**Date:** 2026-05-07
**Repo:** /home/shan/projects/homematch-v2
**Tenant:** home-match-revival
**Migration count:** 40
**Tables audited:** 6 core (user_profiles, households, neighborhoods, properties, user_property_interactions, saved_searches)

---

## Executive Summary

- **Total findings:** 18 (4 critical, 6 high, 5 medium, 3 low)
- **Critical issues:** (1) listing_status has no CHECK constraint — any string is accepted. (2) households table has no ON DELETE behavior for user_profiles FKs — deleting a household leaves dangling references. (3) user_property_interactions UNIQUE allows up to 4 rows per user×property — the application code assumes exactly 1. (4) No numeric range checks (price, bedrooms, bathrooms, square_feet, year_built all allow nonsensical values like negatives or year 5000).
- **Previously known issue confirmed:** The `property_type` CHECK misalignment between the original DDL (`house`,`condo`,`townhouse`,`apartment`) and seed.sql (`single_family`,`townhome`, etc.) was **already resolved** by migration 20251122073000. Seed data is now consistent with the canonical set.
- **JSONB columns unindexed:** `preferences` (user_profiles), `score_data` (user_property_interactions), and `filters` (saved_searches) all lack GIN indexes. Querying into JSONB without indexes works at dev scale but will degrade under production load.
- **Missing updated_at columns:** neighborhoods and saved_searches have no `updated_at`, making change tracking impossible.

---

## Table 1: user_profiles

| #   | Finding                          | Severity | Detail                                                                                                                                                               |
| --- | -------------------------------- | -------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| 1   | preferences JSONB — no GIN index | **HIGH** | `preferences->>'display_name'`, `preferences->'avatar'` queries do sequential scans. Dev scale is fine; 10K+ users will be slow.                                     |
| 2   | email column — no UNIQUE         | MEDIUM   | `display_name` and `email` were added in migration 20251123220000. No unique constraint on email, so duplicate emails are possible if the new-user trigger misfires. |
| 3   | No CHECK on preferences shape    | LOW      | Free-form JSONB is flexible but allows garbage data. Consider JSON schema validation at the application layer (already done via Zod in `user.ts`).                   |

### Effective DDL (all migrations applied)

```sql
CREATE TABLE user_profiles (
  id                    UUID REFERENCES auth.users(id) ON DELETE CASCADE PRIMARY KEY,
  household_id          UUID REFERENCES households(id),
  onboarding_completed  BOOLEAN DEFAULT FALSE,
  preferences           JSONB DEFAULT '{}',
  display_name          TEXT,
  email                 TEXT,
  full_name             TEXT,
  created_at            TIMESTAMPTZ DEFAULT NOW(),
  updated_at            TIMESTAMPTZ DEFAULT NOW()
);
```

### Recommended Fixes

```sql
-- P1: GIN index for preferences queries
CREATE INDEX idx_user_profiles_preferences_gin ON user_profiles USING GIN (preferences);

-- P2: Unique email constraint (safe since trigger populates from auth.users.email)
CREATE UNIQUE INDEX uq_user_profiles_email ON user_profiles (email) WHERE email IS NOT NULL;
```

---

## Table 2: households

| #   | Finding                                        | Severity     | Detail                                                                                                                                                                                       |
| --- | ---------------------------------------------- | ------------ | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| 4   | No FK cascade from user_profiles→households    | **CRITICAL** | Deleting a household leaves `user_profiles.household_id` dangling (no `ON DELETE SET NULL` or `CASCADE`). This breaks couples features that JOIN on household_id.                            |
| 5   | name is now nullable but created_by may not be | MEDIUM       | `name` was made nullable in 20251130200000. If the `create_household_for_user()` function is bypassed (direct INSERT), `name` can be NULL and `created_by` NULL — leaving orphan households. |
| 6   | No updated_at trigger                          | LOW          | No automatic `updated_at` update on row modification.                                                                                                                                        |

### Effective DDL

```sql
CREATE TABLE households (
  id                  UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name                TEXT,                          -- was NOT NULL, relaxed in 20251130200000
  collaboration_mode  TEXT DEFAULT 'independent' CHECK (collaboration_mode IN ('independent','shared','weighted')),
  created_by          UUID REFERENCES auth.users(id),
  user_count          INTEGER DEFAULT 1,
  created_at          TIMESTAMPTZ DEFAULT NOW(),
  updated_at          TIMESTAMPTZ DEFAULT NOW()
);
```

### Recommended Fixes

```sql
-- P3: Auto-nullify user_profiles.household_id when household is deleted
ALTER TABLE user_profiles
  DROP CONSTRAINT fk_user_profiles_household,
  ADD CONSTRAINT fk_user_profiles_household
    FOREIGN KEY (household_id) REFERENCES households(id) ON DELETE SET NULL;

-- P4: updated_at trigger (shared across all tables, define once)
```

---

## Table 3: neighborhoods

| #   | Finding                                    | Severity | Detail                                                                           |
| --- | ------------------------------------------ | -------- | -------------------------------------------------------------------------------- |
| 7   | Missing updated_at column                  | **HIGH** | No way to track when a neighborhood was last modified. Used in caching logic.    |
| 8   | No CHECK on walk_score/transit_score range | **HIGH** | Accepts any INTEGER including negatives or values > 100. App code assumes 0-100. |
| 9   | No CHECK on median_price > 0               | MEDIUM   | Allows 0 or negative median_price.                                               |
| 10  | city_state_key is generated — good         | —        | Well-implemented generated column with index. No issues.                         |

### Effective DDL

```sql
CREATE TABLE neighborhoods (
  id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name            TEXT NOT NULL,
  city            TEXT NOT NULL,
  state           TEXT NOT NULL,
  metro_area      TEXT,
  bounds          GEOMETRY(POLYGON, 4326),
  median_price    INTEGER,
  walk_score      INTEGER,
  transit_score   INTEGER,
  city_state_key  TEXT GENERATED ALWAYS AS (lower(trim(city)) || '|' || lower(trim(state))) STORED,
  created_at      TIMESTAMPTZ DEFAULT NOW()
  -- NO updated_at column
);
```

### Recommended Fixes

```sql
-- P5: Add updated_at
ALTER TABLE neighborhoods ADD COLUMN updated_at TIMESTAMPTZ DEFAULT NOW();

-- P6: Score range checks
ALTER TABLE neighborhoods ADD CONSTRAINT chk_walk_score_range CHECK (walk_score IS NULL OR (walk_score >= 0 AND walk_score <= 100));
ALTER TABLE neighborhoods ADD CONSTRAINT chk_transit_score_range CHECK (transit_score IS NULL OR (transit_score >= 0 AND transit_score <= 100));

-- P7: Median price positivity
ALTER TABLE neighborhoods ADD CONSTRAINT chk_median_price_positive CHECK (median_price IS NULL OR median_price > 0);
```

---

## Table 4: properties

| #   | Finding                                             | Severity     | Detail                                                                                                                                                                                                                 |
| --- | --------------------------------------------------- | ------------ | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| 11  | listing_status has NO CHECK constraint              | **CRITICAL** | Any string accepted. App code writes 'active'/'pending'/'sold'/'off_market'. A typo like 'actve' silently succeeds and breaks all dashboard queries that filter on `listing_status = 'active'`.                        |
| 12  | No CHECK on price, bedrooms, bathrooms, square_feet | **CRITICAL** | All are NOT NULL but accept 0 or negatives. A data ingestion bug inserting `price = -1` or `bedrooms = 0` corrupts search results.                                                                                     |
| 13  | No CHECK on year_built                              | **HIGH**     | Accepts year 5000, year 800, or negative values.                                                                                                                                                                       |
| 14  | No ON DELETE for neighborhood_id FK                 | **HIGH**     | If a neighborhood is deleted, property.neighborhood_id becomes dangling. Should be SET NULL with a backfill job.                                                                                                       |
| 15  | No composite indexes for city/state/price queries   | MEDIUM       | Partially addressed by 20251218120000 (`idx_properties_active_type_price`), but no index on `(city, price)` or `(state, bedrooms)`. The generated `city_state_key` helps but doesn't replace direct column composites. |
| 16  | images TEXT[] has no GIN index                      | LOW          | Array containment queries (`amenities && ARRAY['pool']`) would benefit from a GIN index. Currently only `amenities` and `images` are TEXT[] arrays.                                                                    |

### Effective DDL

```sql
CREATE TABLE properties (
  id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  zpid            TEXT UNIQUE,
  address         TEXT NOT NULL,
  city            TEXT NOT NULL,
  state           TEXT NOT NULL,
  zip_code        TEXT NOT NULL,
  price           INTEGER NOT NULL,
  bedrooms        INTEGER NOT NULL,
  bathrooms       DECIMAL(2,1) NOT NULL,
  square_feet     INTEGER,
  property_type   TEXT CHECK (property_type IS NULL OR property_type IN ('single_family','condo','townhome','multi_family','manufactured','land','other')),
  images          TEXT[] DEFAULT '{}',
  description     TEXT,
  coordinates     GEOMETRY(POINT, 4326),
  neighborhood_id UUID REFERENCES neighborhoods(id),
  amenities       TEXT[] DEFAULT '{}',
  year_built      INTEGER,
  lot_size_sqft   INTEGER,
  parking_spots   INTEGER DEFAULT 0,
  listing_status  TEXT DEFAULT 'active',   -- NO CHECK CONSTRAINT
  property_hash   TEXT UNIQUE,
  is_active       BOOLEAN DEFAULT TRUE,
  city_state_key  TEXT GENERATED ALWAYS AS (lower(trim(city)) || '|' || lower(trim(state))) STORED,
  created_at      TIMESTAMPTZ DEFAULT NOW(),
  updated_at      TIMESTAMPTZ DEFAULT NOW()
);
```

### Recommended Fixes

```sql
-- P8: listing_status CHECK
ALTER TABLE properties ADD CONSTRAINT chk_listing_status
  CHECK (listing_status IN ('active', 'pending', 'sold', 'off_market'));

-- P9: Numeric sanity checks
ALTER TABLE properties ADD CONSTRAINT chk_price_positive CHECK (price > 0);
ALTER TABLE properties ADD CONSTRAINT chk_bedrooms_positive CHECK (bedrooms > 0);
ALTER TABLE properties ADD CONSTRAINT chk_bathrooms_positive CHECK (bathrooms > 0);
ALTER TABLE properties ADD CONSTRAINT chk_square_feet_positive CHECK (square_feet IS NULL OR square_feet > 0);
ALTER TABLE properties ADD CONSTRAINT chk_year_built_reasonable CHECK (year_built IS NULL OR (year_built >= 1700 AND year_built <= 2100));

-- P10: ON DELETE SET NULL for neighborhood FK
ALTER TABLE properties
  DROP CONSTRAINT IF EXISTS properties_neighborhood_id_fkey,
  ADD CONSTRAINT properties_neighborhood_id_fkey
    FOREIGN KEY (neighborhood_id) REFERENCES neighborhoods(id) ON DELETE SET NULL;

-- P11: GIN index for amenities array queries
CREATE INDEX idx_properties_amenities_gin ON properties USING GIN (amenities);

-- P12: Composite index for city + price queries
CREATE INDEX idx_properties_city_state_price ON properties (city, state, price) WHERE is_active = true;
```

---

## Table 5: user_property_interactions

| #   | Finding                                | Severity     | Detail                                                                                                                                                                                                                                                                                |
| --- | -------------------------------------- | ------------ | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| 17  | UNIQUE allows 4 rows per user×property | **CRITICAL** | `UNIQUE(user_id, property_id, interaction_type)` permits one row PER type (like, dislike, skip, view). The application code deletes-then-inserts, effectively enforcing 1 row total, but the schema allows 4. If the delete fails silently (RLS, race condition), orphans accumulate. |
| 18  | score_data JSONB — no GIN index        | MEDIUM       | Couples features query `score_data` for ML scores. Without a GIN index, `score_data->>'compatibility'` scans sequentially.                                                                                                                                                            |
| —   | FK cascade from auth.users works       | ✓            | Fixed in 20250731041925: `ON DELETE CASCADE` from auth.users.                                                                                                                                                                                                                         |
| —   | interaction_type CHECK is correct      | ✓            | Allows `like`,`dislike`,`skip`,`view` and matches app code.                                                                                                                                                                                                                           |

### Effective DDL

```sql
CREATE TABLE user_property_interactions (
  id               UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id          UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  property_id      UUID REFERENCES properties(id) NOT NULL,
  household_id     UUID REFERENCES households(id),
  interaction_type TEXT CHECK (interaction_type IN ('like','dislike','skip','view')) NOT NULL,
  score_data       JSONB,
  created_at       TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(user_id, property_id, interaction_type)
);
```

### Recommended Fixes

```sql
-- P13: Replace per-type UNIQUE with global UNIQUE on (user_id, property_id)
-- This enforces exactly 1 interaction per user×property regardless of type.
-- Safe because the application already uses delete-then-insert.
-- First drop the old constraint, then add the new one.
ALTER TABLE user_property_interactions
  DROP CONSTRAINT IF EXISTS user_property_interactions_user_id_property_id_inte_key;
ALTER TABLE user_property_interactions
  ADD CONSTRAINT uq_user_property_interaction UNIQUE (user_id, property_id);

-- P14: GIN index for score_data queries
CREATE INDEX idx_user_property_interactions_score_data_gin
  ON user_property_interactions USING GIN (score_data);

-- P15: ON DELETE CASCADE for properties FK
ALTER TABLE user_property_interactions
  DROP CONSTRAINT IF EXISTS user_property_interactions_property_id_fkey,
  ADD CONSTRAINT user_property_interactions_property_id_fkey
    FOREIGN KEY (property_id) REFERENCES properties(id) ON DELETE CASCADE;
```

---

## Table 6: saved_searches

| #   | Finding                          | Severity | Detail                                                                                                                                                  |
| --- | -------------------------------- | -------- | ------------------------------------------------------------------------------------------------------------------------------------------------------- |
| 19  | filters JSONB — no GIN index     | **HIGH** | `filters->>'city'`, `filters->>'min_price'` queries are unindexed. Searches with `filters @> '{"city":"San Francisco"}'` would benefit hugely from GIN. |
| 20  | Missing updated_at column        | MEDIUM   | Cannot track when a saved search was last modified.                                                                                                     |
| 21  | No CHECK on filters shape        | LOW      | Free-form JSONB. Application validates via Zod. Acceptable at DB layer.                                                                                 |
| —   | FK CASCADE from auth.users works | ✓        | Added in 20250731041925.                                                                                                                                |

### Effective DDL

```sql
CREATE TABLE saved_searches (
  id            UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id       UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  household_id  UUID REFERENCES households(id),
  name          TEXT NOT NULL,
  filters       JSONB NOT NULL,
  is_active     BOOLEAN DEFAULT TRUE,
  created_at    TIMESTAMPTZ DEFAULT NOW()
  -- NO updated_at
);
```

### Recommended Fixes

```sql
-- P16: GIN index for filters queries
CREATE INDEX idx_saved_searches_filters_gin ON saved_searches USING GIN (filters);

-- P17: Add updated_at
ALTER TABLE saved_searches ADD COLUMN updated_at TIMESTAMPTZ DEFAULT NOW();
```

---

## Shared Infrastructure Fixes

```sql
-- P18: Universal updated_at trigger function (for all tables that need it)
CREATE OR REPLACE FUNCTION public.set_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Apply to tables that have updated_at: user_profiles, households, properties
DROP TRIGGER IF EXISTS trg_user_profiles_updated_at ON user_profiles;
CREATE TRIGGER trg_user_profiles_updated_at
  BEFORE UPDATE ON user_profiles
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();

DROP TRIGGER IF EXISTS trg_households_updated_at ON households;
CREATE TRIGGER trg_households_updated_at
  BEFORE UPDATE ON households
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();

DROP TRIGGER IF EXISTS trg_properties_updated_at ON properties;
CREATE TRIGGER trg_properties_updated_at
  BEFORE UPDATE ON properties
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();

-- After adding updated_at columns to neighborhoods and saved_searches:
DROP TRIGGER IF EXISTS trg_neighborhoods_updated_at ON neighborhoods;
CREATE TRIGGER trg_neighborhoods_updated_at
  BEFORE UPDATE ON neighborhoods
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();

DROP TRIGGER IF EXISTS trg_saved_searches_updated_at ON saved_searches;
CREATE TRIGGER trg_saved_searches_updated_at
  BEFORE UPDATE ON saved_searches
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();
```

---

## Seed.sql Cross-Reference

✅ **property_type values match current CHECK constraint.** All seed data uses `single_family`, `condo`, `townhome` from the canonical set. The original mismatch (`house`,`townhouse`,`apartment` vs `single_family`,`townhome`,`multi_family`) was resolved by migration 20251122073000 which (a) normalizes existing rows and (b) replaces the CHECK.

⚠️ **zpid UNIQUE index is enforced in seed.sql** via `ux_properties_zpid`, not in the main migration. This works because seed.sql runs after all migrations, but if seed.sql is skipped, the UNIQUE constraint on the `zpid` column in the DDL is sufficient. The extra index is redundant but harmless.

---

## Severity Summary

| Severity     | Count | Issues                                                                                                                                                                                  |
| ------------ | ----- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **CRITICAL** | 4     | listing_status no CHECK (#11), no price/bed/bath/sqft checks (#12), interaction UNIQUE too permissive (#17), household FK orphan risk (#4)                                              |
| **HIGH**     | 6     | preferences GIN missing (#1), neighborhoods missing updated_at (#7), score checks missing (#8), year_built no CHECK (#13), neighborhood FK no SET NULL (#14), filters GIN missing (#19) |
| **MEDIUM**   | 5     | email no UNIQUE (#2), household created_by nullable (#5), median_price no CHECK (#9), composite indexes missing (#15), neighborhoods updated_at (#20)                                   |
| **LOW**      | 3     | preferences shape (#3), updated_at trigger (#6), images GIN (#16)                                                                                                                       |

---

## Migration Patch Files Generated

All patches are under `supabase/migrations/` in the workspace:

| File                                                   | Patches                                                                    |
| ------------------------------------------------------ | -------------------------------------------------------------------------- |
| `20260507220000_add_missing_check_constraints.sql`     | P8, P9 (listing_status, numeric sanity)                                    |
| `20260507220100_fix_foreign_key_cascades.sql`          | P3, P10, P15 (household SET NULL, neighborhood SET NULL, property CASCADE) |
| `20260507220200_fix_interaction_unique_constraint.sql` | P13 (user×property global UNIQUE)                                          |
| `20260507220300_add_jsonb_gin_indexes.sql`             | P1, P14, P16 (preferences, score_data, filters GIN)                        |
| `20260507220400_add_updated_at_and_triggers.sql`       | P4, P17, P18 (updated_at columns + universal trigger)                      |
| `20260507220500_add_score_checks_and_indexes.sql`      | P6, P7, P11, P12 (score ranges, amenities GIN, city+price composite)       |
