# HomeMatch V2 - New Architecture Design

## Technology Stack

### Core Framework

- **Next.js 15** - App Router with React 19 and Server Components
- **TypeScript 5.x** - Full type safety throughout the application
- **Tailwind CSS 3.4+** - Utility-first styling with custom design tokens
- **shadcn/ui** - Modern, accessible component library built on Radix

### Backend Services

- **Supabase** - PostgreSQL database with built-in authentication and real-time features
- **Supabase Auth** - Handles user authentication, sessions, and Google OAuth
- **Row-Level Security** - Database-level authorization and data protection
- **Edge Functions** - Serverless functions for complex business logic

### State Management

- **TanStack Query v5** - Server state management with caching, background updates, and optimistic mutations
- **Zustand** - Lightweight client state for UI interactions and temporary data
- **React Hook Form** - Form state management with validation

### Validation & Type Safety

- **Zod** - Runtime type validation for all API inputs, forms, and data transformations
- **TypeScript 5.x** - Compile-time type checking with strict configuration
- **Generated Types** - Supabase auto-generated database types

### Testing Strategy

- **Jest** - Unit tests for components, functions, and utilities with React Testing Library
- **Vitest** - Fast integration tests for API routes, services, and database operations
- **Playwright** - End-to-end testing with cross-browser support
- **React Testing Library** - Component testing utilities with Jest

### Code Quality & Development

- **ESLint** - Linting with Next.js, TypeScript, and React rules
- **Prettier** - Code formatting with consistent style
- **Husky** - Git hooks for pre-commit quality checks
- **TypeScript Strict Mode** - Maximum type safety

### Background Jobs & Workflows

- **Inngest** - Type-safe background jobs, cron jobs, and workflows
- **Edge Functions** - Serverless functions with global distribution
- **Webhooks** - Real-time event processing from Supabase

### Monitoring & Analytics

- **Sentry** - Error tracking, performance monitoring, and alerting
- **PostHog** - Product analytics, feature flags, and user behavior tracking
- **Vercel Analytics** - Web vitals and performance metrics
- **Supabase Logs** - Database query performance and real-time monitoring
- **ML Model Performance** - Track scoring accuracy, user engagement, and model drift

### AI & ML Integration

- **Natural Language Search** - Convert user queries to search criteria ("$2.5M homes in San Jose AND $1.5-2M in Oakland Hills")
- **3-Phase ML Scoring System** - Preserve existing cold-start → online-LR → LightGBM progression
- **Chinese LLM Models** - Cost-effective alternatives (Qwen, DeepSeek, ChatGLM) for NL processing
- **Scoring Migration** - Preserve your sophisticated ML property matching system

### Development & Deployment

- **Vercel** - Hosting with Edge Runtime and global CDN
- **GitHub Actions** - CI/CD pipeline with automated testing and deployment
- **Next.js Middleware** - Edge-enforced route protection and authentication
- **Edge Runtime** - Global compute with minimal cold starts

## Database Architecture

### Schema Design

```sql
-- User profiles (extends Supabase auth.users)
CREATE TABLE user_profiles (
  id UUID REFERENCES auth.users(id) PRIMARY KEY,
  household_id UUID REFERENCES households(id),
  onboarding_completed BOOLEAN DEFAULT FALSE,
  preferences JSONB DEFAULT '{}',
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Households for collaboration (essential for multi-user property viewing)
CREATE TABLE households (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  collaboration_mode TEXT DEFAULT 'independent' CHECK (collaboration_mode IN ('independent', 'shared', 'weighted')),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Properties with complete information
CREATE TABLE properties (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  zpid TEXT UNIQUE, -- Zillow integration
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
  listing_status TEXT DEFAULT 'active',
  property_hash TEXT UNIQUE, -- For deduplication
  is_active BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- User property interactions (likes, dislikes, skips)
CREATE TABLE user_property_interactions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) NOT NULL,
  property_id UUID REFERENCES properties(id) NOT NULL,
  household_id UUID REFERENCES households(id), -- For collaboration
  interaction_type TEXT CHECK (interaction_type IN ('like', 'dislike', 'skip', 'view')) NOT NULL,
  score_data JSONB, -- Store ML scores with interaction
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(user_id, property_id, interaction_type)
);

-- Geographic data (simplified from complex 4-table hierarchy)
CREATE TABLE neighborhoods (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  city TEXT NOT NULL,
  state TEXT NOT NULL,
  metro_area TEXT, -- Simplified geographic context
  bounds POLYGON,
  median_price INTEGER,
  walk_score INTEGER,
  transit_score INTEGER,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- User saved searches
CREATE TABLE saved_searches (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) NOT NULL,
  household_id UUID REFERENCES households(id), -- Share searches within household
  name TEXT NOT NULL,
  filters JSONB NOT NULL,
  is_active BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);
```

### Row-Level Security Policies

```sql
-- Users can only access their own data
CREATE POLICY "users_own_profile" ON user_profiles
  FOR ALL USING (auth.uid() = id);

CREATE POLICY "users_own_interactions" ON user_property_interactions
  FOR ALL USING (auth.uid() = user_id);

CREATE POLICY "users_own_searches" ON saved_searches
  FOR ALL USING (auth.uid() = user_id);

-- Household policies
CREATE POLICY "users_household_access" ON households
  FOR SELECT USING (
    id IN (
      SELECT household_id FROM user_profiles WHERE id = auth.uid()
    )
  );

-- Properties are public read, admin write
CREATE POLICY "properties_public_read" ON properties
  FOR SELECT USING (TRUE);

CREATE POLICY "neighborhoods_public_read" ON neighborhoods
  FOR SELECT USING (TRUE);
```

## Authentication Architecture

### Supabase Auth Integration

```typescript
// lib/supabase/client.ts
import { createClientComponentClient } from '@supabase/auth-helpers-nextjs'
export const createClient = () => createClientComponentClient()

// lib/supabase/server.ts
import { createServerComponentClient } from '@supabase/auth-helpers-nextjs'
import { cookies } from 'next/headers'
export const createServerClient = () => createServerComponentClient({ cookies })
```

### Authentication Flow

1. **Sign Up**: Email/password with automatic email verification
2. **Sign In**: Password-based or Google OAuth
3. **Session Management**: Automatic token refresh and persistence
4. **Edge Route Protection**: Next.js Middleware with global enforcement
5. **Profile Creation**: Automatic user_profiles record on first sign-in
6. **Security Monitoring**: Sentry integration for auth failures and security events

### Edge-Enforced Route Protection

```typescript
// middleware.ts - Runs on Vercel Edge Runtime globally
import { createMiddlewareClient } from '@supabase/auth-helpers-nextjs'
import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'
import { withSentryEdge } from '@sentry/nextjs'

async function middleware(req: NextRequest) {
  const res = NextResponse.next()
  const supabase = createMiddlewareClient({ req, res })

  const {
    data: { session },
    error,
  } = await supabase.auth.getSession()

  // Log auth errors to Sentry
  if (error) {
    console.error('Auth middleware error:', error)
    // Sentry will automatically capture this in Edge Runtime
  }

  const isAuthPage = req.nextUrl.pathname.startsWith('/auth')
  const isProtectedPage =
    req.nextUrl.pathname.startsWith('/dashboard') ||
    req.nextUrl.pathname.startsWith('/onboarding')
  const isApiRoute = req.nextUrl.pathname.startsWith('/api')

  // Protect API routes
  if (isApiRoute && req.nextUrl.pathname !== '/api/auth/callback' && !session) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  // Redirect authenticated users away from auth pages
  if (session && isAuthPage) {
    return NextResponse.redirect(new URL('/dashboard', req.url))
  }

  // Redirect unauthenticated users to login
  if (!session && isProtectedPage) {
    const loginUrl = new URL('/auth/login', req.url)
    loginUrl.searchParams.set('redirectTo', req.nextUrl.pathname)
    return NextResponse.redirect(loginUrl)
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

  // Add security headers
  res.headers.set('X-Frame-Options', 'DENY')
  res.headers.set('X-Content-Type-Options', 'nosniff')
  res.headers.set('Referrer-Policy', 'strict-origin-when-cross-origin')

  return res
}

export default withSentryEdge(middleware)

export const config = {
  matcher: [
    '/((?!_next/static|_next/image|favicon.ico|.*\.(?:svg|png|jpg|jpeg|gif|webp)$).*)',
  ],
  // Run on Edge Runtime for global performance
  runtime: 'edge',
}
```

## State Management Architecture

### TanStack Query (Server State)

```typescript
// hooks/useProperties.ts
import {
  useInfiniteQuery,
  useMutation,
  useQueryClient,
} from '@tanstack/react-query'

export function useProperties(filters: PropertyFilters) {
  return useInfiniteQuery({
    queryKey: ['properties', filters],
    queryFn: ({ pageParam = 0 }) => getProperties(filters, pageParam),
    getNextPageParam: (lastPage) => lastPage.nextCursor,
    staleTime: 5 * 60 * 1000, // 5 minutes
    cacheTime: 10 * 60 * 1000, // 10 minutes
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
      // Optimistic update
      await queryClient.cancelQueries(['properties'])
      // Update UI immediately
    },
    onError: (err, variables, context) => {
      // Rollback on error
      queryClient.setQueryData(['properties'], context?.previousData)
    },
  })
}
```

### Zustand (Client State)

```typescript
// stores/appStore.ts
import { create } from 'zustand'
import { devtools } from 'zustand/middleware'

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
    openPropertyDetail: (id: string) => void
    closePropertyDetail: () => void
    recordSwipe: (propertyId: string) => void
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

        setTempFilters: (filters) => set({ tempSearchFilters: filters }),

        openPropertyDetail: (id) =>
          set({
            isPropertyDetailOpen: true,
            selectedPropertyId: id,
          }),

        recordSwipe: (propertyId) =>
          set((state) => ({
            swipeHistory: [...state.swipeHistory, propertyId],
          })),
      },
    }),
    { name: 'app-store' }
  )
)
```

## Component Architecture

### Directory Structure

```typescript
components/
├── ui/                     # shadcn/ui components (auto-generated)
│   ├── button.tsx         # Button variants and styles
│   ├── card.tsx           # Card layouts
│   ├── dialog.tsx         # Modal dialogs
│   ├── form.tsx           # Form components with validation
│   ├── input.tsx          # Input fields
│   ├── select.tsx         # Dropdown selects
│   ├── slider.tsx         # Range sliders
│   └── toast.tsx          # Notification toasts
├── features/              # Feature-specific components
│   ├── auth/
│   │   ├── LoginForm.tsx          # Login with email/password
│   │   ├── SignupForm.tsx         # User registration
│   │   ├── SocialLogin.tsx        # Google OAuth button
│   │   └── ResetPasswordForm.tsx  # Password reset
│   ├── properties/
│   │   ├── PropertyCard.tsx       # Property display card
│   │   ├── PropertySwiper.tsx     # Tinder-style interface
│   │   ├── PropertyDetail.tsx     # Full property modal
│   │   ├── PropertyFilters.tsx    # Search and filter UI
│   │   ├── PropertyGallery.tsx    # Image carousel
│   │   └── PropertyMap.tsx        # Location map
│   ├── dashboard/
│   │   ├── UserStats.tsx          # User activity overview
│   │   ├── LikedProperties.tsx    # Favorited properties
│   │   ├── SearchHistory.tsx      # Recent searches
│   │   └── PreferencesForm.tsx    # User settings
│   └── onboarding/
│       ├── WelcomeStep.tsx        # Introduction
│       ├── PreferencesStep.tsx    # Initial preferences
│       └── CompletionStep.tsx     # Onboarding finish
├── layouts/
│   ├── AppLayout.tsx              # Main app shell with navigation
│   ├── AuthLayout.tsx             # Authentication pages layout
│   └── OnboardingLayout.tsx       # Onboarding flow layout
└── providers/
    ├── QueryProvider.tsx          # TanStack Query setup
    ├── ThemeProvider.tsx          # shadcn/ui theming
    └── ToastProvider.tsx          # Global notifications
```

### Design System & Theming

```typescript
// tailwind.config.js
module.exports = {
  darkMode: ['class'],
  content: ['./app/**/*.{ts,tsx}', './components/**/*.{ts,tsx}'],
  theme: {
    extend: {
      colors: {
        border: 'hsl(var(--border))',
        background: 'hsl(var(--background))',
        foreground: 'hsl(var(--foreground))',
        primary: {
          DEFAULT: 'hsl(var(--primary))',
          foreground: 'hsl(var(--primary-foreground))',
        },
        // ... more design tokens
      },
      animation: {
        'swipe-left': 'swipeLeft 0.3s ease-out',
        'swipe-right': 'swipeRight 0.3s ease-out',
        'fade-in': 'fadeIn 0.2s ease-in',
      },
    },
  },
  plugins: [require('tailwindcss-animate')],
}
```

## Validation Architecture with Zod

### Comprehensive Schema Definitions

```typescript
// lib/schemas/property.ts
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
  lot_size_sqft: z.number().int().positive().optional(),
  parking_spots: z.number().int().min(0).default(0),
  is_active: z.boolean().default(true),
  created_at: z.string().datetime(),
  updated_at: z.string().datetime(),
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
    squareFeetMin: z.number().int().positive().optional(),
    squareFeetMax: z.number().int().positive().optional(),
    yearBuiltMin: z.number().int().min(1800).optional(),
    yearBuiltMax: z.number().int().max(new Date().getFullYear()).optional(),
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

export const PropertySearchSchema = z.object({
  filters: PropertyFiltersSchema.optional(),
  limit: z.number().int().min(1).max(100).default(20),
  offset: z.number().int().min(0).default(0),
  orderBy: z
    .enum(['price', 'created_at', 'bedrooms', 'square_feet'])
    .default('created_at'),
  orderDirection: z.enum(['asc', 'desc']).default('desc'),
})

// Type inference from schemas
export type Property = z.infer<typeof PropertySchema>
export type PropertyFilters = z.infer<typeof PropertyFiltersSchema>
export type PropertySearch = z.infer<typeof PropertySearchSchema>
```

```typescript
// lib/schemas/user.ts
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
  maxCommute: z.number().int().min(0).max(120).optional(), // minutes
  amenities: z.array(z.string()).default([]),
  dealBreakers: z.array(z.string()).default([]),
  neighborhoods: z.array(z.string().uuid()).default([]),
})

export const UserProfileSchema = z.object({
  id: z.string().uuid(),
  onboarding_completed: z.boolean().default(false),
  preferences: UserPreferencesSchema.optional(),
  created_at: z.string().datetime(),
  updated_at: z.string().datetime(),
})

export const OnboardingStepSchema = z.object({
  step: z.enum(['preferences', 'location', 'budget', 'complete']),
  data: z.record(z.unknown()),
})

export type UserPreferences = z.infer<typeof UserPreferencesSchema>
export type UserProfile = z.infer<typeof UserProfileSchema>
export type OnboardingStep = z.infer<typeof OnboardingStepSchema>
```

```typescript
// lib/schemas/interaction.ts
import { z } from 'zod'

export const InteractionSchema = z.object({
  propertyId: z.string().uuid('Invalid property ID'),
  type: z.enum(['like', 'dislike', 'skip', 'view'], {
    errorMap: () => ({
      message: 'Interaction type must be like, dislike, skip, or view',
    }),
  }),
  metadata: z.record(z.unknown()).optional(), // For additional data like swipe direction, time spent
})

export const SavedSearchSchema = z.object({
  name: z.string().min(1, 'Search name is required').max(100, 'Name too long'),
  filters: PropertyFiltersSchema,
  notifications: z.boolean().default(false),
})

export type Interaction = z.infer<typeof InteractionSchema>
export type SavedSearch = z.infer<typeof SavedSearchSchema>
```

## API Architecture with Zod Validation

### Route Structure

```typescript
app/api/
├── auth/
│   └── callback/route.ts          # Supabase auth callback
├── properties/
│   ├── route.ts                   # GET: search properties (PropertySearchSchema)
│   ├── [id]/route.ts             # GET: property details (UuidSchema)
│   └── recommendations/route.ts   # GET: personalized recommendations
├── interactions/
│   └── route.ts                   # POST: record user interactions (InteractionSchema)
├── users/
│   ├── profile/route.ts          # GET/PUT: user profile (UserProfileSchema)
│   └── preferences/route.ts      # GET/PUT: user preferences (UserPreferencesSchema)
└── search/
    ├── saved/route.ts            # GET/POST/DELETE: saved searches (SavedSearchSchema)
    └── suggestions/route.ts      # GET: search autocomplete
```

### Type-Safe API Implementation Pattern

```typescript
// lib/api/validation.ts - Reusable validation utilities
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

    // Convert URL search params to object with type coercion
    searchParams.forEach((value, key) => {
      // Handle arrays (e.g., ?neighborhoods=id1&neighborhoods=id2)
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
```

```typescript
// app/api/properties/route.ts
import { createServerClient } from '@/lib/supabase/server'
import { NextRequest, NextResponse } from 'next/server'
import { PropertySearchSchema } from '@/lib/schemas/property'
import { validateSearchParams } from '@/lib/api/validation'

export async function GET(request: NextRequest) {
  try {
    const supabase = createServerClient()

    // Verify authentication
    const {
      data: { session },
      error: authError,
    } = await supabase.auth.getSession()
    if (authError || !session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Validate query parameters with comprehensive Zod schema
    const validation = validateSearchParams(request, PropertySearchSchema)
    if (!validation.success) {
      return validation.error
    }

    const { filters, limit, offset, orderBy, orderDirection } = validation.data

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
    if (filters?.priceMin) query = query.gte('price', filters.priceMin)
    if (filters?.priceMax) query = query.lte('price', filters.priceMax)
    if (filters?.bedrooms) query = query.gte('bedrooms', filters.bedrooms)
    if (filters?.bathrooms) query = query.gte('bathrooms', filters.bathrooms)
    if (filters?.propertyType)
      query = query.eq('property_type', filters.propertyType)
    if (filters?.city) query = query.ilike('city', `%${filters.city}%`)
    if (filters?.neighborhoods?.length)
      query = query.in('neighborhood_id', filters.neighborhoods)
    if (filters?.squareFeetMin)
      query = query.gte('square_feet', filters.squareFeetMin)
    if (filters?.squareFeetMax)
      query = query.lte('square_feet', filters.squareFeetMax)
    if (filters?.yearBuiltMin)
      query = query.gte('year_built', filters.yearBuiltMin)
    if (filters?.yearBuiltMax)
      query = query.lte('year_built', filters.yearBuiltMax)

    // Apply pagination and ordering
    const { data: properties, error } = await query
      .range(offset, offset + limit - 1)
      .order(orderBy, { ascending: orderDirection === 'asc' })

    if (error) throw error

    // Return type-safe response
    return NextResponse.json({
      properties: properties || [],
      pagination: {
        offset,
        limit,
        hasMore: (properties?.length || 0) === limit,
      },
      filters: filters || {},
      total: properties?.length || 0,
    })
  } catch (error) {
    console.error('Properties API error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}
```

```typescript
// app/api/interactions/route.ts
import { createServerClient } from '@/lib/supabase/server'
import { NextRequest, NextResponse } from 'next/server'
import { InteractionSchema } from '@/lib/schemas/interaction'
import { validateRequestBody } from '@/lib/api/validation'

export async function POST(request: NextRequest) {
  try {
    const supabase = createServerClient()

    // Verify authentication
    const {
      data: { session },
      error: authError,
    } = await supabase.auth.getSession()
    if (authError || !session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Validate request body
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

    return NextResponse.json({
      success: true,
      interaction: { propertyId, type, timestamp: new Date().toISOString() },
    })
  } catch (error) {
    console.error('Interaction API error:', error)
    return NextResponse.json(
      { error: 'Failed to record interaction' },
      { status: 500 }
    )
  }
}
```

## Form Validation with Zod + React Hook Form

### Type-Safe Form Handling

```typescript
// hooks/useValidatedForm.ts
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
    mode: 'onChange', // Validate on change for better UX
  })
}
```

```typescript
// components/features/properties/PropertyFiltersForm.tsx
import { useValidatedForm } from '@/hooks/useValidatedForm'
import { PropertyFiltersSchema } from '@/lib/schemas/property'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form'

interface PropertyFiltersFormProps {
  onSubmit: (data: z.infer<typeof PropertyFiltersSchema>) => void
  initialValues?: Partial<z.infer<typeof PropertyFiltersSchema>>
}

export function PropertyFiltersForm({ onSubmit, initialValues }: PropertyFiltersFormProps) {
  const form = useValidatedForm(PropertyFiltersSchema, initialValues)

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
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
          name="propertyType"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Property Type</FormLabel>
              <Select onValueChange={field.onChange} defaultValue={field.value}>
                <FormControl>
                  <SelectTrigger>
                    <SelectValue placeholder="Select property type" />
                  </SelectTrigger>
                </FormControl>
                <SelectContent>
                  <SelectItem value="house">House</SelectItem>
                  <SelectItem value="condo">Condo</SelectItem>
                  <SelectItem value="townhouse">Townhouse</SelectItem>
                  <SelectItem value="apartment">Apartment</SelectItem>
                </SelectContent>
              </Select>
              <FormMessage />
            </FormItem>
          )}
        />

        <Button
          type="submit"
          className="w-full"
          disabled={!form.formState.isValid || form.formState.isSubmitting}
        >
          Apply Filters
        </Button>
      </form>
    </Form>
  )
}
```

## Background Jobs & Workflows with Inngest

### Inngest Integration

```typescript
// lib/inngest/client.ts
import { Inngest } from 'inngest'
import { serve } from 'inngest/next'

export const inngest = new Inngest({
  id: 'homematch',
  name: 'HomeMatch',
})

// app/api/inngest/route.ts
import { serve } from 'inngest/next'
import { inngest } from '@/lib/inngest/client'
import {
  sendPropertyNotification,
  processPropertyImages,
  updateMarketData,
} from '@/lib/inngest/functions'

export const { GET, POST, PUT } = serve({
  client: inngest,
  functions: [
    sendPropertyNotification,
    processPropertyImages,
    updateMarketData,
  ],
})
```

### Background Job Examples

```typescript
// lib/inngest/functions/property-notifications.ts
import { inngest } from '../client'
import { createClient } from '@/lib/supabase/server'

export const sendPropertyNotification = inngest.createFunction(
  { id: 'send-property-notification' },
  { event: 'property/new-match' },
  async ({ event, step }) => {
    const { userId, propertyId } = event.data

    // Step 1: Get user preferences
    const userPrefs = await step.run('get-user-preferences', async () => {
      const supabase = createClient()
      return supabase
        .from('user_profiles')
        .select('preferences')
        .eq('id', userId)
        .single()
    })

    // Step 2: Calculate match score
    const matchScore = await step.run('calculate-match-score', async () => {
      // AI-powered property matching logic
      return calculatePropertyMatch(propertyId, userPrefs.data.preferences)
    })

    // Step 3: Send notification if good match
    if (matchScore > 0.8) {
      await step.run('send-notification', async () => {
        // Send push notification, email, etc.
        return sendPushNotification(userId, {
          title: 'New Property Match!',
          body: `We found a ${Math.round(matchScore * 100)}% match for you`,
          data: { propertyId },
        })
      })
    }

    return { matchScore, notificationSent: matchScore > 0.8 }
  }
)

// Cron job for market data updates
export const updateMarketData = inngest.createFunction(
  { id: 'update-market-data' },
  { cron: '0 6 * * *' }, // Daily at 6 AM
  async ({ step }) => {
    // Update neighborhood price trends
    await step.run('update-price-trends', async () => {
      // Fetch external market data APIs
      return updateNeighborhoodPrices()
    })

    // Update walk scores
    await step.run('update-walk-scores', async () => {
      return updateWalkScores()
    })

    return { status: 'completed' }
  }
)
```

## Monitoring & Analytics

### Sentry Configuration

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

  // Custom error filtering
  beforeSend(event) {
    // Filter out known non-issues
    if (event.exception) {
      const error = event.exception.values?.[0]
      if (error?.value?.includes('Non-Error promise rejection')) {
        return null
      }
    }
    return event
  },

  // Custom tags
  initialScope: {
    tags: {
      component: 'homematch-frontend',
    },
  },
})
```

### PostHog Analytics

```typescript
// lib/analytics/posthog.ts
import { PostHog } from 'posthog-node'

const posthog = new PostHog(process.env.NEXT_PUBLIC_POSTHOG_KEY!, {
  host: process.env.NEXT_PUBLIC_POSTHOG_HOST || 'https://app.posthog.com',
})

// Track property interactions
export function trackPropertyInteraction(
  userId: string,
  propertyId: string,
  action: string
) {
  posthog.capture({
    distinctId: userId,
    event: 'property_interaction',
    properties: {
      propertyId,
      action,
      timestamp: new Date().toISOString(),
    },
  })
}

// Track user journey
export function trackUserJourney(
  userId: string,
  step: string,
  metadata?: Record<string, any>
) {
  posthog.capture({
    distinctId: userId,
    event: 'user_journey',
    properties: {
      step,
      ...metadata,
      timestamp: new Date().toISOString(),
    },
  })
}
```

## AI & ML Integration

### Natural Language Search Processing

```typescript
// lib/ai/natural-language-search.ts
import { ChatCompletionMessageParam } from 'openai/resources'

interface SearchQuery {
  operator: 'AND' | 'OR'
  conditions: SearchCondition[]
}

interface SearchCondition {
  operator: 'AND' | 'OR'
  filters: PropertyFilter[]
}

interface PropertyFilter {
  field: 'price' | 'bedrooms' | 'bathrooms' | 'neighborhoods' | 'property_type'
  operator: '=' | '<=' | '>=' | 'in' | 'between'
  value: any
}

export async function parseNaturalLanguageQuery(
  query: string
): Promise<SearchQuery> {
  // Use cost-effective Chinese models or Anthropic
  const model =
    process.env.AI_PROVIDER === 'chinese' ? 'qwen' : 'claude-3-haiku'

  const systemPrompt = `You are a real estate search query parser. Convert natural language into structured search criteria.

Examples:
"$2.5M homes in San Jose AND homes between $1.5M-2M in Oakland Hills" → 
{
  "operator": "OR",
  "conditions": [
    {
      "operator": "AND",
      "filters": [
        {"field": "price", "operator": "<=", "value": 2500000},
        {"field": "neighborhoods", "operator": "in", "value": ["san-jose"]}
      ]
    },
    {
      "operator": "AND",
      "filters": [
        {"field": "price", "operator": "between", "value": [1500000, 2000000]},
        {"field": "neighborhoods", "operator": "in", "value": ["oakland-hills"]}
      ]
    }
  ]
}

Return only valid JSON.`

  const response = await callLLM(model, systemPrompt, query)
  return JSON.parse(response)
}

function callLLM(
  model: string,
  system: string,
  query: string
): Promise<string> {
  switch (process.env.AI_PROVIDER) {
    case 'chinese':
      return callQwenAPI(system, query)
    case 'anthropic':
      return callClaudeAPI(system, query)
    default:
      throw new Error('No AI provider configured')
  }
}
```

### ML Scoring System (Migrated from Production)

```typescript
// lib/ml/property-scoring.ts - Preserve your 3-phase ML system
export class PropertyScoringService {
  selectModelPhase(
    userSwipeCount: number
  ): 'cold-start' | 'online-lr' | 'lightgbm' {
    if (userSwipeCount >= 100) return 'lightgbm' // Advanced ML
    if (userSwipeCount >= 10) return 'online-lr' // Learning from swipes
    return 'cold-start' // Preference-based
  }

  async scoreProperty(
    property: Property,
    userPreferences: UserPreferences,
    userSwipes: UserSwipe[]
  ): Promise<PropertyScore> {
    // Hard constraints filtering (preserve from your existing system)
    const constraintCheck = this.checkHardConstraints(userPreferences, property)
    if (!constraintCheck.passes) {
      return {
        total_score: 0,
        constraint_violation: constraintCheck.reason,
        model_phase: 'constraints',
      }
    }

    // Feature engineering (preserve your existing features)
    const features = this.extractFeatures(property, userPreferences)
    const modelPhase = this.selectModelPhase(userSwipes.length)

    let score: number

    switch (modelPhase) {
      case 'cold-start':
        score = this.calculateColdStartScore(features, userPreferences)
        break
      case 'online-lr':
        score = this.calculateOnlineLRScore(features, userSwipes)
        break
      case 'lightgbm':
        score = await this.callLightGBMModel(features)
        break
    }

    return {
      total_score: Math.round(score * 100), // 0-100 scale
      price_score: features.price_alignment,
      location_score: features.location_alignment,
      features_score: features.amenity_alignment,
      model_phase: modelPhase,
      features_used: Object.keys(features),
    }
  }

  private checkHardConstraints(
    preferences: UserPreferences,
    property: Property
  ) {
    // Preserve your existing constraint logic
    if (
      preferences.priceRange?.min &&
      property.price < preferences.priceRange.min
    ) {
      return {
        passes: false,
        reason: `Price $${property.price.toLocaleString()} below minimum`,
      }
    }
    if (
      preferences.priceRange?.max &&
      property.price > preferences.priceRange.max
    ) {
      return {
        passes: false,
        reason: `Price $${property.price.toLocaleString()} above maximum`,
      }
    }
    return { passes: true }
  }

  private calculateColdStartScore(
    features: PropertyFeatures,
    preferences: UserPreferences
  ): number {
    // Preserve your existing cold-start algorithm
    let score = features.overall_preference_alignment * 0.6

    // Property quality bonuses
    if (features.has_images) score += 0.1
    if (features.has_description) score += 0.05
    if (features.price_per_sqft > 0) {
      const priceEfficiency = Math.max(0, 1 - features.price_per_sqft / 1000)
      score += priceEfficiency * 0.1
    }

    return Math.min(1, score)
  }
}
```

## Performance & Optimization

### Bundle Optimization

- **Code Splitting**: Automatic route-based splitting with Next.js 15
- **Tree Shaking**: Import only used shadcn/ui components
- **Zod Tree Shaking**: Import specific validators to reduce bundle size
- **Image Optimization**: Next.js Image component with Vercel optimization
- **Font Optimization**: Local font hosting with font-display: swap

### Validation Performance

- **Schema Memoization**: Cache Zod schemas to avoid re-parsing
- **Lazy Validation**: Validate forms on change/blur, not on every keystroke
- **Transform vs Parse**: Use `.transform()` for data cleaning, `.parse()` for validation
- **Custom Error Messages**: Provide user-friendly validation feedback

### Caching Strategy

- **TanStack Query**: 5-minute stale time, 10-minute cache time for properties
- **Supabase**: Built-in query caching and connection pooling
- **Vercel**: Edge caching for static assets and API responses
- **Browser**: Service worker for offline property viewing
- **Schema Caching**: Memoize complex Zod schemas for better performance

### Monitoring Performance

- **Sentry Performance**: Track API response times and database queries
- **PostHog**: User interaction analytics and conversion funnels
- **Vercel Analytics**: Core Web Vitals and real user metrics
- **Inngest Monitoring**: Background job success rates and execution times

### Database Performance

- **Indexes**: Composite indexes on frequently queried columns
- **Connection Pooling**: Supabase built-in pooling
- **Query Optimization**: Select only required fields, use joins efficiently
- **Real-time**: Selective subscriptions to minimize bandwidth

## Security & Compliance

### Authentication Security

- **Row-Level Security**: Database enforced data isolation
- **JWT Tokens**: Automatic rotation and secure storage
- **OAuth Integration**: Google OAuth with proper scope management
- **Session Management**: Secure httpOnly cookies

### Data Protection

- **Input Validation**: Zod schemas for all API endpoints
- **SQL Injection**: Parameterized queries via Supabase client
- **XSS Protection**: React's built-in sanitization + CSP headers
- **CSRF Protection**: SameSite cookies and origin validation

### Privacy Compliance

- **Data Minimization**: Store only necessary user information
- **Consent Management**: Clear opt-ins for data collection
- **Data Deletion**: User-initiated account and data deletion
- **Audit Logging**: Track access to sensitive user data

## Data Migration Strategy

### Production Data Import

Your existing production database contains valuable assets that should be preserved:

#### **Property Data Migration**

```typescript
// scripts/migrate-properties.ts
import { createClient } from '@supabase/supabase-js'

interface LegacyProperty {
  id: string
  zpid?: string
  address: string
  city: string
  state: string
  zip_code: string
  price: number
  bedrooms: number
  bathrooms: number
  square_feet?: number
  property_type: string
  images: string[]
  description?: string
  latitude?: number
  longitude?: number
  neighborhood?: string
  amenities?: string[]
  year_built?: number
  lot_size?: number
  parking_spots?: number
  listing_status?: string
  property_hash?: string
}

export async function migrateProperties() {
  const legacySupabase = createClient(LEGACY_SUPABASE_URL, LEGACY_SERVICE_KEY)
  const newSupabase = createClient(NEW_SUPABASE_URL, NEW_SERVICE_KEY)

  // Extract from production DB
  const { data: legacyProperties } = await legacySupabase
    .from('properties')
    .select('*')
    .eq('is_active', true)

  // Transform and load into new schema
  const transformedProperties = legacyProperties?.map((prop) => ({
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

  // Batch insert with conflict resolution
  await newSupabase
    .from('properties')
    .upsert(transformedProperties, { onConflict: 'id' })
}
```

#### **Neighborhood Mapping Migration**

```typescript
// scripts/migrate-neighborhoods.ts
interface AuthoritativeNeighborhood {
  id: string
  name: string
  city: string
  region: string
  metro_area: string
  polygon: string
  median_price?: number
  walk_score?: number
  transit_score?: number
}

export async function migrateNeighborhoodMappings() {
  const legacySupabase = createClient(LEGACY_SUPABASE_URL, LEGACY_SERVICE_KEY)
  const newSupabase = createClient(NEW_SUPABASE_URL, NEW_SERVICE_KEY)

  // Extract authoritative neighborhood data
  const { data: neighborhoods } = await legacySupabase.from(
    'neighborhoods_authoritative'
  ).select(`
      *,
      cities (
        name,
        regions (
          name,
          metro_areas (name)
        )
      )
    `)

  // Transform complex hierarchy into simplified structure
  const transformedNeighborhoods = neighborhoods?.map((n) => ({
    id: n.id,
    name: n.name,
    city: n.cities.name,
    state: extractStateFromCity(n.cities.name), // Helper function
    metro_area: n.cities.regions.metro_areas.name,
    bounds: n.polygon, // Convert to POLYGON format
    median_price: n.median_price,
    walk_score: n.walk_score,
    transit_score: n.transit_score,
    created_at: n.created_at,
  }))

  await newSupabase
    .from('neighborhoods')
    .upsert(transformedNeighborhoods, { onConflict: 'id' })

  // Update property neighborhood references
  await updatePropertyNeighborhoodMappings()
}

async function updatePropertyNeighborhoodMappings() {
  // Map properties to neighborhoods using polygon containment
  const { data: properties } = await newSupabase
    .from('properties')
    .select('id, coordinates')
    .not('coordinates', 'is', null)

  for (const property of properties || []) {
    const { data: neighborhood } = await newSupabase.rpc(
      'find_neighborhood_for_property',
      {
        property_coordinates: property.coordinates,
      }
    )

    if (neighborhood?.id) {
      await newSupabase
        .from('properties')
        .update({ neighborhood_id: neighborhood.id })
        .eq('id', property.id)
    }
  }
}
```

#### **PostGIS Function for Neighborhood Mapping**

```sql
-- Create function to find neighborhood by coordinates
CREATE OR REPLACE FUNCTION find_neighborhood_for_property(
  property_coordinates POINT
) RETURNS TABLE(id UUID, name TEXT) AS $$
BEGIN
  RETURN QUERY
  SELECT n.id, n.name
  FROM neighborhoods n
  WHERE ST_Contains(n.bounds, ST_GeomFromText('POINT(' || ST_X(property_coordinates) || ' ' || ST_Y(property_coordinates) || ')', 4326))
  LIMIT 1;
END;
$$ LANGUAGE plpgsql;
```

### Migration Timing Strategy

#### **Phase 1: Schema Setup** (Week 1)

- Deploy new schema to staging
- Test with sample data
- Validate all relationships

#### **Phase 2: Data Migration** (Week 2-3)

- Export production neighborhoods and mappings
- Transform to new schema format
- Import to staging environment
- Validate polygon containment logic

#### **Phase 3: Property Migration** (Week 3-4)

- Export active properties from production
- Map to neighborhood IDs using polygons
- Import with proper deduplication
- Validate data integrity

#### **Phase 4: User Data Migration** (Week 4)

- Export user preferences and interactions
- Map to new household structure
- Preserve user history and liked properties

### Migration Scripts Organization

```bash
scripts/
├── migrate/
│   ├── 01-neighborhoods.ts      # Import neighborhood mappings
│   ├── 02-properties.ts         # Import property data
│   ├── 03-user-data.ts         # Import user preferences/interactions
│   ├── 04-validate.ts          # Data validation and cleanup
│   └── helpers/
│       ├── polygon-utils.ts    # Polygon conversion utilities
│       ├── data-transform.ts   # Schema transformation helpers
│       └── batch-import.ts     # Efficient batch processing
```

This architecture provides a solid foundation for building a modern, scalable, and maintainable property browsing application with excellent user experience and developer productivity, while preserving your valuable production data assets.
