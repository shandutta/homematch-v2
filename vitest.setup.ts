import { config } from 'dotenv'

// Load test environment variables
// Integration tests use local Supabase Docker stack
config({ path: '.env.test.local' })

// Set NODE_ENV to test for integration tests
process.env.NODE_ENV = 'test'

// Set default test environment variables for local Supabase
process.env.NEXT_PUBLIC_SUPABASE_URL =
  process.env.NEXT_PUBLIC_SUPABASE_URL || 'http://127.0.0.1:54321'
process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY =
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ||
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZS1kZW1vIiwicm9sZSI6ImFub24iLCJleHAiOjE5ODM4MTI5OTZ9.tQwoQ-dh_iOZ9Hp4dXWtu12rIUbyaXU2G0_SBoWKZJo'
process.env.SUPABASE_SERVICE_ROLE_KEY =
  process.env.SUPABASE_SERVICE_ROLE_KEY ||
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZS1kZW1vIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImV4cCI6MTk4MzgxMjk5Nn0.pmctc3-i5D7PRVq4HOXcXDZ0Er3mrC8a2W7yIa5jePI'

// No mocks in integration tests - we use the real Supabase Docker stack
