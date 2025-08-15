/**
 * Real Integration Tests for Couples Frontend Components
 * Uses real data from TestDataFactory instead of mocks
 */
import { describe, test, expect, beforeAll, afterAll, beforeEach } from '@jest/globals'
import { render, screen, waitFor } from '@testing-library/react'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { MutualLikesSection } from '@/components/features/couples/MutualLikesSection'
import { MutualLikesBadge } from '@/components/features/couples/MutualLikesBadge'
import { createClient } from '@/lib/supabase/standalone'
import { TestDataFactory, cleanupAllTestData } from '@/__tests__/utils/test-data-factory'
// import { waitForDatabase } from '@/__tests__/utils/db-test-helpers' // Not used

// next/navigation is already mocked centrally in setupSupabaseMock.ts

describe('Real Integration: Couples Frontend Components', () => {
  let factory: TestDataFactory
  let queryClient: QueryClient

  beforeAll(async () => {
    // Initialize test utilities
    const client = createClient()
    factory = new TestDataFactory(client)
  })

  afterAll(async () => {
    // Clean up all test data
    await cleanupAllTestData()
  })

  beforeEach(() => {
    queryClient = new QueryClient({
      defaultOptions: {
        queries: {
          retry: false,
          cacheTime: 0,
        },
      },
    })
  })

  const renderWithQueryClient = (component: React.ReactElement) => {
    return render(
      <QueryClientProvider client={queryClient}>
        {component}
      </QueryClientProvider>
    )
  }

  describe('MutualLikesSection Component with Real Data', () => {
    test('should render loading state correctly', () => {
      renderWithQueryClient(<MutualLikesSection isLoading={true} />)

      expect(screen.getByTestId('mutual-likes-loading')).toBeInTheDocument()
    })

    test('should display empty state when no mutual likes exist', () => {
      renderWithQueryClient(
        <MutualLikesSection isLoading={false} mutualLikes={[]} />
      )

      expect(screen.getByTestId('mutual-likes-empty')).toBeInTheDocument()
    })

    test('should display mutual likes with real property data', async () => {
      // Create real test data
      const scenario = await factory.createCouplesScenario()
      const property = scenario.properties[0] // Get the mutual like property
      
      try {
        const realMutualLikes = [
          {
            property_id: property.id,
            liked_by_count: 2,
            first_liked_at: '2024-01-01T00:00:00.000Z',
            last_liked_at: '2024-01-02T00:00:00.000Z',
            user_ids: scenario.users.map(u => u.id),
            property: {
              id: property.id,
              address: property.address,
              price: property.price,
              bedrooms: property.bedrooms,
              bathrooms: property.bathrooms,
              image_urls: property.image_urls,
              square_feet: property.square_feet,
              property_type: property.property_type,
              listing_status: property.listing_status,
            },
          },
        ]

        renderWithQueryClient(
          <MutualLikesSection isLoading={false} mutualLikes={realMutualLikes} />
        )

        // Should show mutual likes list
        await waitFor(() => {
          expect(screen.getByTestId('mutual-likes-list')).toBeInTheDocument()
        })

        // Should display real property information
        expect(screen.getByText(property.address)).toBeInTheDocument()
        
        // Format price for display (assuming the component formats it)
        const formattedPrice = new Intl.NumberFormat('en-US', {
          style: 'currency',
          currency: 'USD',
          minimumFractionDigits: 0,
          maximumFractionDigits: 0,
        }).format(property.price)
        
        // The component might show abbreviated price (e.g., $500k)
        const abbreviatedPrice = property.price >= 1000000 
          ? `$${(property.price / 1000000).toFixed(1)}M`
          : `$${(property.price / 1000).toFixed(0)}k`
        
        // Check for either format
        const priceDisplayed = screen.queryByText(formattedPrice) || screen.queryByText(abbreviatedPrice)
        expect(priceDisplayed).toBeInTheDocument()
        
        // Should show bedroom/bathroom info
        expect(screen.getByText(`${property.bedrooms} beds`)).toBeInTheDocument()
        expect(screen.getByText(`${property.bathrooms} baths`)).toBeInTheDocument()
      } finally {
        await factory.cleanup()
      }
    })

    test('should handle multiple mutual likes from real data', async () => {
      // Create scenario with multiple mutual likes
      const user1 = await factory.createUser()
      const user2 = await factory.createUser()
      const _household = await factory.createHousehold([user1.id, user2.id])
      
      const property1 = await factory.createProperty({ address: '123 First St' })
      const property2 = await factory.createProperty({ address: '456 Second Ave' })
      
      // Both users like both properties
      await factory.createInteraction(user1.id, property1.id, 'like')
      await factory.createInteraction(user2.id, property1.id, 'like')
      await factory.createInteraction(user1.id, property2.id, 'like')
      await factory.createInteraction(user2.id, property2.id, 'like')

      try {
        const realMutualLikes = [
          {
            property_id: property1.id,
            liked_by_count: 2,
            first_liked_at: '2024-01-01T00:00:00.000Z',
            last_liked_at: '2024-01-02T00:00:00.000Z',
            user_ids: [user1.id, user2.id],
            property: {
              id: property1.id,
              address: property1.address,
              price: property1.price,
              bedrooms: property1.bedrooms,
              bathrooms: property1.bathrooms,
              image_urls: property1.image_urls,
            },
          },
          {
            property_id: property2.id,
            liked_by_count: 2,
            first_liked_at: '2024-01-01T01:00:00.000Z',
            last_liked_at: '2024-01-02T01:00:00.000Z',
            user_ids: [user1.id, user2.id],
            property: {
              id: property2.id,
              address: property2.address,
              price: property2.price,
              bedrooms: property2.bedrooms,
              bathrooms: property2.bathrooms,
              image_urls: property2.image_urls,
            },
          },
        ]

        renderWithQueryClient(
          <MutualLikesSection isLoading={false} mutualLikes={realMutualLikes} />
        )

        await waitFor(() => {
          expect(screen.getByTestId('mutual-likes-list')).toBeInTheDocument()
        })

        // Both properties should be displayed
        expect(screen.getByText('123 First St')).toBeInTheDocument()
        expect(screen.getByText('456 Second Ave')).toBeInTheDocument()
      } finally {
        await factory.cleanup()
      }
    })

    test('should handle error state gracefully', () => {
      renderWithQueryClient(
        <MutualLikesSection
          isLoading={false}
          error="Failed to fetch mutual likes"
        />
      )

      expect(screen.getByTestId('mutual-likes-error')).toBeInTheDocument()
      expect(screen.getByText('Failed to fetch mutual likes')).toBeInTheDocument()
    })

    test('should handle property data variations', async () => {
      // Create property with different characteristics
      const property = await factory.createProperty({
        address: '789 Unique Blvd',
        price: 1250000, // Higher price
        bedrooms: 5,
        bathrooms: 3.5,
        square_feet: 3500,
        property_type: 'TOWNHOUSE',
        image_urls: ['/image1.jpg', '/image2.jpg'], // Multiple images
      })

      try {
        const mutualLikes = [
          {
            property_id: property.id,
            liked_by_count: 2,
            first_liked_at: '2024-01-01T00:00:00.000Z',
            last_liked_at: '2024-01-02T00:00:00.000Z',
            user_ids: ['user1', 'user2'],
            property: {
              id: property.id,
              address: property.address,
              price: property.price,
              bedrooms: property.bedrooms,
              bathrooms: property.bathrooms,
              square_feet: property.square_feet,
              property_type: property.property_type,
              image_urls: property.image_urls,
            },
          },
        ]

        renderWithQueryClient(
          <MutualLikesSection isLoading={false} mutualLikes={mutualLikes} />
        )

        await waitFor(() => {
          expect(screen.getByTestId('mutual-likes-list')).toBeInTheDocument()
        })

        // Should handle different data formats correctly
        expect(screen.getByText('789 Unique Blvd')).toBeInTheDocument()
        expect(screen.getByText('5 beds')).toBeInTheDocument()
        expect(screen.getByText('3.5 baths')).toBeInTheDocument()
        
        // Should show high price correctly (likely as $1.3M)
        const priceElement = screen.getByText(/\$1\.[0-9]M/)
        expect(priceElement).toBeInTheDocument()
      } finally {
        await factory.cleanup()
      }
    })
  })

  describe('MutualLikesBadge Component', () => {
    test('should render with count from real scenario', async () => {
      const scenario = await factory.createCouplesScenario()
      
      try {
        renderWithQueryClient(<MutualLikesBadge likedByCount={scenario.users.length} />)

        expect(screen.getByTestId('mutual-likes-badge')).toBeInTheDocument()
        expect(screen.getByText(scenario.users.length.toString())).toBeInTheDocument()
      } finally {
        await factory.cleanup()
      }
    })

    test('should not render with count less than 2', () => {
      const { container } = renderWithQueryClient(
        <MutualLikesBadge likedByCount={1} />
      )

      expect(container.firstChild).toBeNull()
    })

    test('should handle large household sizes', async () => {
      // Create larger household
      const users = await Promise.all(
        Array.from({ length: 5 }, () => factory.createUser())
      )
      const _household = await factory.createHousehold(users.map(u => u.id))

      try {
        renderWithQueryClient(<MutualLikesBadge likedByCount={users.length} />)

        expect(screen.getByTestId('mutual-likes-badge')).toBeInTheDocument()
        expect(screen.getByText('5')).toBeInTheDocument()
      } finally {
        await factory.cleanup()
      }
    })
  })

  describe('Component Integration with Real Data Flow', () => {
    test('should handle data updates correctly', async () => {
      // Create initial scenario
      const user1 = await factory.createUser()
      const user2 = await factory.createUser()
      const _household = await factory.createHousehold([user1.id, user2.id])
      const property = await factory.createProperty({ address: 'Initial Property' })
      
      await factory.createInteraction(user1.id, property.id, 'like')
      await factory.createInteraction(user2.id, property.id, 'like')

      try {
        const initialMutualLikes = [
          {
            property_id: property.id,
            liked_by_count: 2,
            first_liked_at: '2024-01-01T00:00:00.000Z',
            last_liked_at: '2024-01-02T00:00:00.000Z',
            user_ids: [user1.id, user2.id],
            property: {
              id: property.id,
              address: property.address,
              price: property.price,
              bedrooms: property.bedrooms,
              bathrooms: property.bathrooms,
              image_urls: property.image_urls,
            },
          },
        ]

        const { rerender } = renderWithQueryClient(
          <MutualLikesSection isLoading={false} mutualLikes={initialMutualLikes} />
        )

        // Should show initial mutual likes
        await waitFor(() => {
          expect(screen.getByTestId('mutual-likes-list')).toBeInTheDocument()
        })
        expect(screen.getByText('Initial Property')).toBeInTheDocument()

        // Create new property and add to mutual likes
        const newProperty = await factory.createProperty({ address: 'New Property' })
        await factory.createInteraction(user1.id, newProperty.id, 'like')
        await factory.createInteraction(user2.id, newProperty.id, 'like')

        const updatedMutualLikes = [
          ...initialMutualLikes,
          {
            property_id: newProperty.id,
            liked_by_count: 2,
            first_liked_at: '2024-01-03T00:00:00.000Z',
            last_liked_at: '2024-01-04T00:00:00.000Z',
            user_ids: [user1.id, user2.id],
            property: {
              id: newProperty.id,
              address: newProperty.address,
              price: newProperty.price,
              bedrooms: newProperty.bedrooms,
              bathrooms: newProperty.bathrooms,
              image_urls: newProperty.image_urls,
            },
          },
        ]

        // Update component with new data
        rerender(
          <QueryClientProvider client={queryClient}>
            <MutualLikesSection isLoading={false} mutualLikes={updatedMutualLikes} />
          </QueryClientProvider>
        )

        // Should show both properties
        await waitFor(() => {
          expect(screen.getByText('Initial Property')).toBeInTheDocument()
          expect(screen.getByText('New Property')).toBeInTheDocument()
        })
      } finally {
        await factory.cleanup()
      }
    })

    test('should handle loading to data transition', async () => {
      const scenario = await factory.createCouplesScenario()
      const property = scenario.properties[0]

      try {
        const { rerender } = renderWithQueryClient(
          <MutualLikesSection isLoading={true} />
        )

        // Should show loading state
        expect(screen.getByTestId('mutual-likes-loading')).toBeInTheDocument()

        const mutualLikes = [
          {
            property_id: property.id,
            liked_by_count: 2,
            first_liked_at: '2024-01-01T00:00:00.000Z',
            last_liked_at: '2024-01-02T00:00:00.000Z',
            user_ids: scenario.users.map(u => u.id),
            property: {
              id: property.id,
              address: property.address,
              price: property.price,
              bedrooms: property.bedrooms,
              bathrooms: property.bathrooms,
              image_urls: property.image_urls,
            },
          },
        ]

        // Simulate loading completion
        rerender(
          <QueryClientProvider client={queryClient}>
            <MutualLikesSection isLoading={false} mutualLikes={mutualLikes} />
          </QueryClientProvider>
        )

        // Should transition to data display
        await waitFor(() => {
          expect(screen.queryByTestId('mutual-likes-loading')).not.toBeInTheDocument()
          expect(screen.getByTestId('mutual-likes-list')).toBeInTheDocument()
        })
        
        expect(screen.getByText(property.address)).toBeInTheDocument()
      } finally {
        await factory.cleanup()
      }
    })
  })

  describe('Error Boundary Integration', () => {
    test('should handle component errors gracefully', () => {
      // Create invalid data that might cause component errors
      const invalidMutualLikes = [
        {
          property_id: 'invalid-id',
          liked_by_count: 'invalid-count', // Invalid type
          first_liked_at: 'invalid-date',
          last_liked_at: null,
          user_ids: null, // Invalid null
          property: null, // Missing property
        },
      ] as any

      // Component should handle invalid data gracefully
      expect(() => {
        renderWithQueryClient(
          <MutualLikesSection isLoading={false} mutualLikes={invalidMutualLikes} />
        )
      }).not.toThrow()
    })
  })
})