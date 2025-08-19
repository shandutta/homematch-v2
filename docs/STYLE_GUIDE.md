# HomeMatch UX/UI Style Guide

This style guide outlines visual and interaction guidelines for the HomeMatch real‑estate platform. It reflects the actual implementation patterns used in the current application and is tailored to millennial homebuyers. Use this guide to ensure a cohesive and accessible user experience across the web application.

## 1. Design principles

### Focus on clarity and purpose

- **Minimalism with intent** – Use clean layouts with generous white space so content stands out. Keep components simple and avoid clutter.
- **Human‑centred storytelling** – Highlight aspirational lifestyle imagery (beautiful homes, happy couples) rather than only transactional data. Use narrative copy and visuals to connect emotionally with millennials.
- **Single goal per page** – Each page should support a primary user task (swipe properties, adjust filters, save favourites). Use concise copy and a clear call‑to‑action.

### Build trust

- **Transparency and social proof** – Include testimonials, partner badges and statistics that reinforce credibility.
- **Consistency** – Use consistent colours, typography, component sizes and interaction patterns. Consistency reduces cognitive load and builds user confidence.
- **Accessibility first** – Adhere to WCAG 2.1 AA. Use high contrast, clear labeling, keyboard navigation and ARIA attributes.

### Subtle motion

- **Micro‑interactions** – Provide feedback when users interact with cards, buttons and sliders. Hover effects, like/unlike animations and swipe confirmations provide interactive feedback.
- **Progressive disclosure** – Reveal advanced options (filters, scoring breakdown) only when the user needs them.

## 2. Colour, typography and icons

### Colour palette

The HomeMatch colour palette is designed to convey trust, modernity, and sophistication while maintaining accessibility. The teal/cyan gradient (#29e3ff → #1ecfea) is reserved for primary actions like "Get started" buttons and should be used sparingly for high visibility elements.

| Role              | Colours & Usage                                  | Notes                                                                                                               |
| ----------------- | ------------------------------------------------ | ------------------------------------------------------------------------------------------------------------------- |
| **Primary brand** | Deep navy gradient (#020b1f → #03123b → #041a52) | Used for main backgrounds and immersive sections. Creates a sophisticated, premium feel.                            |
| **Secondary**     | Rich purple (#6D28D9)                            | New accent color for buttons, highlights, and interactive elements. Creates a vibrant contrast with the navy theme. |
| **Tertiary**      | Soft neutrals (white/gray with transparency)     | Background sections, cards and modals. Light neutrals soften dark themes and support white space.                   |
| **Error/Warning** | Coral red (#FF6B6B) and Amber (#F59E0B)          | Feedback colours for errors, warnings and alerts.                                                                   |

Support dark and light modes. Maintain sufficient contrast ratios (>4.5:1) for text and interactive elements.

### Typography

- **Font family** – Use Geist (via `--font-geist-sans` and `--font-geist-mono`) for a modern, clean appearance.
- **Heading font** – Custom heading font (via `--font-heading`) for prominent titles.
- **Body font** – Custom body font (via `--font-body`) for descriptive text.
- **Hierarchy** – Establish a clear typographic hierarchy:
  - **Headings (H1–H3):** Bold weight, 1.75–2.5 rem sizes, minimal letter‑spacing.
  - **Body text:** Regular weight, 1 rem size with comfortable line height (~1.5). Use dark text on light backgrounds or light text on dark backgrounds.
  - **Labels and captions:** 0.875 rem with medium weight.
- **Usage** – Limit to two font families and avoid excessive styles.

### Icons

- Use Lucide icons (included with shadcn/ui). Icons should be simple, line‑based and match the stroke weight of text.
- Provide context with tooltips or labels. Avoid using icons alone for critical actions.
- Ensure icons have descriptive labels for screen readers.

## 3. Layout and spacing

- **Grid system:** Use a responsive 12‑column grid. Adjust breakpoints for mobile‑first design (e.g., 375px, 768px, 1024px, 1440px).
- **Spacing scale:** Adopt a consistent spacing scale based on Tailwind's default spacing (4px increments). Use Tailwind's spacing utilities for consistency.
- **Container widths:** Limit content width to ~1200px for desktop. Maintain generous margins for readability.
- **Layered backgrounds:** Use a combination of:
  - Radial gradients for depth: `radial-gradient(1200px 600px at 50% -10%, rgba(2,26,68,0.06) 0%, rgba(2,26,68,0.03) 35%, rgba(255,255,255,1) 65%)`
  - Grid overlays: `repeating-linear-gradient` with 28px grid pattern
  - Additional radial overlays for visual interest

## 4. Components (shadcn/ui)

- **Buttons:**
  - Primary buttons: High visibility gradient with hover glow effect
  - Secondary buttons: White with navy border and subtle hover effects
  - Support loading and disabled states
- **Cards:**
  - Glass-morphism effect with backdrop blur (`backdrop-blur-[2px]`)
  - Soft shadows: `shadow-[0_6px_28px_rgba(2,6,23,0.08)]`
  - Hover effects with enhanced shadows
- **Modals & Dialogs:** For onboarding, filters, and property details. Always include clear close actions.
- **Forms:** Use React Hook Form with validation. Provide inline error messages and confirmation states.
- **Toasts:** Use for non‑blocking notifications (e.g., saved search confirmation).

## 5. Animations

- Use Framer Motion for subtle transitions and micro-interactions.
- Apply animations to:
  - Page transitions and section reveals
  - Hover states on interactive elements
  - Button feedback and loading states
- Avoid overwhelming animations. Keep durations between 150–300ms.
- Provide haptic or visual feedback on swipe actions.

## 6. Accessibility

- Ensure all interactive elements are keyboard‑navigable.
- Provide ARIA roles for complex components (carousels, modals).
- Support dark mode with proper contrast.
- Test with screen readers and accessibility tools.

## 7. Implementation tips

- Use Tailwind design tokens for colours, spacing, and typography.
- Extend shadcn/ui components for custom needs while preserving accessibility.
- Optimize images with Next.js Image component.
- Implement lazy loading for property lists and galleries.
- **Note on Parallax Effects:** The parallax stars effect used on the homepage hero section is a special-case implementation and should not be replicated elsewhere in the application.

## 8. Design Token System

### Current Design Token Implementation

HomeMatch uses a comprehensive design token system with 226 tokens achieving 85% coverage. The system includes semantic tokens for consistent theming across components.

#### Marketing Semantic Tokens (8 tokens)

```css
--color-marketing-text-primary: #1f2937;
--color-marketing-text-secondary: #6b7280;
--color-marketing-error: #ef4444;
--color-marketing-error-bg: #fef2f2;
--gradient-marketing-primary: linear-gradient(
  to bottom right,
  #021a44,
  #063a9e
);
--gradient-marketing-card: linear-gradient(to bottom right, #021a44, #063a9e);
--bg-marketing-glass: rgba(255, 255, 255, 0.05);
--border-marketing-glass: rgba(255, 255, 255, 0.2);
```

**Utility Classes:**

- `.text-marketing-primary`, `.text-marketing-secondary`, `.text-marketing-error`
- `.bg-marketing-error`, `.bg-gradient-marketing-primary`, `.bg-gradient-marketing-card`
- `.bg-marketing-glass`, `.border-marketing-glass`

#### Couples Theme Tokens (7 tokens)

```css
--color-couples-primary: #ec4899;
--color-couples-secondary: #8b5cf6;
--color-couples-accent: #f43f5e;
--color-couples-success: #22c55e;
--color-couples-warning: #f59e0b;
--color-couples-info: #eab308;
--gradient-couples-mutual: linear-gradient(
  to right,
  rgba(236, 72, 153, 0.2),
  rgba(139, 92, 246, 0.2)
);
```

**Utility Classes:**

- `.text-couples-*` for all color variants
- `.bg-couples-primary`, `.bg-couples-secondary`, `.bg-couples-accent`
- `.bg-gradient-couples-mutual`, `.border-couples-primary`

#### Glassmorphism Enhancement Tokens (5 tokens)

```css
--blur-glassmorphism-sm: 4px;
--blur-glassmorphism-md: 8px;
--blur-glassmorphism-lg: 12px;
--opacity-glass-subtle: 0.05;
--opacity-glass-strong: 0.95;
```

**Utility Classes:**

- `.blur-glass-sm`, `.blur-glass-md`, `.blur-glass-lg`
- `.glass-subtle`, `.glass-strong` (combined opacity + blur effects)

### Token Usage Guidelines

#### Marketing Components

```css
.marketing-hero {
  background: var(--gradient-marketing-primary);
  color: var(--color-marketing-text-primary);
}
```

#### Couples Functionality

```css
.couples-card {
  background: var(--gradient-couples-mutual);
  border-color: var(--color-couples-primary);
}
```

#### Enhanced Glassmorphism

```css
.glass-card {
  background-color: rgba(255, 255, 255, var(--opacity-glass-subtle));
  backdrop-filter: blur(var(--blur-glassmorphism-md));
}
```

### Design Token Coverage

- **Total Tokens**: 226 tokens
- **Coverage**: 85% (target achieved)
- **Categories**: Marketing, Couples, Glassmorphism, Core UI
- **Location**: `src/app/globals.css`

---

## 9. Component Development Guidelines

### PropertyCard Storytelling Feature

**Overview**: The PropertyCard Storytelling feature enhances the property browsing experience for couples by adding emotional, lifestyle-focused descriptions and contextual tags to property cards.

#### StorytellingDescription Component

**Location**: `src/components/features/storytelling/StorytellingDescription.tsx`

A React component that generates personalized, emotional descriptions and lifestyle tags based on property characteristics.

**Features**:

1. **Dynamic Descriptions**: Context-aware descriptions based on:
   - Property type (house, condo, townhouse, apartment)
   - Price range (starter, family, luxury)
   - Property features (bedrooms, bathrooms, square footage)

2. **Lifestyle Tags**: Smart tag generation including:
   - "Work from Home Ready" (3+ bedrooms)
   - "Entertainer's Dream" (>1500 sqft, 2+ baths)
   - "Pet Paradise" (houses with large lots >2000 sqft)
   - "Urban Oasis" (condos with pool amenity)
   - "Family Haven" (3+ bed, 2+ bath)
   - "Cozy Retreat" (≤2 bed, ≤1200 sqft)
   - "Scholar's Den" (high walk score >80)
   - "Love Nest" (always included for couples)

3. **Couple-Specific Features**:
   - Special mutual like messages when both partners like a property
   - Romantic, aspirational language focused on couples
   - Enhanced styling for mutual likes (pink gradient background)

4. **Animations**: Subtle entrance animations using framer-motion:
   - Staggered tag appearances
   - Heart icon animation for mutual likes
   - Smooth fade-in transitions

**Props Interface**:

```typescript
interface StorytellingDescriptionProps {
  property: Property
  neighborhood?: Neighborhood
  isMutualLike?: boolean
  className?: string
}
```

**Usage**:

```tsx
<StorytellingDescription
  property={property}
  neighborhood={neighborhood}
  isMutualLike={isMutualLike}
/>
```

**Integration**: The StorytellingDescription component is integrated into the existing PropertyCard component at:

- **Location**: `src/components/property/PropertyCard.tsx`
- **Position**: Between property details grid and existing description
- **Logic**: Automatically detects mutual likes using the `useMutualLikes` hook

**Example Outputs**:

- **Starter Home**: "Perfect starter home where your love story begins" + Tags: "Love Nest", "Cozy Retreat"
- **Family Home**: "Room to grow, laugh, and create lifelong memories" + Tags: "Family Haven", "Work from Home Ready", "Pet Paradise"
- **Luxury Property**: "Elegant retreat for the refined couple" + Tags: "Entertainer's Dream", "Urban Oasis", "Love Nest"
- **Mutual Like**: "Both hearts say yes to this special place" (with heart icon) + Enhanced pink gradient styling

**Dependencies**:

- `framer-motion`: For smooth animations
- `lucide-react`: For lifestyle tag icons
- Existing UI components (`Badge`)

**Performance Considerations**:

- Randomized descriptions to avoid repetition
- Maximum 3 lifestyle tags to prevent UI clutter
- Lightweight component with minimal re-renders
- Proper memoization through React functional components

**Accessibility**:

- Semantic HTML structure
- ARIA-friendly badge components
- Keyboard navigation support
- Screen reader compatible

### SwipeablePropertyCard Component

**Overview**: An enhanced property card component with advanced swipe physics, haptic feedback, and delightful animations for HomeMatch v2.

#### Features

**🎯 Advanced Swipe Physics**:

- **Spring animations** with realistic physics using framer-motion
- **Velocity-based throw** animations for natural card movement
- **Rubber-band effect** at boundaries to prevent over-swiping
- **Dynamic card rotation** based on swipe direction and intensity
- **Card scaling** during drag for visual feedback

**📱 Haptic Feedback (Mobile)**:

- **Light haptic** on drag start
- **Medium haptic** when crossing decision threshold
- **Success haptic** on completed like/pass actions
- **Cross-platform support** for iOS and Android devices
- **Fallback mechanisms** for devices without haptic support

**🎨 Visual Feedback**:

- **Decision overlays** showing "LIKE" (green) and "PASS" (red)
- **Opacity transitions** based on swipe distance
- **Shadow changes** during drag for depth perception
- **Threshold indicators** showing swipe zones
- **Gradient overlays** for decision areas

**📚 Card Stack Behavior**:

- **Depth visualization** showing next 2-3 cards behind current
- **Scale and opacity** differences for visual depth
- **Smooth transitions** when cards are swiped away
- **Performance optimized** with proper z-indexing

**↩️ Undo Functionality**:

- **Undo button** appears when history exists
- **State management** for swipe history
- **Visual confirmation** of undo actions

**⚡ Performance Optimizations**:

- **Hardware acceleration** with transform3d and will-change hints
- **RequestAnimationFrame** for smooth 60fps animations
- **Efficient re-renders** with React.memo and useCallback
- **Memory management** with proper cleanup

**🆕 First-Time User Experience**:

- **Swipe hints** with subtle animations on first load
- **Auto-dismiss** hints after first interaction
- **Accessibility support** with keyboard navigation
- **Screen reader** friendly with proper ARIA labels

#### Usage

```tsx
import { SwipeablePropertyCard } from '@/components/properties/SwipeablePropertyCard'

function PropertySwiper() {
  const [currentIndex, setCurrentIndex] = useState(0)

  const handleDecision = (propertyId: string, type: InteractionType) => {
    console.log(`User ${type} property ${propertyId}`)
    setCurrentIndex((prev) => prev + 1)
  }

  const handleUndo = () => {
    setCurrentIndex((prev) => prev - 1)
  }

  return (
    <SwipeablePropertyCard
      properties={properties}
      currentIndex={currentIndex}
      onDecision={handleDecision}
      onUndo={handleUndo}
      showHints={currentIndex === 0}
      className="custom-styles"
    />
  )
}
```

#### Props

| Prop           | Type                                                  | Default | Description                              |
| -------------- | ----------------------------------------------------- | ------- | ---------------------------------------- |
| `properties`   | `Property[]`                                          | -       | Array of properties to display           |
| `currentIndex` | `number`                                              | -       | Index of current property being shown    |
| `onDecision`   | `(propertyId: string, type: InteractionType) => void` | -       | Callback when user makes a decision      |
| `onUndo?`      | `() => void`                                          | -       | Optional callback for undo functionality |
| `className?`   | `string`                                              | -       | Additional CSS classes                   |
| `showHints?`   | `boolean`                                             | `false` | Whether to show swipe hints              |

#### Architecture

**Hook System**:

- **`useSwipePhysics`** - Handles all swipe physics and animations
- **`useHapticFeedback`** - Manages cross-platform haptic feedback
- **Custom motion values** for smooth transforms and transitions

**Component Structure**:

```
SwipeablePropertyCard/
├── Card Stack (Background cards)
├── Current Card (Interactive)
│   ├── PropertyCard (Content)
│   ├── Decision Overlays (LIKE/PASS)
│   ├── Threshold Indicators
│   └── Swipe Hints
└── Action Buttons (Manual controls)
```

**Animation System**:

- **Transform-based** animations for performance
- **Spring physics** for realistic motion
- **Staggered animations** for card stack depth
- **Hardware acceleration** optimizations

#### Customization

**Physics Constants** (adjust in `useSwipePhysics.ts`):

```ts
const SWIPE_THRESHOLD = 100 // Distance to trigger action
const SWIPE_VELOCITY_THRESHOLD = 500 // Velocity to trigger action
const RUBBER_BAND_FACTOR = 0.3 // Boundary resistance
```

**Visual Design** (customize in component):

```ts
const STACK_DEPTH = 3 // Number of background cards
const STACK_SCALE_FACTOR = 0.05 // Scale reduction per card
const STACK_OPACITY_FACTOR = 0.3 // Opacity reduction per card
```

**Haptic Patterns** (modify in `haptic-feedback.ts`):

```ts
// Custom vibration patterns
success: () => vibrate([5, 20, 5]) // Short-long-short pattern
warning: () => vibrate([5, 25, 5]) // Medium pattern
```

#### Accessibility

- **ARIA labels** for all interactive elements
- **Keyboard navigation** support
- **Screen reader** announcements for state changes
- **High contrast** mode support
- **Reduced motion** respects user preferences

#### Browser Support

- **Modern browsers** with framer-motion support
- **iOS Safari** 12+ (haptic feedback)
- **Chrome Mobile** 60+ (vibration API)
- **Graceful degradation** for older browsers

#### Performance Notes

- **60fps animations** on modern devices
- **<16ms** frame times for smooth motion
- **Minimal re-renders** with optimized React patterns
- **Memory efficient** with proper cleanup

### Coordinate Utilities

**Overview**: The coordinate utilities provide a centralized, type-safe system for handling coordinate parsing, conversion, and validation throughout the HomeMatch application.

#### Key Files

- **`src/lib/utils/coordinates.ts`** - Main utilities module
- **`__tests__/unit/lib/utils/coordinates.test.ts`** - Comprehensive unit tests
- **`__tests__/unit/lib/utils/coordinates-integration.test.ts`** - Integration tests

#### Features

**Type-Safe Coordinate Handling**:

- **LatLng** objects with validation
- **CoordinateTuple** arrays `[longitude, latitude]`
- **GeoJSONPoint** format for PostGIS
- **BoundingBox** operations with validation

**PostGIS Integration**:

- Parse PostGIS geometry to lat/lng coordinates
- Convert between GeoJSON and LatLng formats
- Handle multiple coordinate formats from database

**Distance & Bearing Calculations**:

- Great circle distance using Haversine formula
- Bearing calculations between points
- Destination point from bearing and distance

**Bounding Box Operations**:

- Calculate bounding boxes from coordinate arrays
- Expand bounding boxes by distance
- Check coordinate containment and intersection
- Get bounding box centers

**Validation & Error Handling**:

- Comprehensive coordinate validation
- Type-safe error handling
- Input sanitization and bounds checking

#### Usage Examples

**Basic Coordinate Parsing**:

```typescript
import { parsePostGISGeometry, isValidLatLng } from '@/lib/utils/coordinates'

// Parse PostGIS geometry from database
const dbGeometry = { type: 'Point', coordinates: [-122.4194, 37.7749] }
const coords = parsePostGISGeometry(dbGeometry)
// Result: { lat: 37.7749, lng: -122.4194 }

// Validate coordinates
if (isValidLatLng(coords)) {
  // Safe to use coordinates
}
```

**Distance Calculations**:

```typescript
import { calculateDistance } from '@/lib/utils/coordinates'

const sanFrancisco = { lat: 37.7749, lng: -122.4194 }
const newYork = { lat: 40.7128, lng: -74.006 }

const distance = calculateDistance(sanFrancisco, newYork)
// Result: ~4139 km
```

**Bounding Box Operations**:

```typescript
import {
  calculateBoundingBox,
  expandBoundingBox,
} from '@/lib/utils/coordinates'

const locations = [
  { lat: 37.7749, lng: -122.4194 },
  { lat: 40.7128, lng: -74.006 },
]

const bbox = calculateBoundingBox(locations)
const expandedBbox = expandBoundingBox(bbox, 50) // Expand by 50km
```

**GeoJSON Conversion**:

```typescript
import { latLngToGeoJSON, geoJSONToLatLng } from '@/lib/utils/coordinates'

const coords = { lat: 37.7749, lng: -122.4194 }
const geoJSON = latLngToGeoJSON(coords)
// Result: { type: 'Point', coordinates: [-122.4194, 37.7749] }

const backToCoords = geoJSONToLatLng(geoJSON)
// Result: { lat: 37.7749, lng: -122.4194 }
```

#### Integration with Services

**Geographic Service Updates**: The `GeographicService` has been updated to use the coordinate utilities:

- **PostGIS geometry parsing** using `parsePostGISGeometry()`
- **Coordinate validation** using `isValidLatLng()`
- **Distance calculations** using `calculateDistance()`
- **Bounding box normalization** for legacy format support

**Component Updates**: Components using coordinates have been updated:

- **PropertyMap** component uses `parsePostGISGeometry()` for safe coordinate extraction
- **Geocoding API** uses validation functions for result filtering

#### Validation & Error Handling

**Coordinate Validation**:

```typescript
import {
  isValidLatitude,
  isValidLongitude,
  isValidLatLng,
} from '@/lib/utils/coordinates'

// Individual validation
isValidLatitude(37.7749) // true
isValidLatitude(91) // false

isValidLongitude(-122.4194) // true
isValidLongitude(-181) // false

// Combined validation
isValidLatLng({ lat: 37.7749, lng: -122.4194 }) // true
isValidLatLng({ lat: 91, lng: -122.4194 }) // false
```

**Error Handling**: The utilities handle errors gracefully:

- **Null/undefined inputs** return `null` safely
- **Invalid coordinate values** throw descriptive errors
- **Malformed geometry** logs warnings and returns `null`
- **Type validation** prevents runtime errors

#### API Reference

**Core Functions**:

- `parsePostGISGeometry(geometry)` - Parse PostGIS geometry to LatLng
- `latLngToGeoJSON(coords)` - Convert LatLng to GeoJSON Point
- `geoJSONToLatLng(geoJSON)` - Convert GeoJSON Point to LatLng
- `calculateDistance(point1, point2)` - Calculate distance in km
- `calculateBearing(point1, point2)` - Calculate bearing in degrees
- `calculateDestination(start, distance, bearing)` - Calculate destination point

**Validation Functions**:

- `isValidLatitude(lat)` - Validate latitude value
- `isValidLongitude(lng)` - Validate longitude value
- `isValidLatLng(coords)` - Validate coordinate object
- `isValidBoundingBox(bbox)` - Validate bounding box

**Utility Functions**:

- `toRadians(degrees)` - Convert degrees to radians
- `toDegrees(radians)` - Convert radians to degrees
- `roundCoordinates(coords, decimals)` - Round coordinates
- `formatCoordinates(coords)` - Format as human-readable string
- `parseCoordinateString(str)` - Parse coordinate string

**Types**:

- `LatLng` - `{ lat: number; lng: number }`
- `CoordinateTuple` - `[number, number]` (longitude, latitude)
- `GeoJSONPoint` - GeoJSON Point geometry
- `BoundingBox` - `{ north, south, east, west }`

#### Best Practices

1. **Always validate coordinates** before using them in calculations
2. **Use type-safe functions** instead of manual coordinate handling
3. **Handle null/undefined geometry** gracefully with parsePostGISGeometry
4. **Use appropriate precision** for coordinate rounding based on use case
5. **Validate bounding boxes** before geographic operations
6. **Test coordinate edge cases** including poles and date line crossings

---

This guide establishes a modern, accessible design system for HomeMatch, ensuring consistency across the app experience while reflecting the actual implemented design patterns, comprehensive design token system, and specialized component development guidelines.
