-- Migration: Harden public properties SELECT policy listing-status scope
-- Created at: 2026-05-08 00:35:00 UTC
--
-- The original broad policy allowed every role to read rows where is_active = true,
-- which bypassed the stricter anon marketing policy and exposed draft/sold rows.

BEGIN;

ALTER TABLE IF EXISTS public.properties ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Anyone can view active properties" ON public.properties;

CREATE POLICY "Anyone can view active properties"
  ON public.properties
  FOR SELECT
  USING (
    listing_status = 'active'
    AND coalesce(is_active, true) = true
  );

COMMIT;
