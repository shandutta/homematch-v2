/**
 * Typed Mock Factory
 *
 * This module provides strongly-typed mock factories to replace loose `any` types
 * in tests. Use these factories instead of raw mock objects to ensure type safety.
 *
 * @example
 * ```typescript
 * // Instead of:
 * const mockSupabase = { ... } as any
 *
 * // Use:
 * const mockSupabase = createMockSupabaseClient()
 * ```
 */

import type { User, Session } from '@supabase/supabase-js'
import type { Property, PropertyFilters } from '@/lib/schemas/property'
import type {
  MutualLike,
  HouseholdActivity,
  CouplesStats,
} from '@/lib/services/couples'

// ============================================================================
// Supabase Mock Types
// ============================================================================

interface MockQueryResponse<T> {
  data: T | null
  error: Error | null
  count?: number
}

interface MockQueryBuilder<T> {
  select: jest.Mock<MockQueryBuilder<T>, [string?]>
  insert: jest.Mock<MockQueryBuilder<T>, [unknown]>
  update: jest.Mock<MockQueryBuilder<T>, [unknown]>
  delete: jest.Mock<MockQueryBuilder<T>, []>
  eq: jest.Mock<MockQueryBuilder<T>, [string, unknown]>
  neq: jest.Mock<MockQueryBuilder<T>, [string, unknown]>
  gt: jest.Mock<MockQueryBuilder<T>, [string, unknown]>
  gte: jest.Mock<MockQueryBuilder<T>, [string, unknown]>
  lt: jest.Mock<MockQueryBuilder<T>, [string, unknown]>
  lte: jest.Mock<MockQueryBuilder<T>, [string, unknown]>
  in: jest.Mock<MockQueryBuilder<T>, [string, unknown[]]>
  order: jest.Mock<MockQueryBuilder<T>, [string, { ascending?: boolean }?]>
  limit: jest.Mock<MockQueryBuilder<T>, [number]>
  single: jest.Mock<Promise<MockQueryResponse<T>>, []>
  maybeSingle: jest.Mock<Promise<MockQueryResponse<T>>, []>
  then: <TResult>(
    callback: (value: MockQueryResponse<T[]>) => TResult
  ) => Promise<TResult>
}

interface MockAuthClient {
  getUser: jest.Mock<
    Promise<{ data: { user: User | null }; error: Error | null }>,
    []
  >
  getSession: jest.Mock<
    Promise<{ data: { session: Session | null }; error: Error | null }>,
    []
  >
  signInWithPassword: jest.Mock
  signOut: jest.Mock
  onAuthStateChange: jest.Mock
}

interface MockSupabaseClient {
  auth: MockAuthClient
  from: jest.Mock<MockQueryBuilder<unknown>, [string]>
  rpc: jest.Mock<Promise<MockQueryResponse<unknown>>, [string, unknown?]>
}

// ============================================================================
// User & Auth Factories
// ============================================================================

export function createMockUser(overrides: Partial<User> = {}): User {
  return {
    id: 'test-user-id',
    email: 'test@example.com',
    app_metadata: {},
    user_metadata: { display_name: 'Test User' },
    aud: 'authenticated',
    created_at: '2024-01-01T00:00:00Z',
    confirmed_at: '2024-01-01T00:00:00Z',
    email_confirmed_at: '2024-01-01T00:00:00Z',
    phone: '',
    last_sign_in_at: '2024-01-01T00:00:00Z',
    role: 'authenticated',
    updated_at: '2024-01-01T00:00:00Z',
    ...overrides,
  } satisfies User
}

export function createMockSession(overrides: Partial<Session> = {}): Session {
  return {
    access_token: 'mock-access-token',
    refresh_token: 'mock-refresh-token',
    expires_in: 3600,
    expires_at: Math.floor(Date.now() / 1000) + 3600,
    token_type: 'bearer',
    user: createMockUser(),
    ...overrides,
  } satisfies Session
}

// ============================================================================
// Supabase Client Factory
// ============================================================================

export function createMockQueryBuilder<T>(): MockQueryBuilder<T> {
  const builder: MockQueryBuilder<T> = {
    select: jest.fn().mockReturnThis(),
    insert: jest.fn().mockReturnThis(),
    update: jest.fn().mockReturnThis(),
    delete: jest.fn().mockReturnThis(),
    eq: jest.fn().mockReturnThis(),
    neq: jest.fn().mockReturnThis(),
    gt: jest.fn().mockReturnThis(),
    gte: jest.fn().mockReturnThis(),
    lt: jest.fn().mockReturnThis(),
    lte: jest.fn().mockReturnThis(),
    in: jest.fn().mockReturnThis(),
    order: jest.fn().mockReturnThis(),
    limit: jest.fn().mockReturnThis(),
    single: jest.fn().mockResolvedValue({ data: null, error: null }),
    maybeSingle: jest.fn().mockResolvedValue({ data: null, error: null }),
    then: jest.fn().mockImplementation((cb) =>
      Promise.resolve(
        cb({
          data: [],
          error: null,
        })
      )
    ),
  }
  return builder
}

export function createMockSupabaseClient(): MockSupabaseClient {
  return {
    auth: {
      getUser: jest
        .fn()
        .mockResolvedValue({ data: { user: null }, error: null }),
      getSession: jest
        .fn()
        .mockResolvedValue({ data: { session: null }, error: null }),
      signInWithPassword: jest
        .fn()
        .mockResolvedValue({ data: {}, error: null }),
      signOut: jest.fn().mockResolvedValue({ error: null }),
      onAuthStateChange: jest.fn().mockReturnValue({
        data: { subscription: { unsubscribe: jest.fn() } },
      }),
    },
    from: jest.fn().mockReturnValue(createMockQueryBuilder()),
    rpc: jest.fn().mockResolvedValue({ data: null, error: null }),
  }
}

// Helper to configure mock responses
export function configureMockAuth(
  client: MockSupabaseClient,
  user: User | null,
  error: Error | null = null
): void {
  client.auth.getUser.mockResolvedValue({
    data: { user },
    error,
  })
}

// ============================================================================
// Property Factories
// ============================================================================

export function createMockProperty(
  overrides: Partial<Property> = {}
): Property {
  return {
    id: 'test-property-id',
    zpid: 'test-zpid',
    address: '123 Test St',
    city: 'San Francisco',
    state: 'CA',
    zip_code: '94102',
    price: 500000,
    bedrooms: 3,
    bathrooms: 2,
    square_feet: 1500,
    property_type: 'single_family',
    images: ['https://example.com/image1.jpg'],
    description: 'A beautiful test property',
    coordinates: { lat: 37.7749, lng: -122.4194 },
    neighborhood_id: null,
    amenities: ['parking', 'garden'],
    year_built: 2000,
    lot_size_sqft: 5000,
    parking_spots: 2,
    listing_status: 'active',
    property_hash: null,
    is_active: true,
    created_at: '2024-01-01T00:00:00Z',
    updated_at: '2024-01-01T00:00:00Z',
    ...overrides,
  } satisfies Property
}

export function createMockPropertyFilters(
  overrides: Partial<PropertyFilters> = {}
): PropertyFilters {
  return {
    price_min: 300000,
    price_max: 800000,
    bedrooms_min: 2,
    bedrooms_max: 5,
    bathrooms_min: 1,
    bathrooms_max: 4,
    property_types: ['single_family', 'condo'],
    ...overrides,
  } satisfies PropertyFilters
}

// ============================================================================
// Couples Service Factories
// ============================================================================

export function createMockMutualLike(
  overrides: Partial<MutualLike> = {}
): MutualLike {
  return {
    property_id: 'test-property-id',
    liked_by_count: 2,
    first_liked_at: '2024-01-10T10:00:00Z',
    last_liked_at: '2024-01-15T12:00:00Z',
    user_ids: ['user-1', 'user-2'],
    ...overrides,
  } satisfies MutualLike
}

export function createMockHouseholdActivity(
  overrides: Partial<HouseholdActivity> = {}
): HouseholdActivity {
  return {
    id: 'activity-id',
    user_id: 'test-user-id',
    property_id: 'test-property-id',
    interaction_type: 'like',
    created_at: '2024-01-15T12:00:00Z',
    user_display_name: 'Test User',
    property_address: '123 Test St',
    property_price: 500000,
    property_bedrooms: 3,
    property_bathrooms: 2,
    property_images: ['https://example.com/image1.jpg'],
    is_mutual: false,
    ...overrides,
  } satisfies HouseholdActivity
}

export function createMockCouplesStats(
  overrides: Partial<CouplesStats> = {}
): CouplesStats {
  return {
    total_mutual_likes: 5,
    total_household_likes: 25,
    activity_streak_days: 3,
    last_mutual_like_at: '2024-01-15T12:00:00Z',
    ...overrides,
  } satisfies CouplesStats
}

// ============================================================================
// API Request/Response Factories
// ============================================================================

export interface MockNextRequest {
  nextUrl: {
    searchParams: URLSearchParams
  }
  headers: {
    get: (key: string) => string | null
  }
  json: () => Promise<unknown>
}

export function createMockNextRequest(options: {
  searchParams?: Record<string, string>
  headers?: Record<string, string>
  body?: unknown
}): MockNextRequest {
  return {
    nextUrl: {
      searchParams: new URLSearchParams(options.searchParams || {}),
    },
    headers: {
      get: (key: string) => options.headers?.[key] || null,
    },
    json: async () => options.body || {},
  }
}

// ============================================================================
// Interaction Factories
// ============================================================================

export interface MockInteraction {
  id: string
  user_id: string
  property_id: string
  household_id: string | null
  interaction_type: 'like' | 'dislike' | 'skip' | 'view'
  score_data: Record<string, unknown> | null
  created_at: string
}

export function createMockInteraction(
  overrides: Partial<MockInteraction> = {}
): MockInteraction {
  return {
    id: 'interaction-id',
    user_id: 'test-user-id',
    property_id: 'test-property-id',
    household_id: null,
    interaction_type: 'like',
    score_data: null,
    created_at: '2024-01-15T12:00:00Z',
    ...overrides,
  }
}

// ============================================================================
// User Profile Factories
// ============================================================================

export interface MockUserProfile {
  id: string
  household_id: string | null
  display_name: string | null
  email: string
  onboarding_completed: boolean
  preferences: Record<string, unknown> | null
  created_at: string
  updated_at: string
}

export function createMockUserProfile(
  overrides: Partial<MockUserProfile> = {}
): MockUserProfile {
  return {
    id: 'test-user-id',
    household_id: null,
    display_name: 'Test User',
    email: 'test@example.com',
    onboarding_completed: true,
    preferences: null,
    created_at: '2024-01-01T00:00:00Z',
    updated_at: '2024-01-01T00:00:00Z',
    ...overrides,
  }
}

// ============================================================================
// Household Factories
// ============================================================================

export interface MockHousehold {
  id: string
  name: string
  collaboration_mode: 'independent' | 'shared' | 'weighted'
  created_at: string
  updated_at: string
}

export function createMockHousehold(
  overrides: Partial<MockHousehold> = {}
): MockHousehold {
  return {
    id: 'household-id',
    name: 'Test Household',
    collaboration_mode: 'shared',
    created_at: '2024-01-01T00:00:00Z',
    updated_at: '2024-01-01T00:00:00Z',
    ...overrides,
  }
}

// ============================================================================
// Type Exports
// ============================================================================

export type {
  MockQueryBuilder,
  MockAuthClient,
  MockSupabaseClient,
  MockQueryResponse,
}
