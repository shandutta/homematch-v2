-- Indexes for performance optimization
CREATE INDEX IF NOT EXISTS idx_properties_coordinates ON properties USING GIST (coordinates);
CREATE INDEX IF NOT EXISTS idx_properties_neighborhood_id ON properties(neighborhood_id);
CREATE INDEX IF NOT EXISTS idx_properties_price ON properties(price);
CREATE INDEX IF NOT EXISTS idx_properties_bedrooms ON properties(bedrooms);
CREATE INDEX IF NOT EXISTS idx_properties_bathrooms ON properties(bathrooms);
CREATE INDEX IF NOT EXISTS idx_properties_square_feet ON properties(square_feet);
CREATE INDEX IF NOT EXISTS idx_properties_property_type ON properties(property_type);
CREATE INDEX IF NOT EXISTS idx_properties_listing_status ON properties(listing_status);
CREATE INDEX IF NOT EXISTS idx_properties_is_active ON properties(is_active);

CREATE INDEX IF NOT EXISTS idx_neighborhoods_bounds ON neighborhoods USING GIST (bounds);
CREATE INDEX IF NOT EXISTS idx_neighborhoods_city_state ON neighborhoods(city, state);

CREATE INDEX IF NOT EXISTS idx_user_property_interactions_user_id ON user_property_interactions(user_id);
CREATE INDEX IF NOT EXISTS idx_user_property_interactions_property_id ON user_property_interactions(property_id);
CREATE INDEX IF NOT EXISTS idx_user_property_interactions_household_id ON user_property_interactions(household_id);
CREATE INDEX IF NOT EXISTS idx_user_property_interactions_type ON user_property_interactions(interaction_type);

CREATE INDEX IF NOT EXISTS idx_user_profiles_household_id ON user_profiles(household_id);
CREATE INDEX IF NOT EXISTS idx_saved_searches_user_id ON saved_searches(user_id);
CREATE INDEX IF NOT EXISTS idx_saved_searches_household_id ON saved_searches(household_id);