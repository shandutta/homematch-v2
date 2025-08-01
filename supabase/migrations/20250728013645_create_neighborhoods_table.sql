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