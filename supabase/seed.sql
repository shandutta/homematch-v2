-- Test data for integration tests
-- This file is executed after migrations when running `supabase db reset`

-- Insert 3 test neighborhoods
INSERT INTO public.neighborhoods (id, name, city, state, bounds)
VALUES 
  ('11111111-1111-1111-1111-111111111111', 'Test Neighborhood 1', 'San Francisco', 'CA', 
   ST_GeomFromText('POLYGON((-122.5 37.7, -122.5 37.8, -122.4 37.8, -122.4 37.7, -122.5 37.7))', 4326)),
  ('22222222-2222-2222-2222-222222222222', 'Test Neighborhood 2', 'Oakland', 'CA',
   ST_GeomFromText('POLYGON((-122.3 37.8, -122.3 37.9, -122.2 37.9, -122.2 37.8, -122.3 37.8))', 4326)),
  ('33333333-3333-3333-3333-333333333333', 'Test Neighborhood 3', 'Berkeley', 'CA',
   ST_GeomFromText('POLYGON((-122.3 37.85, -122.3 37.95, -122.2 37.95, -122.2 37.85, -122.3 37.85))', 4326));

-- Insert 5 test properties (ensure uniqueness by zpid via ON CONFLICT to avoid duplicates)
INSERT INTO public.properties (
  id, zpid, address, city, state, zip_code, price, bedrooms, bathrooms, 
  square_feet, property_type, listing_status, coordinates, 
  neighborhood_id, property_hash, is_active
)
VALUES 
  ('aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', 'dev-100001', '123 Test St', 'San Francisco', 'CA', '94110', 
   750000, 2, 1.5, 1200, 'single_family', 'active', 
   ST_SetSRID(ST_MakePoint(-122.45, 37.75), 4326),
   '11111111-1111-1111-1111-111111111111', 'test-hash-1', true),
   
  ('bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb', 'dev-100002', '456 Sample Ave', 'San Francisco', 'CA', '94110', 
   850000, 3, 2, 1500, 'condo', 'active',
   ST_SetSRID(ST_MakePoint(-122.46, 37.76), 4326),
   '11111111-1111-1111-1111-111111111111', 'test-hash-2', true),
   
  ('cccccccc-cccc-cccc-cccc-cccccccccccc', 'dev-100003', '789 Demo Blvd', 'Oakland', 'CA', '94612', 
   650000, 2, 1, 1100, 'townhome', 'active',
   ST_SetSRID(ST_MakePoint(-122.25, 37.85), 4326),
   '22222222-2222-2222-2222-222222222222', 'test-hash-3', true),
   
  ('dddddddd-dddd-dddd-dddd-dddddddddddd', 'dev-100004', '321 Example Ln', 'Berkeley', 'CA', '94702', 
   950000, 4, 2.5, 2000, 'single_family', 'active',
   ST_SetSRID(ST_MakePoint(-122.25, 37.90), 4326),
   '33333333-3333-3333-3333-333333333333', 'test-hash-4', true),
   
  ('eeeeeeee-eeee-eeee-eeee-eeeeeeeeeeee', 'dev-100005', '654 Mock Rd', 'Berkeley', 'CA', '94702', 
   1200000, 4, 3, 2500, 'single_family', 'active',
   ST_SetSRID(ST_MakePoint(-122.26, 37.91), 4326),
   '33333333-3333-3333-3333-333333333333', 'test-hash-5', true)
ON CONFLICT (zpid) DO UPDATE SET
  address = EXCLUDED.address,
  city = EXCLUDED.city,
  state = EXCLUDED.state,
  zip_code = EXCLUDED.zip_code,
  price = EXCLUDED.price,
  bedrooms = EXCLUDED.bedrooms,
  bathrooms = EXCLUDED.bathrooms,
  square_feet = EXCLUDED.square_feet,
  property_type = EXCLUDED.property_type,
  listing_status = EXCLUDED.listing_status,
  coordinates = EXCLUDED.coordinates,
  neighborhood_id = EXCLUDED.neighborhood_id,
  property_hash = EXCLUDED.property_hash,
  is_active = EXCLUDED.is_active,
  updated_at = NOW();

-- ============================
-- Test Users for Development & E2E Testing
-- NOTE: Auth users with proper password hashes are created by:
--   node scripts/setup-test-users-admin.js
-- This ensures correct bcrypt hashing and proper trigger execution
-- Run after: supabase db reset --linked
-- ============================

-- ============================
-- Enforce uniqueness and clean duplicates by zpid (idempotent)
-- 1) Ensure a unique index exists on properties(zpid)
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_indexes
    WHERE schemaname = 'public'
      AND tablename = 'properties'
      AND indexname = 'ux_properties_zpid'
  ) THEN
    EXECUTE 'CREATE UNIQUE INDEX ux_properties_zpid ON public.properties (zpid);';
  END IF;
EXCEPTION
  WHEN duplicate_table THEN
    -- ignore
    NULL;
END $$;

--2) Delete duplicate rows keeping the most recent updated_at (or highest id if null)
WITH ranked AS (
  SELECT id, zpid,
         ROW_NUMBER() OVER (PARTITION BY zpid ORDER BY updated_at DESC NULLS LAST, id DESC) AS rn
  FROM public.properties
  WHERE zpid IS NOT NULL
)
DELETE FROM public.properties p
USING ranked r
WHERE p.id = r.id
  AND r.rn > 1;

-- ============================
-- COUPLES & HOUSEHOLDS TEST DATA
-- Critical for demonstrating all couples functionality
-- ============================

-- 1. Create test households for couples demo
INSERT INTO public.households (id, name, collaboration_mode)
VALUES 
  -- Active couple searching together
  ('12340001-1234-1234-1234-123456789abc', 'The Johnsons', 'shared'),
  -- Family with kids looking for bigger home
  ('12340002-1234-1234-1234-123456789abc', 'The Martinez Family', 'weighted'),
  -- Young couple, first-time buyers
  ('12340003-1234-1234-1234-123456789abc', 'The Chen-Williams', 'independent'),
  -- Single household for contrast
  ('12340004-1234-1234-1234-123456789abc', 'Sarah''s Search', 'independent')
ON CONFLICT (id) DO NOTHING;

-- ============================
-- Seed real-looking listings from JSON snapshot
-- File: migrated_data/seed-properties.json
-- Idempotent upsert into public.properties by unique(zpid)
-- NOTE:
-- Supabase CLI runs seed.sql through psql without support for psql meta-commands
-- like \copy or server-side file reads. To keep compatibility, we inline a
-- minimal JSON dataset here so `supabase db reset` succeeds without external tooling.
-- The full JSON file remains at migrated_data/seed-properties.json for reference/editing.
-- ============================

WITH inline_json AS (
  SELECT jsonb_build_array(
    jsonb_build_object(
      'zpid','dev-100001','address','1200 Lakeview Dr','city','Oakland','state','CA','zip_code','94610',
      'price',975000,'bedrooms',3,'bathrooms',2.0,'square_feet',1680,'property_type','single_family',
      'images',jsonb_build_array('https://images.unsplash.com/photo-1560518883-ce09059eeffa?q=80&auto=format&fit=crop&w=1600'),
      'description','Classic craftsman near Lake Merritt with sunny backyard and updated kitchen.',
      'listing_status','active','latitude',37.8124,'longitude',-122.2476
    ),
    jsonb_build_object(
      'zpid','dev-100002','address','55 Dolores St #5A','city','San Francisco','state','CA','zip_code','94103',
      'price',1295000,'bedrooms',2,'bathrooms',2.0,'square_feet',1120,'property_type','condo',
      'images',jsonb_build_array('https://images.unsplash.com/photo-1494526585095-c41746248156?q=80&auto=format&fit=crop&w=1600'),
      'description','Modern condo with city views, in-unit laundry, and parking.',
      'listing_status','active','latitude',37.7687,'longitude',-122.4256
    ),
    jsonb_build_object(
      'zpid','dev-100003','address','4180 Claremont Ave','city','Berkeley','state','CA','zip_code','94705',
      'price',1649000,'bedrooms',4,'bathrooms',2.5,'square_feet',2350,'property_type','single_family',
      'images',jsonb_build_array('https://images.unsplash.com/photo-1512917774080-9991f1c4c750?q=80&auto=format&fit=crop&w=1600'),
      'description','Renovated hillside home with decks and bay views.',
      'listing_status','active','latitude',37.8586,'longitude',-122.2416
    ),
    jsonb_build_object(
      'zpid','dev-100004','address','902 Mission Bay Blvd N #1207','city','San Francisco','state','CA','zip_code','94158',
      'price',1490000,'bedrooms',3,'bathrooms',2.0,'square_feet',1405,'property_type','condo',
      'images',jsonb_build_array('https://images.unsplash.com/photo-1493809842364-78817add7ffb?q=80&auto=format&fit=crop&w=1600'),
      'description','Corner-unit high-rise with abundant light and amenities.',
      'listing_status','active','latitude',37.7707,'longitude',-122.3893
    ),
    jsonb_build_object(
      'zpid','dev-100005','address','6312 College Ave','city','Oakland','state','CA','zip_code','94618',
      'price',1190000,'bedrooms',3,'bathrooms',2.0,'square_feet',1580,'property_type','townhome',
      'images',jsonb_build_array('https://images.unsplash.com/photo-1599420186946-7b88fef55aaf?q=80&auto=format&fit=crop&w=1600'),
      'description','Walkable Rockridge townhouse near BART and shops.',
      'listing_status','active','latitude',37.8465,'longitude',-122.2524
    )
  ) AS docs
),
expanded AS (
  SELECT jsonb_array_elements(docs) AS j
  FROM inline_json
)
INSERT INTO public.properties (
  zpid,
  address,
  city,
  state,
  zip_code,
  price,
  bedrooms,
  bathrooms,
  square_feet,
  property_type,
  listing_status,
  coordinates,
  images,
  description,
  is_active
)
SELECT
  j->>'zpid' AS zpid,
  j->>'address' AS address,
  j->>'city' AS city,
  j->>'state' AS state,
  j->>'zip_code' AS zip_code,
  COALESCE((j->>'price')::int, NULL) AS price,
  COALESCE((j->>'bedrooms')::int, NULL) AS bedrooms,
  COALESCE((j->>'bathrooms')::numeric, NULL) AS bathrooms,
  COALESCE((j->>'square_feet')::int, NULL) AS square_feet,
  COALESCE(j->>'property_type', 'single_family') AS property_type,
  COALESCE(j->>'listing_status', 'active') AS listing_status,
  CASE 
    WHEN (j ? 'latitude') AND (j ? 'longitude') 
      THEN ST_SetSRID(ST_MakePoint((j->>'longitude')::double precision, (j->>'latitude')::double precision), 4326)
    ELSE NULL
  END AS coordinates,
  CASE 
    WHEN jsonb_typeof(j->'images') = 'array' 
      THEN ARRAY(SELECT elem FROM jsonb_array_elements_text(j->'images') AS elem)
    ELSE NULL
  END::text[] AS images,
  j->>'description' AS description,
  COALESCE((j->>'listing_status')::text = 'active', true) AS is_active
FROM expanded
ON CONFLICT (zpid) DO UPDATE SET
  address = EXCLUDED.address,
  city = EXCLUDED.city,
  state = EXCLUDED.state,
  zip_code = EXCLUDED.zip_code,
  price = EXCLUDED.price,
  bedrooms = EXCLUDED.bedrooms,
  bathrooms = EXCLUDED.bathrooms,
  square_feet = EXCLUDED.square_feet,
  property_type = EXCLUDED.property_type,
  listing_status = EXCLUDED.listing_status,
  coordinates = EXCLUDED.coordinates,
  images = EXCLUDED.images,
  description = EXCLUDED.description,
  is_active = EXCLUDED.is_active,
  updated_at = NOW();

-- ============================
-- ADDITIONAL PROPERTIES FOR COUPLES TESTING
-- Add more properties to demonstrate comprehensive couples interactions
-- ============================

WITH additional_properties AS (
  SELECT jsonb_build_array(
    jsonb_build_object(
      'zpid','dev-100006','address','2847 Pine St','city','San Francisco','state','CA','zip_code','94115',
      'price',1890000,'bedrooms',3,'bathrooms',2.5,'square_feet',1850,'property_type','single_family',
      'images',jsonb_build_array('https://images.unsplash.com/photo-1512917774080-9991f1c4c750?q=80&auto=format&fit=crop&w=1600'),
      'description','Victorian home in Pacific Heights with period details and modern updates.',
      'listing_status','active','latitude',37.7886,'longitude',-122.4386
    ),
    jsonb_build_object(
      'zpid','dev-100007','address','445 Kansas St #3B','city','San Francisco','state','CA','zip_code','94107',
      'price',1150000,'bedrooms',2,'bathrooms',2.0,'square_feet',1050,'property_type','condo',
      'images',jsonb_build_array('https://images.unsplash.com/photo-1512918728675-ed5a9ecdebfd?q=80&auto=format&fit=crop&w=1600'),
      'description','Industrial loft conversion in Potrero Hill with exposed brick.',
      'listing_status','active','latitude',37.7611,'longitude',-122.4008
    ),
    jsonb_build_object(
      'zpid','dev-100008','address','1633 Webster St #1205','city','San Francisco','state','CA','zip_code','94115',
      'price',2250000,'bedrooms',3,'bathrooms',3.0,'square_feet',1650,'property_type','condo',
      'images',jsonb_build_array('https://images.unsplash.com/photo-1484154218962-a197022b5858?q=80&auto=format&fit=crop&w=1600'),
      'description','Luxury high-rise with panoramic city and bay views.',
      'listing_status','active','latitude',37.7886,'longitude',-122.4324
    ),
    jsonb_build_object(
      'zpid','dev-100009','address','3542 18th St','city','San Francisco','state','CA','zip_code','94110',
      'price',1725000,'bedrooms',4,'bathrooms',3.0,'square_feet',2100,'property_type','single_family',
      'images',jsonb_build_array('https://images.unsplash.com/photo-1545324418-cc1a3fa10c00?q=80&auto=format&fit=crop&w=1600'),
      'description','Remodeled Mission home with open floor plan and private garden.',
      'listing_status','active','latitude',37.7615,'longitude',-122.4194
    ),
    jsonb_build_object(
      'zpid','dev-100010','address','5627 Lawton St','city','San Francisco','state','CA','zip_code','94122',
      'price',1385000,'bedrooms',3,'bathrooms',2.0,'square_feet',1480,'property_type','single_family',
      'images',jsonb_build_array('https://images.unsplash.com/photo-1570129477492-45c003edd2be?q=80&auto=format&fit=crop&w=1600'),
      'description','Sunset District home with updated kitchen and sunny backyard.',
      'listing_status','active','latitude',37.7565,'longitude',-122.4636
    ),
    jsonb_build_object(
      'zpid','dev-100011','address','2045 Franklin St #4A','city','San Francisco','state','CA','zip_code','94109',
      'price',995000,'bedrooms',1,'bathrooms',1.0,'square_feet',750,'property_type','condo',
      'images',jsonb_build_array('https://images.unsplash.com/photo-1502672260266-1c1ef2d93688?q=80&auto=format&fit=crop&w=1600'),
      'description','Charming studio in Russian Hill with city views.',
      'listing_status','active','latitude',37.7952,'longitude',-122.4221
    ),
    jsonb_build_object(
      'zpid','dev-100012','address','897 Harrison St #205','city','San Francisco','state','CA','zip_code','94107',
      'price',1650000,'bedrooms',2,'bathrooms',2.0,'square_feet',1200,'property_type','condo',
      'images',jsonb_build_array('https://images.unsplash.com/photo-1554995207-c18c203602cb?q=80&auto=format&fit=crop&w=1600'),
      'description','Modern SOMA loft with floor-to-ceiling windows.',
      'listing_status','active','latitude',37.7748,'longitude',-122.4047
    ),
    jsonb_build_object(
      'zpid','dev-100013','address','1456 Grove St','city','Berkeley','state','CA','zip_code','94709',
      'price',1220000,'bedrooms',3,'bathrooms',2.0,'square_feet',1350,'property_type','single_family',
      'images',jsonb_build_array('https://images.unsplash.com/photo-1518780664697-55e3ad937233?q=80&auto=format&fit=crop&w=1600'),
      'description','Charming Berkeley bungalow near UC campus.',
      'listing_status','active','latitude',37.8715,'longitude',-122.2730
    )
  ) AS docs
),
expanded_additional AS (
  SELECT jsonb_array_elements(docs) AS j
  FROM additional_properties
)
INSERT INTO public.properties (
  zpid, address, city, state, zip_code, price, bedrooms, bathrooms, 
  square_feet, property_type, listing_status, coordinates, images, 
  description, is_active
)
SELECT
  j->>'zpid' AS zpid,
  j->>'address' AS address,
  j->>'city' AS city,
  j->>'state' AS state,
  j->>'zip_code' AS zip_code,
  COALESCE((j->>'price')::int, NULL) AS price,
  COALESCE((j->>'bedrooms')::int, NULL) AS bedrooms,
  COALESCE((j->>'bathrooms')::numeric, NULL) AS bathrooms,
  COALESCE((j->>'square_feet')::int, NULL) AS square_feet,
  COALESCE(j->>'property_type', 'single_family') AS property_type,
  COALESCE(j->>'listing_status', 'active') AS listing_status,
  CASE 
    WHEN (j ? 'latitude') AND (j ? 'longitude') 
      THEN ST_SetSRID(ST_MakePoint((j->>'longitude')::double precision, (j->>'latitude')::double precision), 4326)
    ELSE NULL
  END AS coordinates,
  CASE 
    WHEN jsonb_typeof(j->'images') = 'array' 
      THEN ARRAY(SELECT elem FROM jsonb_array_elements_text(j->'images') AS elem)
    ELSE NULL
  END::text[] AS images,
  j->>'description' AS description,
  COALESCE((j->>'listing_status')::text = 'active', true) AS is_active
FROM expanded_additional
ON CONFLICT (zpid) DO UPDATE SET
  address = EXCLUDED.address,
  city = EXCLUDED.city,
  state = EXCLUDED.state,
  zip_code = EXCLUDED.zip_code,
  price = EXCLUDED.price,
  bedrooms = EXCLUDED.bedrooms,
  bathrooms = EXCLUDED.bathrooms,
  square_feet = EXCLUDED.square_feet,
  property_type = EXCLUDED.property_type,
  listing_status = EXCLUDED.listing_status,
  coordinates = EXCLUDED.coordinates,
  images = EXCLUDED.images,
  description = EXCLUDED.description,
  is_active = EXCLUDED.is_active,
  updated_at = NOW();

-- ============================
-- TEST USERS FOR COUPLES DEMO
-- NOTE: Auth users are created via admin API after database reset
-- See: create-test-users.js
-- This section is left for reference but auth users are created separately
-- ============================

-- User profiles will be created by create-test-users.js script
-- This preserves the interaction data structure

-- ============================
-- COUPLES INTERACTION TEST DATA
-- NOTE: Interaction data will be created by create-test-interactions.js after users are set up
-- This ensures proper user ID references
-- ============================
