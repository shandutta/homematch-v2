-- Phase 1 performance closure: add GIN indexes for JSONB fields used by
-- preferences, interaction scoring, and saved-search filtering paths.

CREATE INDEX IF NOT EXISTS idx_user_profiles_preferences_gin
  ON public.user_profiles
  USING gin (preferences);

CREATE INDEX IF NOT EXISTS idx_user_property_interactions_score_data_gin
  ON public.user_property_interactions
  USING gin (score_data);

CREATE INDEX IF NOT EXISTS idx_saved_searches_filters_gin
  ON public.saved_searches
  USING gin (filters);

-- DOWN:
-- DROP INDEX IF EXISTS public.idx_saved_searches_filters_gin;
-- DROP INDEX IF EXISTS public.idx_user_property_interactions_score_data_gin;
-- DROP INDEX IF EXISTS public.idx_user_profiles_preferences_gin;
