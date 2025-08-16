import { faker } from '@faker-js/faker'
import type { Database } from '@/types/database'
import type {
  Property as SchemaProperty,
  Neighborhood as SchemaNeighborhood,
} from '@/lib/schemas/property'

// Database types for backend/API tests
type DatabaseProperty = Database['public']['Tables']['properties']['Row']

// Schema types for frontend components (default export)
type Property = SchemaProperty
type Neighborhood = SchemaNeighborhood
import type {
  UserPropertyInteraction,
  UserProfile,
  Household,
  SavedSearch,
} from '@/lib/schemas/user'
import type { User } from '@supabase/supabase-js'

// Type-safe mock factories leveraging existing patterns
export const createMockProperty = (
  overrides?: Partial<Property>
): Property => ({
  id: faker.string.uuid(),
  zpid: faker.string.numeric(10),
  address: faker.location.streetAddress(),
  city: faker.location.city(),
  state: faker.location.state({ abbreviated: true }),
  zip_code: faker.location.zipCode(),
  price: faker.number.int({ min: 100000, max: 5000000 }),
  bedrooms: faker.number.int({ min: 1, max: 6 }),
  bathrooms: faker.number.float({ min: 1, max: 5, fractionDigits: 1 }),
  square_feet: faker.number.int({ min: 500, max: 10000 }),
  lot_size_sqft: faker.number.int({ min: 1000, max: 50000 }),
  year_built: faker.number.int({ min: 1900, max: 2024 }),
  property_type: faker.helpers.arrayElement([
    'single_family',
    'condo',
    'townhome',
    'multi_family',
  ]),
  listing_status: faker.helpers.arrayElement(['active', 'pending', 'sold']),
  is_active: true,
  created_at: faker.date.past().toISOString(),
  updated_at: faker.date.recent().toISOString(),
  neighborhood_id: faker.string.uuid(),
  images: [faker.image.url()],
  description: faker.lorem.paragraph(),
  // Default to a GeoJSON Point to align with database schema; override as needed
  coordinates: {
    type: 'Point',
    coordinates: [faker.location.longitude(), faker.location.latitude()],
  } as unknown,
  amenities: [faker.word.adjective(), faker.word.adjective()],
  parking_spots: faker.number.int({ min: 0, max: 10 }),
  property_hash: faker.string.alphanumeric(32),
  ...overrides,
})

// Database property factory for backend/API tests
export const createMockDatabaseProperty = (
  overrides?: Partial<DatabaseProperty>
): DatabaseProperty => ({
  id: faker.string.uuid(),
  zpid: faker.string.numeric(10),
  address: faker.location.streetAddress(),
  city: faker.location.city(),
  state: faker.location.state({ abbreviated: true }),
  zip_code: faker.location.zipCode(),
  price: faker.number.int({ min: 100000, max: 5000000 }),
  bedrooms: faker.number.int({ min: 1, max: 6 }),
  bathrooms: faker.number.float({ min: 1, max: 5, fractionDigits: 1 }),
  square_feet: faker.number.int({ min: 500, max: 10000 }),
  lot_size_sqft: faker.number.int({ min: 1000, max: 50000 }),
  year_built: faker.number.int({ min: 1900, max: 2024 }),
  property_type: faker.helpers.arrayElement([
    'single_family',
    'condo',
    'townhome',
    'multi_family',
  ]),
  listing_status: faker.helpers.arrayElement(['active', 'pending', 'sold']),
  is_active: true,
  created_at: faker.date.past().toISOString(),
  updated_at: faker.date.recent().toISOString(),
  neighborhood_id: faker.string.uuid(),
  images: [faker.image.url()],
  description: faker.lorem.paragraph(),
  // Database expects unknown type for coordinates
  coordinates: {
    type: 'Point',
    coordinates: [faker.location.longitude(), faker.location.latitude()],
  } as unknown,
  amenities: [faker.word.adjective(), faker.word.adjective()],
  parking_spots: faker.number.int({ min: 0, max: 10 }),
  property_hash: faker.string.alphanumeric(32),
  ...overrides,
})

// Additional helpers aligned with UI layer expectations

export const makeInteractionSummary = (
  overrides?: Partial<{ viewed: number; liked: number; passed: number }>
) => ({
  viewed: 0,
  liked: 0,
  passed: 0,
  ...overrides,
})

export const makePagedInteractions = <T = unknown>(
  items: T[],
  nextCursor: string | null = null
): { items: T[]; nextCursor: string | null } => ({
  items,
  nextCursor,
})

export const createMockNeighborhood = (
  overrides?: Partial<Neighborhood>
): Neighborhood => ({
  id: faker.string.uuid(),
  name: faker.location.county(),
  city: faker.location.city(),
  state: faker.location.state({ abbreviated: true }),
  metro_area: faker.location.city(),
  created_at: faker.date.past().toISOString(),
  bounds: null,
  median_price: faker.number.int({ min: 200000, max: 2000000 }),
  walk_score: faker.number.int({ min: 0, max: 100 }),
  transit_score: faker.number.int({ min: 0, max: 100 }),
  ...overrides,
})

export const createMockPropertyWithNeighborhood = (
  overrides?: Partial<Property & { neighborhood?: Neighborhood | null }>
): Property & { neighborhood?: Neighborhood | null } => ({
  ...createMockProperty(),
  neighborhood: createMockNeighborhood(),
  ...overrides,
})

export const createMockUser = (overrides?: Partial<User>): User => ({
  id: faker.string.uuid(),
  email: faker.internet.email(),
  user_metadata: {
    full_name: faker.person.fullName(),
  },
  created_at: faker.date.past().toISOString(),
  app_metadata: {},
  aud: 'authenticated',
  confirmation_sent_at: faker.date.past().toISOString(),
  email_confirmed_at: faker.date.past().toISOString(),
  phone: faker.phone.number(),
  role: 'authenticated',
  updated_at: faker.date.recent().toISOString(),
  identities: [],
  is_anonymous: false,
  ...overrides,
})

export const createMockInteraction = (
  overrides?: Partial<UserPropertyInteraction>
): UserPropertyInteraction => ({
  id: faker.string.uuid(),
  user_id: faker.string.uuid(),
  property_id: faker.string.uuid(),
  interaction_type: faker.helpers.arrayElement(['view', 'like', 'skip']),
  created_at: faker.date.past().toISOString(),
  household_id: faker.string.uuid(),
  score_data: null,
  ...overrides,
})

export const createMockUserProfile = (
  overrides?: Partial<UserProfile>
): UserProfile => ({
  id: faker.string.uuid(),
  household_id: faker.string.uuid(),
  onboarding_completed: faker.datatype.boolean(),
  preferences: null,
  created_at: faker.date.past().toISOString(),
  updated_at: faker.date.recent().toISOString(),
  ...overrides,
})

export const createMockHousehold = (
  overrides?: Partial<Household>
): Household => ({
  id: faker.string.uuid(),
  name: faker.company.name(),
  collaboration_mode: faker.helpers.arrayElement([
    'independent',
    'shared',
    'weighted',
  ]),
  created_at: faker.date.past().toISOString(),
  updated_at: faker.date.recent().toISOString(),
  ...overrides,
})

export const createMockSavedSearch = (
  overrides?: Partial<SavedSearch>
): SavedSearch => ({
  id: faker.string.uuid(),
  user_id: faker.string.uuid(),
  household_id: faker.string.uuid(),
  name: faker.lorem.words(3),
  filters: {
    price_min: faker.number.int({ min: 100000, max: 500000 }),
    price_max: faker.number.int({ min: 500000, max: 2000000 }),
    bedrooms_min: 1,
    bedrooms_max: 5,
    bathrooms_min: 1,
    bathrooms_max: 3,
  },
  is_active: faker.datatype.boolean(),
  created_at: faker.date.past().toISOString(),
  ...overrides,
})
