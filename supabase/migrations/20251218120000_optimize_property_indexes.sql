-- Optimize common search patterns for properties
-- Most queries filter by is_active=true, so including it in composite indexes helps

-- 1. Optimizing Default Sort: Active properties sorted by creation date
CREATE INDEX IF NOT EXISTS idx_properties_active_created_at 
ON properties(is_active, created_at DESC);

-- 2. Optimizing Price Search: Active properties filtered/sorted by price
-- This helps queries like: WHERE is_active = true AND price BETWEEN X AND Y
CREATE INDEX IF NOT EXISTS idx_properties_active_price 
ON properties(is_active, price);

-- 3. Optimizing Neighborhood Lists: Active properties in a neighborhood
CREATE INDEX IF NOT EXISTS idx_properties_active_neighborhood 
ON properties(neighborhood_id, is_active);

-- 4. Optimizing Similar Properties/Type Search: 
-- Helps with: WHERE is_active = true AND property_type = 'house' AND price...
CREATE INDEX IF NOT EXISTS idx_properties_active_type_price 
ON properties(is_active, property_type, price);
