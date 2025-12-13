-- Add Zillow image refresh marker fields to avoid repeated RapidAPI refreshes
-- for listings with small galleries (i.e., never reaching `minImages`).

ALTER TABLE public.properties
  ADD COLUMN IF NOT EXISTS zillow_images_refreshed_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS zillow_images_refreshed_count INTEGER,
  ADD COLUMN IF NOT EXISTS zillow_images_refresh_status TEXT;

CREATE INDEX IF NOT EXISTS idx_properties_zillow_images_refreshed_at
  ON public.properties (zillow_images_refreshed_at);

