# HomeMatch V1 to V2 - Comprehensive Migration Plan

## Executive Summary

This document outlines the complete migration strategy from HomeMatch V1 to the new V2 architecture built on Next.js 15, Supabase, and modern tooling. Based on analysis of the original codebase and available data, we will migrate:

1. **Dashboard & Property Interaction System** - Tinder-style property browsing with statistics
2. **Settings Page** - Hierarchical neighborhood selectors and user preferences
3. **Property Ingestion Pipeline** - Background jobs for Zillow API data collection
4. **Data Migration** - 1,100 properties and 3,400+ geographic entities from CSV data
5. **Additional V1 Features** - Notifications, ML scoring, and enhanced UI components

### Key Data Assets

- **Properties**: 1,100 verified properties with Zillow IDs, images, and coordinates
- **Geographic Data**: 3,417 neighborhoods, cities, regions, and metro areas with polygon boundaries
- **Property Images**: Full image galleries (up to 20 images per property)
- **User Interaction History**: Swipe data and preferences from production users

---

## 1. Dashboard & Property Interaction Migration

### V1 Implementation Analysis ⭐⭐⭐⭐⭐ **EXCELLENT - PORT DIRECTLY**

The original dashboard uses:

- **SwipeContainer** with sophisticated gesture handling and race condition prevention
- **Production-ready batching** (3 visible cards, queue threshold management)
- **Robust error handling** with retry logic and auto-ingestion triggers
- **Performance optimized** with useMemo and proper cleanup patterns
- **Real-time statistics** showing viewed/liked/passed counts
- **Property pages** for liked/viewed/passed with status toggling

**Quality Assessment**: The SwipeContainer is enterprise-grade code with excellent React patterns - migrate with confidence

### V2 Migration Plan

#### 1.1 Dashboard Structure

```typescript
// New route structure
app/dashboard/
├── page.tsx                 // Main dashboard with statistics
├── liked/page.tsx          // Liked properties grid
├── viewed/page.tsx         // Viewed properties history
├── passed/page.tsx         // Passed properties with reconsider option
├── layout.tsx              // Shared dashboard layout
└── components/
    ├── PropertySwiper.tsx  // Tinder-style browsing
    ├── DashboardStats.tsx  // Statistics cards
    └── PropertyGrid.tsx    // Shared grid component
```

#### 1.2 Key Components to Port

**PropertySwiper Component**

```typescript
export function PropertySwiper() {
  // TanStack Query for infinite property loading
  const { data: properties } = useInfiniteProperties(filters)

  // Optimistic updates for swipe interactions
  const { mutate: recordSwipe } = usePropertyInteraction()

  // Framer Motion for card animations
  // Touch gesture support for mobile
  // Empty state handling
  // Prefetching next properties
}
```

**PropertyCard Component** (Enhanced from V1)

```typescript
interface PropertyCardProps {
  property: Property
  onLike?: () => void
  onDislike?: () => void
  onSkip?: () => void
  showActions?: boolean
  enableImagePreloading?: boolean
}

// Features to migrate:
// - Multi-image gallery with swipe navigation
// - Touch gesture support
// - PropertyDetailModal integration
// - Neighborhood service lookup
// - Image proxy service integration
// - Property cache optimization
```

#### 1.3 Property Interaction Pages

- **Liked Properties**: Grid with filter sold toggle, status change options
- **Viewed Properties**: History with timestamps, re-engagement features
- **Passed Properties**: Reconsider functionality, "Start Fresh" option

---

## 2. Settings Page with Hierarchical Geography

### V1 Implementation Analysis ⭐⭐⭐⭐ **GOOD - MIGRATE WITH SIMPLIFICATION**

The settings page features:

- **MetroRegionNeighborhoodSelector** with sophisticated 3-level hierarchy and state persistence
- **Region → City → Neighborhood** cascading selection with "remember previous selections"
- **Search functionality** across all geographic levels with performance optimization
- **Bulk operations** (Select All/Clear All at each hierarchy level)
- **POIManager** for points of interest
- **Comprehensive preferences**: price, bedrooms, bathrooms, square footage, lifestyle
- **Auto-save functionality** with toast notifications

**Quality Assessment**: Well-architected hierarchical state management, but overly complex for V2's simplified schema. Adapt core logic with cleaner UI.

### V2 Enhanced Implementation

#### 2.1 Geographic Hierarchy Structure

```typescript
interface GeographicHierarchy {
  metroAreas: MetroArea[]
  regions: Region[]
  cities: City[]
  neighborhoods: Neighborhood[]
}

// Simplified from V1's complex 4-table structure
interface Neighborhood {
  id: string
  name: string
  city: string
  state: string
  metro_area: string
  bounds: string // PostGIS POLYGON
  median_price?: number
  walk_score?: number
  transit_score?: number
}
```

#### 2.2 New Settings Components

**HierarchicalGeographySelector**

```typescript
export function GeographySelector() {
  // Database-driven geography from neighborhoods table
  const { data: geographies } = useGeographies()

  // Multi-level selection state with persistence
  const [selection, setSelection] = useState<GeographySelection>()

  // Real-time search with debouncing (300ms)
  const searchResults = useGeographySearch(searchQuery)

  // Batch selection and deselection
  // Visual feedback for selected items
  // Collapsible hierarchy levels
}
```

**PreferenceForm with Zod Validation**

```typescript
export function PreferenceForm() {
  // Form validation with UserPreferencesSchema
  const form = useValidatedForm(UserPreferencesSchema)

  // Auto-save with debouncing
  const { mutate: savePreferences } = useSavePreferences()

  // Range sliders for price, size, lifestyle
  // Multi-select for property types and amenities
  // POI management integration
}
```

---

## 3. Property Ingestion System Migration

### V1 Implementation Analysis ⭐⭐⭐⭐ **EXCELLENT - CONVERT TO TYPESCRIPT**

The `ultimate-property-ingest.cjs` script features:

- **Zillow RapidAPI integration** with comprehensive multi-image fetching (up to 20 per property)
- **Database-driven neighborhoods** (no hardcoded polygons) - eliminates configuration drift
- **Hash-based deduplication** using property characteristics (address + beds + baths + price)
- **Sophisticated rate limiting**: 2s between API calls, 6s for image downloads
- **Intelligent batch processing**: 3 properties per batch, max 200 per neighborhood
- **Robust retry logic** with exponential backoff and comprehensive error categorization
- **Production-grade statistics** with neighborhood-level reporting and detailed error logs

**Quality Assessment**: This is production-ready business logic with excellent error handling. Convert to TypeScript service for V2.

### V2 Migration Strategy

#### 3.1 TypeScript Service Class

```typescript
// lib/services/property-ingestion.ts
export class PropertyIngestionService {
  private supabase: SupabaseClient
  private rapidApiKey: string
  private rateLimiter: RateLimiter

  async ingestNeighborhood(neighborhoodId: string) {
    // 1. Get neighborhood polygon
    // 2. Query Zillow API with geographic bounds
    // 3. Process properties in batches
    // 4. Generate property hashes for deduplication
    // 5. Download and store images
    // 6. Update statistics and logs
  }

  private generatePropertyHash(property: ZillowProperty): string {
    // Hash based on address, bedrooms, bathrooms, price
    // Ensures deduplication across ingestion runs
  }

  private async downloadImages(zpid: string, imageUrls: string[]) {
    // Rate-limited image downloading
    // Error handling and retry logic
    // Storage optimization
  }
}
```

#### 3.2 Inngest Background Jobs

```typescript
// lib/inngest/functions/property-ingestion.ts
export const ingestProperties = inngest.createFunction(
  { id: 'ingest-properties' },
  { cron: '0 */6 * * *' }, // Every 6 hours
  async ({ step }) => {
    // 1. Get active neighborhoods from database
    const neighborhoods = await step.run('get-neighborhoods', async () => {
      return getActiveNeighborhoods()
    })

    // 2. Process each neighborhood
    for (const neighborhood of neighborhoods) {
      await step.run(`ingest-${neighborhood.id}`, async () => {
        return ingestNeighborhoodProperties(neighborhood)
      })
    }

    // 3. Update ML scores for new properties
    await step.run('update-ml-scores', async () => {
      return updatePropertyScores()
    })
  }
)
```

---

## 4. Data Migration Strategy

### Available Data Files

#### 4.1 Properties Data

**Source**: `migrated_data/properties_rows.csv` (1,100 properties)

- **Complete property information**: Zillow IDs, addresses, pricing, specifications
- **High-resolution images**: JSON arrays with up to 20 images per property
- **Geographic coordinates**: Latitude/longitude for mapping
- **Neighborhood mappings**: Links to neighborhood hierarchy
- **Property hashes**: For deduplication validation

#### 4.2 Geographic Data

**Source**: `migrated_data/neighborhoods_authoritative_rows.csv` (3,417 entities)

- **Complete hierarchy**: Metro areas, regions, cities, neighborhoods
- **Polygon boundaries**: Coordinate strings for geographic queries
- **Hierarchical IDs**: Links between metro → region → city → neighborhood
- **Display metadata**: Names, slugs, coordinates

### Migration Scripts

#### 4.3 Data Import Pipeline

```bash
scripts/migrate/
├── 01-validate-csv-data.ts      # Verify data integrity
├── 02-import-geography.ts       # Load neighborhoods with PostGIS
├── 03-import-properties.ts      # Load properties with relationships
├── 04-verify-relationships.ts   # Validate neighborhood mappings
└── 05-generate-indexes.ts       # Create performance indexes
```

#### 4.4 Geographic Data Transformation

```typescript
// Transform from CSV to V2 schema
async function migrateGeographicData() {
  const csvData = await readCSV('neighborhoods_authoritative_rows.csv')

  // Group by hierarchy levels
  const transformed = csvData.map((row) => ({
    id: row.id,
    name: row.name,
    city: lookupCityName(row.city_id),
    state: extractStateFromCity(row.city_id),
    metro_area: lookupMetroArea(row.metro_area_id),
    bounds: convertToPostGIS(row.polygon),
    created_at: row.created_at,
    updated_at: row.updated_at,
  }))

  // Batch insert with conflict resolution
  await supabase.from('neighborhoods').upsert(transformed, {
    onConflict: 'id',
  })
}
```

#### 4.5 Property Data Migration

```typescript
async function migratePropertyData() {
  const properties = await readCSV('properties_rows.csv')

  const batchSize = 100
  for (let i = 0; i < properties.length; i += batchSize) {
    const batch = properties.slice(i, i + batchSize)

    const transformed = batch.map((p) => ({
      id: p.id,
      zpid: p.zpid,
      address: p.address,
      city: p.city,
      state: p.state,
      zip_code: p.zip_code,
      price: parseInt(p.price),
      bedrooms: parseInt(p.bedrooms),
      bathrooms: parseFloat(p.bathrooms),
      square_feet: p.square_feet ? parseInt(p.square_feet) : null,
      property_type: mapPropertyType(p.property_type),
      images: JSON.parse(p.images),
      coordinates:
        p.latitude && p.longitude
          ? `POINT(${p.longitude} ${p.latitude})`
          : null,
      neighborhood_id: p.neighborhood_id,
      property_hash: p.property_hash,
      is_active: p.listing_status === 'for_sale',
      created_at: p.created_at,
      updated_at: p.updated_at,
    }))

    await supabase.from('properties').upsert(transformed)
    console.log(
      `Migrated batch ${i / batchSize + 1}/${Math.ceil(properties.length / batchSize)}`
    )
  }
}
```

---

## 5. Additional V1 Features Migration

### 5.1 Notification System

**Components to Port**:

- NotificationBell with real-time updates
- NotificationPane for viewing messages
- SoldPropertyNotification for status changes
- Property match notifications based on ML scoring

### 5.2 Enhanced Property Features

- **PropertyDetailModal**: Full property view with image galleries
- **PropertyScore**: ML-driven compatibility scoring display
- **PropertyMiniMap**: Neighborhood context and location
- **SoldPropertyIndicator**: Visual status badges

### 5.3 Advanced UI Components

- **Multiple selector variants** for different use cases
- **EmbeddedGoogleMap** with property markers
- **AddressAutocomplete** for search functionality
- **CacheStatus** monitoring for performance

---

## 6. API Architecture Migration

### V1 to V2 Endpoint Mapping

| V1 Endpoint         | V2 Endpoint                        | Schema Validation     |
| ------------------- | ---------------------------------- | --------------------- |
| `/api/swipes`       | `/api/interactions`                | InteractionSchema     |
| `/api/swipes/liked` | `/api/properties?interaction=like` | PropertyFiltersSchema |
| `/api/users/me`     | `/api/users/profile`               | UserProfileSchema     |
| `/api/settings`     | `/api/users/preferences`           | UserPreferencesSchema |

### New API Structure with Zod Validation

```typescript
// app/api/interactions/route.ts
export async function POST(request: NextRequest) {
  // Validate with InteractionSchema
  const validation = await validateRequestBody(request, InteractionSchema)
  if (!validation.success) return validation.error

  // Record interaction with RLS security
  // Optimistic response for UI updates
  // Background ML score updates
}

// app/api/properties/route.ts
export async function GET(request: NextRequest) {
  // Validate with PropertySearchSchema
  // Apply filters with type safety
  // Return paginated results
  // Include neighborhood data
}
```

---

## 7. State Management Migration

### V1 Stores → V2 Architecture ❌ **AVOID - REPLACE ENTIRELY**

**V1 Problems Identified:**

- **authStore** - Complex persistence with race conditions between local state and API
- **propertyStore** - Mixed server/client state causing cache invalidation issues
- **settingsStore** - Overly complex serialization with memory leaks
- **swipeStore** - No optimistic updates, poor error handling

**V2 Clean Architecture:**

- **authStore** → **Supabase Auth Context** (simple, integrated)
- **propertyStore** → **TanStack Query** cache management (server state only)
- **settingsStore** → **User preferences in database** + optimistic updates
- **swipeStore** → **TanStack Query** for interactions + minimal UI state

### New State Architecture

```typescript
// Server state with TanStack Query
const { data: properties } = useInfiniteProperties(filters)
const { data: preferences } = useUserPreferences()

// Client state with Zustand (UI only)
const { currentPropertyIndex, isFilterModalOpen, tempSearchFilters } =
  useAppStore()

// Form state with React Hook Form + Zod
const form = useValidatedForm(PreferencesSchema, defaults)
```

---

## 8. Background Jobs & Workflows

### Inngest Job Architecture

```typescript
// Property ingestion pipeline
export const ingestProperties = inngest.createFunction(
  { id: 'ingest-properties' },
  { cron: '0 */6 * * *' },
  async ({ step }) => {
    // Process neighborhoods in parallel
    // Rate-limited API calls
    // Image downloading and optimization
    // ML score calculation
    // User notification for matches
  }
)

// Market data updates
export const updateMarketData = inngest.createFunction(
  { id: 'update-market-data' },
  { cron: '0 6 * * *' },
  async ({ step }) => {
    // Neighborhood price trend analysis
    // Walk score updates
    // Transit score refreshes
  }
)
```

---

## 9. Testing Strategy

### Test Coverage Plan

- **Unit Tests**: Component logic, utility functions, Zod schemas
- **Integration Tests**: API endpoints, database operations, background jobs
- **E2E Tests**: Complete user workflows with Playwright
- **Migration Tests**: Data integrity validation, performance benchmarks

### Key Test Scenarios

- Property browsing and interaction recording
- Settings management with hierarchy selection
- Data migration accuracy and completeness
- Background job processing and error handling

---

## 10. Implementation Timeline

### Week 1: Foundation & Dashboard

**Days 1-2: Core Setup**

- [ ] Dashboard route structure
- [ ] PropertySwiper component with gesture handling
- [ ] Basic property grid views
- [ ] Interaction recording API

**Days 3-4: Property Pages**

- [ ] Liked/viewed/passed pages
- [ ] PropertyCard component migration
- [ ] Status toggle functionality
- [ ] "Start Fresh" feature

**Days 5-7: Statistics & Polish**

- [ ] Dashboard statistics calculation
- [ ] Empty states and loading indicators
- [ ] Optimistic updates for interactions
- [ ] Mobile responsiveness

### Week 2: Settings & Preferences

**Days 8-10: Geography Selector**

- [ ] HierarchicalGeographySelector component
- [ ] Database-driven neighborhood loading
- [ ] Real-time search implementation
- [ ] Multi-level selection state

**Days 11-12: Preference Forms**

- [ ] Price range sliders with validation
- [ ] Property type and amenity selectors
- [ ] Lifestyle preference controls
- [ ] Auto-save with debouncing

**Days 13-14: POI & Advanced Features**

- [ ] POIManager component
- [ ] Google Places integration
- [ ] Commute time calculations
- [ ] Settings persistence testing

### Week 2.5: V1 Feature Migration

**Days 15-17: Additional Components**

- [ ] PropertyDetailModal with image galleries
- [ ] NotificationBell and NotificationPane
- [ ] PropertyScore ML display component
- [ ] SoldPropertyIndicator badges

**Day 18: Integration Testing**

- [ ] Component integration testing
- [ ] User workflow validation
- [ ] Performance optimization
- [ ] Cross-browser compatibility

### Week 3: Data Migration

**Days 19-20: Migration Scripts**

- [ ] CSV data validation scripts
- [ ] Geographic data transformation
- [ ] Property data migration pipeline
- [ ] Relationship mapping validation

**Days 21-22: Data Import**

- [ ] Import 3,417 geographic entities
- [ ] Import 1,100 properties with images
- [ ] Verify neighborhood relationships
- [ ] Create spatial indexes

**Days 23-25: Property Ingestion**

- [ ] Convert ultimate-property-ingest to TypeScript
- [ ] Integrate with Inngest background jobs
- [ ] Set up scheduled ingestion pipeline
- [ ] Test rate limiting and error handling

### Week 4: Integration & Production

**Days 26-27: End-to-End Testing**

- [ ] Complete user journey testing
- [ ] Data integrity validation
- [ ] Performance benchmarking
- [ ] Security audit

**Days 28-30: Production Deployment**

- [ ] Environment configuration
- [ ] Database migration execution
- [ ] Background job deployment
- [ ] Monitoring setup

---

## 11. Risk Mitigation & Success Metrics

### Data Quality Assurance

- **Validation**: All imported data validated with Zod schemas
- **Integrity**: Relationship mapping verification between properties and neighborhoods
- **Monitoring**: Real-time alerts for data quality issues

### Performance Targets

- **Property browsing**: < 100ms response time
- **Settings save**: < 500ms with visual feedback
- **Image loading**: Progressive loading with blur placeholders
- **Database queries**: Optimized with proper indexing

### Migration Success Criteria

- [ ] All 1,100 properties imported with complete data
- [ ] All 3,417 geographic entities properly structured
- [ ] Zero data loss during migration
- [ ] 95%+ test coverage achieved
- [ ] User workflows fully functional

### Rollback Strategy

- **Database snapshots** before each migration step
- **Feature flags** for gradual rollout
- **Monitoring alerts** for critical issues
- **Quick rollback procedures** documented and tested

---

## 12. V1 Codebase Quality Assessment Summary

### 🟢 **MIGRATE WITH CONFIDENCE** (Enterprise-Grade)

- **SwipeContainer.tsx** ⭐⭐⭐⭐⭐ - Production-ready React patterns, excellent error handling
- **ultimate-property-ingest.cjs** ⭐⭐⭐⭐ - Robust business logic, comprehensive reporting
- **MetroRegionNeighborhoodSelector.tsx** ⭐⭐⭐⭐ - Complex but well-architected UX

### 🟡 **MIGRATE WITH MODIFICATIONS** (Good Foundation)

- **PropertyCard.tsx** - Solid core, needs V2 styling alignment
- **Geographic hierarchy system** - Good logic, overly complex schema
- **Touch gesture handling** - Smooth interactions, extract to hooks

### 🔴 **AVOID ENTIRELY** (Technical Debt)

- **Zustand store architecture** - Replace with TanStack Query + Supabase Auth
- **NextAuth integration** - Overly complex, conflicts with Supabase RLS
- **Migration system** - 26+ conflicting migrations, start fresh
- **Over-normalized geography** - Simplify to single table

## 13. Conclusion

This comprehensive migration plan provides a structured approach to bringing HomeMatch V1's **proven high-quality components** into the modern V2 architecture while **avoiding technical debt pitfalls**. The plan prioritizes:

1. **Selective Migration** - Port excellent components, redesign problematic areas
2. **Data Integrity** - Careful migration of 1,100 properties and 3,400+ geographic entities
3. **Architecture Modernization** - TanStack Query, Supabase Auth, simplified schemas
4. **Performance First** - Target <100ms property loading vs 500ms+ in V1

**Confidence Level**: **High** - V1 analysis confirms our migration strategy targets the right components while avoiding the architectural complexity that accumulated over time.

The 4-week timeline provides adequate buffer for testing and validation while ensuring a smooth transition to the significantly improved V2 platform.
