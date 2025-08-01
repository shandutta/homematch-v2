-- RLS Policies

-- User profiles: Users can only access their own profile
CREATE POLICY "Users can view their own profile" ON user_profiles
  FOR SELECT USING (auth.uid() = id);

CREATE POLICY "Users can update their own profile" ON user_profiles
  FOR UPDATE USING (auth.uid() = id);

CREATE POLICY "Users can insert their own profile" ON user_profiles
  FOR INSERT WITH CHECK (auth.uid() = id);

-- Households: Users can access households they belong to
CREATE POLICY "Users can view their household" ON households
  FOR SELECT USING (
    id IN (
      SELECT household_id FROM user_profiles 
      WHERE id = auth.uid()
    )
  );

CREATE POLICY "Users can update their household" ON households
  FOR UPDATE USING (
    id IN (
      SELECT household_id FROM user_profiles 
      WHERE id = auth.uid()
    )
  );

-- Neighborhoods: Public read access
CREATE POLICY "Anyone can view neighborhoods" ON neighborhoods
  FOR SELECT USING (true);

-- Properties: Public read access for active properties
CREATE POLICY "Anyone can view active properties" ON properties
  FOR SELECT USING (is_active = true);

-- User property interactions: Users can only access their own interactions
CREATE POLICY "Users can view their own interactions" ON user_property_interactions
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own interactions" ON user_property_interactions
  FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own interactions" ON user_property_interactions
  FOR UPDATE USING (auth.uid() = user_id);

-- Saved searches: Users can only access their own searches
CREATE POLICY "Users can view their own searches" ON saved_searches
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own searches" ON saved_searches
  FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own searches" ON saved_searches
  FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own searches" ON saved_searches
  FOR DELETE USING (auth.uid() = user_id);