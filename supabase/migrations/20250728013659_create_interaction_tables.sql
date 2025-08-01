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