/// <reference types="jest" />
import { jest } from '@jest/globals'
import {
  makeMockClient,
  mockSupabaseClient,
} from './__mocks__/supabaseClient-simple'

// Mock the Supabase client creation globally
jest.mock('@supabase/supabase-js', () => ({
  createClient: jest.fn(() => mockSupabaseClient),
}))

// Also mock the server-side createClient for services that use it
jest.mock('@/lib/supabase/server', () => ({
  createClient: jest.fn(() => Promise.resolve(mockSupabaseClient)),
}))

// Mock the client-side createClient
jest.mock('@/lib/supabase/client', () => ({
  createClient: jest.fn(() => mockSupabaseClient),
}))
