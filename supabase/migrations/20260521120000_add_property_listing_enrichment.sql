-- Listing-enrichment columns captured inline from the RapidAPI /property
-- response (schools, price/tax history, zestimate, days-on-market, HOA,
-- broker/agent). These fields already arrive in the /property call the ingest
-- makes per zpid — they were previously discarded. Capturing them gives the
-- listing UI + vibe generator far richer grounding at zero extra API cost.
ALTER TABLE public.properties
  ADD COLUMN IF NOT EXISTS price_history jsonb,
  ADD COLUMN IF NOT EXISTS tax_history jsonb,
  ADD COLUMN IF NOT EXISTS schools jsonb,
  ADD COLUMN IF NOT EXISTS zestimate integer,
  ADD COLUMN IF NOT EXISTS rent_zestimate integer,
  ADD COLUMN IF NOT EXISTS days_on_market integer,
  ADD COLUMN IF NOT EXISTS listed_at timestamptz,
  ADD COLUMN IF NOT EXISTS hoa_fee numeric,
  ADD COLUMN IF NOT EXISTS broker_name text,
  ADD COLUMN IF NOT EXISTS agent_name text;

COMMENT ON COLUMN public.properties.price_history IS 'RapidAPI /property priceHistory[] (date, price, event, priceChangeRate)';
COMMENT ON COLUMN public.properties.tax_history IS 'RapidAPI /property taxHistory[] (time, taxPaid, value)';
COMMENT ON COLUMN public.properties.schools IS 'RapidAPI /property schools[] (name, rating, level, distance, grades)';
COMMENT ON COLUMN public.properties.zestimate IS 'RapidAPI /property zestimate (Zillow estimated value)';
COMMENT ON COLUMN public.properties.rent_zestimate IS 'RapidAPI /property rentZestimate (estimated monthly rent)';
COMMENT ON COLUMN public.properties.days_on_market IS 'Derived from /property datePosted at ingest time';
COMMENT ON COLUMN public.properties.listed_at IS 'RapidAPI /property datePosted (listing date)';
COMMENT ON COLUMN public.properties.hoa_fee IS 'RapidAPI /property resoFacts HOA fee (monthly, USD)';
COMMENT ON COLUMN public.properties.broker_name IS 'RapidAPI /property attributionInfo broker name';
COMMENT ON COLUMN public.properties.agent_name IS 'RapidAPI /property attributionInfo agent name';
