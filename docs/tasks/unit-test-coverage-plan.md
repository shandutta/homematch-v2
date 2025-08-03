# Production-Grade Unit Test Coverage Plan
## Enhanced TDD Strategy: 6.7% → 50-60% Coverage

### Executive Summary
This enhanced plan addresses critical gaps in the original plan by leveraging existing infrastructure, implementing type-safe testing, and following TDD best practices. It incorporates the project's established patterns, mock factories, and testing utilities.

---

## Phase 0: Infrastructure Enhancement (Foundation)

### 0.1 Enhanced Mock Factory Architecture
**Location:** `__tests__/factories/test-data-factory.ts`

```typescript
import { faker } from '@faker-js/faker';
import type { 
  Property, 
  PropertyWithNeighborhood, 
  User, 
  UserProfile, 
  Interaction 
} from '@/types/database';

// Type-safe mock factories leveraging existing patterns
export const createMockProperty = (overrides?: Partial<Property>): Property => ({
  id: faker.string.uuid(),
  zpid: faker.string.numeric(10),
  address: faker.location.streetAddress(),
  city: faker.location.city(),
  state: faker.location.state(),
  zip_code: faker.location.zipCode(),
  price: faker.number.int({ min: 100000, max: 5000000 }),
  bedrooms: faker.number.int({ min: 1, max: 6 }),
  bathrooms: faker.number.float({ min: 1, max: 5, precision: 0.1 }),
  square_feet: faker.number.int({ min: 500, max: 10000 }),
  lot_size_sqft: faker.number.int({ min: 1000, max: 50000 }),
  year_built: faker.number.int({ min: 1900, max: 2024 }),
  property_type: faker.helpers.arrayElement(['single_family', 'condo', 'townhouse']),
  listing_status: faker.helpers.arrayElement(['active', 'pending', 'sold']),
  is_active: true,
  created_at: faker.date.past().toISOString(),
  updated_at: faker.date.recent().toISOString(),
  neighborhood_id: faker.string.uuid(),
  ...overrides
});

export const createMockPropertyWithNeighborhood = (overrides?: Partial<PropertyWithNeighborhood>): PropertyWithNeighborhood => ({
  ...createMockProperty(),
  neighborhood: {
    id: faker.string.uuid(),
    name: faker.location.county(),
    city: faker.location.city(),
    state: faker.location.state(),
    metro_area: faker.location.city(),
    created_at: faker.date.past().toISOString()
  },
  ...overrides
});

export const createMockUser = (overrides?: Partial<User>): User => ({
  id: faker.string.uuid(),
  email: faker.internet.email(),
  user_metadata: {
    full_name: faker.person.fullName()
  },
  created_at: faker.date.past().toISOString(),
  ...overrides
});

export const createMockInteraction = (overrides?: Partial<Interaction>): Interaction => ({
  id: faker.string.uuid(),
  user_id: faker.string.uuid(),
  property_id: faker.string.uuid(),
  interaction_type: faker.helpers.arrayElement(['viewed', 'liked', 'passed']),
  created_at: faker.date.past().toISOString(),
  ...overrides
});
```

### 0.2 Type-Safe Test Utilities
**Location:** `__tests__/utils/test-helpers.ts`

```typescript
import { jest } from '@jest/globals';
import type { SupabaseClient } from '@supabase/supabase-js';
import type { Database } from '@/types/database';

// Enhanced mock client with full type safety
export const createMockSupabaseClient = (): jest.Mocked<SupabaseClient<Database>> => {
  return {
    from: jest.fn().mockReturnValue({
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
      like: jest.fn().mockReturnThis(),
      ilike: jest.fn().mockReturnThis(),
      is: jest.fn().mockReturnThis(),
      in: jest.fn().mockReturnThis(),
      contains: jest.fn().mockReturnThis(),
      containedBy: jest.fn().mockReturnThis(),
      range: jest.fn().mockReturnThis(),
      order: jest.fn().mockReturnThis(),
      single: jest.fn().mockResolvedValue({ data: null, error: null })
    }),
    rpc: jest.fn().mockReturnThis(),
    auth: {
      signInWithPassword: jest.fn(),
      signOut: jest.fn(),
      getUser: jest.fn()
    }
  };
};

// Type-safe test renderer for components
export const renderWithProviders = (
  ui: React.ReactElement,
  options?: {
    initialAuthState?: Partial<AuthState>;
    initialRouterState?: Partial<NextRouter>;
  }
) => {
  const Wrapper = ({ children }: { children: React.ReactNode }) => (
    <AuthProvider initialAuthState={options?.initialAuthState}>
      <RouterContext.Provider value={{
        push: jest.fn(),
        replace: jest.fn(),
        ...options?.initialRouterState
      } as any}>
        {children}
      </RouterContext.Provider>
    </AuthProvider>
  );

  return render(ui, { wrapper: Wrapper });
};
      order: jest.fn().mockReturnThis(),
      single: jest.fn().mockResolvedValue({ data: null, error: null })
    }),
    rpc: jest.fn().mockReturnThis(),
    auth: {
      signInWithPassword: jest.fn(),
      signOut: jest.fn(),
      getUser: jest.fn()
    }
  };
};

// Type-safe test renderer for components
export const renderWithProviders = (
  ui: React.ReactElement,
  options?: {
    initialAuthState?: Partial<AuthState>;
    initialRouterState?: Partial<NextRouter>;
  }
) => {
  const Wrapper = ({ children }: { children: React.ReactNode }) => (
    <AuthProvider initialAuthState={options?.initialAuthState}>
      <RouterContext.Provider value={{
        push: jest.fn(),
        replace: jest.fn(),
        ...options?.initialRouterState
      } as any}>
        {children}
      </RouterContext.Provider>
    </AuthProvider>
  );

  return render(ui, { wrapper: Wrapper });
};
```

### 0.3 Test Configuration
**Location:** `jest.setup.js`

```javascript
import '@testing-library/jest-dom';
import { TextEncoder, TextDecoder } from 'util';

// Polyfills for Jest
global.TextEncoder = TextEncoder;
global.TextDecoder = TextDecoder;

// Mock Next.js router
jest.mock('next/router', () => ({
  useRouter: () => ({
    push: jest.fn(),
    replace: jest.fn(),
    pathname: '/',
    route: '/',
    query: {},
    asPath: '/',
  })
}));

// Mock Supabase client
jest.mock('@/lib/supabase/client', () => ({
  createClient: jest.fn(() => require('@/__tests__/utils/test-helpers').createMockSupabaseClient())
}));
```

---

## Phase 1: Core Component Testing (TDD Approach)

### 1.1 Header Component - Behavior-Driven Tests
**File:** `__tests__/unit/components/layouts/Header.test.tsx`

```typescript
