/**
 * Environment configuration for E2E tests
 * This is a plain JS file to avoid TypeScript module issues
 */

// Default test environment values from .env.test.local
const TEST_ENV = {
  NEXT_PUBLIC_SUPABASE_URL: 'http://127.0.0.1:54321',
  NEXT_PUBLIC_SUPABASE_ANON_KEY: 'REDACTED_SUPABASE_ANON_KEY',
  SUPABASE_SERVICE_ROLE_KEY: 'REDACTED_SUPABASE_SERVICE_ROLE_KEY',
}

module.exports = TEST_ENV