-- SEED-001: 46 active properties in prod were test/seed artifacts (city='Test City',
-- addresses like '123 Test St' or 'Interaction Test <uuid>', plus the supabase/seed.sql
-- dev-* zpid rows) that surfaced in the prod dashboard feed for brand-new users —
-- sometimes as the FIRST card. The audit caught one as "$500,000 / 3BR / 2BA /
-- 123 Cascade Test / Test City, CA" with the LLM decorating it as a "FUTURE FAMILY HOME."
--
-- Deactivate (don't delete) so the rows stay for FK integrity and audit history
-- but don't pollute production. The companion code-side filter in
-- searchService also drops rows by these patterns even if is_active toggles back on.
UPDATE public.properties
SET is_active = false, updated_at = NOW()
WHERE is_active = true
  AND (
    zpid LIKE 'dev-%'
    OR (city = 'Test City' AND (state = 'TS' OR state = 'CA'))
    OR state = 'TS'
  );
