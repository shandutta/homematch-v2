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

-- Insert 5 test properties
INSERT INTO public.properties (
  id, zpid, address, city, state, zip_code, price, bedrooms, bathrooms, 
  square_feet, property_type, listing_status, coordinates, 
  neighborhood_id, property_hash, is_active
)
VALUES 
  ('aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', 'test-zpid-1', '123 Test St', 'San Francisco', 'CA', '94110', 
   750000, 2, 1.5, 1200, 'house', 'active', 
   ST_SetSRID(ST_MakePoint(-122.45, 37.75), 4326),
   '11111111-1111-1111-1111-111111111111', 'test-hash-1', true),
   
  ('bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb', 'test-zpid-2', '456 Sample Ave', 'San Francisco', 'CA', '94110', 
   850000, 3, 2, 1500, 'condo', 'active',
   ST_SetSRID(ST_MakePoint(-122.46, 37.76), 4326),
   '11111111-1111-1111-1111-111111111111', 'test-hash-2', true),
   
  ('cccccccc-cccc-cccc-cccc-cccccccccccc', 'test-zpid-3', '789 Demo Blvd', 'Oakland', 'CA', '94612', 
   650000, 2, 1, 1100, 'townhouse', 'active',
   ST_SetSRID(ST_MakePoint(-122.25, 37.85), 4326),
   '22222222-2222-2222-2222-222222222222', 'test-hash-3', true),
   
  ('dddddddd-dddd-dddd-dddd-dddddddddddd', 'test-zpid-4', '321 Example Ln', 'Berkeley', 'CA', '94702', 
   950000, 4, 2.5, 2000, 'house', 'active',
   ST_SetSRID(ST_MakePoint(-122.25, 37.90), 4326),
   '33333333-3333-3333-3333-333333333333', 'test-hash-4', true),
   
  ('eeeeeeee-eeee-eeee-eeee-eeeeeeeeeeee', 'test-zpid-5', '654 Mock Rd', 'Berkeley', 'CA', '94702', 
   1200000, 4, 3, 2500, 'house', 'active',
   ST_SetSRID(ST_MakePoint(-122.26, 37.91), 4326),
   '33333333-3333-3333-3333-333333333333', 'test-hash-5', true);