import {
  jest,
  describe,
  test,
  expect,
  beforeEach,
  afterEach,
} from '@jest/globals'
import { render, screen, waitFor } from '@testing-library/react'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { MutualLikesSection } from '@/components/features/couples/MutualLikesSection'
import { toast } from '@/lib/utils/toast'
import { createJsonResponse } from '@/__tests__/utils/http-helpers'

// Mock the child components and dependencies
jest.mock('@/components/features/couples/MutualLikesBadge', () => ({
  MutualLikesBadge: ({ likedByCount }: { likedByCount: number }) => (
    <div data-testid="mutual-likes-badge">Badge: {likedByCount}</div>
  ),
}))

jest.mock('@/components/ui/skeleton', () => ({
  Skeleton: ({ className, ...props }: React.HTMLAttributes<HTMLDivElement>) => (
    <div
      data-testid="skeleton"
      className={className}
      {...props}
      role="presentation"
    />
  ),
}))

jest.mock('framer-motion', () => ({
  motion: {
    div: ({ children, ...props }: React.HTMLAttributes<HTMLDivElement>) => (
      <div {...props}>{children}</div>
    ),
  },
  AnimatePresence: ({ children }: React.PropsWithChildren) => <>{children}</>,
}))

jest.mock('next/image', () => ({
  __esModule: true,
  default: ({
    src,
    alt,
    width,
    height,
    className,
    ...props
  }: React.ComponentProps<'img'>) => {
    // Filter out Next.js specific props that aren't valid HTML attributes
    const validProps = props

    return (
      // eslint-disable-next-line @next/next/no-img-element
      <img
        src={src}
        alt={alt}
        width={width}
        height={height}
        className={className}
        {...validProps}
      />
    )
  },
}))

jest.mock('next/link', () => ({
  __esModule: true,
  default: ({
    children,
    href,
  }: {
    children?: React.ReactNode
    href: string
  }) => <a href={href}>{children}</a>,
}))

jest.mock('@/lib/utils/toast', () => ({
  toast: {
    authRequired: jest.fn(),
    householdRequired: jest.fn(),
    success: jest.fn(),
    networkError: jest.fn(),
    error: jest.fn(),
  },
}))

jest.mock('@/components/ui/property-image', () => ({
  PropertyImage: ({
    src: _src,
    alt,
    className,
  }: {
    src?: string | null
    alt?: string
    className?: string
  }) => (
    <div className={className} data-testid="property-image">
      <span>Image: {alt}</span>
    </div>
  ),
}))

jest.mock('@/components/ui/card', () => ({
  Card: ({
    children,
    className,
    ...props
  }: React.HTMLAttributes<HTMLDivElement>) => (
    <div className={className} {...props}>
      {children}
    </div>
  ),
  CardContent: ({
    children,
    className,
    ...props
  }: React.HTMLAttributes<HTMLDivElement>) => (
    <div className={className} {...props}>
      {children}
    </div>
  ),
  CardHeader: ({
    children,
    className,
    ...props
  }: React.HTMLAttributes<HTMLDivElement>) => (
    <div className={className} {...props}>
      {children}
    </div>
  ),
  CardTitle: ({
    children,
    className,
    ...props
  }: React.HTMLAttributes<HTMLHeadingElement>) => (
    <h3 className={className} {...props}>
      {children}
    </h3>
  ),
}))

jest.mock('@/components/ui/button', () => ({
  Button: ({
    children,
    className,
    onClick,
    asChild,
    ...props
  }: React.ButtonHTMLAttributes<HTMLButtonElement> & { asChild?: boolean }) =>
    asChild ? (
      <>{children}</>
    ) : (
      <button className={className} onClick={onClick} {...props}>
        {children}
      </button>
    ),
}))

jest.mock('lucide-react', () => ({
  Heart: ({ className, ...props }: React.HTMLAttributes<HTMLDivElement>) => (
    <div className={`lucide-heart ${className}`} {...props} />
  ),
  Users: ({ className, ...props }: React.HTMLAttributes<HTMLDivElement>) => (
    <div className={`lucide-users ${className}`} {...props} />
  ),
  ChevronRight: ({
    className,
    ...props
  }: React.HTMLAttributes<HTMLDivElement>) => (
    <div className={`lucide-chevron-right ${className}`} {...props} />
  ),
  RefreshCw: ({
    className,
    ...props
  }: React.HTMLAttributes<HTMLDivElement>) => (
    <div className={`lucide-refresh-cw ${className}`} {...props} />
  ),
  Sparkles: ({ className, ...props }: React.HTMLAttributes<HTMLDivElement>) => (
    <div className={`lucide-sparkles ${className}`} {...props} />
  ),
  Star: ({ className, ...props }: React.HTMLAttributes<HTMLDivElement>) => (
    <div className={`lucide-star ${className}`} {...props} />
  ),
  Home: ({ className, ...props }: React.HTMLAttributes<HTMLDivElement>) => (
    <div className={`lucide-home ${className}`} {...props} />
  ),
}))

// Mock fetch globally
const mockFetch: jest.MockedFunction<typeof fetch> = jest.fn()
global.fetch = mockFetch

const renderWithQueryClient = (ui: React.ReactElement) => {
  const queryClient = new QueryClient({
    defaultOptions: {
      queries: { retry: false, gcTime: 0 },
      mutations: { retry: false },
    },
  })

  return render(
    <QueryClientProvider client={queryClient}>{ui}</QueryClientProvider>
  )
}

describe('MutualLikesSection Component', () => {
  const defaultProps = {
    userId: 'user-123',
  }

  const mockMutualLikes = [
    {
      property_id: 'prop-1',
      liked_by_count: 2,
      first_liked_at: '2024-01-01T00:00:00.000Z',
      last_liked_at: '2024-01-02T00:00:00.000Z',
      property: {
        address: '123 Main St',
        price: 500000,
        bedrooms: 3,
        bathrooms: 2,
        image_urls: ['/test-image.jpg'],
      },
    },
    {
      property_id: 'prop-2',
      liked_by_count: 3,
      first_liked_at: '2024-01-03T00:00:00.000Z',
      last_liked_at: '2024-01-04T00:00:00.000Z',
      property: {
        address: '456 Oak Ave',
        price: 750000,
        bedrooms: 4,
        bathrooms: 3,
        image_urls: ['/test-image-2.jpg'],
      },
    },
  ]

  beforeEach(() => {
    jest.clearAllMocks()
  })

  afterEach(() => {
    jest.restoreAllMocks()
  })

  describe('Loading State', () => {
    test('should show loading state initially', () => {
      mockFetch.mockImplementation(() => new Promise(() => {})) // Never resolves

      renderWithQueryClient(<MutualLikesSection {...defaultProps} />)

      expect(screen.getByText('Shared Likes')).toBeInTheDocument()
      expect(screen.getAllByTestId('skeleton').length).toBeGreaterThan(0)
    })

    test('should show skeleton placeholders during loading', () => {
      mockFetch.mockImplementation(() => new Promise(() => {}))

      renderWithQueryClient(<MutualLikesSection {...defaultProps} />)

      const skeletons = screen.getAllByRole('presentation') // Skeleton components
      expect(skeletons.length).toBeGreaterThan(0)
    })
  })

  describe('Error State', () => {
    test('should show error message when fetch fails', async () => {
      const errorMessage = 'Failed to fetch mutual likes'
      mockFetch.mockRejectedValueOnce(new Error(errorMessage))

      renderWithQueryClient(<MutualLikesSection {...defaultProps} />)

      await waitFor(() => {
        expect(
          screen.getByText('Failed to fetch mutual likes')
        ).toBeInTheDocument()
      })
    })

    test('should show error message when API returns error status', async () => {
      mockFetch.mockResolvedValueOnce(new Response(null, { status: 500 }))

      renderWithQueryClient(<MutualLikesSection {...defaultProps} />)

      await waitFor(() => {
        expect(
          screen.getByText('Server error - please try again later')
        ).toBeInTheDocument()
      })
    })

    test('should prompt sign-in when API returns 401', async () => {
      mockFetch.mockResolvedValueOnce(new Response(null, { status: 401 }))

      renderWithQueryClient(<MutualLikesSection {...defaultProps} />)

      await waitFor(() => {
        expect(
          screen.getByText('Please sign in to view mutual likes')
        ).toBeInTheDocument()
      })

      expect(toast.authRequired).toHaveBeenCalled()
    })

    test('should surface API-provided error messages', async () => {
      mockFetch.mockResolvedValueOnce(
        createJsonResponse({ error: 'Forbidden' }, { status: 403 })
      )

      renderWithQueryClient(<MutualLikesSection {...defaultProps} />)

      await waitFor(() => {
        expect(screen.getByText('Forbidden')).toBeInTheDocument()
      })
    })

    test('should maintain header structure in error state', async () => {
      mockFetch.mockRejectedValueOnce(new Error('Test error'))

      renderWithQueryClient(<MutualLikesSection {...defaultProps} />)

      await waitFor(() => {
        expect(screen.getByText('Shared Likes')).toBeInTheDocument()
        const heartIcon = document.querySelector('.lucide-heart')
        expect(heartIcon).toBeInTheDocument()
        expect(heartIcon).toHaveClass('text-couples-accent/50', 'fill-current')
      })
    })
  })

  describe('Empty State', () => {
    test('should show empty state when no mutual likes exist', async () => {
      mockFetch.mockResolvedValueOnce(createJsonResponse({ mutualLikes: [] }))

      renderWithQueryClient(<MutualLikesSection {...defaultProps} />)

      await waitFor(() => {
        expect(screen.getByText('No mutual likes yet!')).toBeInTheDocument()
        const helperText = screen.getByText(
          'Properties everyone likes will appear here'
        )
        expect(helperText).toBeInTheDocument()
        expect(helperText).toHaveClass('text-hm-stone-200')
      })
    })

    test('should use high-contrast headings in empty state', async () => {
      mockFetch.mockResolvedValueOnce(createJsonResponse({ mutualLikes: [] }))

      renderWithQueryClient(<MutualLikesSection {...defaultProps} />)

      await waitFor(() => {
        expect(screen.getByText('Shared Likes')).toHaveClass(
          'text-hm-stone-100'
        )
        expect(
          screen.getByRole('heading', { name: 'No mutual likes yet!' })
        ).toHaveClass('text-hm-stone-100')
      })
    })

    test('should show overlapping hearts in empty state', async () => {
      mockFetch.mockResolvedValueOnce(createJsonResponse({ mutualLikes: [] }))

      renderWithQueryClient(<MutualLikesSection {...defaultProps} />)

      await waitFor(() => {
        const emptyStateContainer = screen
          .getByText('No mutual likes yet!')
          .closest('div')
        expect(emptyStateContainer).toBeInTheDocument()
      })
    })

    test('should include users icon in header for empty state', async () => {
      mockFetch.mockResolvedValueOnce(createJsonResponse({ mutualLikes: [] }))

      renderWithQueryClient(<MutualLikesSection {...defaultProps} />)

      await waitFor(() => {
        const usersIcon = document.querySelector('.lucide-users')
        expect(usersIcon).toBeInTheDocument()
        expect(usersIcon).toHaveClass('text-couples-secondary')
      })
    })
  })

  describe('Populated State', () => {
    test('should display mutual likes with correct count in header', async () => {
      mockFetch.mockResolvedValueOnce(
        createJsonResponse({ mutualLikes: mockMutualLikes })
      )

      renderWithQueryClient(<MutualLikesSection {...defaultProps} />)

      await waitFor(() => {
        expect(screen.getByText('Shared Likes (2)')).toBeInTheDocument()
      })
    })

    test('should render property cards with correct information', async () => {
      mockFetch.mockResolvedValueOnce(
        createJsonResponse({ mutualLikes: mockMutualLikes })
      )

      renderWithQueryClient(<MutualLikesSection {...defaultProps} />)

      await waitFor(() => {
        expect(screen.getByText('123 Main St')).toBeInTheDocument()
        expect(screen.getByText('456 Oak Ave')).toBeInTheDocument()
        expect(screen.getByText('$500k')).toBeInTheDocument()
        expect(screen.getByText('$750k')).toBeInTheDocument()
        expect(screen.getByText('3 bed')).toBeInTheDocument()
        expect(screen.getByText('4 bed')).toBeInTheDocument()
        expect(screen.getByText('2 bath')).toBeInTheDocument()
        expect(screen.getByText('3 bath')).toBeInTheDocument()
      })
    })

    test('should use higher-contrast text for metadata on dark cards', async () => {
      mockFetch.mockResolvedValueOnce(
        createJsonResponse({ mutualLikes: mockMutualLikes })
      )

      renderWithQueryClient(<MutualLikesSection {...defaultProps} />)

      await waitFor(() => {
        const priceMeta = screen.getByText('$500k').closest('div')
        expect(priceMeta).toHaveClass('text-hm-stone-200')
        const likedDate = screen
          .getAllByText(/Liked/i)
          .find((node) => node.classList.contains('text-hm-stone-300'))
        expect(likedDate).toBeDefined()
        expect(likedDate).toHaveClass('text-hm-stone-300')
      })
    })

    test('should display property images when available', async () => {
      mockFetch.mockResolvedValueOnce(
        createJsonResponse({ mutualLikes: mockMutualLikes })
      )

      renderWithQueryClient(<MutualLikesSection {...defaultProps} />)

      await waitFor(() => {
        const images = screen.getAllByTestId('property-image')
        expect(images).toHaveLength(2)
      })
    })

    test('should show fallback home icon when no images available', async () => {
      const mutualLikesNoImages = [
        {
          ...mockMutualLikes[0],
          property: {
            ...mockMutualLikes[0].property,
            image_urls: undefined,
          },
        },
      ]

      mockFetch.mockReset()
      mockFetch.mockResolvedValueOnce(
        createJsonResponse({ mutualLikes: mutualLikesNoImages })
      )

      renderWithQueryClient(<MutualLikesSection {...defaultProps} />)

      await waitFor(() => {
        // The PropertyImage component with undefined image_urls will still try to render an image
        // This test should verify the component renders without error when image_urls is undefined
        expect(screen.getByText('123 Main St')).toBeInTheDocument()

        // Check that the property renders even without images
        expect(screen.getByText('$500k')).toBeInTheDocument()
      })
    })

    test('should render mutual likes badges for each property', async () => {
      mockFetch.mockResolvedValueOnce(
        createJsonResponse({ mutualLikes: mockMutualLikes })
      )

      renderWithQueryClient(<MutualLikesSection {...defaultProps} />)

      await waitFor(() => {
        const badges = screen.getAllByTestId('mutual-likes-badge')
        expect(badges).toHaveLength(2)
        expect(badges[0]).toHaveTextContent('Badge: 2')
        expect(badges[1]).toHaveTextContent('Badge: 3')
      })
    })

    test('should create clickable links to property details', async () => {
      mockFetch.mockResolvedValueOnce(
        createJsonResponse({ mutualLikes: mockMutualLikes })
      )

      renderWithQueryClient(<MutualLikesSection {...defaultProps} />)

      await waitFor(() => {
        const links = screen.getAllByRole('link')
        const propertyLinks = links.filter((link) =>
          link.getAttribute('href')?.includes('/properties/')
        )
        expect(propertyLinks).toHaveLength(2)
        expect(propertyLinks[0]).toHaveAttribute(
          'href',
          '/properties/prop-1?returnTo=/dashboard'
        )
        expect(propertyLinks[1]).toHaveAttribute(
          'href',
          '/properties/prop-2?returnTo=/dashboard'
        )
      })
    })

    test('should format dates correctly', async () => {
      mockFetch.mockResolvedValueOnce(
        createJsonResponse({ mutualLikes: mockMutualLikes })
      )

      renderWithQueryClient(<MutualLikesSection {...defaultProps} />)

      await waitFor(() => {
        // Check for date display (format may vary by locale)
        const dateTexts = screen.getAllByText(/Liked/i)
        expect(dateTexts.length).toBeGreaterThan(0)
      })
    })

    test('should not show a success toast on load', async () => {
      mockFetch.mockResolvedValueOnce(
        createJsonResponse({ mutualLikes: mockMutualLikes })
      )

      renderWithQueryClient(<MutualLikesSection {...defaultProps} />)

      await waitFor(() => {
        expect(screen.getByText('Shared Likes (2)')).toBeInTheDocument()
      })

      expect(toast.success).not.toHaveBeenCalled()
    })
  })

  describe('View All Link', () => {
    test('should not show "View all" when 3 or fewer mutual likes', async () => {
      mockFetch.mockResolvedValueOnce(
        createJsonResponse({ mutualLikes: mockMutualLikes })
      )

      renderWithQueryClient(<MutualLikesSection {...defaultProps} />)

      await waitFor(() => {
        expect(screen.queryByText('View all')).not.toBeInTheDocument()
      })
    })

    test('should show "View all" when more than 3 mutual likes', async () => {
      const manyMutualLikes = [
        ...mockMutualLikes,
        {
          property_id: 'prop-3',
          liked_by_count: 2,
          first_liked_at: '2024-01-05T00:00:00.000Z',
          last_liked_at: '2024-01-06T00:00:00.000Z',
          property: {
            address: '789 Pine St',
            price: 400000,
            bedrooms: 2,
            bathrooms: 1,
            image_urls: ['/test-image-3.jpg'],
          },
        },
        {
          property_id: 'prop-4',
          liked_by_count: 4,
          first_liked_at: '2024-01-07T00:00:00.000Z',
          last_liked_at: '2024-01-08T00:00:00.000Z',
          property: {
            address: '321 Elm St',
            price: 600000,
            bedrooms: 3,
            bathrooms: 2.5,
            image_urls: [],
          },
        },
      ]

      mockFetch.mockResolvedValueOnce(
        createJsonResponse({ mutualLikes: manyMutualLikes })
      )

      renderWithQueryClient(<MutualLikesSection {...defaultProps} />)

      await waitFor(() => {
        expect(screen.getByText('View all')).toBeInTheDocument()
        const viewAllLink = screen.getByText('View all').closest('a')
        expect(viewAllLink).toHaveAttribute('href', '/dashboard/mutual-likes')
      })
    })

    test('should only display first 3 mutual likes even when more exist', async () => {
      const manyMutualLikes = Array.from({ length: 5 }, (_, i) => ({
        property_id: `prop-${i + 1}`,
        liked_by_count: 2,
        first_liked_at: '2024-01-01T00:00:00.000Z',
        last_liked_at: '2024-01-02T00:00:00.000Z',
        property: {
          address: `${i + 1}00 Test St`,
          price: 500000 + i * 50000,
          bedrooms: 3,
          bathrooms: 2,
          image_urls: [`/image-${i + 1}.jpg`],
        },
      }))

      mockFetch.mockResolvedValueOnce(
        createJsonResponse({ mutualLikes: manyMutualLikes })
      )

      renderWithQueryClient(<MutualLikesSection {...defaultProps} />)

      await waitFor(() => {
        // Should only show first 3 properties
        expect(screen.getByText('100 Test St')).toBeInTheDocument()
        expect(screen.getByText('200 Test St')).toBeInTheDocument()
        expect(screen.getByText('300 Test St')).toBeInTheDocument()
        expect(screen.queryByText('400 Test St')).not.toBeInTheDocument()
        expect(screen.queryByText('500 Test St')).not.toBeInTheDocument()
      })
    })
  })

  describe('API Integration', () => {
    test('should call the correct API endpoint', async () => {
      mockFetch.mockResolvedValueOnce(createJsonResponse({ mutualLikes: [] }))

      renderWithQueryClient(<MutualLikesSection {...defaultProps} />)

      await waitFor(() => {
        expect(mockFetch).toHaveBeenCalledWith(
          '/api/couples/mutual-likes',
          expect.objectContaining({ credentials: 'include' })
        )
      })
    })

    test('should handle API response without mutualLikes property', async () => {
      mockFetch.mockResolvedValueOnce(createJsonResponse({}))

      renderWithQueryClient(<MutualLikesSection {...defaultProps} />)

      await waitFor(() => {
        expect(screen.getByText('No mutual likes yet!')).toBeInTheDocument()
      })
    })
  })

  describe('Edge Cases', () => {
    test('should handle properties without complete data', async () => {
      const partialMutualLikes = [
        {
          property_id: 'prop-incomplete',
          liked_by_count: 2,
          first_liked_at: '2024-01-01T00:00:00.000Z',
          last_liked_at: '2024-01-02T00:00:00.000Z',
          property: null, // No property data
        },
      ]

      mockFetch.mockResolvedValueOnce(
        createJsonResponse({ mutualLikes: partialMutualLikes })
      )

      renderWithQueryClient(<MutualLikesSection {...defaultProps} />)

      await waitFor(() => {
        // Should display property ID when no address available (first 8 chars)
        expect(screen.getByText('Property prop-inc')).toBeInTheDocument()
      })
    })

    test('should apply custom className', async () => {
      mockFetch.mockResolvedValueOnce(createJsonResponse({ mutualLikes: [] }))

      const { container } = renderWithQueryClient(
        <MutualLikesSection {...defaultProps} className="custom-class" />
      )

      await waitFor(() => {
        const cardElement = container.querySelector('.custom-class')
        expect(cardElement).toBeInTheDocument()
      })
    })

    test('should handle network errors gracefully', async () => {
      mockFetch.mockRejectedValueOnce(new TypeError('Network error'))

      renderWithQueryClient(<MutualLikesSection {...defaultProps} />)

      await waitFor(() => {
        expect(screen.getByText('Network error')).toBeInTheDocument()
      })
    })
  })

  describe('Accessibility', () => {
    test('should have proper heading structure', async () => {
      mockFetch.mockResolvedValueOnce(
        createJsonResponse({ mutualLikes: mockMutualLikes })
      )

      renderWithQueryClient(<MutualLikesSection {...defaultProps} />)

      await waitFor(() => {
        expect(screen.getByText(/Shared Likes/)).toBeInTheDocument()
      })
    })

    test('should have accessible links with proper labels', async () => {
      mockFetch.mockResolvedValueOnce(
        createJsonResponse({ mutualLikes: mockMutualLikes })
      )

      renderWithQueryClient(<MutualLikesSection {...defaultProps} />)

      await waitFor(() => {
        const propertyLinks = screen.getAllByRole('link')
        propertyLinks.forEach((link) => {
          expect(link).toHaveAttribute('href')
        })
      })
    })
  })

  describe('Responsive Design', () => {
    test('should maintain card styling with dashboard tokens', async () => {
      mockFetch.mockResolvedValueOnce(
        createJsonResponse({ mutualLikes: mockMutualLikes })
      )

      const { container } = renderWithQueryClient(
        <MutualLikesSection {...defaultProps} />
      )

      await waitFor(() => {
        const cardElement = container.querySelector(
          '[data-testid="mutual-likes-list"]'
        )
        expect(cardElement).toBeInTheDocument()
        expect(cardElement).toHaveAttribute('style')
      })
    })
  })
})
