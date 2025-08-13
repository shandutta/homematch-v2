# PropertyCard Storytelling Feature

## Overview

The PropertyCard Storytelling feature enhances the property browsing experience for couples by adding emotional, lifestyle-focused descriptions and contextual tags to property cards.

## Components

### StorytellingDescription

**Location**: `src/components/features/storytelling/StorytellingDescription.tsx`

A React component that generates personalized, emotional descriptions and lifestyle tags based on property characteristics.

#### Features

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

#### Props

```typescript
interface StorytellingDescriptionProps {
  property: Property
  neighborhood?: Neighborhood
  isMutualLike?: boolean
  className?: string
}
```

#### Usage

```tsx
<StorytellingDescription
  property={property}
  neighborhood={neighborhood}
  isMutualLike={isMutualLike}
/>
```

## Integration

The StorytellingDescription component is integrated into the existing PropertyCard component at:

- **Location**: `src/components/property/PropertyCard.tsx`
- **Position**: Between property details grid and existing description
- **Logic**: Automatically detects mutual likes using the `useMutualLikes` hook

## Example Outputs

### Starter Home

- Description: "Perfect starter home where your love story begins"
- Tags: "Love Nest", "Cozy Retreat"

### Family Home

- Description: "Room to grow, laugh, and create lifelong memories"
- Tags: "Family Haven", "Work from Home Ready", "Pet Paradise"

### Luxury Property

- Description: "Elegant retreat for the refined couple"
- Tags: "Entertainer's Dream", "Urban Oasis", "Love Nest"

### Mutual Like

- Description: "Both hearts say yes to this special place" (with heart icon)
- Enhanced pink gradient styling
- Special romantic messaging

## Testing

Comprehensive unit tests are provided:

- **Location**: `__tests__/unit/components/features/storytelling/StorytellingDescription.test.tsx`
- **Coverage**: Description generation, tag logic, mutual like behavior, edge cases
- **PropertyCard Integration**: Updated PropertyCard tests include storytelling component

## Technical Details

### Dependencies

- `framer-motion`: For smooth animations
- `lucide-react`: For lifestyle tag icons
- Existing UI components (`Badge`)

### Performance Considerations

- Randomized descriptions to avoid repetition
- Maximum 3 lifestyle tags to prevent UI clutter
- Lightweight component with minimal re-renders
- Proper memoization through React functional components

### Accessibility

- Semantic HTML structure
- ARIA-friendly badge components
- Keyboard navigation support
- Screen reader compatible

## Design Tokens

The component uses existing design tokens from the project:

- `text-token-sm`, `text-token-xs` for typography
- `token-lg`, `token-sm`, `token-xs` for spacing
- Color schemes follow existing UI patterns
- Responsive design maintains mobile-first approach

## Future Enhancements

Potential improvements could include:

- Machine learning-based description personalization
- Additional lifestyle categories
- User preference learning
- A/B testing for description effectiveness
- Integration with neighborhood data for more context
