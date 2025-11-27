-- Create property_vibes table for storing LLM-generated property descriptions
-- This enables AI-powered "About this home" sections with vibes extraction from images

CREATE TABLE IF NOT EXISTS property_vibes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  property_id UUID NOT NULL REFERENCES properties(id) ON DELETE CASCADE,

  -- Generated Content
  tagline TEXT NOT NULL,                    -- "Sun-Drenched Victorian with Modern Soul"
  vibe_statement TEXT NOT NULL,             -- 2-sentence lifestyle summary
  feature_highlights JSONB NOT NULL DEFAULT '[]', -- [{"feature": "...", "appeal": "..."}]
  lifestyle_fits JSONB NOT NULL DEFAULT '[]',     -- [{"category": "...", "score": 0.9, "reason": "..."}]
  suggested_tags TEXT[] NOT NULL DEFAULT '{}',    -- ["Work from Home Ready", "Pet Paradise"]
  emotional_hooks TEXT[] DEFAULT '{}',            -- ["Sunday brunch on the patio"]

  -- Visual Analysis
  primary_vibes JSONB NOT NULL DEFAULT '[]',      -- [{"name": "Modern Minimalist", "intensity": 0.8}]
  aesthetics JSONB,                               -- {lightingQuality, colorPalette, architecturalStyle}

  -- Raw I/O for future training data
  input_data JSONB,                         -- Property data sent to LLM
  raw_output TEXT,                          -- Full LLM response

  -- Metadata
  model_used TEXT NOT NULL,
  images_analyzed TEXT[] DEFAULT '{}',
  source_data_hash TEXT NOT NULL,           -- For cache invalidation
  generation_cost_usd DECIMAL(8,6),
  confidence DECIMAL(3,2),

  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),

  -- One vibes record per property
  CONSTRAINT unique_property_vibes UNIQUE (property_id)
);

-- Indexes for efficient lookups
CREATE INDEX IF NOT EXISTS idx_property_vibes_property_id ON property_vibes(property_id);
CREATE INDEX IF NOT EXISTS idx_property_vibes_source_hash ON property_vibes(source_data_hash);
CREATE INDEX IF NOT EXISTS idx_property_vibes_model ON property_vibes(model_used);

-- Enable RLS
ALTER TABLE property_vibes ENABLE ROW LEVEL SECURITY;

-- RLS Policies: vibes are readable by authenticated users (same as properties)
CREATE POLICY "property_vibes_select_authenticated"
  ON property_vibes FOR SELECT
  TO authenticated
  USING (true);

-- Service role can insert/update (for batch generation jobs)
CREATE POLICY "property_vibes_insert_service"
  ON property_vibes FOR INSERT
  TO service_role
  WITH CHECK (true);

CREATE POLICY "property_vibes_update_service"
  ON property_vibes FOR UPDATE
  TO service_role
  USING (true);

CREATE POLICY "property_vibes_delete_service"
  ON property_vibes FOR DELETE
  TO service_role
  USING (true);

-- Comment on table for documentation
COMMENT ON TABLE property_vibes IS 'LLM-generated property descriptions and vibes extracted from Zillow images. Used for AI-powered "About this home" sections.';
