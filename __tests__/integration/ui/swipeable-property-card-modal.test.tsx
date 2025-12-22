/* eslint-disable @next/next/no-img-element */
import React from 'react'
import { describe, test, expect, beforeEach, vi } from 'vitest'
import { fireEvent, render, screen } from '@testing-library/react'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { PropertyDetailProvider } from '@/components/property/PropertyDetailProvider'
import { SwipeablePropertyCard } from '@/components/properties/SwipeablePropertyCard'
import type { Property } from '@/lib/schemas/property'

vi.mock('framer-motion', () => {
  const MockMotionDiv = React.forwardRef<
    HTMLDivElement,
    React.HTMLProps<HTMLDivElement>
  >(({ children, ...rest }, ref) => (
    <div ref={ref} {...rest}>
      {children}
    </div>
  ))
  MockMotionDiv.displayName = 'MockMotionDiv'

  const MockMotionButton = React.forwardRef<
    HTMLButtonElement,
    React.HTMLProps<HTMLButtonElement>
  >((props, ref) => <button ref={ref} {...props} />)
  MockMotionButton.displayName = 'MockMotionButton'

  return {
    AnimatePresence: ({ children }: { children: React.ReactNode }) => (
      <>{children}</>
    ),
    useMotionValue: () => ({
      set: vi.fn(),
      get: vi.fn(() => 0),
    }),
    useTransform: () => ({
      set: vi.fn(),
      get: vi.fn(() => 0),
    }),
    useAnimation: () => ({
      start: vi.fn().mockResolvedValue(undefined),
      set: vi.fn(),
    }),
    motion: {
      div: MockMotionDiv,
      button: MockMotionButton,
    },
  }
})

vi.mock('@/components/ui/motion-components', () => {
  const MockMotionDiv = React.forwardRef<
    HTMLDivElement,
    React.HTMLProps<HTMLDivElement>
  >(({ children, ...rest }, ref) => {
    const { onTap, onClick, ...restProps } = rest
    return (
      <div ref={ref} onClick={onTap ?? onClick} {...restProps}>
        {children}
      </div>
    )
  })
  MockMotionDiv.displayName = 'MockMotionDiv'
  return { MotionDiv: MockMotionDiv }
})

vi.mock('@/components/ui/motion-button', () => ({
  MotionButton: ({
    children,
    ...props
  }: React.ButtonHTMLAttributes<HTMLButtonElement>) => (
    <button {...props}>{children}</button>
  ),
}))

vi.mock('@/components/property/PropertyMap', () => ({
  PropertyMap: () => <div data-testid="property-map" />,
}))

vi.mock('@/components/features/storytelling/StorytellingDescription', () => ({
  StorytellingDescription: () => <div data-testid="storytelling-description" />,
}))

vi.mock('@/components/features/couples/MutualLikesBadge', () => ({
  MutualLikesIndicator: () => <div data-testid="mutual-likes-indicator" />,
}))

vi.mock('@/components/ui/property-image', () => ({
  PropertyImage: ({ src, alt }: { src?: string | string[]; alt: string }) => (
    <img src={Array.isArray(src) ? src[0] : src} alt={alt} />
  ),
}))

vi.mock('@/hooks/useCouples', () => ({
  useMutualLikes: () => ({ data: [] }),
}))

vi.mock('@/hooks/usePropertyVibes', () => ({
  usePropertyVibes: () => ({ data: null }),
}))

vi.mock('@/hooks/useNeighborhoodVibes', () => ({
  useNeighborhoodVibes: () => ({ data: null }),
}))

vi.mock('@/hooks/useInteractions', () => ({
  useRecordInteraction: () => ({ mutate: vi.fn() }),
}))

vi.mock('@/hooks/useSwipePhysics', () => ({
  useSwipePhysics: () => ({
    x: { set: vi.fn(), get: vi.fn(() => 0) },
    y: { set: vi.fn(), get: vi.fn(() => 0) },
    rotate: { set: vi.fn(), get: vi.fn(() => 0) },
    opacity: { set: vi.fn(), get: vi.fn(() => 1) },
    scale: { set: vi.fn(), get: vi.fn(() => 1) },
    likeOpacity: { set: vi.fn(), get: vi.fn(() => 0) },
    passOpacity: { set: vi.fn(), get: vi.fn(() => 0) },
    controls: {
      start: vi.fn().mockResolvedValue(undefined),
      set: vi.fn(),
    },
    handleDragStart: vi.fn(),
    handleDrag: vi.fn(),
    handleDragEnd: vi.fn(),
    swipeCard: vi.fn(),
    SWIPE_THRESHOLD: 120,
    SWIPE_VELOCITY_THRESHOLD: 400,
  }),
}))

vi.mock('@/lib/utils/haptic-feedback', () => ({
  useHapticFeedback: () => ({
    light: vi.fn(),
    medium: vi.fn(),
    success: vi.fn(),
    heavy: vi.fn(),
    error: vi.fn(),
    warning: vi.fn(),
    selection: vi.fn(),
    impact: vi.fn(),
    custom: vi.fn(),
    isAvailable: true,
  }),
}))

const mockProperty: Property = {
  id: 'test-property-1',
  zpid: 'zpid-1',
  address: '123 Mobile Tap St',
  city: 'San Francisco',
  state: 'CA',
  zip_code: '94102',
  price: 500000,
  bedrooms: 3,
  bathrooms: 2,
  square_feet: 1500,
  property_type: 'single_family',
  images: ['/images/properties/house-1.svg', '/images/properties/house-2.svg'],
  description: 'Mobile tap test home',
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
}

describe('SwipeablePropertyCard integration', () => {
  let queryClient: QueryClient

  beforeEach(() => {
    queryClient = new QueryClient({
      defaultOptions: {
        queries: { retry: false },
      },
    })
  })

  test('opens the property detail modal when tapping the card', async () => {
    render(
      <QueryClientProvider client={queryClient}>
        <PropertyDetailProvider>
          <SwipeablePropertyCard
            properties={[mockProperty]}
            currentIndex={0}
            onDecision={vi.fn()}
          />
        </PropertyDetailProvider>
      </QueryClientProvider>
    )

    expect(screen.queryByTestId('property-detail-scroll')).toBeNull()

    fireEvent.click(screen.getByTestId('swipe-card-tap-target'))

    expect(await screen.findByTestId('property-detail-scroll')).toBeVisible()
    expect(screen.getByTestId('image-counter')).toHaveTextContent('1 / 2')
  })
})
