# HomeMatch V2 - Step-by-Step Implementation Guide

## Overview

This guide provides detailed, actionable steps to build HomeMatch V2 from scratch using modern technologies. Follow these steps in order to create a production-ready property browsing application.

**Timeline**: 4 weeks  
**Tech Stack**: Next.js 15, Supabase, shadcn/ui, TanStack Query, Zustand, Inngest, Sentry, PostHog, Vercel AI SDK

---

## Week 1: Foundation Setup

### Day 1: Project Initialization

#### 1.1 Create Next.js Project

```bash
# Create new project with TypeScript and Tailwind
pnpm dlx create-next-app@latest homematch-v2 --typescript --tailwind --app --src-dir --import-alias "@/*"

cd homematch-v2

# Install core dependencies
pnpm install @supabase/supabase-js @supabase/ssr
pnpm install @tanstack/react-query @tanstack/react-query-devtools
pnpm install zustand
pnpm install zod react-hook-form @hookform/resolvers
pnpm install react-hook-form
pnpm install lucide-react class-variance-authority clsx tailwind-merge

# Background jobs and workflows
pnpm install inngest

# AI integration
pnpm install ai @ai-sdk/openai

# Monitoring and analytics
pnpm install @sentry/nextjs posthog-js posthog-node

# Development dependencies
pnpm install -D @types/node @types/react @types/react-dom
pnpm install -D vitest @vitest/ui jsdom @testing-library/react @testing-library/jest-dom
pnpm install -D jest jest-environment-jsdom
pnpm install -D @playwright/test
pnpm install -D eslint-config-next eslint-plugin-react-hooks eslint-plugin-react-refresh
pnpm install -D prettier prettier-plugin-tailwindcss
pnpm install -D simple-git-hooks lint-staged @commitlint/cli @commitlint/config-conventional
```

#### 1.2 Configure shadcn/ui

```bash
# Initialize shadcn/ui
pnpm dlx shadcn@latest init

# Install essential components
pnpm dlx shadcn@latest add button card input label form dialog sheet
pnpm dlx shadcn@latest add dropdown-menu avatar badge sonner tabs
pnpm dlx shadcn@latest add select checkbox switch slider progress
pnpm dlx shadcn@latest add alert alert-dialog

# Initialize testing frameworks
pnpm dlx playwright install
pnpm dlx playwright install-deps

# Initialize git hooks with simple-git-hooks (better Windows Git Bash compatibility)
pnpm add --save-dev simple-git-hooks
# Configure hooks in package.json, then initialize
npx simple-git-hooks
```

#### 1.3 Development Tooling Setup

```javascript
// .eslintrc.json
{
  "extends": [
    "next/core-web-vitals",
    "@typescript-eslint/recommended",
    "prettier"
  ],
  "parser": "@typescript-eslint/parser",
  "plugins": ["@typescript-eslint"],
  "rules": {
    "@typescript-eslint/no-unused-vars": "error",
    "@typescript-eslint/no-explicit-any": "warn",
    "prefer-const": "error",
    "no-var": "error"
  },
  "ignorePatterns": ["*.js", "*.jsx"]
}
```

```json
// .prettierrc.json
{
  "semi": false,
  "trailingComma": "es5",
  "singleQuote": true,
  "tabWidth": 2,
  "useTabs": false,
  "plugins": ["prettier-plugin-tailwindcss"]
}
```

```javascript
// commitlint.config.js
module.exports = {
  extends: ['@commitlint/config-conventional'],
  rules: {
    'type-enum': [
      2,
      'always',
      ['feat', 'fix', 'docs', 'style', 'refactor', 'test', 'chore'],
    ],
  },
}
```

```json
// package.json - lint-staged configuration
{
  "simple-git-hooks": {
    "pre-commit": "npx lint-staged",
    "commit-msg": "npx commitlint --edit $1"
  },
  "lint-staged": {
    "*.{js,jsx,ts,tsx}": ["eslint --fix", "prettier --write"],
    "*.{json,md,yml}": ["prettier --write"]
  }
}
```

#### 1.4 Project Structure Setup

```bash
# Create comprehensive directory structure
mkdir -p src/components/features/{auth,properties,dashboard,onboarding}
mkdir -p src/components/layouts
mkdir -p src/components/providers
mkdir -p src/lib/{supabase,services,stores,schemas,utils,ai,api,analytics,inngest}
mkdir -p src/hooks
mkdir -p src/types
mkdir -p __tests__/{unit,integration,e2e}
mkdir -p tests/{fixtures,helpers,mocks}
mkdir -p inngest

# Create initial files
touch src/lib/supabase/{client.ts,server.ts}
touch src/lib/stores/{app-store.ts,auth-store.ts}
touch src/lib/services/{properties.ts,users.ts,interactions.ts}
touch src/types/{database.ts,app.ts}
touch src/lib/schemas/{property.ts,user.ts,interaction.ts,auth.ts,household.ts}
touch src/lib/api/validation.ts
touch src/hooks/useValidatedForm.ts

# Monitoring and AI files
touch src/lib/analytics/{posthog.ts,sentry.ts}
touch src/lib/ai/{property-matching.ts,descriptions.ts}
touch src/lib/inngest/{client.ts,functions.ts}

# Testing configuration files
touch vitest.config.ts jest.config.js playwright.config.ts
touch .eslintrc.json .prettierrc.json
touch commitlint.config.js
```

### Day 2: Supabase Setup

#### 2.1 Create Supabase Project

1. Go to [supabase.com](https://supabase.com) and create new project
2. Note down Project URL and API keys
3. Create `.env.local` file:

```env
# Supabase
NEXT_PUBLIC_SUPABASE_URL=https://[project-ref].supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-anon-key
SUPABASE_SERVICE_ROLE_KEY=your-service-role-key

# App
NEXTAUTH_URL=http://localhost:3000
NEXTAUTH_SECRET=your-secret-key
```

#### 2.2 Database Schema Migration

Create and run the following SQL in Supabase SQL Editor:

```sql
-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- User profiles (extends auth.users)
CREATE TABLE user_profiles (
  id UUID REFERENCES auth.users(id) PRIMARY KEY,
  onboarding_completed BOOLEAN DEFAULT FALSE,
  preferences JSONB DEFAULT '{}',
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Neighborhoods
CREATE TABLE neighborhoods (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name TEXT NOT NULL,
  city TEXT NOT NULL,
  state TEXT NOT NULL,
  bounds POLYGON,
  median_price INTEGER,
  walk_score INTEGER,
  transit_score INTEGER,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Properties
CREATE TABLE properties (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  address TEXT NOT NULL,
  city TEXT NOT NULL,
  state TEXT NOT NULL,
  zip_code TEXT NOT NULL,
  price INTEGER NOT NULL,
  bedrooms INTEGER NOT NULL,
  bathrooms DECIMAL(2,1) NOT NULL,
  square_feet INTEGER,
  property_type TEXT CHECK (property_type IN ('house', 'condo', 'townhouse', 'apartment')),
  images TEXT[] DEFAULT '{}',
  description TEXT,
  coordinates POINT,
  neighborhood_id UUID REFERENCES neighborhoods(id),
  amenities TEXT[] DEFAULT '{}',
  year_built INTEGER,
  lot_size_sqft INTEGER,
  parking_spots INTEGER DEFAULT 0,
  is_active BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- User property interactions
CREATE TABLE user_property_interactions (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID REFERENCES auth.users(id) NOT NULL,
  property_id UUID REFERENCES properties(id) NOT NULL,
  interaction_type TEXT CHECK (interaction_type IN ('like', 'dislike', 'skip', 'view')) NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(user_id, property_id, interaction_type)
);

-- Saved searches
CREATE TABLE saved_searches (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID REFERENCES auth.users(id) NOT NULL,
  name TEXT NOT NULL,
  filters JSONB NOT NULL,
  is_active BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Indexes for performance
CREATE INDEX idx_properties_price ON properties(price);
CREATE INDEX idx_properties_bedrooms ON properties(bedrooms);
CREATE INDEX idx_properties_city ON properties(city);
CREATE INDEX idx_properties_type ON properties(property_type);
CREATE INDEX idx_properties_active ON properties(is_active);
CREATE INDEX idx_interactions_user_id ON user_property_interactions(user_id);
CREATE INDEX idx_interactions_property_id ON user_property_interactions(property_id);

-- Row Level Security policies
ALTER TABLE user_profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_property_interactions ENABLE ROW LEVEL SECURITY;
ALTER TABLE saved_searches ENABLE ROW LEVEL SECURITY;

-- Users can only access their own data
CREATE POLICY "users_own_profile" ON user_profiles
  FOR ALL USING (auth.uid() = id);

CREATE POLICY "users_own_interactions" ON user_property_interactions
  FOR ALL USING (auth.uid() = user_id);

CREATE POLICY "users_own_searches" ON saved_searches
  FOR ALL USING (auth.uid() = user_id);

-- Properties are public read
CREATE POLICY "properties_public_read" ON properties
  FOR SELECT USING (TRUE);

CREATE POLICY "neighborhoods_public_read" ON neighborhoods
  FOR SELECT USING (TRUE);

-- Household policies
ALTER TABLE households ENABLE ROW LEVEL SECURITY;
CREATE POLICY "users_household_access" ON households
  FOR SELECT USING (
    id IN (
      SELECT household_id FROM user_profiles WHERE id = auth.uid()
    )
  );
```

#### 2.3 Configure Supabase Auth

1. In Supabase Dashboard → Authentication → Settings:
   - Set Site URL: `http://localhost:3000`
   - Add redirect URLs: `http://localhost:3000/auth/callback`
2. Enable Google OAuth (get credentials from Google Cloud Console)

### Day 3: Core Infrastructure

#### 3.1 Supabase Client Setup

```typescript
// src/lib/supabase/client.ts
import { createBrowserClient } from '@supabase/ssr'
import { Database } from '@/types/database'

export function createClient() {
  return createBrowserClient<Database>(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  )
}
```

```typescript
// src/lib/supabase/server.ts
import { createServerClient } from '@supabase/ssr'
import { cookies } from 'next/headers'
import { Database } from '@/types/database'

export async function createClient() {
  const cookieStore = await cookies()

  return createServerClient<Database>(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return cookieStore.getAll()
        },
        setAll(cookiesToSet) {
          try {
            cookiesToSet.forEach(({ name, value, options }) =>
              cookieStore.set(name, value, options)
            )
          } catch {
            // Server Component - handled by middleware
          }
        },
      },
    }
  )
}
```

#### 3.2 Generate TypeScript Types

```bash
# Generate types from Supabase schema
npx supabase gen types typescript --project-id your-project-ref > src/types/database.ts
```

#### 3.3 Zod Schemas & Type-Safe Validation

```typescript
// src/lib/schemas/property.ts
import { z } from 'zod'

export const PropertySchema = z.object({
  id: z.string().uuid(),
  address: z.string().min(1, 'Address is required'),
  city: z.string().min(1, 'City is required'),
  state: z.string().min(2).max(2, 'State must be 2 characters'),
  zip_code: z.string().regex(/^\d{5}(-\d{4})?$/, 'Invalid ZIP code'),
  price: z.number().int().positive('Price must be positive'),
  bedrooms: z.number().int().min(0).max(20),
  bathrooms: z.number().min(0).max(20),
  square_feet: z.number().int().positive().optional(),
  property_type: z.enum(['house', 'condo', 'townhouse', 'apartment']),
  images: z.array(z.string().url()).default([]),
  description: z.string().max(5000).optional(),
  amenities: z.array(z.string()).default([]),
  year_built: z
    .number()
    .int()
    .min(1800)
    .max(new Date().getFullYear())
    .optional(),
  parking_spots: z.number().int().min(0).default(0),
  is_active: z.boolean().default(true),
  created_at: z.string().datetime(),
})

export const PropertyFiltersSchema = z
  .object({
    priceMin: z.number().int().positive().optional(),
    priceMax: z.number().int().positive().optional(),
    bedrooms: z.number().int().min(0).max(20).optional(),
    bathrooms: z.number().min(0).max(20).optional(),
    propertyType: z
      .enum(['house', 'condo', 'townhouse', 'apartment'])
      .optional(),
    city: z.string().min(1).optional(),
    neighborhoods: z.array(z.string().uuid()).optional(),
  })
  .refine(
    (data) => {
      if (data.priceMin && data.priceMax) {
        return data.priceMin <= data.priceMax
      }
      return true
    },
    {
      message: 'Minimum price must be less than maximum price',
      path: ['priceMax'],
    }
  )

// Type inference from schemas
export type Property = z.infer<typeof PropertySchema>
export type PropertyFilters = z.infer<typeof PropertyFiltersSchema>
```

```typescript
// src/lib/schemas/user.ts
import { z } from 'zod'

export const UserPreferencesSchema = z.object({
  priceRange: z
    .object({
      min: z.number().int().positive(),
      max: z.number().int().positive(),
    })
    .refine((data) => data.min <= data.max, {
      message: 'Min price must be less than max price',
    }),
  preferredPropertyTypes: z
    .array(z.enum(['house', 'condo', 'townhouse', 'apartment']))
    .min(1),
  minBedrooms: z.number().int().min(0).max(20),
  minBathrooms: z.number().min(0).max(20),
  amenities: z.array(z.string()).default([]),
  neighborhoods: z.array(z.string().uuid()).default([]),
})

export const UserProfileSchema = z.object({
  id: z.string().uuid(),
  onboarding_completed: z.boolean().default(false),
  preferences: UserPreferencesSchema.optional(),
  created_at: z.string().datetime(),
})

export type UserPreferences = z.infer<typeof UserPreferencesSchema>
export type UserProfile = z.infer<typeof UserProfileSchema>
```

```typescript
// src/lib/schemas/interaction.ts
import { z } from 'zod'

export const InteractionSchema = z.object({
  propertyId: z.string().uuid('Invalid property ID'),
  type: z.enum(['like', 'dislike', 'skip', 'view']),
  metadata: z.record(z.unknown()).optional(),
})

export type Interaction = z.infer<typeof InteractionSchema>
export type InteractionType = Interaction['type']
```

```typescript
// src/lib/schemas/household.ts
import { z } from 'zod'

export const HouseholdSchema = z.object({
  id: z.string().uuid(),
  name: z.string().min(1, 'Household name is required'),
  collaboration_mode: z
    .enum(['independent', 'shared', 'weighted'])
    .default('independent'),
  created_at: z.string().datetime(),
  updated_at: z.string().datetime(),
})

export const CreateHouseholdSchema = z.object({
  name: z.string().min(1, 'Household name is required'),
  collaboration_mode: z
    .enum(['independent', 'shared', 'weighted'])
    .default('independent'),
})

export type Household = z.infer<typeof HouseholdSchema>
export type CreateHousehold = z.infer<typeof CreateHouseholdSchema>
```

```typescript
// src/lib/schemas/auth.ts
import { z } from 'zod'

export const LoginSchema = z.object({
  email: z.string().email('Invalid email address'),
  password: z.string().min(6, 'Password must be at least 6 characters'),
})

export const SignupSchema = z
  .object({
    email: z.string().email('Invalid email address'),
    password: z
      .string()
      .min(8, 'Password must be at least 8 characters')
      .regex(
        /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)/,
        'Password must contain uppercase, lowercase, and number'
      ),
    confirmPassword: z.string(),
  })
  .refine((data) => data.password === data.confirmPassword, {
    message: 'Passwords do not match',
    path: ['confirmPassword'],
  })

export type LoginData = z.infer<typeof LoginSchema>
export type SignupData = z.infer<typeof SignupSchema>
```

### Day 4: Testing Configuration Setup

#### 4.1 Jest Configuration (Unit Tests)

```javascript
// jest.config.js
const nextJest = require('next/jest')

const createJestConfig = nextJest({
  dir: './',
})

const customJestConfig = {
  displayName: 'unit',
  setupFilesAfterEnv: ['<rootDir>/tests/jest.setup.js'],
  moduleNameMapping: {
    '^@/(.*)$': '<rootDir>/src/$1',
  },
  testEnvironment: 'jsdom', // For React component testing
  testMatch: ['**/__tests__/unit/**/*.test.{js,jsx,ts,tsx}'],
  collectCoverageFrom: [
    'src/**/*.{js,jsx,ts,tsx}',
    '!src/**/*.d.ts',
    '!src/app/api/**/*', // Integration tests handle API routes
  ],
}

module.exports = createJestConfig(customJestConfig)
```

```javascript
// tests/jest.setup.js
import '@testing-library/jest-dom'

// Mock Next.js router
jest.mock('next/navigation', () => ({
  useRouter: () => ({
    push: jest.fn(),
    replace: jest.fn(),
    prefetch: jest.fn(),
  }),
  useSearchParams: () => new URLSearchParams(),
  usePathname: () => '/',
}))

// Mock Supabase client for component tests
jest.mock('@/lib/supabase/client', () => ({
  createClient: () => ({
    auth: {
      signUp: jest.fn(),
      signInWithPassword: jest.fn(),
      signInWithOAuth: jest.fn(),
      signOut: jest.fn(),
      getUser: jest.fn(),
    },
    from: jest.fn(() => ({
      select: jest.fn(() => ({
        eq: jest.fn(() => ({
          single: jest.fn(),
        })),
      })),
    })),
  }),
}))

// Mock PostHog for component tests
jest.mock('@/lib/analytics/posthog', () => ({
  trackPropertyInteraction: jest.fn(),
  trackUserJourney: jest.fn(),
}))
```

#### 4.2 Vitest Configuration (Integration Tests)

```typescript
// vitest.config.ts
import { defineConfig } from 'vitest/config'
import path from 'path'

export default defineConfig({
  test: {
    environment: 'node', // For API and service testing
    setupFiles: ['./tests/vitest.setup.ts'],
    globals: true,
    include: ['**/__tests__/integration/**/*.test.{js,ts}'],
  },
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
    },
  },
})
```

```typescript
// tests/vitest.setup.ts
import { beforeAll, vi } from 'vitest'

// Set up test environment variables
beforeAll(() => {
  process.env.NEXT_PUBLIC_SUPABASE_URL = 'http://localhost:54321'
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY = 'test-anon-key'
  process.env.SUPABASE_SERVICE_ROLE_KEY = 'test-service-role-key'
})

// Mock external services for integration tests
vi.mock('@/lib/ai/property-descriptions', () => ({
  generatePropertyDescription: vi.fn().mockResolvedValue('Mock AI description'),
}))

vi.mock('@/lib/inngest/client', () => ({
  inngest: {
    send: vi.fn().mockResolvedValue({ ids: ['test-event-id'] }),
  },
}))
```

#### 4.3 Playwright Configuration

```typescript
// playwright.config.ts
import { defineConfig, devices } from '@playwright/test'

export default defineConfig({
  testDir: './__tests__/e2e',
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 2 : 0,
  workers: process.env.CI ? 1 : undefined,
  reporter: 'html',
  use: {
    baseURL: 'http://localhost:3000',
    trace: 'on-first-retry',
    screenshot: 'only-on-failure',
  },
  projects: [
    {
      name: 'chromium',
      use: { ...devices['Desktop Chrome'] },
    },
    {
      name: 'firefox',
      use: { ...devices['Desktop Firefox'] },
    },
    {
      name: 'webkit',
      use: { ...devices['Desktop Safari'] },
    },
    {
      name: 'Mobile Chrome',
      use: { ...devices['Pixel 5'] },
    },
  ],
  webServer: {
    command: 'pnpm dev',
    url: 'http://localhost:3000',
    reuseExistingServer: !process.env.CI,
  },
})
```

### Day 5: State Management & Monitoring Setup

#### 5.1 Monitoring Setup

```typescript
// sentry.client.config.ts
import * as Sentry from '@sentry/nextjs'

Sentry.init({
  dsn: process.env.NEXT_PUBLIC_SENTRY_DSN,

  // Performance monitoring
  tracesSampleRate: 1.0,

  // Session replay for debugging
  replaysSessionSampleRate: 0.1,
  replaysOnErrorSampleRate: 1.0,

  integrations: [
    new Sentry.BrowserTracing({
      tracePropagationTargets: ['localhost', /^https:\/\/yourapp\.vercel\.app/],
    }),
  ],

  beforeSend(event) {
    if (event.exception) {
      const error = event.exception.values?.[0]
      if (error?.value?.includes('Non-Error promise rejection')) {
        return null
      }
    }
    return event
  },
})
```

```typescript
// sentry.server.config.ts
import * as Sentry from '@sentry/nextjs'

Sentry.init({
  dsn: process.env.NEXT_PUBLIC_SENTRY_DSN,
  tracesSampleRate: 1.0,
  debug: false,
})
```

```typescript
// sentry.edge.config.ts
import * as Sentry from '@sentry/nextjs'

Sentry.init({
  dsn: process.env.NEXT_PUBLIC_SENTRY_DSN,
  tracesSampleRate: 1.0,
})
```

```typescript
// src/lib/analytics/posthog.ts
import { PostHog } from 'posthog-node'
import posthog from 'posthog-js'

// Server-side PostHog
export const serverPostHog = new PostHog(process.env.NEXT_PUBLIC_POSTHOG_KEY!, {
  host: process.env.NEXT_PUBLIC_POSTHOG_HOST || 'https://app.posthog.com',
})

// Client-side initialization
if (typeof window !== 'undefined') {
  posthog.init(process.env.NEXT_PUBLIC_POSTHOG_KEY!, {
    api_host: process.env.NEXT_PUBLIC_POSTHOG_HOST || 'https://app.posthog.com',
    loaded: (posthog) => {
      if (process.env.NODE_ENV === 'development') posthog.debug()
    },
  })
}

export { posthog }

// Custom tracking functions
export function trackPropertyInteraction(
  userId: string,
  propertyId: string,
  action: string
) {
  posthog.capture('property_interaction', {
    propertyId,
    action,
    timestamp: new Date().toISOString(),
  })
}

export function trackUserJourney(step: string, metadata?: Record<string, any>) {
  posthog.capture('user_journey', {
    step,
    ...metadata,
  })
}
```

#### 5.2 TanStack Query Provider

```typescript
// src/components/providers/query-provider.tsx
'use client'

import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { ReactQueryDevtools } from '@tanstack/react-query-devtools'
import { useState } from 'react'

export function QueryProvider({ children }: { children: React.ReactNode }) {
  const [queryClient] = useState(() => new QueryClient({
    defaultOptions: {
      queries: {
        staleTime: 5 * 60 * 1000, // 5 minutes
        cacheTime: 10 * 60 * 1000, // 10 minutes
        retry: 1,
        refetchOnWindowFocus: false,
      },
    },
  }))

  return (
    <QueryClientProvider client={queryClient}>
      {children}
      <ReactQueryDevtools initialIsOpen={false} />
    </QueryClientProvider>
  )
}
```

#### 4.2 Zustand Store

```typescript
// src/lib/stores/app-store.ts
import { create } from 'zustand'
import { devtools } from 'zustand/middleware'
import { PropertyFilters } from '@/types/app'

interface AppState {
  // UI State
  currentPropertyIndex: number
  isFilterModalOpen: boolean
  isPropertyDetailOpen: boolean
  selectedPropertyId: string | null

  // Temporary data
  tempSearchFilters: PropertyFilters
  swipeHistory: string[]

  // Actions
  actions: {
    nextProperty: () => void
    previousProperty: () => void
    openFilterModal: () => void
    closeFilterModal: () => void
    setTempFilters: (filters: PropertyFilters) => void
    clearTempFilters: () => void
    openPropertyDetail: (id: string) => void
    closePropertyDetail: () => void
    recordSwipe: (propertyId: string) => void
    resetSwipeHistory: () => void
  }
}

export const useAppStore = create<AppState>()(
  devtools(
    (set, get) => ({
      // Initial state
      currentPropertyIndex: 0,
      isFilterModalOpen: false,
      isPropertyDetailOpen: false,
      selectedPropertyId: null,
      tempSearchFilters: {},
      swipeHistory: [],

      // Actions
      actions: {
        nextProperty: () =>
          set((state) => ({
            currentPropertyIndex: state.currentPropertyIndex + 1,
          })),

        previousProperty: () =>
          set((state) => ({
            currentPropertyIndex: Math.max(0, state.currentPropertyIndex - 1),
          })),

        openFilterModal: () => set({ isFilterModalOpen: true }),
        closeFilterModal: () => set({ isFilterModalOpen: false }),

        setTempFilters: (filters) => set({ tempSearchFilters: filters }),
        clearTempFilters: () => set({ tempSearchFilters: {} }),

        openPropertyDetail: (id) =>
          set({
            isPropertyDetailOpen: true,
            selectedPropertyId: id,
          }),

        closePropertyDetail: () =>
          set({
            isPropertyDetailOpen: false,
            selectedPropertyId: null,
          }),

        recordSwipe: (propertyId) =>
          set((state) => ({
            swipeHistory: [...state.swipeHistory, propertyId],
            currentPropertyIndex: state.currentPropertyIndex + 1,
          })),

        resetSwipeHistory: () =>
          set({
            swipeHistory: [],
            currentPropertyIndex: 0,
          }),
      },
    }),
    { name: 'app-store' }
  )
)
```

### Day 6: Inngest Background Jobs Setup

#### 6.1 Inngest Configuration

```typescript
// src/lib/inngest/client.ts
import { Inngest } from 'inngest'

export const inngest = new Inngest({
  id: 'homematch',
  name: 'HomeMatch',
  eventKey: process.env.INNGEST_EVENT_KEY,
})
```

```typescript
// src/lib/inngest/functions.ts
import { inngest } from './client'
import { createClient } from '@/lib/supabase/server'
import { trackPropertyInteraction } from '@/lib/analytics/posthog'

// Property notification workflow
export const sendPropertyNotification = inngest.createFunction(
  { id: 'send-property-notification' },
  { event: 'property/new-match' },
  async ({ event, step }) => {
    const { userId, propertyId } = event.data

    const userPrefs = await step.run('get-user-preferences', async () => {
      const supabase = createClient()
      return supabase
        .from('user_profiles')
        .select('preferences')
        .eq('id', userId)
        .single()
    })

    const matchScore = await step.run('calculate-match-score', async () => {
      // AI-powered property matching
      return calculatePropertyMatch(propertyId, userPrefs.data.preferences)
    })

    if (matchScore > 0.8) {
      await step.run('send-notification', async () => {
        return sendPushNotification(userId, {
          title: 'New Property Match!',
          body: `We found a ${Math.round(matchScore * 100)}% match for you`,
          data: { propertyId },
        })
      })

      // Track in PostHog
      trackPropertyInteraction(userId, propertyId, 'notification_sent')
    }

    return { matchScore, notificationSent: matchScore > 0.8 }
  }
)

// Daily market data update
export const updateMarketData = inngest.createFunction(
  { id: 'update-market-data' },
  { cron: '0 6 * * *' }, // Daily at 6 AM
  async ({ step }) => {
    await step.run('update-price-trends', async () => {
      // Fetch external market data
      return updateNeighborhoodPrices()
    })

    await step.run('update-walk-scores', async () => {
      return updateWalkScores()
    })

    return { status: 'completed' }
  }
)
```

```typescript
// app/api/inngest/route.ts
import { serve } from 'inngest/next'
import { inngest } from '@/lib/inngest/client'
import {
  sendPropertyNotification,
  updateMarketData,
} from '@/lib/inngest/functions'

export const { GET, POST, PUT } = serve({
  client: inngest,
  functions: [sendPropertyNotification, updateMarketData],
})
```

### Day 7: API Validation Utilities

#### 5.1 Validation Helper Functions

```typescript
// src/lib/api/validation.ts
import { NextRequest, NextResponse } from 'next/server'
import { z, ZodError } from 'zod'

export function validateSearchParams<T extends z.ZodType>(
  request: NextRequest,
  schema: T
):
  | { success: true; data: z.infer<T> }
  | { success: false; error: NextResponse } {
  try {
    const searchParams = request.nextUrl.searchParams
    const params: Record<string, any> = {}

    // Convert URL search params to object with proper type coercion
    searchParams.forEach((value, key) => {
      if (params[key]) {
        params[key] = Array.isArray(params[key])
          ? [...params[key], value]
          : [params[key], value]
      } else {
        // Try to parse numbers and booleans
        if (value === 'true') params[key] = true
        else if (value === 'false') params[key] = false
        else if (/^\d+$/.test(value)) params[key] = parseInt(value, 10)
        else if (/^\d*\.\d+$/.test(value)) params[key] = parseFloat(value)
        else params[key] = value
      }
    })

    const data = schema.parse(params)
    return { success: true, data }
  } catch (error) {
    if (error instanceof ZodError) {
      return {
        success: false,
        error: NextResponse.json(
          {
            error: 'Validation failed',
            details: error.errors.map((err) => ({
              field: err.path.join('.'),
              message: err.message,
            })),
          },
          { status: 400 }
        ),
      }
    }
    return {
      success: false,
      error: NextResponse.json(
        { error: 'Invalid parameters' },
        { status: 400 }
      ),
    }
  }
}

export async function validateRequestBody<T extends z.ZodType>(
  request: NextRequest,
  schema: T
): Promise<
  { success: true; data: z.infer<T> } | { success: false; error: NextResponse }
> {
  try {
    const body = await request.json()
    const data = schema.parse(body)
    return { success: true, data }
  } catch (error) {
    if (error instanceof ZodError) {
      return {
        success: false,
        error: NextResponse.json(
          {
            error: 'Validation failed',
            details: error.errors.map((err) => ({
              field: err.path.join('.'),
              message: err.message,
            })),
          },
          { status: 400 }
        ),
      }
    }
    return {
      success: false,
      error: NextResponse.json(
        { error: 'Invalid request body' },
        { status: 400 }
      ),
    }
  }
}

export function createApiResponse<T>(data: T, status: number = 200) {
  return NextResponse.json(data, { status })
}
```

#### 5.2 Validated Form Hook

```typescript
// src/hooks/useValidatedForm.ts
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'

export function useValidatedForm<T extends z.ZodType>(
  schema: T,
  defaultValues?: Partial<z.infer<T>>
) {
  return useForm<z.infer<T>>({
    resolver: zodResolver(schema),
    defaultValues,
    mode: 'onChange',
  })
}
```

### Day 8-9: AI Integration Setup

#### 8.1 Vercel AI SDK Configuration

```typescript
// src/lib/ai/config.ts
import { openai } from '@ai-sdk/openai'

export const aiModel = openai('gpt-4-turbo')
export const embeddingModel = openai.embedding('text-embedding-3-small')
```

```typescript
// src/lib/ai/property-descriptions.ts
import { generateText } from 'ai'
import { aiModel } from './config'
import type { Property } from '@/lib/schemas/property'

export async function generatePropertyDescription(property: Property) {
  try {
    const { text } = await generateText({
      model: aiModel,
      prompt: `Write an engaging property description for:
      
      Address: ${property.address}
      Price: $${property.price.toLocaleString()}
      Bedrooms: ${property.bedrooms}
      Bathrooms: ${property.bathrooms}
      Square Feet: ${property.square_feet || 'N/A'}
      Amenities: ${property.amenities?.join(', ') || 'None listed'}
      
      Make it compelling but accurate. Focus on lifestyle and neighborhood benefits.
      Keep it under 200 words.`,
      maxTokens: 250,
    })

    return text
  } catch (error) {
    console.error('Failed to generate property description:', error)
    return null
  }
}
```

```typescript
// src/lib/ai/property-matching.ts
import { embed } from 'ai'
import { embeddingModel } from './config'
import type { Property } from '@/lib/schemas/property'
import type { UserPreferences } from '@/lib/schemas/user'

export async function calculatePropertyMatch(
  property: Property,
  userPreferences: UserPreferences
): Promise<number> {
  try {
    // Generate embeddings for property features
    const propertyText = `${property.description || ''} ${property.amenities?.join(' ') || ''} ${property.neighborhoods?.name || ''}`
    const propertyVector = await embed({
      model: embeddingModel,
      value: propertyText,
    })

    // Generate embeddings for user preferences
    const preferencesText = `Preferred types: ${userPreferences.preferredPropertyTypes.join(' ')} Amenities: ${userPreferences.amenities.join(' ')}`
    const preferencesVector = await embed({
      model: embeddingModel,
      value: preferencesText,
    })

    // Calculate cosine similarity
    return cosineSimilarity(
      propertyVector.embedding,
      preferencesVector.embedding
    )
  } catch (error) {
    console.error('Failed to calculate property match:', error)
    return 0
  }
}

function cosineSimilarity(a: number[], b: number[]): number {
  const dotProduct = a.reduce((sum, ai, i) => sum + ai * b[i], 0)
  const magnitudeA = Math.sqrt(a.reduce((sum, ai) => sum + ai * ai, 0))
  const magnitudeB = Math.sqrt(b.reduce((sum, bi) => sum + bi * bi, 0))
  return dotProduct / (magnitudeA * magnitudeB)
}
```

### Day 10-11: Service Layer & API Routes

#### 6.1 Property Service

```typescript
// src/lib/services/properties.ts
import { createClient } from '@/lib/supabase/client'
import { createServerClient } from '@/lib/supabase/server'
import { PropertyFilters, Property } from '@/types/app'

export async function getProperties(
  filters: PropertyFilters = {},
  offset: number = 0,
  limit: number = 20
) {
  const supabase = createClient()

  let query = supabase
    .from('properties')
    .select(
      `
      *,
      neighborhoods (
        name,
        city,
        state,
        walk_score,
        transit_score
      )
    `
    )
    .eq('is_active', true)

  // Apply filters
  if (filters.priceMin) query = query.gte('price', filters.priceMin)
  if (filters.priceMax) query = query.lte('price', filters.priceMax)
  if (filters.bedrooms) query = query.gte('bedrooms', filters.bedrooms)
  if (filters.bathrooms) query = query.gte('bathrooms', filters.bathrooms)
  if (filters.propertyType)
    query = query.eq('property_type', filters.propertyType)
  if (filters.city) query = query.ilike('city', `%${filters.city}%`)

  const { data, error } = await query
    .range(offset, offset + limit - 1)
    .order('created_at', { ascending: false })

  if (error) throw error
  return data
}

export async function getPropertyById(id: string) {
  const supabase = createClient()

  const { data, error } = await supabase
    .from('properties')
    .select(
      `
      *,
      neighborhoods (
        name,
        city,
        state,
        walk_score,
        transit_score
      )
    `
    )
    .eq('id', id)
    .single()

  if (error) throw error
  return data
}

export async function recordInteraction(
  propertyId: string,
  type: 'like' | 'dislike' | 'skip' | 'view'
) {
  const supabase = createClient()

  const { error } = await supabase.from('user_property_interactions').upsert({
    property_id: propertyId,
    interaction_type: type,
    user_id: (await supabase.auth.getUser()).data.user?.id,
  })

  if (error) throw error
}
```

#### 5.2 API Routes

```typescript
// src/app/api/properties/route.ts
import { createServerClient } from '@/lib/supabase/server'
import { NextRequest, NextResponse } from 'next/server'
import { PropertyFiltersSchema } from '@/lib/schemas/property'
import { validateSearchParams, createApiResponse } from '@/lib/api/validation'

// Enhanced schema with pagination and sorting
const PropertySearchSchema = PropertyFiltersSchema.extend({
  limit: z.number().int().min(1).max(100).default(20),
  offset: z.number().int().min(0).default(0),
  orderBy: z.enum(['price', 'created_at', 'bedrooms']).default('created_at'),
  orderDirection: z.enum(['asc', 'desc']).default('desc'),
})

export async function GET(request: NextRequest) {
  try {
    const supabase = createServerClient()

    // Verify authentication
    const {
      data: { session },
      error: authError,
    } = await supabase.auth.getSession()
    if (authError || !session) {
      return createApiResponse({ error: 'Unauthorized' }, 401)
    }

    // Validate query parameters with Zod
    const validation = validateSearchParams(request, PropertySearchSchema)
    if (!validation.success) {
      return validation.error
    }

    const {
      priceMin,
      priceMax,
      bedrooms,
      bathrooms,
      propertyType,
      city,
      neighborhoods,
      limit,
      offset,
      orderBy,
      orderDirection,
    } = validation.data

    // Build type-safe query
    let query = supabase
      .from('properties')
      .select(
        `
        *,
        neighborhoods (
          name,
          city,
          state,
          walk_score,
          transit_score
        )
      `
      )
      .eq('is_active', true)

    // Apply validated filters
    if (priceMin) query = query.gte('price', priceMin)
    if (priceMax) query = query.lte('price', priceMax)
    if (bedrooms) query = query.gte('bedrooms', bedrooms)
    if (bathrooms) query = query.gte('bathrooms', bathrooms)
    if (propertyType) query = query.eq('property_type', propertyType)
    if (city) query = query.ilike('city', `%${city}%`)
    if (neighborhoods?.length)
      query = query.in('neighborhood_id', neighborhoods)

    const { data: properties, error } = await query
      .range(offset, offset + limit - 1)
      .order(orderBy, { ascending: orderDirection === 'asc' })

    if (error) throw error

    return createApiResponse({
      properties: properties || [],
      pagination: {
        offset,
        limit,
        hasMore: (properties?.length || 0) === limit,
      },
      filters: { priceMin, priceMax, bedrooms, bathrooms, propertyType, city },
      total: properties?.length || 0,
    })
  } catch (error) {
    console.error('Properties API error:', error)
    return createApiResponse({ error: 'Internal server error' }, 500)
  }
}
```

```typescript
// src/app/api/interactions/route.ts
import { createServerClient } from '@/lib/supabase/server'
import { NextRequest } from 'next/server'
import { InteractionSchema } from '@/lib/schemas/interaction'
import { validateRequestBody, createApiResponse } from '@/lib/api/validation'

export async function POST(request: NextRequest) {
  try {
    const supabase = createServerClient()

    // Verify authentication
    const {
      data: { session },
      error: authError,
    } = await supabase.auth.getSession()
    if (authError || !session) {
      return createApiResponse({ error: 'Unauthorized' }, 401)
    }

    // Validate request body with Zod
    const validation = await validateRequestBody(request, InteractionSchema)
    if (!validation.success) {
      return validation.error
    }

    const { propertyId, type, metadata } = validation.data

    // Record interaction with validated data
    const { error } = await supabase.from('user_property_interactions').upsert({
      property_id: propertyId,
      interaction_type: type,
      user_id: session.user.id,
      metadata: metadata || null,
      created_at: new Date().toISOString(),
    })

    if (error) throw error

    return createApiResponse({
      success: true,
      interaction: { propertyId, type, timestamp: new Date().toISOString() },
    })
  } catch (error) {
    console.error('Interaction API error:', error)
    return createApiResponse({ error: 'Failed to record interaction' }, 500)
  }
}
```

---

## Week 2: Authentication & Core Components

### Day 8-9: Authentication Components

#### 8.1 Auth Callback Route

```typescript
// src/app/auth/callback/route.ts
import { createServerClient } from '@supabase/ssr'
import { cookies } from 'next/headers'
import { NextRequest, NextResponse } from 'next/server'

export async function GET(request: NextRequest) {
  const { searchParams, origin } = new URL(request.url)
  const code = searchParams.get('code')
  const next = searchParams.get('next') ?? '/helloworld_notes'

  if (code) {
    const cookieStore = await cookies()
    const supabase = createServerClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
      {
        cookies: {
          getAll() {
            return cookieStore.getAll()
          },
          setAll(cookiesToSet) {
            cookiesToSet.forEach(({ name, value, options }) =>
              cookieStore.set(name, value, options)
            )
          },
        },
      }
    )

    const { error } = await supabase.auth.exchangeCodeForSession(code)
    if (!error) {
      // Create user profile if it doesn't exist
      const {
        data: { user },
      } = await supabase.auth.getUser()
      if (user) {
        await supabase.from('user_profiles').upsert({ id: user.id }).select()
      }

      const forwardedHost = request.headers.get('x-forwarded-host')
      const isLocalEnv = process.env.NODE_ENV === 'development'
      if (isLocalEnv) {
        return NextResponse.redirect(`${origin}${next}`)
      } else if (forwardedHost) {
        return NextResponse.redirect(`https://${forwardedHost}${next}`)
      } else {
        return NextResponse.redirect(`${origin}${next}`)
      }
    }
  }

  // Redirect to error page with instructions
  return NextResponse.redirect(new URL('/auth/auth-code-error', request.url))
}
```

#### 8.2 Type-Safe Login Form Component

```typescript
// src/components/features/auth/LoginForm.tsx
'use client'

import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { useValidatedForm } from '@/hooks/useValidatedForm'
import { LoginSchema } from '@/lib/schemas/auth'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form'
import { Loader2 } from 'lucide-react'
import { useState } from 'react'

export function LoginForm() {
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const router = useRouter()
  const supabase = createClient()

  // Use validated form with Zod schema
  const form = useValidatedForm(LoginSchema, {
    email: '',
    password: '',
  })

  const handleEmailLogin = async (data: z.infer<typeof LoginSchema>) => {
    setLoading(true)
    setError(null)

    const { error } = await supabase.auth.signInWithPassword({
      email: data.email,
      password: data.password,
    })

    if (error) {
      setError(error.message)
    } else {
      router.push('/helloworld_notes')
    }

    setLoading(false)
  }

  const handleGoogleLogin = async () => {
    setLoading(true)

    const { error } = await supabase.auth.signInWithOAuth({
      provider: 'google',
      options: {
        redirectTo: `${location.origin}/auth/callback`
      }
    })

    if (error) {
      setError(error.message)
      setLoading(false)
    }
  }

  return (
    <Card className="w-full max-w-md mx-auto">
      <CardHeader>
        <CardTitle className="text-2xl font-bold text-center">Welcome Back</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {error && (
          <Alert variant="destructive">
            <AlertDescription>{error}</AlertDescription>
          </Alert>
        )}

        <Form {...form}>
          <form onSubmit={form.handleSubmit(handleEmailLogin)} className="space-y-4">
            <FormField
              control={form.control}
              name="email"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Email</FormLabel>
                  <FormControl>
                    <Input
                      type="email"
                      placeholder="Enter your email"
                      disabled={loading}
                      {...field}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="password"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Password</FormLabel>
                  <FormControl>
                    <Input
                      type="password"
                      placeholder="Enter your password"
                      disabled={loading}
                      {...field}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <Button
              type="submit"
              className="w-full"
              disabled={loading || !form.formState.isValid}
            >
              {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Sign In
            </Button>
          </form>
        </Form>

        <div className="relative">
          <div className="absolute inset-0 flex items-center">
            <span className="w-full border-t" />
          </div>
          <div className="relative flex justify-center text-xs uppercase">
            <span className="bg-background px-2 text-muted-foreground">Or continue with</span>
          </div>
        </div>

        <Button
          variant="outline"
          onClick={handleGoogleLogin}
          disabled={loading}
          className="w-full"
        >
          {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
          Google
        </Button>
      </CardContent>
    </Card>
  )
}
```

#### 8.3 Signup Form Component

```typescript
// src/components/features/auth/SignupForm.tsx
'use client'

import { useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { Loader2 } from 'lucide-react'

export function SignupForm() {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState(false)
  const supabase = createClient()

  const handleSignup = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    setError(null)

    if (password !== confirmPassword) {
      setError('Passwords do not match')
      setLoading(false)
      return
    }

    const { error } = await supabase.auth.signUp({
      email,
      password,
      options: {
        emailRedirectTo: `${location.origin}/auth/callback`
      }
    })

    if (error) {
      setError(error.message)
    } else {
      setSuccess(true)
    }

    setLoading(false)
  }

  if (success) {
    return (
      <Card className="w-full max-w-md mx-auto">
        <CardContent className="pt-6">
          <Alert>
            <AlertDescription>
              Check your email for a verification link to complete your account setup.
            </AlertDescription>
          </Alert>
        </CardContent>
      </Card>
    )
  }

  return (
    <Card className="w-full max-w-md mx-auto">
      <CardHeader>
        <CardTitle className="text-2xl font-bold text-center">Create Account</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {error && (
          <Alert variant="destructive">
            <AlertDescription>{error}</AlertDescription>
          </Alert>
        )}

        <form onSubmit={handleSignup} className="space-y-4">
          <div>
            <Label htmlFor="email">Email</Label>
            <Input
              id="email"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              disabled={loading}
            />
          </div>

          <div>
            <Label htmlFor="password">Password</Label>
            <Input
              id="password"
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              disabled={loading}
              minLength={6}
            />
          </div>

          <div>
            <Label htmlFor="confirmPassword">Confirm Password</Label>
            <Input
              id="confirmPassword"
              type="password"
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              required
              disabled={loading}
              minLength={6}
            />
          </div>

          <Button type="submit" className="w-full" disabled={loading}>
            {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            Create Account
          </Button>
        </form>
      </CardContent>
    </Card>
  )
}
```

### Day 10-11: Property Components

#### 10.1 React Query Hooks

```typescript
// src/hooks/useProperties.ts
import {
  useInfiniteQuery,
  useMutation,
  useQueryClient,
} from '@tanstack/react-query'
import { getProperties, recordInteraction } from '@/lib/services/properties'
import { PropertyFilters, InteractionType } from '@/types/app'

export function useProperties(filters: PropertyFilters = {}) {
  return useInfiniteQuery({
    queryKey: ['properties', filters],
    queryFn: ({ pageParam = 0 }) => getProperties(filters, pageParam, 20),
    getNextPageParam: (lastPage, pages) => {
      return lastPage.length === 20 ? pages.length * 20 : undefined
    },
    staleTime: 5 * 60 * 1000,
    cacheTime: 10 * 60 * 1000,
  })
}

export function usePropertyInteraction() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: ({
      propertyId,
      type,
    }: {
      propertyId: string
      type: InteractionType
    }) => recordInteraction(propertyId, type),
    onMutate: async ({ propertyId, type }) => {
      // Optimistic update logic here
      await queryClient.cancelQueries({ queryKey: ['properties'] })
    },
    onError: (err, variables, context) => {
      // Rollback optimistic update
    },
    onSuccess: () => {
      // Invalidate related queries if needed
    },
  })
}
```

#### 10.2 Property Card Component

```typescript
// src/components/features/properties/PropertyCard.tsx
import { Property } from '@/types/app'
import { Card, CardContent, CardHeader } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Heart, MapPin, Bed, Bath, Square, X } from 'lucide-react'

interface PropertyCardProps {
  property: Property
  onLike: () => void
  onDislike: () => void
  onSkip: () => void
  onViewDetails: () => void
}

export function PropertyCard({
  property,
  onLike,
  onDislike,
  onSkip,
  onViewDetails
}: PropertyCardProps) {
  return (
    <Card className="overflow-hidden hover:shadow-lg transition-all duration-200 cursor-pointer max-w-sm mx-auto">
      <CardHeader className="p-0">
        <div className="relative h-64">
          <img
            src={property.images[0] || '/placeholder-property.jpg'}
            alt={property.address}
            className="w-full h-full object-cover"
            onClick={onViewDetails}
          />
          <div className="absolute top-4 right-4">
            <Badge variant="secondary" className="bg-black/50 text-white border-0">
              ${property.price.toLocaleString()}
            </Badge>
          </div>
        </div>
      </CardHeader>
      <CardContent className="p-6">
        <div className="flex items-center gap-2 text-muted-foreground mb-3">
          <MapPin className="h-4 w-4" />
          <span className="text-sm">
            {property.neighborhoods?.name ?
              `${property.neighborhoods.name}, ${property.neighborhoods.city}` :
              `${property.city}, ${property.state}`
            }
          </span>
        </div>

        <div className="flex gap-6 mb-4">
          <div className="flex items-center gap-2">
            <Bed className="h-4 w-4 text-muted-foreground" />
            <span className="text-sm font-medium">{property.bedrooms} bed</span>
          </div>
          <div className="flex items-center gap-2">
            <Bath className="h-4 w-4 text-muted-foreground" />
            <span className="text-sm font-medium">{property.bathrooms} bath</span>
          </div>
          {property.square_feet && (
            <div className="flex items-center gap-2">
              <Square className="h-4 w-4 text-muted-foreground" />
              <span className="text-sm font-medium">{property.square_feet.toLocaleString()} sqft</span>
            </div>
          )}
        </div>

        <div className="flex gap-3">
          <Button
            variant="outline"
            size="sm"
            onClick={onDislike}
            className="flex-1"
          >
            <X className="h-4 w-4 mr-2" />
            Pass
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={onSkip}
            className="flex-1"
          >
            Skip
          </Button>
          <Button
            onClick={onLike}
            className="flex-1"
          >
            <Heart className="h-4 w-4 mr-2" />
            Like
          </Button>
        </div>
      </CardContent>
    </Card>
  )
}
```

### Day 12-14: Middleware & Layouts

#### 12.1 Authentication Middleware

```typescript
// src/middleware.ts
import { createMiddlewareClient } from '@supabase/auth-helpers-nextjs'
import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'

export async function middleware(req: NextRequest) {
  const res = NextResponse.next()
  const supabase = createMiddlewareClient({ req, res })

  const {
    data: { session },
  } = await supabase.auth.getSession()

  const isAuthPage = req.nextUrl.pathname.startsWith('/auth')
  const isProtectedPage =
    req.nextUrl.pathname.startsWith('/dashboard') ||
    req.nextUrl.pathname.startsWith('/onboarding')

  // Redirect authenticated users away from auth pages
  if (session && isAuthPage) {
    return NextResponse.redirect(new URL('/dashboard', req.url))
  }

  // Redirect unauthenticated users to login
  if (!session && isProtectedPage) {
    return NextResponse.redirect(new URL('/auth/login', req.url))
  }

  // Check onboarding completion for dashboard access
  if (session && req.nextUrl.pathname.startsWith('/dashboard')) {
    const { data: profile } = await supabase
      .from('user_profiles')
      .select('onboarding_completed')
      .eq('id', session.user.id)
      .single()

    if (!profile?.onboarding_completed) {
      return NextResponse.redirect(new URL('/onboarding', req.url))
    }
  }

  return res
}

export const config = {
  matcher: [
    '/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)',
  ],
}
```

#### 12.2 App Layout

```typescript
// src/components/layouts/AppLayout.tsx
'use client'

import { useState, useEffect } from 'react'
import { createClient } from '@/lib/supabase/client'
import { Button } from '@/components/ui/button'
import { User, Settings, LogOut, Menu } from 'lucide-react'
import { useRouter } from 'next/navigation'

interface AppLayoutProps {
  children: React.ReactNode
}

export function AppLayout({ children }: AppLayoutProps) {
  const [user, setUser] = useState<any>(null)
  const supabase = createClient()
  const router = useRouter()

  useEffect(() => {
    const getUser = async () => {
      const { data: { user } } = await supabase.auth.getUser()
      setUser(user)
    }
    getUser()
  }, [supabase])

  const handleSignOut = async () => {
    await supabase.auth.signOut()
    router.push('/auth/login')
  }

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
        <div className="container flex h-16 items-center justify-between">
          <div className="flex items-center gap-4">
            <h1 className="text-xl font-bold">HomeMatch</h1>
          </div>

          <div className="flex items-center gap-4">
            <Button variant="ghost" size="sm">
              <Settings className="h-4 w-4" />
            </Button>
            <Button variant="ghost" size="sm" onClick={handleSignOut}>
              <LogOut className="h-4 w-4" />
            </Button>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="container py-6">
        {children}
      </main>
    </div>
  )
}
```

---

## Week 3: Core Features

### Day 15-17: Property Browsing

#### 15.1 Property Swiper Component

```typescript
// src/components/features/properties/PropertySwiper.tsx
'use client'

import { useState, useCallback } from 'react'
import { PropertyCard } from './PropertyCard'
import { useProperties, usePropertyInteraction } from '@/hooks/useProperties'
import { useAppStore } from '@/lib/stores/app-store'
import { PropertyFilters } from '@/types/app'
import { Button } from '@/components/ui/button'
import { Loader2, RotateCcw } from 'lucide-react'

interface PropertySwiperProps {
  filters?: PropertyFilters
}

export function PropertySwiper({ filters = {} }: PropertySwiperProps) {
  const { currentPropertyIndex, actions } = useAppStore()
  const { data, isLoading, isError, hasNextPage, fetchNextPage } = useProperties(filters)
  const { mutate: recordInteraction } = usePropertyInteraction()

  const properties = data?.pages.flatMap(page => page) ?? []
  const currentProperty = properties[currentPropertyIndex]

  const handleInteraction = useCallback((type: 'like' | 'dislike' | 'skip') => {
    if (!currentProperty) return

    recordInteraction({ propertyId: currentProperty.id, type })
    actions.recordSwipe(currentProperty.id)

    // Load more properties if we're near the end
    if (currentPropertyIndex >= properties.length - 5 && hasNextPage) {
      fetchNextPage()
    }
  }, [currentProperty, currentPropertyIndex, properties.length, hasNextPage, fetchNextPage, recordInteraction, actions])

  const handleReset = () => {
    actions.resetSwipeHistory()
  }

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-96">
        <Loader2 className="h-8 w-8 animate-spin" />
      </div>
    )
  }

  if (isError) {
    return (
      <div className="text-center py-8">
        <p className="text-muted-foreground">Failed to load properties. Please try again.</p>
        <Button onClick={() => window.location.reload()} className="mt-4">
          Try Again
        </Button>
      </div>
    )
  }

  if (!currentProperty) {
    return (
      <div className="text-center py-8">
        <p className="text-lg font-medium mb-2">No more properties!</p>
        <p className="text-muted-foreground mb-4">You've seen all available properties matching your criteria.</p>
        <Button onClick={handleReset} variant="outline">
          <RotateCcw className="h-4 w-4 mr-2" />
          Start Over
        </Button>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <div className="text-center">
        <p className="text-sm text-muted-foreground">
          Property {currentPropertyIndex + 1} of {properties.length}
        </p>
      </div>

      <PropertyCard
        property={currentProperty}
        onLike={() => handleInteraction('like')}
        onDislike={() => handleInteraction('dislike')}
        onSkip={() => handleInteraction('skip')}
        onViewDetails={() => actions.openPropertyDetail(currentProperty.id)}
      />
    </div>
  )
}
```

### Day 18-19: Search & Filters

#### 18.1 Type-Safe Property Filters Component

```typescript
// src/components/features/properties/PropertyFilters.tsx
'use client'

import { useValidatedForm } from '@/hooks/useValidatedForm'
import { PropertyFiltersSchema, PropertyFilters } from '@/lib/schemas/property'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form'
import { Slider } from '@/components/ui/slider'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Input } from '@/components/ui/input'
import { z } from 'zod'

interface PropertyFiltersProps {
  initialFilters?: PropertyFilters
  onFiltersChange: (filters: PropertyFilters) => void
  onClose?: () => void
}

export function PropertyFilters({
  initialFilters = {},
  onFiltersChange,
  onClose
}: PropertyFiltersProps) {
  // Use validated form with Zod schema
  const form = useValidatedForm(PropertyFiltersSchema, initialFilters)

  const handleApplyFilters = (data: PropertyFilters) => {
    onFiltersChange(data)
    onClose?.()
  }

  const handleClearFilters = () => {
    form.reset({})
    onFiltersChange({})
    onClose?.()
  }

  return (
    <Card className="w-full max-w-md">
      <CardHeader>
        <CardTitle>Filter Properties</CardTitle>
      </CardHeader>
      <CardContent>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(handleApplyFilters)} className="space-y-6">
            <div className="grid grid-cols-2 gap-4">
              <FormField
                control={form.control}
                name="priceMin"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Min Price</FormLabel>
                    <FormControl>
                      <Input
                        type="number"
                        placeholder="100000"
                        {...field}
                        onChange={(e) => field.onChange(e.target.value ? Number(e.target.value) : undefined)}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="priceMax"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Max Price</FormLabel>
                    <FormControl>
                      <Input
                        type="number"
                        placeholder="1000000"
                        {...field}
                        onChange={(e) => field.onChange(e.target.value ? Number(e.target.value) : undefined)}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            <FormField
              control={form.control}
              name="city"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>City</FormLabel>
                  <FormControl>
                    <Input placeholder="Enter city name" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

        <div>
          <Label className="text-sm font-medium mb-2 block">Bedrooms</Label>
          <Select value={bedrooms} onValueChange={setBedrooms}>
            <SelectTrigger>
              <SelectValue placeholder="Any" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="">Any</SelectItem>
              <SelectItem value="1">1+ Bedroom</SelectItem>
              <SelectItem value="2">2+ Bedrooms</SelectItem>
              <SelectItem value="3">3+ Bedrooms</SelectItem>
              <SelectItem value="4">4+ Bedrooms</SelectItem>
              <SelectItem value="5">5+ Bedrooms</SelectItem>
            </SelectContent>
          </Select>
        </div>

        <div>
          <Label className="text-sm font-medium mb-2 block">Bathrooms</Label>
          <Select value={bathrooms} onValueChange={setBathrooms}>
            <SelectTrigger>
              <SelectValue placeholder="Any" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="">Any</SelectItem>
              <SelectItem value="1">1+ Bathroom</SelectItem>
              <SelectItem value="1.5">1.5+ Bathrooms</SelectItem>
              <SelectItem value="2">2+ Bathrooms</SelectItem>
              <SelectItem value="2.5">2.5+ Bathrooms</SelectItem>
              <SelectItem value="3">3+ Bathrooms</SelectItem>
            </SelectContent>
          </Select>
        </div>

        <div>
          <Label className="text-sm font-medium mb-2 block">Property Type</Label>
          <Select value={propertyType} onValueChange={setPropertyType}>
            <SelectTrigger>
              <SelectValue placeholder="Any Type" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="">Any Type</SelectItem>
              <SelectItem value="house">House</SelectItem>
              <SelectItem value="condo">Condo</SelectItem>
              <SelectItem value="townhouse">Townhouse</SelectItem>
              <SelectItem value="apartment">Apartment</SelectItem>
            </SelectContent>
          </Select>
        </div>

        <div className="flex gap-3">
          <Button onClick={handleClearFilters} variant="outline" className="flex-1">
            Clear All
          </Button>
          <Button onClick={handleApplyFilters} className="flex-1">
            Apply Filters
          </Button>
        </div>
      </CardContent>
    </Card>
  )
}
```

### Day 20-21: Dashboard & User Profile

#### 20.1 Dashboard Page

```typescript
// src/app/dashboard/page.tsx
'use client'

import { useState } from 'react'
import { PropertySwiper } from '@/components/features/properties/PropertySwiper'
import { PropertyFilters } from '@/components/features/properties/PropertyFilters'
import { AppLayout } from '@/components/layouts/AppLayout'
import { useAppStore } from '@/lib/stores/app-store'
import { Button } from '@/components/ui/button'
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Filter, Heart } from 'lucide-react'
import { PropertyFilters as FilterType } from '@/types/app'

export default function DashboardPage() {
  const [activeFilters, setActiveFilters] = useState<FilterType>({})
  const { isFilterModalOpen, actions } = useAppStore()

  const handleFiltersChange = (filters: FilterType) => {
    setActiveFilters(filters)
  }

  return (
    <AppLayout>
      <div className="max-w-md mx-auto space-y-6">
        {/* Header Actions */}
        <div className="flex justify-between items-center">
          <h2 className="text-2xl font-bold">Discover Properties</h2>
          <div className="flex gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={actions.openFilterModal}
            >
              <Filter className="h-4 w-4 mr-2" />
              Filters
            </Button>
          </div>
        </div>

        {/* Active Filters Display */}
        {Object.keys(activeFilters).length > 0 && (
          <div className="p-4 bg-muted rounded-lg">
            <p className="text-sm font-medium mb-2">Active Filters:</p>
            <div className="flex flex-wrap gap-2">
              {activeFilters.priceMin && (
                <span className="text-xs bg-primary/10 px-2 py-1 rounded">
                  Min: ${activeFilters.priceMin.toLocaleString()}
                </span>
              )}
              {activeFilters.priceMax && (
                <span className="text-xs bg-primary/10 px-2 py-1 rounded">
                  Max: ${activeFilters.priceMax.toLocaleString()}
                </span>
              )}
              {activeFilters.bedrooms && (
                <span className="text-xs bg-primary/10 px-2 py-1 rounded">
                  {activeFilters.bedrooms}+ bed
                </span>
              )}
              {activeFilters.city && (
                <span className="text-xs bg-primary/10 px-2 py-1 rounded">
                  {activeFilters.city}
                </span>
              )}
            </div>
          </div>
        )}

        {/* Property Swiper */}
        <PropertySwiper filters={activeFilters} />

        {/* Filter Modal */}
        <Dialog open={isFilterModalOpen} onOpenChange={actions.closeFilterModal}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Filter Properties</DialogTitle>
            </DialogHeader>
            <PropertyFilters
              initialFilters={activeFilters}
              onFiltersChange={handleFiltersChange}
              onClose={actions.closeFilterModal}
            />
          </DialogContent>
        </Dialog>
      </div>
    </AppLayout>
  )
}
```

---

## Week 4: Testing & Deployment

### Day 22-24: Comprehensive Testing Implementation

#### 22.1 Unit Tests with Jest

```typescript
// __tests__/unit/PropertyCard.test.tsx
import { render, screen, fireEvent } from '@testing-library/react'
import { PropertyCard } from '@/components/features/properties/PropertyCard'
import type { Property } from '@/lib/schemas/property'

const mockProperty: Property = {
  id: '1',
  address: '123 Main St',
  city: 'San Francisco',
  state: 'CA',
  zip_code: '94102',
  price: 500000,
  bedrooms: 2,
  bathrooms: 1,
  property_type: 'condo',
  images: ['https://example.com/image.jpg'],
  is_active: true,
  created_at: new Date().toISOString()
}

const mockHandlers = {
  onLike: jest.fn(),
  onDislike: jest.fn(),
  onSkip: jest.fn(),
  onViewDetails: jest.fn(),
}

describe('PropertyCard', () => {
  beforeEach(() => {
    jest.clearAllMocks()
  })

  it('renders property information correctly', () => {
    render(<PropertyCard property={mockProperty} {...mockHandlers} />)

    expect(screen.getByText('$500,000')).toBeInTheDocument()
    expect(screen.getByText('San Francisco, CA')).toBeInTheDocument()
    expect(screen.getByText('2 bed')).toBeInTheDocument()
    expect(screen.getByText('1 bath')).toBeInTheDocument()
  })

  it('calls onLike when like button is clicked', () => {
    render(<PropertyCard property={mockProperty} {...mockHandlers} />)

    const likeButton = screen.getByRole('button', { name: /like/i })
    fireEvent.click(likeButton)

    expect(mockHandlers.onLike).toHaveBeenCalledTimes(1)
  })

  it('tracks analytics on interaction', () => {
    const trackSpy = jest.spyOn(require('@/lib/analytics/posthog'), 'trackPropertyInteraction')

    render(<PropertyCard property={mockProperty} {...mockHandlers} />)

    const likeButton = screen.getByRole('button', { name: /like/i })
    fireEvent.click(likeButton)

    expect(trackSpy).toHaveBeenCalledWith('1', 'like')
  })
})
```

#### 22.2 Integration Tests with Vitest

```typescript
// __tests__/integration/properties-api.test.ts
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { GET } from '@/app/api/properties/route'
import { NextRequest } from 'next/server'

// Mock Supabase server client
vi.mock('@/lib/supabase/server', () => ({
  createServerClient: () => ({
    auth: {
      getSession: vi.fn(),
    },
    from: vi.fn(() => ({
      select: vi.fn(() => ({
        eq: vi.fn(() => ({
          range: vi.fn(() => ({
            order: vi.fn(),
          })),
        })),
      })),
    })),
  }),
}))

const mockProperty = {
  id: '1',
  address: '123 Main St',
  city: 'San Francisco',
  state: 'CA',
  price: 500000,
  bedrooms: 2,
  bathrooms: 1,
  property_type: 'condo',
}

describe('/api/properties', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('should return properties with valid session', async () => {
    const { createServerClient } = await import('@/lib/supabase/server')
    const mockSupabase = createServerClient()

    // Mock authenticated session
    mockSupabase.auth.getSession.mockResolvedValue({
      data: { session: { user: { id: 'user-123' } } },
      error: null,
    })

    // Mock database query
    const mockQuery = mockSupabase.from().select().eq().range().order
    mockQuery.mockResolvedValue({
      data: [mockProperty],
      error: null,
    })

    const request = new NextRequest(
      'http://localhost:3000/api/properties?priceMin=100000&priceMax=500000'
    )
    const response = await GET(request)
    const data = await response.json()

    expect(response.status).toBe(200)
    expect(data.properties).toHaveLength(1)
    expect(data.properties[0].price).toBe(500000)
  })

  it('should return 401 for unauthenticated requests', async () => {
    const { createServerClient } = await import('@/lib/supabase/server')
    const mockSupabase = createServerClient()

    // Mock no session
    mockSupabase.auth.getSession.mockResolvedValue({
      data: { session: null },
      error: null,
    })

    const request = new NextRequest('http://localhost:3000/api/properties')
    const response = await GET(request)

    expect(response.status).toBe(401)
  })

  it('should validate query parameters with Zod', async () => {
    const request = new NextRequest(
      'http://localhost:3000/api/properties?priceMin=invalid'
    )
    const response = await GET(request)
    const data = await response.json()

    expect(response.status).toBe(400)
    expect(data.error).toBe('Validation failed')
    expect(data.details).toBeDefined()
  })
})
```

#### 22.3 E2E Tests with Playwright

```typescript
// __tests__/e2e/property-browsing.test.ts
import { test, expect } from '@playwright/test'

test.describe('Property Browsing', () => {
  test.beforeEach(async ({ page }) => {
    // Set up test user and properties
    await page.goto('/auth/login')
    await page.fill('[name="email"]', 'test@example.com')
    await page.fill('[name="password"]', 'password123')
    await page.click('button[type="submit"]')
    await page.waitForURL('/dashboard')
  })

  test('should display property cards', async ({ page }) => {
    await expect(page.locator('[data-testid="property-card"]')).toBeVisible()
    await expect(page.locator('text=Discover Properties')).toBeVisible()
  })

  test('should like a property', async ({ page }) => {
    const likeButton = page.locator('button:has-text("Like")')
    await likeButton.click()

    // Should advance to next property
    await page.waitForTimeout(500)
    await expect(page.locator('[data-testid="property-card"]')).toBeVisible()
  })

  test('should open property filters', async ({ page }) => {
    await page.click('button:has-text("Filters")')
    await expect(page.locator('text=Filter Properties')).toBeVisible()

    // Set price range
    await page.fill('[name="priceMin"]', '200000')
    await page.fill('[name="priceMax"]', '800000')

    await page.click('button:has-text("Apply Filters")')

    // Should show filtered results
    await expect(page.locator('text=Active Filters')).toBeVisible()
  })

  test('should handle no more properties', async ({ page }) => {
    // Like all properties until none left
    for (let i = 0; i < 10; i++) {
      const likeButton = page.locator('button:has-text("Like")')
      if (await likeButton.isVisible()) {
        await likeButton.click()
        await page.waitForTimeout(300)
      } else {
        break
      }
    }

    // Should show no more properties message
    await expect(page.locator('text=No more properties')).toBeVisible()
    await expect(page.locator('button:has-text("Start Over")')).toBeVisible()
  })
})
```

#### 22.4 Test Scripts Configuration

```json
// package.json scripts
{
  "scripts": {
    "test": "jest",
    "test:watch": "jest --watch",
    "test:coverage": "jest --coverage",
    "test:integration": "vitest",
    "test:integration:ui": "vitest --ui",
    "test:e2e": "playwright test",
    "test:e2e:ui": "playwright test --ui",
    "test:all": "pnpm test && pnpm test:integration && pnpm test:e2e"
  }
}
```

### Day 25-26: Performance Optimization

#### 25.1 Image Optimization

```typescript
// src/components/ui/optimized-image.tsx
'use client'

import Image from 'next/image'
import { useState } from 'react'
import { cn } from '@/lib/utils'

interface OptimizedImageProps {
  src: string
  alt: string
  className?: string
  width?: number
  height?: number
  priority?: boolean
}

export function OptimizedImage({
  src,
  alt,
  className,
  width = 400,
  height = 300,
  priority = false
}: OptimizedImageProps) {
  const [isLoading, setIsLoading] = useState(true)
  const [hasError, setHasError] = useState(false)

  return (
    <div className={cn("relative overflow-hidden bg-muted", className)}>
      {!hasError ? (
        <Image
          src={src}
          alt={alt}
          width={width}
          height={height}
          priority={priority}
          className={cn(
            "object-cover transition-opacity duration-300",
            isLoading ? "opacity-0" : "opacity-100"
          )}
          onLoad={() => setIsLoading(false)}
          onError={() => setHasError(true)}
        />
      ) : (
        <div className="flex items-center justify-center h-full bg-muted">
          <span className="text-muted-foreground">Failed to load image</span>
        </div>
      )}

      {isLoading && (
        <div className="absolute inset-0 flex items-center justify-center">
          <div className="h-8 w-8 animate-spin rounded-full border-2 border-primary border-t-transparent" />
        </div>
      )}
    </div>
  )
}
```

### Day 27-28: Deployment

#### 27.1 Environment Variables Setup

```env
# .env.production
NEXT_PUBLIC_SUPABASE_URL=your-production-supabase-url
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-production-anon-key
SUPABASE_SERVICE_ROLE_KEY=your-production-service-role-key
NEXTAUTH_URL=https://your-domain.com
NEXTAUTH_SECRET=your-production-secret
```

#### 27.2 Vercel Deployment

```json
{
  "buildCommand": "pnpm build",
  "outputDirectory": ".next",
  "installCommand": "pnpm install",
  "devCommand": "pnpm dev",
  "framework": "nextjs"
}
```

#### 27.3 Production Scripts

```json
// package.json scripts section
{
  "scripts": {
    "dev": "next dev",
    "build": "next build",
    "start": "next start",
    "lint": "eslint . --fix",
    "format": "prettier --write .",
    "type-check": "tsc --noEmit",
    "test": "vitest",
    "test:ui": "vitest --ui",
    "test:integration": "jest --config jest.config.js",
    "test:e2e": "playwright test",
    "test:e2e:ui": "playwright test --ui",
    "test:all": "pnpm test && pnpm test:integration && pnpm test:e2e",
    "test:coverage": "vitest --coverage",
    "db:types": "npx supabase gen types typescript --project-id your-project-ref > src/types/database.ts",
    "prepare": "simple-git-hooks"
  }
}
```

---

## Final Steps & Launch Checklist

### Pre-Launch Checklist

- [ ] All environment variables configured for production
- [ ] Database schema deployed to production Supabase
- [ ] Row-level security policies tested
- [ ] Google OAuth configured for production domain
- [ ] Error boundaries implemented
- [ ] Loading states implemented
- [ ] Form validation working
- [ ] Mobile responsiveness tested
- [ ] Performance optimization completed
- [ ] SEO meta tags added
- [ ] Analytics setup (optional)
- [ ] Monitoring setup (optional)

### Post-Launch Tasks

1. **Monitor Performance**
   - Check Core Web Vitals
   - Monitor error rates
   - Review user feedback

2. **Database Optimization**
   - Add indexes based on query patterns
   - Monitor query performance
   - Set up database backups

3. **Feature Enhancements**
   - Add property favorites functionality
   - Implement search history
   - Add user preferences learning
   - Build admin panel for property management

---

## Data Migration Phase: Importing Production Assets

### Week 5: Production Data & ML System Migration (WHEN READY)

After your core app is built and tested, import your valuable production data:

#### Day 29: Neighborhood Data Migration

```bash
# Create migration directory structure
mkdir -p scripts/migrate/{helpers,validation}

# Install migration dependencies
pnpm install pg-copy-streams fast-csv
```

```typescript
// scripts/migrate/01-neighborhoods.ts
import { createClient } from '@supabase/supabase-js'
import { readFileSync } from 'fs'

export async function migrateNeighborhoods() {
  console.log('🏘️ Migrating neighborhood mappings...')

  const legacySupabase = createClient(
    process.env.LEGACY_SUPABASE_URL!,
    process.env.LEGACY_SERVICE_KEY!
  )

  const newSupabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_KEY!
  )

  // Extract your authoritative neighborhood data
  const { data: neighborhoods, error } = await legacySupabase.from(
    'neighborhoods_authoritative'
  ).select(`
      id,
      name,
      polygon,
      median_price,
      walk_score,
      transit_score,
      cities (
        name,
        regions (
          name,
          metro_areas (name)
        )
      )
    `)

  if (error) throw error

  console.log(`📍 Found ${neighborhoods?.length} neighborhoods to migrate`)

  // Transform to simplified schema
  const transformedNeighborhoods = neighborhoods?.map((n) => ({
    id: n.id,
    name: n.name,
    city: n.cities?.name || 'Unknown',
    state: extractStateFromRegion(n.cities?.regions?.name),
    metro_area: n.cities?.regions?.metro_areas?.name || 'Unknown',
    bounds: n.polygon, // Preserve your polygon work
    median_price: n.median_price,
    walk_score: n.walk_score,
    transit_score: n.transit_score,
    created_at: new Date().toISOString(),
  }))

  // Batch insert with progress tracking
  const batchSize = 100
  let imported = 0

  for (let i = 0; i < transformedNeighborhoods.length; i += batchSize) {
    const batch = transformedNeighborhoods.slice(i, i + batchSize)

    const { error: insertError } = await newSupabase
      .from('neighborhoods')
      .upsert(batch, { onConflict: 'id' })

    if (insertError) throw insertError

    imported += batch.length
    console.log(
      `✅ Imported ${imported}/${transformedNeighborhoods.length} neighborhoods`
    )
  }

  console.log('🎉 Neighborhood migration complete!')
}

function extractStateFromRegion(region?: string): string {
  // Your logic to extract state from region name
  const stateMap: Record<string, string> = {
    'San Francisco Bay Area': 'CA',
    'Los Angeles Metro': 'CA',
    'Seattle Metro': 'WA',
    // Add your mappings
  }
  return stateMap[region || ''] || 'Unknown'
}
```

#### Day 30: Property Data Migration

```typescript
// scripts/migrate/02-properties.ts
export async function migrateProperties() {
  console.log('🏠 Migrating property data...')

  const legacySupabase = createClient(
    process.env.LEGACY_SUPABASE_URL!,
    process.env.LEGACY_SERVICE_KEY!
  )

  const newSupabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_KEY!
  )

  // Get total count first
  const { count } = await legacySupabase
    .from('properties')
    .select('*', { count: 'exact', head: true })
    .eq('is_active', true)

  console.log(`📊 Found ${count} active properties to migrate`)

  const batchSize = 500
  let processed = 0

  // Process in batches to handle large datasets
  for (let offset = 0; offset < count!; offset += batchSize) {
    const { data: properties } = await legacySupabase
      .from('properties')
      .select('*')
      .eq('is_active', true)
      .range(offset, offset + batchSize - 1)

    if (!properties?.length) break

    // Transform to new schema
    const transformedProperties = properties.map((prop) => ({
      id: prop.id,
      zpid: prop.zpid,
      address: prop.address,
      city: prop.city,
      state: prop.state,
      zip_code: prop.zip_code,
      price: prop.price,
      bedrooms: prop.bedrooms,
      bathrooms: prop.bathrooms,
      square_feet: prop.square_feet,
      property_type: prop.property_type,
      images: prop.images || [],
      description: prop.description,
      coordinates:
        prop.latitude && prop.longitude
          ? `POINT(${prop.longitude} ${prop.latitude})`
          : null,
      amenities: prop.amenities || [],
      year_built: prop.year_built,
      lot_size_sqft: prop.lot_size,
      parking_spots: prop.parking_spots || 0,
      listing_status: prop.listing_status || 'active',
      property_hash: prop.property_hash,
      is_active: true,
      created_at: prop.created_at,
      updated_at: prop.updated_at,
    }))

    // Insert batch
    const { error } = await newSupabase
      .from('properties')
      .upsert(transformedProperties, { onConflict: 'id' })

    if (error) {
      console.error('❌ Batch error:', error)
      continue
    }

    processed += properties.length
    console.log(
      `✅ Migrated ${processed}/${count} properties (${Math.round((processed / count!) * 100)}%)`
    )
  }

  console.log('🎉 Property migration complete!')
}
```

#### Day 31: Property-Neighborhood Mapping

```typescript
// scripts/migrate/03-map-neighborhoods.ts
export async function mapPropertiesToNeighborhoods() {
  console.log('🗺️ Mapping properties to neighborhoods using polygons...')

  const newSupabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_KEY!
  )

  // Get properties with coordinates but no neighborhood
  const { data: unmappedProperties } = await newSupabase
    .from('properties')
    .select('id, coordinates')
    .not('coordinates', 'is', null)
    .is('neighborhood_id', null)

  console.log(`📍 Found ${unmappedProperties?.length} properties to map`)

  let mapped = 0

  for (const property of unmappedProperties || []) {
    // Use your polygon containment logic
    const { data: neighborhood } = await newSupabase.rpc(
      'find_neighborhood_for_property',
      {
        property_coordinates: property.coordinates,
      }
    )

    if (neighborhood?.length > 0) {
      await newSupabase
        .from('properties')
        .update({ neighborhood_id: neighborhood[0].id })
        .eq('id', property.id)

      mapped++

      if (mapped % 100 === 0) {
        console.log(
          `✅ Mapped ${mapped}/${unmappedProperties.length} properties`
        )
      }
    }
  }

  console.log(`🎉 Mapped ${mapped} properties to neighborhoods!`)
}
```

#### Day 32: Migration Validation & Cleanup

```typescript
// scripts/migrate/04-validate.ts
export async function validateMigration() {
  console.log('🔍 Validating migration...')

  const newSupabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_KEY!
  )

  // Validation checks
  const validations = [
    {
      name: 'Neighborhoods imported',
      query: () =>
        newSupabase
          .from('neighborhoods')
          .select('id', { count: 'exact', head: true }),
    },
    {
      name: 'Properties imported',
      query: () =>
        newSupabase
          .from('properties')
          .select('id', { count: 'exact', head: true }),
    },
    {
      name: 'Properties with neighborhoods',
      query: () =>
        newSupabase
          .from('properties')
          .select('id', { count: 'exact', head: true })
          .not('neighborhood_id', 'is', null),
    },
    {
      name: 'Properties with coordinates',
      query: () =>
        newSupabase
          .from('properties')
          .select('id', { count: 'exact', head: true })
          .not('coordinates', 'is', null),
    },
  ]

  for (const validation of validations) {
    const { count } = await validation.query()
    console.log(`✅ ${validation.name}: ${count}`)
  }

  // Data integrity checks
  const { data: orphanedProperties } = await newSupabase
    .from('properties')
    .select('id, address')
    .not('coordinates', 'is', null)
    .is('neighborhood_id', null)
    .limit(10)

  if (orphanedProperties?.length) {
    console.log(
      `⚠️ Found ${orphanedProperties.length} properties with coordinates but no neighborhood`
    )
    orphanedProperties.forEach((p) => console.log(`  - ${p.address}`))
  }

  console.log('🎉 Migration validation complete!')
}
```

#### Migration Runner Script

```typescript
// scripts/run-migration.ts
import { migrateNeighborhoods } from './migrate/01-neighborhoods'
import { migrateProperties } from './migrate/02-properties'
import { mapPropertiesToNeighborhoods } from './migrate/03-map-neighborhoods'
import { validateMigration } from './migrate/04-validate'

async function runFullMigration() {
  try {
    console.log('🚀 Starting HomeMatch data migration...')

    // Step 1: Import neighborhood mappings (your valuable work!)
    await migrateNeighborhoods()

    // Step 2: Import property data
    await migrateProperties()

    // Step 3: Map properties to neighborhoods using polygons
    await mapPropertiesToNeighborhoods()

    // Step 4: Validate everything worked
    await validateMigration()

    console.log('🎉 Migration complete! Your production data is preserved.')
  } catch (error) {
    console.error('❌ Migration failed:', error)
    process.exit(1)
  }
}

// Run when you're ready
if (require.main === module) {
  runFullMigration()
}
```

### Environment Setup for Migration

```env
# .env.migration
# Legacy production database
LEGACY_SUPABASE_URL=your-production-supabase-url
LEGACY_SERVICE_KEY=your-production-service-key

# New V2 database
NEXT_PUBLIC_SUPABASE_URL=your-new-supabase-url
SUPABASE_SERVICE_KEY=your-new-service-key
```

### Migration Scripts in package.json

```json
{
  "scripts": {
    "migrate:neighborhoods": "tsx scripts/migrate/01-neighborhoods.ts",
    "migrate:properties": "tsx scripts/migrate/02-properties.ts",
    "migrate:mapping": "tsx scripts/migrate/03-map-neighborhoods.ts",
    "migrate:validate": "tsx scripts/migrate/04-validate.ts",
    "migrate:full": "tsx scripts/run-migration.ts"
  }
}
```

---

## External API Integration: Zillow Data Pipeline

### Zillow RapidAPI Integration (zillow-com1.p.rapidapi.com)

Your production app uses an excellent RapidAPI service that provides:

- **Property search by polygon** for neighborhood-based ingestion
- **Multiple high-quality images** per property (up to 20)
- **Zillow Property IDs (zpid)** for unique identification
- **Rich property data** (price, beds, baths, sqft, amenities, coordinates)

#### Environment Setup

```env
# .env.local
RAPIDAPI_KEY=your-rapidapi-key
```

#### API Configuration

```typescript
// lib/services/zillow-api.ts
interface ZillowAPIConfig {
  apiKey: string
  baseURL: string
  rateLimitDelay: number
  maxImagesPerProperty: number
  timeout: number
}

export const ZILLOW_API_CONFIG: ZillowAPIConfig = {
  apiKey: process.env.RAPIDAPI_KEY!,
  baseURL: 'https://zillow-com1.p.rapidapi.com',
  rateLimitDelay: 2000, // 2 seconds between calls
  maxImagesPerProperty: 20,
  timeout: 10000,
}
```

#### Zillow API Client

```typescript
// lib/services/zillow-api-client.ts
export class ZillowAPIClient {
  private apiKey: string
  private baseURL: string
  private requestDelay: number

  constructor(config: ZillowAPIConfig) {
    this.apiKey = config.apiKey
    this.baseURL = config.baseURL
    this.requestDelay = config.rateLimitDelay
  }

  // Search properties by neighborhood polygon
  async searchByPolygon(polygon: string, page = 1): Promise<ZillowProperty[]> {
    await this.delay(this.requestDelay)

    const params = new URLSearchParams({
      polygon,
      status_type: 'ForSale',
      page: page.toString(),
    })

    const response = await fetch(
      `${this.baseURL}/propertyByPolygon?${params}`,
      {
        headers: {
          'X-RapidAPI-Key': this.apiKey,
          'X-RapidAPI-Host': 'zillow-com1.p.rapidapi.com',
        },
      }
    )

    if (!response.ok) {
      throw new Error(`Zillow API error: ${response.status}`)
    }

    const data = await response.json()
    return data.props || []
  }

  // Get multiple images for a property
  async getPropertyImages(zpid: string): Promise<string[]> {
    await this.delay(this.requestDelay * 1.5) // Longer delay for images

    const response = await fetch(`${this.baseURL}/images?zpid=${zpid}`, {
      headers: {
        'X-RapidAPI-Key': this.apiKey,
        'X-RapidAPI-Host': 'zillow-com1.p.rapidapi.com',
      },
    })

    if (!response.ok) {
      console.warn(`Failed to fetch images for zpid ${zpid}`)
      return []
    }

    const data = await response.json()
    const images = data.images || []

    return Array.isArray(images)
      ? images.filter(Boolean).slice(0, ZILLOW_API_CONFIG.maxImagesPerProperty)
      : []
  }

  // Get detailed property information
  async getPropertyDetails(
    zpid: string
  ): Promise<ZillowPropertyDetails | null> {
    await this.delay(this.requestDelay)

    const response = await fetch(`${this.baseURL}/property?zpid=${zpid}`, {
      headers: {
        'X-RapidAPI-Key': this.apiKey,
        'X-RapidAPI-Host': 'zillow-com1.p.rapidapi.com',
      },
    })

    if (!response.ok) {
      return null
    }

    return response.json()
  }

  private delay(ms: number): Promise<void> {
    return new Promise((resolve) => setTimeout(resolve, ms))
  }
}
```

#### Property Ingestion Service

```typescript
// lib/services/property-ingestion.ts
import { ZillowAPIClient } from './zillow-api-client'
import { createClient } from '@/lib/supabase/server'

export class PropertyIngestionService {
  private zillowClient: ZillowAPIClient
  private supabase: ReturnType<typeof createClient>

  constructor() {
    this.zillowClient = new ZillowAPIClient(ZILLOW_API_CONFIG)
    this.supabase = createClient()
  }

  async ingestPropertiesForNeighborhood(neighborhoodId: string): Promise<void> {
    // Get neighborhood polygon
    const { data: neighborhood } = await this.supabase
      .from('neighborhoods')
      .select('bounds, name')
      .eq('id', neighborhoodId)
      .single()

    if (!neighborhood?.bounds) return

    console.log(`🏘️ Ingesting properties for ${neighborhood.name}`)

    let page = 1
    let hasMorePages = true

    while (hasMorePages) {
      try {
        // Fetch properties from Zillow API
        const properties = await this.zillowClient.searchByPolygon(
          neighborhood.bounds.toString(),
          page
        )

        if (properties.length === 0) {
          hasMorePages = false
          break
        }

        // Process each property
        for (const zillowProperty of properties) {
          await this.processProperty(zillowProperty, neighborhoodId)
        }

        console.log(
          `✅ Processed page ${page} (${properties.length} properties)`
        )
        page++
      } catch (error) {
        console.error(`❌ Error ingesting page ${page}:`, error)
        hasMorePages = false
      }
    }
  }

  private async processProperty(
    zillowProperty: any,
    neighborhoodId: string
  ): Promise<void> {
    try {
      // Get additional images
      const images = zillowProperty.zpid
        ? await this.zillowClient.getPropertyImages(zillowProperty.zpid)
        : []

      // Transform Zillow data to your schema
      const property = {
        zpid: zillowProperty.zpid,
        address: zillowProperty.streetAddress,
        city: zillowProperty.city,
        state: zillowProperty.state,
        zip_code: zillowProperty.zipcode,
        price: zillowProperty.price,
        bedrooms: zillowProperty.bedrooms || 0,
        bathrooms: zillowProperty.bathrooms || 0,
        square_feet: zillowProperty.livingArea,
        property_type: this.mapPropertyType(zillowProperty.homeType),
        images:
          images.length > 0 ? images : [zillowProperty.imgSrc].filter(Boolean),
        description: zillowProperty.description,
        coordinates:
          zillowProperty.latitude && zillowProperty.longitude
            ? `POINT(${zillowProperty.longitude} ${zillowProperty.latitude})`
            : null,
        neighborhood_id: neighborhoodId,
        amenities: zillowProperty.amenities || [],
        year_built: zillowProperty.yearBuilt,
        lot_size_sqft: zillowProperty.lotAreaValue,
        parking_spots: zillowProperty.parkingFeatures?.length || 0,
        listing_status: 'active',
        property_hash: this.generatePropertyHash(zillowProperty),
        is_active: true,
      }

      // Upsert to database
      await this.supabase.from('properties').upsert(property, {
        onConflict: 'zpid',
        ignoreDuplicates: false,
      })
    } catch (error) {
      console.error(
        `❌ Error processing property ${zillowProperty.zpid}:`,
        error
      )
    }
  }

  private mapPropertyType(homeType: string): string {
    const typeMap: Record<string, string> = {
      SINGLE_FAMILY: 'house',
      TOWNHOUSE: 'townhouse',
      CONDO: 'condo',
      APARTMENT: 'apartment',
      MULTI_FAMILY: 'house',
    }
    return typeMap[homeType] || 'house'
  }

  private generatePropertyHash(property: any): string {
    const hashData = `${property.zpid}-${property.price}-${property.streetAddress}`
    return Buffer.from(hashData).toString('base64').slice(0, 16)
  }
}
```

#### API Route for Manual Ingestion

```typescript
// app/api/admin/ingest/route.ts
import { PropertyIngestionService } from '@/lib/services/property-ingestion'
import { NextRequest, NextResponse } from 'next/server'

export async function POST(request: NextRequest) {
  try {
    const { neighborhoodId } = await request.json()

    if (!neighborhoodId) {
      return NextResponse.json(
        { error: 'Neighborhood ID required' },
        { status: 400 }
      )
    }

    const ingestionService = new PropertyIngestionService()
    await ingestionService.ingestPropertiesForNeighborhood(neighborhoodId)

    return NextResponse.json({
      success: true,
      message: `Properties ingested for neighborhood ${neighborhoodId}`,
    })
  } catch (error) {
    console.error('Ingestion error:', error)
    return NextResponse.json({ error: 'Ingestion failed' }, { status: 500 })
  }
}
```

#### Scheduled Ingestion with Inngest

```typescript
// lib/inngest/functions/property-ingestion.ts
import { inngest } from '../client'
import { PropertyIngestionService } from '@/lib/services/property-ingestion'

export const schedulePropertyIngestion = inngest.createFunction(
  { id: 'scheduled-property-ingestion' },
  { cron: '0 2 * * *' }, // Daily at 2 AM
  async ({ step }) => {
    const ingestionService = new PropertyIngestionService()

    // Get active neighborhoods
    const neighborhoods = await step.run('get-neighborhoods', async () => {
      const { data } = await supabase
        .from('neighborhoods')
        .select('id, name')
        .not('bounds', 'is', null)
        .limit(10) // Process 10 neighborhoods per day

      return data || []
    })

    // Ingest properties for each neighborhood
    for (const neighborhood of neighborhoods) {
      await step.run(`ingest-${neighborhood.id}`, async () => {
        await ingestionService.ingestPropertiesForNeighborhood(neighborhood.id)
        return { neighborhoodId: neighborhood.id, name: neighborhood.name }
      })

      // Add delay between neighborhoods to respect rate limits
      await step.sleep('rate-limit-delay', '30s')
    }

    return {
      processedNeighborhoods: neighborhoods.length,
      message: 'Property ingestion completed successfully',
    }
  }
)
```

#### Day 33: ML Scoring System Migration

```typescript
// scripts/migrate/05-ml-scoring-system.ts
export async function migrateMLScoringSystem() {
  console.log('🧠 Migrating ML scoring system...')

  const legacySupabase = createClient(
    process.env.LEGACY_SUPABASE_URL!,
    process.env.LEGACY_SERVICE_KEY!
  )

  const newSupabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_KEY!
  )

  // 1. Migrate existing property scores
  const { data: existingScores } = await legacySupabase
    .from('property_scores')
    .select('*')

  if (existingScores?.length) {
    console.log(`📊 Found ${existingScores.length} existing property scores`)

    // Transform to new schema (storing in score_data JSONB)
    const transformedScores = existingScores.map((score) => ({
      user_id: score.user_id,
      property_id: score.property_id,
      interaction_type: 'view', // Retroactive scoring
      score_data: {
        total_score: score.total_score,
        price_score: score.price_score,
        location_score: score.location_score,
        features_score: score.features_score,
        model_phase: score.model_phase || 'cold-start',
        legacy_migration: true,
      },
      created_at: score.created_at,
    }))

    // Insert as interactions with score data
    await newSupabase
      .from('user_property_interactions')
      .upsert(transformedScores, {
        onConflict: 'user_id,property_id,interaction_type',
      })

    console.log('✅ Migrated property scores to interaction score_data')
  }

  // 2. Copy ML model weights/parameters if stored in DB
  try {
    const { data: modelWeights } = await legacySupabase
      .from('user_preference_weights')
      .select('*')

    if (modelWeights?.length) {
      console.log(`🎯 Found ${modelWeights.length} user preference weights`)

      // Store in user_profiles preferences JSONB
      for (const weight of modelWeights) {
        await newSupabase.from('user_profiles').upsert(
          {
            id: weight.user_id,
            preferences: {
              ml_weights: {
                price_weight: weight.price_weight,
                location_weight: weight.location_weight,
                size_weight: weight.size_weight,
                features_weight: weight.features_weight,
              },
              migrated_from_ml_system: true,
            },
          },
          { onConflict: 'id' }
        )
      }

      console.log('✅ Migrated ML preference weights')
    }
  } catch (error) {
    console.log('ℹ️ No ML preference weights found (this is normal)')
  }

  // 3. Deploy scoring Edge Function
  console.log('🚀 Deploying ML scoring Edge Function...')

  // Copy your existing scoring function
  const scoringFunction = `
    // Preserve your 3-phase ML scoring system
    function selectModelPhase(swipeCount) {
      if (swipeCount >= 100) return 'lightgbm'
      if (swipeCount >= 10) return 'online-lr' 
      return 'cold-start'
    }
    
    // Your existing algorithms preserved
    function calculateColdStartScore(features, preferences) {
      let score = features.overall_preference_alignment * 0.6
      if (features.has_images) score += 0.1
      if (features.has_description) score += 0.05
      // ... rest of your cold-start logic
      return Math.min(1, score)
    }
  `

  // Write to new Edge Function
  await writeFile('supabase/functions/score-v2/index.ts', scoringFunction)

  console.log('🎉 ML scoring system migration complete!')
}
```

#### AI Configuration (Optional - Add When Ready)

```env
# .env.local - AI configuration
# Choose your preferred provider for cost efficiency
AI_PROVIDER=chinese  # or 'anthropic' or 'openai'

# Chinese models (cost-effective)
QWEN_API_KEY=your-qwen-key
QWEN_API_BASE=your-qwen-endpoint

# Alternative providers
ANTHROPIC_API_KEY=your-anthropic-key
OPENAI_API_KEY=your-openai-key
```

#### Natural Language Search Implementation

```typescript
// lib/ai/search-parser.ts - Add when ready for NL search
export async function parseSearchQuery(query: string): Promise<SearchCriteria> {
  // Example: "$2.5M homes in San Jose AND $1.5-2M in Oakland Hills"

  if (process.env.AI_PROVIDER === 'chinese') {
    return await parseWithQwen(query)
  } else if (process.env.AI_PROVIDER === 'anthropic') {
    return await parseWithClaude(query)
  } else {
    // Fallback to simple keyword parsing
    return parseWithKeywords(query)
  }
}

// Cost-effective Chinese model integration
async function parseWithQwen(query: string) {
  const response = await fetch(
    process.env.QWEN_API_BASE + '/chat/completions',
    {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${process.env.QWEN_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'qwen-turbo',
        messages: [
          {
            role: 'system',
            content:
              'Convert real estate queries to structured search criteria...',
          },
          {
            role: 'user',
            content: query,
          },
        ],
      }),
    }
  )

  const data = await response.json()
  return JSON.parse(data.choices[0].message.content)
}
```

This implementation guide provides a comprehensive, step-by-step approach to building HomeMatch V2. Each section includes practical code examples and can be followed sequentially to create a fully functional property browsing application.

**Key Benefits:**

- **Preserves your valuable production data** - properties and neighborhood polygons
- **Maintains your sophisticated ML scoring system** - 3-phase cold-start → online-LR → LightGBM
- **Excellent Zillow API integration** - continues using `zillow-com1.p.rapidapi.com`
- **Cost-effective AI options** - Chinese models for natural language search
- **Modular approach** - add AI features when ready, core app works without them
