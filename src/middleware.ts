export {
  buildSupabaseSessionCookieOptions,
  config,
} from '../middleware'
// Re-export the default clerkMiddleware export as `middleware` for tests that
// import from this path. With Clerk's wrapper, the runtime export is the
// default; this preserves the legacy named import shape.
export { default as middleware } from '../middleware'
