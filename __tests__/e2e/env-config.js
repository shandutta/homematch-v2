/**
 * Environment configuration for E2E tests
 * This is a plain JS file to avoid TypeScript module issues
 */

// Default test environment values from .env.test.local
const TEST_ENV = {
  NEXT_PUBLIC_SUPABASE_URL:
    process.env.NEXT_PUBLIC_SUPABASE_URL ||
    process.env.SUPABASE_URL ||
    'http://127.0.0.1:54321',
  NEXT_PUBLIC_SUPABASE_ANON_KEY:
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || process.env.SUPABASE_ANON_KEY,
  SUPABASE_SERVICE_ROLE_KEY: process.env.SUPABASE_SERVICE_ROLE_KEY,
}

if (
  !TEST_ENV.NEXT_PUBLIC_SUPABASE_ANON_KEY ||
  !TEST_ENV.SUPABASE_SERVICE_ROLE_KEY
) {
  throw new Error(
    'Missing Supabase test keys. Set NEXT_PUBLIC_SUPABASE_ANON_KEY and SUPABASE_SERVICE_ROLE_KEY in .env.test.local or .env.prod.'
  )
}

module.exports = TEST_ENV
