-- HomeMatch V2 Database Schema Migration
-- Step 2.2: Complete database setup with PostGIS support

-- Enable required extensions
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "postgis";

-- User profiles (extends auth.users)
CREATE TABLE IF NOT EXISTS user_profiles (
  id UUID REFERENCES auth.users(id) PRIMARY KEY,
  household_id UUID,
  onboarding_completed BOOLEAN DEFAULT FALSE,
  preferences JSONB DEFAULT '{}',
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Households for collaboration
CREATE TABLE IF NOT EXISTS households (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name TEXT NOT NULL,
  collaboration_mode TEXT DEFAULT 'independent' CHECK (collaboration_mode IN ('independent', 'shared', 'weighted')),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Add foreign key constraint for user_profiles.household_id
ALTER TABLE user_profiles 
ADD CONSTRAINT fk_user_profiles_household 
FOREIGN KEY (household_id) REFERENCES households(id);

-- Neighborhoods (simplified from V1's 4-table hierarchy)
CREATE TABLE IF NOT EXISTS neighborhoods (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name TEXT NOT NULL,
  city TEXT NOT NULL,
  state TEXT NOT NULL,
  metro_area TEXT,
  bounds POLYGON,
  median_price INTEGER,
  walk_score INTEGER,
  transit_score INTEGER,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Properties
CREATE TABLE IF NOT EXISTS properties (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  zpid TEXT UNIQUE, -- Zillow integration
  address TEXT NOT NULL,
  city TEXT NOT NULL,
  state TEXT NOT NULL,
  zip_code TEXT NOT NULL,
  price INTEGER NOT NULL,
  bedrooms INTEGER NOT NULL,
  bathrooms DECIMAL(2,1) NOT NULL,
  square_feet INTEGER,
  property_type TEXT CHECK (property_type IN ('house', 'condo', 'townhouse', 'apartment')),
  images TEXT[] DEFAULT '{}',
  description TEXT,
  coordinates POINT,
  neighborhood_id UUID REFERENCES neighborhoods(id),
  amenities TEXT[] DEFAULT '{}',
  year_built INTEGER,
  lot_size_sqft INTEGER,
  parking_spots INTEGER DEFAULT 0,
  listing_status TEXT DEFAULT 'active',
  property_hash TEXT UNIQUE, -- For deduplication
  is_active BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- User property interactions
CREATE TABLE IF NOT EXISTS user_property_interactions (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID REFERENCES auth.users(id) NOT NULL,
  property_id UUID REFERENCES properties(id) NOT NULL,
  household_id UUID REFERENCES households(id),
  interaction_type TEXT CHECK (interaction_type IN ('like', 'dislike', 'skip', 'view')) NOT NULL,
  score_data JSONB, -- Store ML scores with interaction
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(user_id, property_id, interaction_type)
);

-- Saved searches
CREATE TABLE IF NOT EXISTS saved_searches (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID REFERENCES auth.users(id) NOT NULL,
  household_id UUID REFERENCES households(id),
  name TEXT NOT NULL,
  filters JSONB NOT NULL,
  is_active BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Indexes for performance
CREATE INDEX IF NOT EXISTS idx_properties_price ON properties(price);
CREATE INDEX IF NOT EXISTS idx_properties_bedrooms ON properties(bedrooms);
CREATE INDEX IF NOT EXISTS idx_properties_city ON properties(city);
CREATE INDEX IF NOT EXISTS idx_properties_type ON properties(property_type);
CREATE INDEX IF NOT EXISTS idx_properties_active ON properties(is_active);
CREATE INDEX IF NOT EXISTS idx_properties_coordinates ON properties USING GIST(coordinates);
CREATE INDEX IF NOT EXISTS idx_neighborhoods_bounds ON neighborhoods USING GIST(bounds);
CREATE INDEX IF NOT EXISTS idx_interactions_user_id ON user_property_interactions(user_id);
CREATE INDEX IF NOT EXISTS idx_interactions_property_id ON user_property_interactions(property_id);

-- Row Level Security policies
ALTER TABLE user_profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_property_interactions ENABLE ROW LEVEL SECURITY;
ALTER TABLE saved_searches ENABLE ROW LEVEL SECURITY;
ALTER TABLE households ENABLE ROW LEVEL SECURITY;

-- Users can only access their own data
CREATE POLICY IF NOT EXISTS "users_own_profile" ON user_profiles
  FOR ALL USING (auth.uid() = id);

CREATE POLICY IF NOT EXISTS "users_own_interactions" ON user_property_interactions
  FOR ALL USING (auth.uid() = user_id);

CREATE POLICY IF NOT EXISTS "users_own_searches" ON saved_searches
  FOR ALL USING (auth.uid() = user_id);

-- Household policies
CREATE POLICY IF NOT EXISTS "users_household_access" ON households
  FOR SELECT USING (
    id IN (
      SELECT household_id FROM user_profiles WHERE id = auth.uid()
    )
  );

-- Properties are public read
CREATE POLICY IF NOT EXISTS "properties_public_read" ON properties
  FOR SELECT USING (TRUE);

CREATE POLICY IF NOT EXISTS "neighborhoods_public_read" ON neighborhoods
  FOR SELECT USING (TRUE);

-- Update function for updated_at timestamps
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Triggers for automatic updated_at
CREATE TRIGGER IF NOT EXISTS update_user_profiles_updated_at BEFORE UPDATE ON user_profiles FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER IF NOT EXISTS update_households_updated_at BEFORE UPDATE ON households FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER IF NOT EXISTS update_properties_updated_at BEFORE UPDATE ON properties FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();