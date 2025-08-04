import { config } from 'dotenv'

// Load test environment variables
// Integration tests use local Supabase Docker stack
config({ path: '.env.test.local' })

// Set NODE_ENV to test for integration tests
Object.defineProperty(process.env, 'NODE_ENV', {
  value: 'test',
  writable: true,
});

// Set default test environment variables for local Supabase
process.env.NEXT_PUBLIC_SUPABASE_URL =
  process.env.NEXT_PUBLIC_SUPABASE_URL || 'http://127.0.0.1:54321'
process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY =
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ||
  'REDACTED_SUPABASE_ANON_KEY'
process.env.SUPABASE_SERVICE_ROLE_KEY =
  process.env.SUPABASE_SERVICE_ROLE_KEY ||
  'REDACTED_SUPABASE_SERVICE_ROLE_KEY'

// No mocks in integration tests - we use the real Supabase Docker stack
