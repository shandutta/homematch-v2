# Dashboard Refinement and Interactions Implementation Plan (Product + Eng Spec, v4)

**Author:** Principal PM + Principal Software Architect  
**Date:** 2025-08-01  
**Version:** 4.0 (Final)

**Objective:** This document is the authoritative, step-by-step specification to implement a complete user interaction and dashboard experience. It is designed to be executed by a junior engineer, incorporating best practices from the project's documentation (`/docs`), lessons from `v1-reference`, and UX patterns from modern consumer apps (Tinder, Airbnb).

**Key Outcomes:**
1.  **Functional Interactions:** Swiping (left/right) and button clicks (like/pass) on property cards will be fully functional.
2.  **Real-time Counters:** On-screen counters for "Viewed," "Liked," and "Passed" will update optimistically.
3.  **Persistent State:** All interactions will be saved to the `user_property_interactions` table in Supabase.
4.  **Dedicated Pages:** Clickable counter tiles will navigate to new, paginated pages for `/dashboard/viewed`, `/dashboard/liked`, and `/dashboard/passed`.
5.  **Visual Overhaul:** The dashboard will be redesigned to be "sleek, sexy, and cool," incorporating the homepage's gradient grid, a purple accent theme, a new header/footer, and modern glass-morphism effects on cards, as per the `STYLE_GUIDE.md`.
6.  **Zillow Integration:** Each property card will feature a direct link to its Zillow page.

---

## Section 0: Pre-flight Checklist & Guiding Principles

Before writing any code, review these documents to internalize the project's standards:
-   `docs/ARCHITECTURE.md`: Understand the tech stack (Next.js, Supabase, TanStack Query).
-   `docs/STYLE_GUIDE.md`: Internalize the color palette, typography, and component styles.
-   `docs/TESTING.md`: Understand the testing strategy and where to add new tests.
-   `docs/DEVELOPMENT_WORKFLOWS.md`: Follow the git and code quality workflows.

**Core Principles to Uphold:**
-   **Strong Typing:** No `any` types. Use generated Supabase types and Zod schemas.
-   **Service Layer:** All database interactions must go through a dedicated service (`InteractionService`).
-   **Optimistic UI:** Actions should feel instantaneous to the user, with server state reconciled in the background.
-   **Accessibility First:** All new components must be keyboard-navigable and have correct ARIA attributes.
-   **Test-Driven:** Write tests alongside features. All new code must be covered.

---

## Section 1: Domain Model & Type Definitions

**Goal:** Establish strongly-typed data structures for all new entities.

**File to Edit:** `src/types/app.ts` (or create `src/types/interactions.ts` if preferred).

**Action:** Add the following type definitions.

```typescript
// In src/types/app.ts

/**
 * Represents the types of interactions a user can have with a property.
 * Aligns with the 'interaction_type' enum in the user_property_interactions table.
 * Note: 'pass' in the UI maps to 'skip' in the database.
 */
export type InteractionType = 'viewed' | 'liked' | 'skip'; // 'pass' will be mapped to 'skip'

/**
 * Represents the client-side data structure for a user interaction.
 * Maps to the 'user_property_interactions' table.
 */
export interface Interaction {
  userId: string;
  propertyId: string;
  type: InteractionType;
  createdAt: string;
  updatedAt: string;
}

/**
 * Represents the summary of a user's interactions.
 */
export interface InteractionSummary {
  viewed: number;
  liked: number;
  passed: number; // This will be the count of 'skip' interactions
}

/**
 * Standardized pagination request for API calls.
 */
export interface PageRequest {
  cursor?: string;
  limit?: number;
}

/**
 * Standardized paginated response from API calls.
 */
export interface PageResponse<T> {
  items: T[];
  nextCursor?: string | null;
}
```

---

## Section 2: Backend - API Routes

**Goal:** Create robust, type-safe Next.js API route handlers for all interaction-related operations.

### Step 2.1: Create the Interactions API Route

**Action:** Create a new file: `src/app/api/interactions/route.ts`.

This single file will handle three distinct operations based on the HTTP method and query parameters. This new route will replace the existing `/api/swipes` endpoint.

```typescript
// In src/app/api/interactions/route.ts

import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server'; // Assumes server client from ARCHITECTURE.md
import { z } from 'zod';
import { InteractionType } from '@/types/app';

// Zod Schema for POST request body
const interactionSchema = z.object({
  propertyId: z.string().uuid(),
  type: z.enum(['viewed', 'liked', 'skip']),
});

// Handler for POST /api/interactions
export async function POST(request: NextRequest) {
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const body = await request.json();
  const validation = interactionSchema.safeParse(body);

  if (!validation.success) {
    return NextResponse.json({ error: 'Invalid request body', details: validation.error.flatten() }, { status: 400 });
  }

  const { propertyId, type } = validation.data;

  // **Critical Logic for Handling Interaction State:**
  // The `user_property_interactions` table has a UNIQUE constraint on (user_id, property_id, interaction_type).
  // This means a user can't just "update" an interaction from 'liked' to 'skip'.
  // The correct business logic is that a user has ONE definitive interaction state per property.
  // Therefore, we must first DELETE any previous interaction for this user/property pair.
  
  // 1. Delete any existing interactions for this user/property to ensure a clean state.
  const { error: deleteError } = await supabase
    .from('user_property_interactions')
    .delete()
    .match({ user_id: user.id, property_id: propertyId });

  if (deleteError) {
    console.error('Error clearing previous interaction:', deleteError);
    // Non-fatal, we can proceed. The insert might fail if a row still exists, which is handled below.
  }

  // 2. Insert the new, definitive interaction.
  const { data: newInteraction, error: insertError } = await supabase
    .from('user_property_interactions')
    .insert({
      user_id: user.id,
      property_id: propertyId,
      interaction_type: type,
    })
    .select()
    .single();

  if (insertError) {
    console.error('Error recording new interaction:', insertError);
    return NextResponse.json({ error: 'Failed to record interaction' }, { status: 500 });
  }

  return NextResponse.json({ success: true, interaction: newInteraction });
}

// Handler for GET /api/interactions?type=...
export async function GET(request: NextRequest) {
    const supabase = createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const type = searchParams.get('type') as InteractionType | 'summary';
    
    if (type === 'summary') {
        // Logic for GET /api/interactions?type=summary
        const { data, error } = await supabase.rpc('get_user_interaction_summary', { p_user_id: user.id });

        if (error) {
            console.error('Error fetching interaction summary:', error);
            return NextResponse.json({ error: 'Failed to fetch summary' }, { status: 500 });
        }
        
        // The RPC function should return counts for liked, skip, and viewed
        const summary = {
            liked: data.find(d => d.interaction_type === 'like')?.count || 0,
            passed: data.find(d => d.interaction_type === 'skip')?.count || 0,
            viewed: data.find(d => d.interaction_type === 'viewed')?.count || 0,
        };

        return NextResponse.json(summary);

    } else if (['viewed', 'liked', 'skip'].includes(type)) {
        // Logic for GET /api/interactions?type=[viewed|liked|skip]
        const cursor = searchParams.get('cursor');
        const limit = parseInt(searchParams.get('limit') || '10', 10);

        let query = supabase
            .from('user_property_interactions')
            .select(`
                properties (
                    *,
                    neighborhoods (*)
                )
            `)
            .eq('user_id', user.id)
            .eq('interaction_type', type)
            .order('created_at', { ascending: false })
            .limit(limit);

        if (cursor) {
            query = query.gt('created_at', cursor);
        }

        const { data, error } = await query;

        if (error) {
            console.error(`Error fetching ${type} properties:`, error);
            return NextResponse.json({ error: `Failed to fetch ${type} properties` }, { status: 500 });
        }

        const items = data.map(item => item.properties);
        const nextCursor = items.length === limit ? data[data.length - 1].created_at : null;

        return NextResponse.json({ items, nextCursor });
    }

    return NextResponse.json({ error: 'Invalid request' }, { status: 400 });
}
```

### Step 2.2: Create a Database RPC Function for Summaries

**Goal:** Create an efficient SQL function to calculate interaction counts.

**Action:** Create a new migration file in `supabase/migrations/`.

**File:** `supabase/migrations/YYYYMMDDHHMMSS_create_interaction_summary_fn.sql`

```sql
-- In supabase/migrations/YYYYMMDDHHMMSS_create_interaction_summary_fn.sql

CREATE OR REPLACE FUNCTION get_user_interaction_summary(p_user_id UUID)
RETURNS TABLE(interaction_type TEXT, count BIGINT) AS $$
BEGIN
    RETURN QUERY
    SELECT
        i.interaction_type,
        COUNT(i.id)
    FROM
        user_property_interactions AS i
    WHERE
        i.user_id = p_user_id
    GROUP BY
        i.interaction_type;
END;
$$ LANGUAGE plpgsql;
```

**Run Migration:**
```bash
pnpm dlx supabase@latest db push
```

---

## Section 3: Client-Side Service Layer

**Goal:** Abstract all API communication into a clean, reusable `InteractionService`.

**Action:** Create a new file: `src/lib/services/interactions.ts`.

```typescript
// In src/lib/services/interactions.ts

import { Interaction, InteractionSummary, InteractionType, PageRequest, PageResponse } from '@/types/app';
import { Property } from '@/lib/schemas/property'; // Assuming Property schema exists

// Note: This service should use a shared fetch client if one exists,
// that handles auth headers and base URLs. For now, we use native fetch.

export const InteractionService = {
  async recordInteraction(propertyId: string, type: InteractionType): Promise<Interaction> {
    const response = await fetch('/api/interactions', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ propertyId, type }),
    });
    if (!response.ok) {
      throw new Error('Failed to record interaction');
    }
    const result = await response.json();
    return result.interaction;
  },

  async getInteractionSummary(): Promise<InteractionSummary> {
    const response = await fetch('/api/interactions?type=summary');
    if (!response.ok) {
      throw new Error('Failed to fetch interaction summary');
    }
    return response.json();
  },

  async getInteractions(type: InteractionType, { cursor, limit = 10 }: PageRequest): Promise<PageResponse<Property>> {
    const params = new URLSearchParams({ type, limit: String(limit) });
    if (cursor) {
      params.append('cursor', cursor);
    }
    const response = await fetch(`/api/interactions?${params.toString()}`);
    if (!response.ok) {
      throw new Error(`Failed to fetch ${type} properties`);
    }
    return response.json();
  },
};
```

---

## Section 4: Frontend - Dashboard Implementation

**Goal:** Rebuild the dashboard to be functional and visually stunning.

### Step 4.1: Create TanStack Query Hooks

**Action:** Create a new file `src/hooks/useInteractions.ts`.

```typescript
// In src/hooks/useInteractions.ts

import { useQuery, useMutation, useQueryClient, useInfiniteQuery } from '@tanstack/react-query';
import { InteractionService } from '@/lib/services/interactions';
import { InteractionType, InteractionSummary } from '@/types/app';

const interactionKeys = {
  all: ['interactions'] as const,
  summary: () => [...interactionKeys.all, 'summary'] as const,
  list: (type: InteractionType) => [...interactionKeys.all, 'list', type] as const,
};

export function useInteractionSummary() {
  return useQuery<InteractionSummary>({
    queryKey: interactionKeys.summary(),
    queryFn: InteractionService.getInteractionSummary,
  });
}

export function useRecordInteraction() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ propertyId, type }: { propertyId: string; type: InteractionType }) =>
      InteractionService.recordInteraction(propertyId, type),
    onSuccess: () => {
      // Invalidate summary to refetch counts from the server
      queryClient.invalidateQueries({ queryKey: interactionKeys.summary() });
    },
  });
}

export function useInfiniteInteractions(type: InteractionType) {
    return useInfiniteQuery({
        queryKey: interactionKeys.list(type),
        queryFn: ({ pageParam }) => InteractionService.getInteractions(type, { cursor: pageParam }),
        getNextPageParam: (lastPage) => lastPage.nextCursor,
        initialPageParam: undefined,
    });
}
```

### Step 4.2: Update the Main Dashboard Component

**Action:** Modify `src/components/dashboard/EnhancedDashboardPageImpl.tsx`. This is the primary client component for the dashboard. The goal is to replace its local state management with our new TanStack Query hooks and introduce the `PropertySwiper`.

```tsx
// In src/components/dashboard/EnhancedDashboardPageImpl.tsx

'use client';

import { useState } from 'react';
import { useInteractionSummary, useRecordInteraction } from '@/hooks/useInteractions';
import { PropertySwiper } from '@/components/features/properties/PropertySwiper'; // Assuming this exists from plan
import { DashboardStats } from '@/components/features/dashboard/DashboardStats'; // New component
import { Property } from '@/lib/schemas/property';

export function DashboardPageImpl({ initialProperties }: { initialProperties: Property[] }) {
  const [properties, setProperties] = useState(initialProperties);
  const { data: summary, isLoading: summaryIsLoading } = useInteractionSummary();
  const { mutate: recordInteraction } = useRecordInteraction();

  // Optimistic update state
  const [optimisticSummary, setOptimisticSummary] = useState<InteractionSummary | undefined>(undefined);

  const handleDecision = (propertyId: string, type: InteractionType) => {
    // 1. Optimistic UI update for the card deck
    setProperties(prev => prev.filter(p => p.id !== propertyId));
    
    // 2. Optimistic UI update for the summary stats
    const currentSummary = optimisticSummary || summary;
    if (currentSummary) {
        const newSummary = { ...currentSummary };
        if (type === 'liked') newSummary.liked++;
        if (type === 'skip') newSummary.passed++;
        // A decision on a card implies it has been viewed.
        // A separate "viewed" event should be fired when a card becomes active.
        // For now, we can increment viewed on any decision.
        newSummary.viewed++;
        setOptimisticSummary(newSummary);
    }

    // 3. Call the mutation to update the backend. TanStack Query handles the rest.
    recordInteraction({ propertyId, type });
  };
  
  // Use optimistic summary if available, otherwise fall back to fetched summary from React Query
  const displaySummary = optimisticSummary || summary;

  return (
    // The layout file will provide the main wrapper and background
    <>
        <DashboardStats summary={displaySummary} isLoading={summaryIsLoading} />
        <PropertySwiper properties={properties} onDecision={handleDecision} />
    </>
  );
}
```

### Step 4.3: Create `DashboardStats` Component

**Action:** Create `src/components/features/dashboard/DashboardStats.tsx`.

```tsx
// In src/components/features/dashboard/DashboardStats.tsx

import Link from 'next/link';
import { InteractionSummary } from '@/types/app';
import { Skeleton } from '@/components/ui/skeleton';

interface DashboardStatsProps {
  summary: InteractionSummary | undefined;
  isLoading: boolean;
}

const StatTile = ({ href, label, value }: { href: string; label: string; value: number | undefined }) => (
  <Link href={href} className="block p-6 rounded-lg bg-white/10 backdrop-blur-sm shadow-lg hover:bg-white/20 transition-colors">
    <div className="text-4xl font-bold text-white">{value ?? <Skeleton className="h-10 w-16 bg-white/20" />}</div>
    <div className="text-sm font-medium text-purple-200">{label}</div>
  </Link>
);

export function DashboardStats({ summary, isLoading }: DashboardStatsProps) {
  if (isLoading && !summary) {
      return (
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
              <Skeleton className="h-28 w-full rounded-lg bg-white/10" />
              <Skeleton className="h-28 w-full rounded-lg bg-white/10" />
              <Skeleton className="h-28 w-full rounded-lg bg-white/10" />
          </div>
      );
  }

  return (
    <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8" data-testid="dashboard-stats">
      <StatTile href="/dashboard/viewed" label="Viewed" value={summary?.viewed} />
      <StatTile href="/dashboard/liked" label="Liked" value={summary?.liked} />
      <StatTile href="/dashboard/passed" label="Passed" value={summary?.passed} />
    </div>
  );
}
```

### Step 4.4: Update `PropertyCard` and `SwipeContainer`

**Action:** Modify `PropertyCard.tsx` and `SwipeContainer.tsx` to handle actions and Zillow links.

```tsx
// In src/components/property/PropertyCard.tsx

// ... imports
import { Property } from '@/lib/schemas/property';
import { ExternalLink } from 'lucide-react';

interface PropertyCardProps {
  property: Property;
  onDecision: (propertyId: string, type: InteractionType) => void;
}

function buildZillowUrl(property: Property): string {
    if (property.zpid) {
        // This is a more stable URL structure.
        return `https://www.zillow.com/homedetails/${property.zpid}_zpid/`;
    }
    // Fallback from docs/RAPIDAPI_ZILLOW.md analysis
    const q = encodeURIComponent(`${property.address}, ${property.city}, ${property.state} ${property.zip_code}`);
    return `https://www.zillow.com/homes/${q}_rb/`;
}

export function PropertyCard({ property, onDecision }: PropertyCardProps) {
  // ... existing card structure
  return (
    <div className="relative card-glassmorphism-style">
      {/* ... image and property details */}
      <div className="absolute top-4 right-4">
        <a href={buildZillowUrl(property)} target="_blank" rel="noopener noreferrer" className="p-2 bg-black/50 rounded-full text-white hover:bg-black/75 transition-colors" aria-label="View on Zillow">
            <ExternalLink className="h-5 w-5" />
        </a>
      </div>
      <div className="absolute bottom-4 flex justify-center w-full space-x-4">
        <button onClick={() => onDecision(property.id, 'skip')} data-testid="pass-button">Pass</button>
        <button onClick={() => onDecision(property.id, 'liked')} data-testid="like-button">Like</button>
      </div>
    </div>
  );
}
```

**Note:** The `SwipeContainer` should be updated to call the `onDecision` prop on swipe completion, similar to how the buttons do. Porting the logic from `v1-reference/SwipeContainer.tsx` as recommended in `IMPLEMENTATION_PLAN.md` is the correct approach here.

---

## Section 5: Frontend - New Interaction Pages

**Goal:** Create the three new pages for viewed, liked, and passed properties.

### Step 5.1: Create a Reusable List Page Component

**Action:** Create `src/components/dashboard/InteractionsListPage.tsx`.

```tsx
// In src/components/dashboard/InteractionsListPage.tsx

'use client';

import { useInfiniteInteractions } from '@/hooks/useInteractions';
import { InteractionType } from '@/types/app';
import { PropertyCard } from '@/components/property/PropertyCard'; // A non-interactive version might be needed
import { Button } from '@/components/ui/button';
import { Property } from '@/lib/schemas/property';

interface InteractionsListPageProps {
  type: InteractionType;
  title: string;
}

export function InteractionsListPage({ type, title }: InteractionsListPageProps) {
  const { data, fetchNextPage, hasNextPage, isLoading, isFetchingNextPage } = useInfiniteInteractions(type);

  const properties = data?.pages.flatMap(page => page.items) ?? [];

  if (isLoading && properties.length === 0) {
    return <div>Loading...</div>;
  }

  if (!isLoading && properties.length === 0) {
    return <div>No {title} yet.</div>;
  }

  return (
    <div className="space-y-8">
        <h1 className="text-3xl font-bold text-white">{title}</h1>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {properties.map(property => (
                // This should be a display-only card, not the interactive one
                <div key={property.id} className="bg-white/10 p-4 rounded-lg">
                    <p>{(property as Property).address}</p>
                </div>
            ))}
        </div>
        {hasNextPage && (
            <div className="text-center">
                <Button onClick={() => fetchNextPage()} disabled={isFetchingNextPage}>
                    {isFetchingNextPage ? 'Loading more...' : 'Load More'}
                </Button>
            </div>
        )}
    </div>
  );
}
```

### Step 5.2: Create the Page Route Files

**Action:** Create the following three files.

```tsx
// In src/app/dashboard/liked/page.tsx
import { InteractionsListPage } from '@/components/dashboard/InteractionsListPage';
export default function LikedPage() {
  return <InteractionsListPage type="liked" title="Liked Properties" />;
}
```

```tsx
// In src/app/dashboard/passed/page.tsx
import { InteractionsListPage } from '@/components/dashboard/InteractionsListPage';
export default function PassedPage() {
  return <InteractionsListPage type="skip" title="Passed Properties" />;
}
```

```tsx
// In src/app/dashboard/viewed/page.tsx
import { InteractionsListPage } from '@/components/dashboard/InteractionsListPage';
export default function ViewedPage() {
  return <InteractionsListPage type="viewed" title="Viewed Properties" />;
}
```

---

## Section 6: Styling and Layout

**Goal:** Implement the visual overhaul.

### Step 6.1: Update Global CSS

**Action:** Modify `src/app/globals.css`.

```css
/* In src/app/globals.css */
@tailwind base;
@tailwind components;
@tailwind utilities;

@layer base {
  :root {
    /* ... existing variables */
    --color-primary: 100 40 217; /* HSL for purple #6D28D9 */
  }
}

@layer components {
  .gradient-grid-bg {
    background-color: #020b1f; /* Fallback color */
    /* Exact background from src/app/page.tsx for perfect cohesion */
    background-image:
      /* Layer 1: Radial gradient for depth */
      radial-gradient(1200px 600px at 50% -10%, rgba(2,26,68,0.06) 0%, rgba(2,26,68,0.03) 35%, rgba(255,255,255,0) 65%),
      /* Layer 2: Repeating grid pattern */
      repeating-linear-gradient(0deg, rgba(2,26,68,0.08) 0px, rgba(2,26,68,0.08) 1px, transparent 1px, transparent 28px), 
      repeating-linear-gradient(90deg, rgba(2,26,68,0.08) 0px, rgba(2,26,68,0.08) 1px, transparent 1px, transparent 28px),
      /* Layer 3: Additional colored radial glows */
      radial-gradient(600px 300px at 80% 0%, rgba(41,227,255,0.12) 0%, rgba(41,227,255,0) 60%), 
      radial-gradient(700px 320px at 15% 0%, rgba(6,58,158,0.10) 0%, rgba(6,58,158,0) 60%);
    background-size: 100% 100%, 28px 28px, 100% 100%;
  }

  .card-glassmorphism-style {
    background: rgba(255, 255, 255, 0.1);
    backdrop-filter: blur(2px);
    border-radius: 1rem;
    border: 1px solid rgba(255, 255, 255, 0.2);
    box-shadow: 0 6px 28px rgba(2, 6, 23, 0.08);
  }
}
```

### Step 6.2: Create Header and Footer

**Action:** Create `Header.tsx` and `Footer.tsx` components in `src/components/layouts/`.

These components should be simple, with a purple background and links to Home, Liked, Passed, Viewed, and Settings.

### Step 6.3: Update Dashboard Layout

**Action:** Modify `src/app/dashboard/layout.tsx`.

```tsx
// In src/app/dashboard/layout.tsx
import { Header } from '@/components/layouts/Header';
import { Footer } from '@/components/layouts/Footer';

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="gradient-grid-bg min-h-screen flex flex-col">
      <Header />
      <main className="flex-grow container mx-auto py-8">
        {children}
      </main>
      <Footer />
    </div>
  );
}
```

---

## Section 7: Testing Strategy

**Goal:** Ensure the new features are robust and bug-free.

1.  **Unit Tests (`__tests__/unit/services/`):**
    -   Create `interactions.service.test.ts`.
    -   Mock `fetch`.
    -   Test `recordInteraction`, `getInteractionSummary`, and `getInteractions` for happy paths and error handling.

2.  **Component Tests (`__tests__/unit/components/`):**
    -   Test `DashboardStats` with loading and loaded states.
    -   Test `InteractionsListPage` for loading, empty, and data states.
    -   Test `PropertyCard` to ensure `onDecision` and Zillow link work.

3.  **Integration Tests (`__tests__/integration/api/`):**
    -   Create `interactions.api.test.ts`.
    -   Use Vitest and Supabase mocks/test-db.
    -   Test the `POST` and `GET` handlers in `src/app/api/interactions/route.ts` to ensure they interact with the database correctly.

4.  **E2E Tests (`__tests__/e2e/`):**
    -   Create `dashboard.spec.ts`.
    -   Use Playwright fixtures (`auth`, `logger`).
    -   **Scenario 1: Like/Pass.** Log in, go to dashboard, find a property card (`data-testid="property-card"`), click the like button (`data-testid="like-button"`), verify the card disappears, check that the "Liked" counter (`data-testid="dashboard-stats"`) increments.
    -   **Scenario 2: Navigation.** Click on the "Liked" stat tile, verify navigation to `/dashboard/liked`, and check that the liked property appears in the list.

---

## Section 8: Engineering Checklist

-   [ ] **Types:** Define `InteractionType`, `Interaction`, `InteractionSummary` in `src/types/app.ts`.
-   [ ] **DB Function:** Create and migrate `get_user_interaction_summary` SQL function.
-   [ ] **API Route:** Implement `POST` and `GET` handlers in `/api/interactions/route.ts` with Zod validation. (Note: This will deprecate `/api/swipes`).
-   [ ] **Service:** Create `InteractionService` in `src/lib/services/interactions.ts`.
-   [ ] **Hooks:** Create `useInteractionSummary`, `useRecordInteraction`, `useInfiniteInteractions` hooks.
-   [ ] **Dashboard UI:** Refactor `EnhancedDashboardPageImpl` to use new hooks and optimistic updates.
-   [ ] **Dashboard UI:** Create `DashboardStats` component with links.
-   [ ] **Card UI:** Update `PropertyCard` with action buttons and Zillow link.
-   [ ] **Swipe UI:** Create `PropertySwiper` component, porting logic from V1's `SwipeContainer` to replace the static grid.
-   [ ] **List Page:** Create reusable `InteractionsListPage` component.
-   [ ] **New Routes:** Create page files for `/dashboard/liked`, `/passed`, and `/viewed`.
-   [ ] **Styling:** Add `gradient-grid-bg` and `card-glassmorphism-style` to `globals.css`.
-   [ ] **Layout:** Create `Header` and `Footer` and add to `dashboard/layout.tsx`.
-   [ ] **Testing:** Add unit, integration, and E2E tests covering all new functionality.
-   [ ] **QA:** Manually verify all user flows.

---

## Section 9: Integration Tests – Additions (Vitest + Supabase)

**Goal:** Verify the end-to-end behavior of the backend, including API routes, database functions, and RLS policies. These tests should be added to the `__tests__/integration/` directory.

1.  **Interactions API Flow (`__tests__/integration/api/interactions.test.ts`)**
    *   **`POST /api/interactions`**:
        *   Should create a new interaction for a user and property.
        *   Should replace the existing interaction if a user swipes the same property differently (e.g., 'like' then 'skip'). Verify only the 'skip' interaction remains.
        *   Should return a `400` error for an invalid request body (e.g., missing `propertyId`).
        *   Should return a `401` error if the user is not authenticated.
    *   **`GET /api/interactions?type=summary`**:
        *   After creating 2 likes, 3 skips, and 5 views for a user, the endpoint should return `{ liked: 2, passed: 3, viewed: 5 }`.
    *   **`GET /api/interactions?type=liked` (Pagination)**:
        *   Seed 15 'liked' properties for a user.
        *   A request with `limit=10` should return 10 items and a `nextCursor`.
        *   A subsequent request using that `nextCursor` should return the remaining 5 items and a `null` `nextCursor`.

2.  **Database Functions & Policies (`__tests__/integration/database/interactions.test.ts`)**
    *   **RPC `get_user_interaction_summary`**:
        *   Directly call the RPC function with a test user's ID and verify it returns the correct aggregate counts.
    *   **RLS Policy for `user_property_interactions`**:
        *   Verify that User A can only select their own interactions and cannot select interactions belonging to User B.
        *   Verify that a user can insert an interaction with their own `user_id`.
        *   Verify that a user *cannot* insert an interaction with a `user_id` belonging to another user (this should be blocked by the RLS policy).
