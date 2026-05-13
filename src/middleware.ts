// Phase 3 (Supabase-auth elimination, 2026-05-13): the legacy
// `buildSupabaseSessionCookieOptions` re-export was dropped along
// with the legacy Supabase middleware path. Tests that need the cookie
// helper import it from '@/lib/supabase/cookie-options' directly until
// Phase 4 removes that file too.
export { config } from '../middleware'
// Re-export the default clerkMiddleware export as `middleware` for tests that
// import from this path. With Clerk's wrapper, the runtime export is the
// default; this preserves the legacy named import shape.
export { default as middleware } from '../middleware'
