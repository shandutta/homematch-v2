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
   '33333333-3333-3333-3333-333333333333', 'test-hash-5', true),

  -- Additional properties with fixed IDs for vibes seeding
  ('ffffffff-ffff-ffff-ffff-ffffffffffff', 'dev-100006', '2847 Pine St', 'San Francisco', 'CA', '94115',
   1890000, 3, 2.5, 1850, 'single_family', 'active',
   ST_SetSRID(ST_MakePoint(-122.4386, 37.7886), 4326),
   '11111111-1111-1111-1111-111111111111', 'test-hash-6', true),

  ('11111111-2222-3333-4444-555555555555', 'dev-100007', '445 Kansas St #3B', 'San Francisco', 'CA', '94107',
   1150000, 2, 2, 1050, 'condo', 'active',
   ST_SetSRID(ST_MakePoint(-122.4008, 37.7611), 4326),
   '11111111-1111-1111-1111-111111111111', 'test-hash-7', true),

  ('22222222-3333-4444-5555-666666666666', 'dev-100008', '1633 Webster St #1205', 'San Francisco', 'CA', '94115',
   2250000, 3, 3, 1650, 'condo', 'active',
   ST_SetSRID(ST_MakePoint(-122.4324, 37.7886), 4326),
   '11111111-1111-1111-1111-111111111111', 'test-hash-8', true),

  ('33333333-4444-5555-6666-777777777777', 'dev-100009', '3542 18th St', 'San Francisco', 'CA', '94110',
   1725000, 4, 3, 2100, 'single_family', 'active',
   ST_SetSRID(ST_MakePoint(-122.4194, 37.7615), 4326),
   '11111111-1111-1111-1111-111111111111', 'test-hash-9', true),

  ('44444444-5555-6666-7777-888888888888', 'dev-100010', '5627 Lawton St', 'San Francisco', 'CA', '94122',
   1385000, 3, 2, 1480, 'single_family', 'active',
   ST_SetSRID(ST_MakePoint(-122.4636, 37.7565), 4326),
   '11111111-1111-1111-1111-111111111111', 'test-hash-10', true),

  ('55555555-6666-7777-8888-999999999999', 'dev-100011', '2045 Franklin St #4A', 'San Francisco', 'CA', '94109',
   995000, 1, 1, 750, 'condo', 'active',
   ST_SetSRID(ST_MakePoint(-122.4221, 37.7952), 4326),
   '11111111-1111-1111-1111-111111111111', 'test-hash-11', true),

  ('66666666-7777-8888-9999-aaaaaaaaaaaa', 'dev-100012', '897 Harrison St #205', 'San Francisco', 'CA', '94107',
   1650000, 2, 2, 1200, 'condo', 'active',
   ST_SetSRID(ST_MakePoint(-122.4047, 37.7748), 4326),
   '11111111-1111-1111-1111-111111111111', 'test-hash-12', true),

  ('77777777-8888-9999-aaaa-bbbbbbbbbbbb', 'dev-100013', '1456 Grove St', 'Berkeley', 'CA', '94709',
   1220000, 3, 2, 1350, 'single_family', 'active',
   ST_SetSRID(ST_MakePoint(-122.2730, 37.8715), 4326),
   '33333333-3333-3333-3333-333333333333', 'test-hash-13', true)
  ,
  -- Additional properties to satisfy default dashboard filters (<= $800k, >= 2 baths)
  ('88888888-9999-aaaa-bbbb-cccccccccccc', 'dev-200001', '2100 Market St #402', 'San Francisco', 'CA', '94114',
   785000, 2, 2, 1080, 'condo', 'active',
   ST_SetSRID(ST_MakePoint(-122.4316, 37.7681), 4326),
   '11111111-1111-1111-1111-111111111111', 'test-hash-2001', true),

  ('99999999-aaaa-bbbb-cccc-dddddddddddd', 'dev-200002', '98 Grand Ave', 'Oakland', 'CA', '94612',
   725000, 3, 2, 1420, 'single_family', 'active',
   ST_SetSRID(ST_MakePoint(-122.2520, 37.8094), 4326),
   '22222222-2222-2222-2222-222222222222', 'test-hash-2002', true)
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
-- NEIGHBORHOOD VIBES SEED DATA
-- LLM-generated neighborhood summaries for storytelling
-- ============================

INSERT INTO public.neighborhood_vibes (
  neighborhood_id,
  tagline,
  vibe_statement,
  neighborhood_themes,
  local_highlights,
  resident_fits,
  suggested_tags,
  input_data,
  raw_output,
  model_used,
  source_data_hash,
  generation_cost_usd,
  confidence
)
VALUES
  (
    '11111111-1111-1111-1111-111111111111',
    'Mission-adjacent energy with quick city access',
    'A lively, walkable pocket that keeps you close to cafes, parks, and transit without the constant rush of downtown.',
    '[{"name":"Walkable Everyday","whyItMatters":"Groceries, coffee, and errands stay within an easy stroll.","intensity":0.82},{"name":"Transit Friendly","whyItMatters":"Quick hops to BART and major bus lines make commuting simple.","intensity":0.78},{"name":"Creative Community","whyItMatters":"Local makers and small businesses add character and momentum.","intensity":0.7}]'::jsonb,
    '[{"name":"Neighborhood cafes","category":"Food & Drink","whyItMatters":"Morning routines feel effortless and social."},{"name":"Pocket parks","category":"Outdoors","whyItMatters":"Green breaks are always close by."},{"name":"Weekend farmers markets","category":"Community","whyItMatters":"Fresh produce and a lively weekend scene."}]'::jsonb,
    '[{"profile":"City Explorer","reason":"Easy access to dining, nightlife, and cultural spots."},{"profile":"Car-light Commuter","reason":"Transit options reduce the need for daily driving."},{"profile":"Creative Professional","reason":"Inspiring streetscapes and community energy."}]'::jsonb,
    ARRAY['Walkable', 'Transit Ready', 'Cafe Culture', 'Vibrant'],
    '{"neighborhood":{"name":"Test Neighborhood 1","city":"San Francisco","state":"CA"}}'::jsonb,
    '{}',
    'seed-data',
    'seed-neighborhood-1',
    0,
    0.86
  ),
  (
    '22222222-2222-2222-2222-222222222222',
    'Lake-adjacent calm with downtown convenience',
    'A balanced Oakland neighborhood that pairs tree-lined streets with quick access to shops, lakeside trails, and nightlife.',
    '[{"name":"Lakeside Living","whyItMatters":"Morning jogs and sunset strolls feel built in.","intensity":0.84},{"name":"Neighborhood Pride","whyItMatters":"Longtime locals and new arrivals keep the vibe welcoming.","intensity":0.74},{"name":"Easy Downtown Access","whyItMatters":"Restaurants, bars, and offices stay minutes away.","intensity":0.68}]'::jsonb,
    '[{"name":"Lake Merritt trails","category":"Outdoors","whyItMatters":"Daily movement and fresh air are always nearby."},{"name":"Local eateries","category":"Food & Drink","whyItMatters":"A mix of casual and destination dining."},{"name":"Community events","category":"Community","whyItMatters":"Seasonal gatherings keep neighbors connected."}]'::jsonb,
    '[{"profile":"Outdoor Regular","reason":"Trails and green space anchor the routine."},{"profile":"Social Weekender","reason":"Events and restaurants are close without being overwhelming."},{"profile":"Hybrid Worker","reason":"Commutes are short, and amenities fill the gaps."}]'::jsonb,
    ARRAY['Lakeside', 'Community', 'Balanced', 'Weekend Ready'],
    '{"neighborhood":{"name":"Test Neighborhood 2","city":"Oakland","state":"CA"}}'::jsonb,
    '{}',
    'seed-data',
    'seed-neighborhood-2',
    0,
    0.84
  ),
  (
    '33333333-3333-3333-3333-333333333333',
    'Tree-lined calm with a campus pulse',
    'A Berkeley enclave that blends quiet residential streets with a steady buzz of cafes, bookstores, and weekend culture.',
    '[{"name":"Academic Energy","whyItMatters":"Talks, libraries, and campus events keep things intellectually active.","intensity":0.78},{"name":"Leafy Streets","whyItMatters":"A slower pace and plenty of shade make daily life feel grounded.","intensity":0.8},{"name":"Local Culture","whyItMatters":"Independent shops and restaurants anchor the neighborhood.","intensity":0.73}]'::jsonb,
    '[{"name":"Independent bookstores","category":"Culture","whyItMatters":"A thoughtful, local feel for weekend wandering."},{"name":"Neighborhood cafes","category":"Food & Drink","whyItMatters":"Low-key spots for studying or meeting friends."},{"name":"Tree-lined blocks","category":"Outdoors","whyItMatters":"A calm backdrop for evening walks."}]'::jsonb,
    '[{"profile":"Graduate Student","reason":"Campus access and study-friendly spots are close."},{"profile":"Quiet Professional","reason":"Calm streets balance busy workdays."},{"profile":"Culture Seeker","reason":"Independent shops and events keep weekends lively."}]'::jsonb,
    ARRAY['Leafy', 'Academic', 'Walkable', 'Local Gems'],
    '{"neighborhood":{"name":"Test Neighborhood 3","city":"Berkeley","state":"CA"}}'::jsonb,
    '{}',
    'seed-data',
    'seed-neighborhood-3',
    0,
    0.83
  )
ON CONFLICT (neighborhood_id) DO UPDATE SET
  tagline = EXCLUDED.tagline,
  vibe_statement = EXCLUDED.vibe_statement,
  neighborhood_themes = EXCLUDED.neighborhood_themes,
  local_highlights = EXCLUDED.local_highlights,
  resident_fits = EXCLUDED.resident_fits,
  suggested_tags = EXCLUDED.suggested_tags,
  input_data = EXCLUDED.input_data,
  raw_output = EXCLUDED.raw_output,
  model_used = EXCLUDED.model_used,
  source_data_hash = EXCLUDED.source_data_hash,
  generation_cost_usd = EXCLUDED.generation_cost_usd,
  confidence = EXCLUDED.confidence,
  updated_at = NOW();

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
    ),
    jsonb_build_object(
      'zpid','dev-100014','address','908 Gallery Ln','city','San Francisco','state','CA','zip_code','94109',
      'price',1095000,'bedrooms',2,'bathrooms',2.0,'square_feet',1180,'property_type','single_family',
      'images',jsonb_build_array(
        '/images/properties/house-1.svg',
        '/images/properties/house-2.svg',
        '/images/properties/house-3.svg'
      ),
      'description','Photo-forward listing with multiple images for gallery verification.',
      'listing_status','active','latitude',37.7908,'longitude',-122.4211
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
-- PROPERTY VIBES SEED DATA
-- LLM-generated property descriptions for storytelling
-- ============================

INSERT INTO public.property_vibes (
  property_id, tagline, vibe_statement, feature_highlights, lifestyle_fits,
  suggested_tags, emotional_hooks, primary_vibes, aesthetics,
  model_used, source_data_hash, confidence
)
VALUES
  -- dev-100001: 1200 Lakeview Dr, Oakland (Classic craftsman near Lake Merritt)
  ('aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa',
   'Classic Craftsman Charm by the Lake',
   'Experience the warmth of timeless craftsmanship in this sun-drenched Oakland gem, steps from serene Lake Merritt.',
   '[{"feature": "Original craftsman details", "location": "throughout", "appealFactor": "Authentic character that modern homes cannot replicate"},
     {"feature": "Updated kitchen", "location": "kitchen", "appealFactor": "Modern functionality meets classic style"},
     {"feature": "Sunny backyard", "location": "exterior", "appealFactor": "Perfect for outdoor entertaining and gardening"}]'::jsonb,
   '[{"category": "Nature Lover", "score": 0.9, "reason": "Walking distance to Lake Merritt trails and parks"},
     {"category": "Work from Home", "score": 0.7, "reason": "Quiet neighborhood with dedicated office potential"},
     {"category": "Entertainer", "score": 0.8, "reason": "Open layout and backyard perfect for hosting"}]'::jsonb,
   ARRAY['Classic Charm', 'Outdoor Living', 'Urban Oasis', 'Family Haven'],
   ARRAY['Morning coffee on the porch watching the sunrise over the lake', 'Weekend barbecues in your private backyard oasis', 'Evening walks around Lake Merritt just steps away'],
   '[{"name": "Warm & Inviting", "intensity": 0.85, "source": "interior"},
     {"name": "Nature-Connected", "intensity": 0.8, "source": "both"},
     {"name": "Classic Elegance", "intensity": 0.7, "source": "interior"}]'::jsonb,
   '{"lightingQuality": "natural_abundant", "colorPalette": ["warm wood", "cream", "sage green"], "architecturalStyle": "Craftsman", "overallCondition": "well_maintained"}'::jsonb,
   'seed-data', 'seed-hash-001', 0.9),

  -- dev-100002: 55 Dolores St #5A, San Francisco (Modern condo with city views)
  ('bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb',
   'Sleek Urban Living with Stunning Views',
   'This modern sanctuary rises above the vibrant Mission district, offering city panoramas and contemporary comfort.',
   '[{"feature": "Floor-to-ceiling windows", "location": "living room", "appealFactor": "Breathtaking city views and natural light"},
     {"feature": "In-unit laundry", "location": "utility", "appealFactor": "Ultimate urban convenience"},
     {"feature": "Dedicated parking", "location": "building", "appealFactor": "Rare SF amenity for stress-free living"}]'::jsonb,
   '[{"category": "Young Professional", "score": 0.95, "reason": "Prime location near tech shuttles and nightlife"},
     {"category": "Minimalist", "score": 0.85, "reason": "Clean lines and efficient use of space"},
     {"category": "City Explorer", "score": 0.9, "reason": "Walk to restaurants, bars, and Dolores Park"}]'::jsonb,
   ARRAY['Urban Oasis', 'Modern Minimalist', 'City Views', 'First-Time Buyer Friendly'],
   ARRAY['Watching the sunset paint the city skyline from your living room', 'Walking to Dolores Park for weekend picnics', 'The convenience of having everything you need within walking distance'],
   '[{"name": "Metropolitan Chic", "intensity": 0.9, "source": "interior"},
     {"name": "Airy & Bright", "intensity": 0.85, "source": "interior"},
     {"name": "Connected", "intensity": 0.75, "source": "both"}]'::jsonb,
   '{"lightingQuality": "natural_abundant", "colorPalette": ["white", "gray", "black accents"], "architecturalStyle": "Contemporary", "overallCondition": "pristine"}'::jsonb,
   'seed-data', 'seed-hash-002', 0.9),

  -- dev-100003: 4180 Claremont Ave, Berkeley (Renovated hillside home)
  ('cccccccc-cccc-cccc-cccc-cccccccccccc',
   'Hillside Haven with Breathtaking Bay Views',
   'Perched in the Berkeley hills, this renovated retreat offers the perfect blend of indoor elegance and outdoor splendor.',
   '[{"feature": "Expansive view decks", "location": "exterior", "appealFactor": "Panoramic bay and bridge views for daily inspiration"},
     {"feature": "Open floor plan", "location": "main level", "appealFactor": "Seamless flow for modern family living"},
     {"feature": "Updated systems", "location": "throughout", "appealFactor": "Move-in ready with modern efficiency"}]'::jsonb,
   '[{"category": "Nature Enthusiast", "score": 0.95, "reason": "Hiking trails and regional parks at your doorstep"},
     {"category": "Growing Family", "score": 0.9, "reason": "Top-rated Berkeley schools and spacious layout"},
     {"category": "Remote Worker", "score": 0.85, "reason": "Inspiring views and quiet hillside setting"}]'::jsonb,
   ARRAY['Outdoor Living', 'Family Haven', 'City Views', 'Wellness Sanctuary'],
   ARRAY['Morning yoga on the deck with the bay stretching before you', 'Watching fog roll through the Golden Gate from your living room', 'Kids playing in the yard while you prepare dinner with a view'],
   '[{"name": "Serene Retreat", "intensity": 0.9, "source": "both"},
     {"name": "Grand & Spacious", "intensity": 0.85, "source": "interior"},
     {"name": "Nature-Embracing", "intensity": 0.8, "source": "exterior"}]'::jsonb,
   '{"lightingQuality": "natural_abundant", "colorPalette": ["warm neutrals", "natural wood", "forest green"], "architecturalStyle": "California Contemporary", "overallCondition": "pristine"}'::jsonb,
   'seed-data', 'seed-hash-003', 0.9),

  -- dev-100004: 902 Mission Bay Blvd N #1207, San Francisco (Corner-unit high-rise)
  ('dddddddd-dddd-dddd-dddd-dddddddddddd',
   'Luminous Corner Unit in Vibrant Mission Bay',
   'Bask in abundant natural light in this corner sanctuary, surrounded by waterfront parks and world-class amenities.',
   '[{"feature": "Corner exposure", "location": "unit", "appealFactor": "Light from multiple directions throughout the day"},
     {"feature": "Building amenities", "location": "common areas", "appealFactor": "Pool, gym, and rooftop for resort-style living"},
     {"feature": "Waterfront location", "location": "neighborhood", "appealFactor": "Steps to the bay trail and Chase Center"}]'::jsonb,
   '[{"category": "Active Lifestyle", "score": 0.95, "reason": "Running paths, water sports, and Giants games nearby"},
     {"category": "Tech Professional", "score": 0.9, "reason": "Minutes to UCSF and biotech campus"},
     {"category": "Social Butterfly", "score": 0.85, "reason": "Walkable to restaurants and entertainment"}]'::jsonb,
   ARRAY['Urban Oasis', 'Modern Minimalist', 'Wellness Sanctuary', 'Entertainer''s Dream'],
   ARRAY['Morning runs along the waterfront before work', 'Hosting friends with views of the bay and city lights', 'Walking to Giants games and concerts at Chase Center'],
   '[{"name": "Light-Filled", "intensity": 0.95, "source": "interior"},
     {"name": "Resort Living", "intensity": 0.85, "source": "both"},
     {"name": "Urban Energy", "intensity": 0.8, "source": "exterior"}]'::jsonb,
   '{"lightingQuality": "natural_abundant", "colorPalette": ["white", "light gray", "blue accents"], "architecturalStyle": "Modern High-Rise", "overallCondition": "pristine"}'::jsonb,
   'seed-data', 'seed-hash-004', 0.9),

  -- dev-100005: 6312 College Ave, Oakland (Walkable Rockridge townhouse)
  ('eeeeeeee-eeee-eeee-eeee-eeeeeeeeeeee',
   'Charming Townhome in Vibrant Rockridge',
   'Experience the best of urban village living in this delightful townhome, steps from boutiques, cafes, and BART.',
   '[{"feature": "Prime walkable location", "location": "neighborhood", "appealFactor": "Everything you need within a pleasant stroll"},
     {"feature": "Multi-level layout", "location": "interior", "appealFactor": "Privacy and separation between living spaces"},
     {"feature": "BART proximity", "location": "transportation", "appealFactor": "Easy commute without a car"}]'::jsonb,
   '[{"category": "Urban Villager", "score": 0.95, "reason": "Walk to farmers market, restaurants, and shops"},
     {"category": "Commuter", "score": 0.9, "reason": "BART station steps away for car-free commuting"},
     {"category": "Foodie", "score": 0.85, "reason": "Surrounded by acclaimed restaurants and cafes"}]'::jsonb,
   ARRAY['Urban Oasis', 'Commuter Friendly', 'First-Time Buyer Friendly', 'Cozy Retreat'],
   ARRAY['Saturday mornings at the Rockridge farmers market', 'Walking home from dinner at your favorite neighborhood spot', 'The freedom of leaving your car at home'],
   '[{"name": "Neighborhood Charm", "intensity": 0.9, "source": "exterior"},
     {"name": "Cozy Comfort", "intensity": 0.85, "source": "interior"},
     {"name": "Connected Living", "intensity": 0.8, "source": "both"}]'::jsonb,
   '{"lightingQuality": "natural_moderate", "colorPalette": ["warm neutrals", "exposed brick", "wood floors"], "architecturalStyle": "Contemporary Townhome", "overallCondition": "well_maintained"}'::jsonb,
   'seed-data', 'seed-hash-005', 0.9),

  -- dev-100006: 2847 Pine St, San Francisco (Victorian in Pacific Heights)
  ('ffffffff-ffff-ffff-ffff-ffffffffffff',
   'Elegant Victorian with Modern Soul',
   'Where historic grandeur meets contemporary living in one of San Francisco''s most coveted neighborhoods.',
   '[{"feature": "Original period details", "location": "throughout", "appealFactor": "Crown moldings, high ceilings, and Victorian charm"},
     {"feature": "Modern updates", "location": "kitchen and baths", "appealFactor": "Today''s amenities in a timeless setting"},
     {"feature": "Pacific Heights address", "location": "neighborhood", "appealFactor": "Prestigious location with tree-lined streets"}]'::jsonb,
   '[{"category": "History Lover", "score": 0.9, "reason": "Authentic Victorian architecture and craftsmanship"},
     {"category": "Established Professional", "score": 0.95, "reason": "Prestigious address in prime neighborhood"},
     {"category": "Design Enthusiast", "score": 0.85, "reason": "Perfect blend of old-world charm and modern updates"}]'::jsonb,
   ARRAY['Classic Charm', 'Urban Oasis', 'Entertainer''s Dream', 'Investment Ready'],
   ARRAY['Hosting elegant dinner parties in your formal dining room', 'Walking to Fillmore Street boutiques and cafes', 'The pride of owning a piece of San Francisco history'],
   '[{"name": "Timeless Elegance", "intensity": 0.95, "source": "interior"},
     {"name": "Prestigious", "intensity": 0.85, "source": "both"},
     {"name": "Refined Living", "intensity": 0.8, "source": "interior"}]'::jsonb,
   '{"lightingQuality": "natural_moderate", "colorPalette": ["cream", "navy", "gold accents"], "architecturalStyle": "Victorian", "overallCondition": "well_maintained"}'::jsonb,
   'seed-data', 'seed-hash-006', 0.9),

  -- dev-100007: 445 Kansas St #3B, San Francisco (Industrial loft in Potrero Hill)
  ('11111111-2222-3333-4444-555555555555',
   'Industrial Chic Loft with Character',
   'Embrace the creative spirit in this converted warehouse space, where exposed brick tells stories of San Francisco''s past.',
   '[{"feature": "Exposed brick walls", "location": "living areas", "appealFactor": "Authentic industrial character and texture"},
     {"feature": "High ceilings", "location": "throughout", "appealFactor": "Dramatic volume and sense of space"},
     {"feature": "Potrero Hill views", "location": "windows", "appealFactor": "Sunny microclimate and city panoramas"}]'::jsonb,
   '[{"category": "Creative Professional", "score": 0.95, "reason": "Inspiring space perfect for artistic pursuits"},
     {"category": "Design Lover", "score": 0.9, "reason": "Industrial aesthetic with endless styling possibilities"},
     {"category": "Dog Owner", "score": 0.8, "reason": "Near parks and dog-friendly neighborhood"}]'::jsonb,
   ARRAY['Creative Paradise', 'Urban Oasis', 'Modern Minimalist', 'Pet Paradise'],
   ARRAY['Setting up your home studio bathed in natural light', 'The satisfaction of living in a space with real character', 'Walking your dog to nearby parks on sunny Potrero Hill days'],
   '[{"name": "Creative Energy", "intensity": 0.9, "source": "interior"},
     {"name": "Raw & Authentic", "intensity": 0.85, "source": "interior"},
     {"name": "Urban Cool", "intensity": 0.8, "source": "both"}]'::jsonb,
   '{"lightingQuality": "natural_abundant", "colorPalette": ["exposed brick", "concrete gray", "black metal"], "architecturalStyle": "Industrial Loft", "overallCondition": "well_maintained"}'::jsonb,
   'seed-data', 'seed-hash-007', 0.9),

  -- dev-100008: 1633 Webster St #1205, San Francisco (Luxury high-rise)
  ('22222222-3333-4444-5555-666666666666',
   'Penthouse Living with Panoramic Splendor',
   'Rise above the ordinary in this luxurious high-floor residence offering sweeping views from bay to ocean.',
   '[{"feature": "Panoramic views", "location": "throughout", "appealFactor": "270-degree views of bay, bridges, and city"},
     {"feature": "Premium finishes", "location": "throughout", "appealFactor": "Designer details and high-end materials"},
     {"feature": "Full-service building", "location": "amenities", "appealFactor": "Concierge, valet, and white-glove service"}]'::jsonb,
   '[{"category": "Executive", "score": 0.95, "reason": "Prestigious address with premium amenities"},
     {"category": "Entertainer", "score": 0.9, "reason": "Impressive space for hosting with stunning backdrop"},
     {"category": "Empty Nester", "score": 0.85, "reason": "Lock-and-leave convenience with luxury touches"}]'::jsonb,
   ARRAY['City Views', 'Modern Minimalist', 'Entertainer''s Dream', 'Investment Ready'],
   ARRAY['Watching the fog roll in while sipping morning espresso', 'Impressing guests with views they''ll never forget', 'The convenience of concierge handling life''s details'],
   '[{"name": "Luxurious", "intensity": 0.95, "source": "interior"},
     {"name": "Elevated Living", "intensity": 0.9, "source": "both"},
     {"name": "Sophisticated", "intensity": 0.85, "source": "interior"}]'::jsonb,
   '{"lightingQuality": "natural_abundant", "colorPalette": ["white marble", "chrome", "warm wood accents"], "architecturalStyle": "Modern Luxury", "overallCondition": "pristine"}'::jsonb,
   'seed-data', 'seed-hash-008', 0.9),

  -- dev-100009: 3542 18th St, San Francisco (Remodeled Mission home)
  ('33333333-4444-5555-6666-777777777777',
   'Modern Mission Living with Private Garden',
   'Discover the perfect blend of indoor sophistication and outdoor tranquility in the heart of vibrant Mission.',
   '[{"feature": "Open floor plan", "location": "main level", "appealFactor": "Seamless flow for modern living and entertaining"},
     {"feature": "Private garden", "location": "rear yard", "appealFactor": "Urban sanctuary for relaxation and dining al fresco"},
     {"feature": "Complete renovation", "location": "throughout", "appealFactor": "Move-in ready with contemporary finishes"}]'::jsonb,
   '[{"category": "Urban Family", "score": 0.9, "reason": "Space for growing family in walkable neighborhood"},
     {"category": "Foodie", "score": 0.95, "reason": "Surrounded by Mission''s legendary food scene"},
     {"category": "Culture Seeker", "score": 0.85, "reason": "Art galleries, music venues, and diverse community"}]'::jsonb,
   ARRAY['Family Haven', 'Outdoor Living', 'Urban Oasis', 'Culinary Paradise'],
   ARRAY['Summer dinners in your private garden oasis', 'Walking to taquerias and coffee shops with the kids', 'The energy of Mission street life just outside your door'],
   '[{"name": "Contemporary Comfort", "intensity": 0.9, "source": "interior"},
     {"name": "Indoor-Outdoor Flow", "intensity": 0.85, "source": "both"},
     {"name": "Neighborhood Energy", "intensity": 0.8, "source": "exterior"}]'::jsonb,
   '{"lightingQuality": "natural_abundant", "colorPalette": ["white walls", "natural wood", "greenery"], "architecturalStyle": "Modern Remodel", "overallCondition": "pristine"}'::jsonb,
   'seed-data', 'seed-hash-009', 0.9),

  -- dev-100010: 5627 Lawton St, San Francisco (Sunset District home)
  ('44444444-5555-6666-7777-888888888888',
   'Sunny Retreat in Friendly Sunset',
   'Find your happy place in this light-filled home with a backyard made for San Francisco''s best-kept-secret sunny days.',
   '[{"feature": "Updated kitchen", "location": "kitchen", "appealFactor": "Modern amenities for everyday cooking joy"},
     {"feature": "Sunny backyard", "location": "exterior", "appealFactor": "BBQs, gardening, and outdoor play space"},
     {"feature": "Garage parking", "location": "lower level", "appealFactor": "Protected parking plus storage"}]'::jsonb,
   '[{"category": "Young Family", "score": 0.95, "reason": "Great schools, safe streets, and yard for kids"},
     {"category": "Beach Lover", "score": 0.85, "reason": "Ocean Beach just minutes away"},
     {"category": "Value Seeker", "score": 0.9, "reason": "More space for your money in established neighborhood"}]'::jsonb,
   ARRAY['Family Haven', 'Outdoor Living', 'First-Time Buyer Friendly', 'Beach Lifestyle'],
   ARRAY['Sunny afternoon barbecues in your backyard', 'Kids riding bikes on quiet, fog-free streets', 'Weekend trips to Ocean Beach just minutes away'],
   '[{"name": "Family Friendly", "intensity": 0.9, "source": "both"},
     {"name": "Comfortable Living", "intensity": 0.85, "source": "interior"},
     {"name": "Neighborhood Pride", "intensity": 0.8, "source": "exterior"}]'::jsonb,
   '{"lightingQuality": "natural_abundant", "colorPalette": ["warm yellow", "white trim", "natural wood"], "architecturalStyle": "Mid-Century", "overallCondition": "well_maintained"}'::jsonb,
   'seed-data', 'seed-hash-010', 0.9),

  -- dev-100011: 2045 Franklin St #4A, San Francisco (Russian Hill studio)
  ('55555555-6666-7777-8888-999999999999',
   'Charming Pied-à-Terre with City Magic',
   'Your cozy perch in prestigious Russian Hill, where cable cars climb and city lights sparkle.',
   '[{"feature": "City views", "location": "windows", "appealFactor": "Twinkling city lights and neighborhood charm"},
     {"feature": "Efficient layout", "location": "throughout", "appealFactor": "Thoughtfully designed for urban living"},
     {"feature": "Prime location", "location": "neighborhood", "appealFactor": "Walk to North Beach, Polk Street, and downtown"}]'::jsonb,
   '[{"category": "First-Time Buyer", "score": 0.95, "reason": "Accessible entry to SF homeownership"},
     {"category": "Urban Explorer", "score": 0.9, "reason": "Central location for discovering the city"},
     {"category": "Investor", "score": 0.85, "reason": "Strong rental potential in sought-after location"}]'::jsonb,
   ARRAY['Urban Oasis', 'First-Time Buyer Friendly', 'Cozy Retreat', 'Investment Ready'],
   ARRAY['Morning coffee with a view of the city waking up', 'Walking everywhere in one of SF''s most charming neighborhoods', 'The magic of cable car bells outside your window'],
   '[{"name": "Cozy Urban", "intensity": 0.9, "source": "interior"},
     {"name": "City Romance", "intensity": 0.85, "source": "both"},
     {"name": "Efficient Elegance", "intensity": 0.75, "source": "interior"}]'::jsonb,
   '{"lightingQuality": "natural_moderate", "colorPalette": ["soft white", "warm gray", "brass accents"], "architecturalStyle": "Classic SF Apartment", "overallCondition": "well_maintained"}'::jsonb,
   'seed-data', 'seed-hash-011', 0.9),

  -- dev-100012: 897 Harrison St #205, San Francisco (Modern SOMA loft)
  ('66666666-7777-8888-9999-aaaaaaaaaaaa',
   'Light-Drenched SOMA Loft Living',
   'Where floor-to-ceiling glass meets industrial soul in San Francisco''s most dynamic neighborhood.',
   '[{"feature": "Floor-to-ceiling windows", "location": "living area", "appealFactor": "Dramatic natural light and urban views"},
     {"feature": "Open loft layout", "location": "throughout", "appealFactor": "Flexible space for living and creating"},
     {"feature": "SOMA location", "location": "neighborhood", "appealFactor": "Tech hub with restaurants and nightlife"}]'::jsonb,
   '[{"category": "Tech Professional", "score": 0.95, "reason": "Walking distance to tech offices and coworking"},
     {"category": "Night Owl", "score": 0.85, "reason": "Surrounded by SOMA''s bar and club scene"},
     {"category": "Minimalist", "score": 0.9, "reason": "Clean lines and open space for curated living"}]'::jsonb,
   ARRAY['Modern Minimalist', 'Urban Oasis', 'Work from Home Ready', 'Entertainer''s Dream'],
   ARRAY['Working from home bathed in natural light', 'Walking to happy hour with colleagues', 'The buzz of city energy right outside your door'],
   '[{"name": "Urban Industrial", "intensity": 0.9, "source": "interior"},
     {"name": "Light & Airy", "intensity": 0.95, "source": "interior"},
     {"name": "Dynamic Energy", "intensity": 0.8, "source": "exterior"}]'::jsonb,
   '{"lightingQuality": "natural_abundant", "colorPalette": ["concrete", "glass", "black steel"], "architecturalStyle": "Modern Loft", "overallCondition": "pristine"}'::jsonb,
   'seed-data', 'seed-hash-012', 0.9),

  -- dev-100013: 1456 Grove St, Berkeley (Berkeley bungalow near UC)
  ('77777777-8888-9999-aaaa-bbbbbbbbbbbb',
   'Classic Berkeley Bungalow with Soul',
   'Embrace the intellectual spirit and community warmth of this charming bungalow in the heart of Berkeley.',
   '[{"feature": "Craftsman details", "location": "throughout", "appealFactor": "Built-ins, wood floors, and period charm"},
     {"feature": "UC proximity", "location": "neighborhood", "appealFactor": "Walk to campus, lectures, and cultural events"},
     {"feature": "Berkeley character", "location": "exterior", "appealFactor": "Tree-lined street with community feel"}]'::jsonb,
   '[{"category": "Academic", "score": 0.95, "reason": "Steps from UC Berkeley and intellectual community"},
     {"category": "Community Oriented", "score": 0.9, "reason": "Strong neighborhood bonds and local culture"},
     {"category": "Garden Lover", "score": 0.8, "reason": "Berkeley''s climate perfect for year-round gardening"}]'::jsonb,
   ARRAY['Classic Charm', 'Urban Oasis', 'Family Haven', 'Cozy Retreat'],
   ARRAY['Attending lectures and events at nearby UC Berkeley', 'Weekend brunch at beloved neighborhood cafes', 'The sense of belonging in a tight-knit community'],
   '[{"name": "Academic Haven", "intensity": 0.85, "source": "both"},
     {"name": "Warm & Welcoming", "intensity": 0.9, "source": "interior"},
     {"name": "Community Spirit", "intensity": 0.8, "source": "exterior"}]'::jsonb,
   '{"lightingQuality": "natural_moderate", "colorPalette": ["warm wood", "sage green", "cream"], "architecturalStyle": "Craftsman Bungalow", "overallCondition": "well_maintained"}'::jsonb,
   'seed-data', 'seed-hash-013', 0.9)
ON CONFLICT (property_id) DO UPDATE SET
  tagline = EXCLUDED.tagline,
  vibe_statement = EXCLUDED.vibe_statement,
  feature_highlights = EXCLUDED.feature_highlights,
  lifestyle_fits = EXCLUDED.lifestyle_fits,
  suggested_tags = EXCLUDED.suggested_tags,
  emotional_hooks = EXCLUDED.emotional_hooks,
  primary_vibes = EXCLUDED.primary_vibes,
  aesthetics = EXCLUDED.aesthetics,
  model_used = EXCLUDED.model_used,
  source_data_hash = EXCLUDED.source_data_hash,
  confidence = EXCLUDED.confidence,
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
