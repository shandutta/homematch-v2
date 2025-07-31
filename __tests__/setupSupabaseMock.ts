import { makeMockClient } from './__mocks__/supabaseClient-simple'

// Mock the Supabase client creation globally
jest.mock('@supabase/supabase-js', () => ({
  createClient: jest.fn(() => makeMockClient()),
}))

// Also mock the server-side createClient for services that use it
jest.mock('@/lib/supabase/server', () => ({
  createClient: jest.fn(() => Promise.resolve(makeMockClient())),
}))

// Mock the client-side createClient
jest.mock('@/lib/supabase/client', () => ({
  supabase: makeMockClient(),
}))
