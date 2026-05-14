// Phase 4 (Supabase-auth elimination, 2026-05-13): cookie-options +
// storage-keys helpers were deleted along with the legacy Supabase
// middleware path. This shim only re-exports what Next.js / tests
// still need.
export { config } from '../middleware'
// Re-export the default clerkMiddleware export as `middleware` for tests that
// import from this path. With Clerk's wrapper, the runtime export is the
// default; this preserves the legacy named import shape.
export { default as middleware } from '../middleware'
