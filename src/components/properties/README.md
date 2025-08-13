# SwipeablePropertyCard

An enhanced property card component with advanced swipe physics, haptic feedback, and delightful animations for HomeMatch v2.

## Features

### 🎯 Advanced Swipe Physics

- **Spring animations** with realistic physics using framer-motion
- **Velocity-based throw** animations for natural card movement
- **Rubber-band effect** at boundaries to prevent over-swiping
- **Dynamic card rotation** based on swipe direction and intensity
- **Card scaling** during drag for visual feedback

### 📱 Haptic Feedback (Mobile)

- **Light haptic** on drag start
- **Medium haptic** when crossing decision threshold
- **Success haptic** on completed like/pass actions
- **Cross-platform support** for iOS and Android devices
- **Fallback mechanisms** for devices without haptic support

### 🎨 Visual Feedback

- **Decision overlays** showing "LIKE" (green) and "PASS" (red)
- **Opacity transitions** based on swipe distance
- **Shadow changes** during drag for depth perception
- **Threshold indicators** showing swipe zones
- **Gradient overlays** for decision areas

### 📚 Card Stack Behavior

- **Depth visualization** showing next 2-3 cards behind current
- **Scale and opacity** differences for visual depth
- **Smooth transitions** when cards are swiped away
- **Performance optimized** with proper z-indexing

### ↩️ Undo Functionality

- **Undo button** appears when history exists
- **State management** for swipe history
- **Visual confirmation** of undo actions

### ⚡ Performance Optimizations

- **Hardware acceleration** with transform3d and will-change hints
- **RequestAnimationFrame** for smooth 60fps animations
- **Efficient re-renders** with React.memo and useCallback
- **Memory management** with proper cleanup

### 🆕 First-Time User Experience

- **Swipe hints** with subtle animations on first load
- **Auto-dismiss** hints after first interaction
- **Accessibility support** with keyboard navigation
- **Screen reader** friendly with proper ARIA labels

## Usage

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

## Props

| Prop           | Type                                                  | Default | Description                              |
| -------------- | ----------------------------------------------------- | ------- | ---------------------------------------- |
| `properties`   | `Property[]`                                          | -       | Array of properties to display           |
| `currentIndex` | `number`                                              | -       | Index of current property being shown    |
| `onDecision`   | `(propertyId: string, type: InteractionType) => void` | -       | Callback when user makes a decision      |
| `onUndo?`      | `() => void`                                          | -       | Optional callback for undo functionality |
| `className?`   | `string`                                              | -       | Additional CSS classes                   |
| `showHints?`   | `boolean`                                             | `false` | Whether to show swipe hints              |

## Architecture

### Hook System

- **`useSwipePhysics`** - Handles all swipe physics and animations
- **`useHapticFeedback`** - Manages cross-platform haptic feedback
- **Custom motion values** for smooth transforms and transitions

### Component Structure

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

### Animation System

- **Transform-based** animations for performance
- **Spring physics** for realistic motion
- **Staggered animations** for card stack depth
- **Hardware acceleration** optimizations

## Customization

### Physics Constants

Adjust in `useSwipePhysics.ts`:

```ts
const SWIPE_THRESHOLD = 100 // Distance to trigger action
const SWIPE_VELOCITY_THRESHOLD = 500 // Velocity to trigger action
const RUBBER_BAND_FACTOR = 0.3 // Boundary resistance
```

### Visual Design

Customize in component:

```ts
const STACK_DEPTH = 3 // Number of background cards
const STACK_SCALE_FACTOR = 0.05 // Scale reduction per card
const STACK_OPACITY_FACTOR = 0.3 // Opacity reduction per card
```

### Haptic Patterns

Modify in `haptic-feedback.ts`:

```ts
// Custom vibration patterns
success: () => vibrate([5, 20, 5]) // Short-long-short pattern
warning: () => vibrate([5, 25, 5]) // Medium pattern
```

## Accessibility

- **ARIA labels** for all interactive elements
- **Keyboard navigation** support
- **Screen reader** announcements for state changes
- **High contrast** mode support
- **Reduced motion** respects user preferences

## Browser Support

- **Modern browsers** with framer-motion support
- **iOS Safari** 12+ (haptic feedback)
- **Chrome Mobile** 60+ (vibration API)
- **Graceful degradation** for older browsers

## Performance Notes

- **60fps animations** on modern devices
- **<16ms** frame times for smooth motion
- **Minimal re-renders** with optimized React patterns
- **Memory efficient** with proper cleanup

## Demo

Visit `/demo-swipe` to try the enhanced swipe functionality with:

- Real property data
- All haptic feedback features
- Complete interaction logging
- Performance monitoring

## Future Enhancements

- [ ] Machine learning for swipe prediction
- [ ] Advanced gesture recognition (pinch, rotate)
- [ ] Customizable swipe directions (up/down actions)
- [ ] Voice control integration
- [ ] Analytics and usage tracking
- [ ] A/B testing framework for physics tuning
