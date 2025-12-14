-- Neighborhood vibes table
-- Stores LLM-generated vibe summaries for each neighborhood (one row per neighborhood)

CREATE TABLE IF NOT EXISTS neighborhood_vibes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  neighborhood_id UUID NOT NULL REFERENCES neighborhoods(id) ON DELETE CASCADE,

  -- Generated content
  tagline TEXT NOT NULL,
  vibe_statement TEXT NOT NULL,
  neighborhood_themes JSONB NOT NULL DEFAULT '[]',
  local_highlights JSONB NOT NULL DEFAULT '[]',
  resident_fits JSONB NOT NULL DEFAULT '[]',
  suggested_tags TEXT[] NOT NULL DEFAULT '{}',

  -- Raw I/O and metadata
  input_data JSONB,
  raw_output TEXT,
  model_used TEXT NOT NULL,
  source_data_hash TEXT NOT NULL,
  generation_cost_usd DECIMAL(8,6),
  confidence DECIMAL(3,2),

  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),

  CONSTRAINT unique_neighborhood_vibes UNIQUE (neighborhood_id)
);

CREATE INDEX IF NOT EXISTS idx_neighborhood_vibes_neighborhood_id ON neighborhood_vibes(neighborhood_id);
CREATE INDEX IF NOT EXISTS idx_neighborhood_vibes_model ON neighborhood_vibes(model_used);
CREATE INDEX IF NOT EXISTS idx_neighborhood_vibes_source_hash ON neighborhood_vibes(source_data_hash);

ALTER TABLE neighborhood_vibes ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "neighborhood_vibes_select_authenticated" ON neighborhood_vibes;
DROP POLICY IF EXISTS "neighborhood_vibes_insert_service" ON neighborhood_vibes;
DROP POLICY IF EXISTS "neighborhood_vibes_update_service" ON neighborhood_vibes;
DROP POLICY IF EXISTS "neighborhood_vibes_delete_service" ON neighborhood_vibes;

CREATE POLICY "neighborhood_vibes_select_authenticated"
  ON neighborhood_vibes FOR SELECT TO authenticated USING (true);

CREATE POLICY "neighborhood_vibes_insert_service"
  ON neighborhood_vibes FOR INSERT TO service_role WITH CHECK (true);

CREATE POLICY "neighborhood_vibes_update_service"
  ON neighborhood_vibes FOR UPDATE TO service_role USING (true);

CREATE POLICY "neighborhood_vibes_delete_service"
  ON neighborhood_vibes FOR DELETE TO service_role USING (true);

COMMENT ON TABLE neighborhood_vibes IS 'LLM-generated vibe summaries for each neighborhood.';
