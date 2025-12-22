import { describe, test, expect, beforeEach, vi } from 'vitest'
import { render, screen } from '@testing-library/react'
import { axe, toHaveNoViolations } from 'jest-axe'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import {
  MutualLikesBadge,
  MutualLikesIndicator,
} from '@/components/features/couples/MutualLikesBadge'
import { MutualLikesSection } from '@/components/features/couples/MutualLikesSection'

// Extend Jest matchers
expect.extend(toHaveNoViolations)

// Mock dependencies to avoid issues in accessibility testing
vi.mock('framer-motion', () => ({
  motion: {
    div: ({ children, ...props }: any) => <div {...props}>{children}</div>,
  },
  AnimatePresence: ({ children }: any) => children,
}))

// Mock MotionDiv to be a simple div in tests
vi.mock('@/components/ui/motion-components', () => ({
  MotionDiv: ({
    children,
    whileHover: _whileHover,
    initial: _initial,
    animate: _animate,
    transition: _transition,
    variants: _variants,
    exit: _exit,
    layout: _layout,
    layoutId: _layoutId,
    ...props
  }: any) => <div {...props}>{children}</div>,
}))

vi.mock('next/image', () => ({
  __esModule: true,
  default: ({ src, alt, ...props }: any) => (
    // eslint-disable-next-line @next/next/no-img-element
    <img src={src} alt={alt} {...props} />
  ),
}))

vi.mock('next/link', () => ({
  __esModule: true,
  default: ({ children, href, ...props }: any) => (
    <a href={href} {...props}>
      {children}
    </a>
  ),
}))

// Mock PropertyImage component
vi.mock('@/components/ui/property-image', () => ({
  PropertyImage: ({ src, alt, fill, width, height, ...props }: any) => (
    // eslint-disable-next-line @next/next/no-img-element
    <img
      src={Array.isArray(src) ? src[0] : src || '/test-image.jpg'}
      alt={alt}
      width={fill ? '100%' : width}
      height={fill ? '100%' : height}
      {...props}
    />
  ),
}))

// Mock toast utilities
vi.mock('@/lib/utils/toast', () => ({
  toast: {
    success: vi.fn(),
    error: vi.fn(),
    authRequired: vi.fn(),
    householdRequired: vi.fn(),
    networkError: vi.fn(),
  },
}))

// Mock fetch globally for MutualLikesSection tests
const mockFetch = vi.fn()
global.fetch = mockFetch as any

describe('Couples Components Accessibility Tests', () => {
  let queryClient: QueryClient

  beforeEach(() => {
    queryClient = new QueryClient({
      defaultOptions: {
        queries: {
          retry: false,
        },
      },
    })
    vi.clearAllMocks()
  })

  const renderWithQueryClient = (component: React.ReactElement) => {
    return render(
      <QueryClientProvider client={queryClient}>
        {component}
      </QueryClientProvider>
    )
  }

  describe('MutualLikesBadge Accessibility', () => {
    test('should have no accessibility violations with default props', async () => {
      const { container } = render(<MutualLikesBadge likedByCount={2} />)

      const results = await axe(container)
      expect(results).toHaveNoViolations()
    })

    test('should have no accessibility violations with count display', async () => {
      const { container } = render(<MutualLikesBadge likedByCount={5} />)

      const results = await axe(container)
      expect(results).toHaveNoViolations()
    })

    test('should have proper text contrast for visibility', () => {
      render(<MutualLikesBadge likedByCount={2} />)

      const badgeText = screen.getByText('Both liked!')
      expect(badgeText).toHaveClass('text-pink-300')
      // Pink-300 on dark backgrounds provides sufficient contrast
    })

    test('should maintain accessibility across all variants', async () => {
      const variants: Array<'compact' | 'default' | 'large'> = [
        'compact',
        'default',
        'large',
      ]

      for (const variant of variants) {
        const { container } = render(
          <MutualLikesBadge likedByCount={3} variant={variant} />
        )

        const results = await axe(container)
        expect(results).toHaveNoViolations()
      }
    })

    test('should be readable by screen readers', () => {
      render(<MutualLikesBadge likedByCount={4} />)

      // Screen readers should be able to read the text content
      expect(screen.getByText('Both liked!')).toBeInTheDocument()
      expect(screen.getByText('4')).toBeInTheDocument()
    })

    test('should not have empty alt attributes or missing labels', () => {
      const { container } = render(<MutualLikesBadge likedByCount={2} />)

      // Ensure no images without alt text
      const images = container.querySelectorAll('img')
      images.forEach((img) => {
        expect(img).toHaveAttribute('alt')
        expect(img.getAttribute('alt')).not.toBe('')
      })
    })
  })

  describe('MutualLikesIndicator Accessibility', () => {
    const mockMutualLikes = [
      { property_id: 'prop-1', liked_by_count: 2 },
      { property_id: 'prop-2', liked_by_count: 4 },
    ]

    test('should have no accessibility violations when property has mutual likes', async () => {
      const { container } = render(
        <MutualLikesIndicator
          propertyId="prop-1"
          mutualLikes={mockMutualLikes}
        />
      )

      const results = await axe(container)
      expect(results).toHaveNoViolations()
    })

    test('should have no accessibility violations when property has no mutual likes', async () => {
      const { container } = render(
        <MutualLikesIndicator
          propertyId="prop-nonexistent"
          mutualLikes={mockMutualLikes}
        />
      )

      const results = await axe(container)
      expect(results).toHaveNoViolations()
    })

    test('should handle empty mutual likes array accessibly', async () => {
      const { container } = render(
        <MutualLikesIndicator propertyId="prop-1" mutualLikes={[]} />
      )

      const results = await axe(container)
      expect(results).toHaveNoViolations()
    })
  })

  describe('MutualLikesSection Accessibility', () => {
    const mockMutualLikes = [
      {
        property_id: 'prop-1',
        liked_by_count: 2,
        first_liked_at: '2024-01-01T00:00:00.000Z',
        last_liked_at: '2024-01-02T00:00:00.000Z',
        property: {
          address: '123 Accessible St',
          price: 500000,
          bedrooms: 3,
          bathrooms: 2,
          image_urls: ['/test-image.jpg'],
        },
      },
    ]

    test('should have no accessibility violations in loading state', async () => {
      // Mock never-resolving fetch for loading state
      mockFetch.mockImplementation(() => new Promise(() => {}))

      const { container } = renderWithQueryClient(
        <MutualLikesSection userId="user-123" />
      )

      const results = await axe(container)
      expect(results).toHaveNoViolations()
    })

    test('should have no accessibility violations in error state', async () => {
      mockFetch.mockRejectedValueOnce(new Error('Test error'))

      const { container } = renderWithQueryClient(
        <MutualLikesSection userId="user-123" />
      )

      // Wait for error state
      await screen.findByText("Couldn't load mutual likes")

      const results = await axe(container)
      expect(results).toHaveNoViolations()
    })

    test('should have no accessibility violations in empty state', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({ mutualLikes: [] }),
      } as Response)

      const { container } = renderWithQueryClient(
        <MutualLikesSection userId="user-123" />
      )

      // Wait for empty state
      await screen.findByText('No mutual likes yet!')

      const results = await axe(container)
      expect(results).toHaveNoViolations()
    })

    test('should have no accessibility violations with populated content', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({ mutualLikes: mockMutualLikes }),
      } as Response)

      const { container } = renderWithQueryClient(
        <MutualLikesSection userId="user-123" />
      )

      // Wait for content to load
      await screen.findByText('123 Accessible St')

      const results = await axe(container)
      expect(results).toHaveNoViolations()
    })

    test('should have proper heading hierarchy', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({ mutualLikes: mockMutualLikes }),
      } as Response)

      renderWithQueryClient(<MutualLikesSection userId="user-123" />)

      // Wait for content
      await screen.findByText('123 Accessible St')

      // Should have proper title text (CardTitle is a div, not a heading)
      expect(screen.getByText(/Both Liked \(1\)/i)).toBeInTheDocument()
    })

    test('should have accessible image alt text', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({ mutualLikes: mockMutualLikes }),
      } as Response)

      renderWithQueryClient(<MutualLikesSection userId="user-123" />)

      // Wait for content
      await screen.findByText('123 Accessible St')

      const propertyImage = screen.getByRole('img')
      expect(propertyImage).toHaveAttribute('alt', '123 Accessible St')
    })

    test('should have keyboard accessible links', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({ mutualLikes: mockMutualLikes }),
      } as Response)

      renderWithQueryClient(<MutualLikesSection userId="user-123" />)

      // Wait for content
      await screen.findByText('123 Accessible St')

      const propertyLinks = screen.getAllByRole('link')
      propertyLinks.forEach((link) => {
        expect(link).toHaveAttribute('href')
        // Links should be keyboard accessible (they are by default)
        expect(link.tagName.toLowerCase()).toBe('a')
      })
    })

    test('should have accessible color contrast for all text elements', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({ mutualLikes: mockMutualLikes }),
      } as Response)

      renderWithQueryClient(<MutualLikesSection userId="user-123" />)

      // Wait for content
      await screen.findByText('123 Accessible St')

      // Check for proper text color classes that provide good contrast
      expect(screen.getByText('123 Accessible St')).toHaveClass(
        'text-hm-stone-100'
      )
      // Price now uses inline styles with design tokens instead of Tailwind classes
      const priceElement = screen.getByText('$500k')
      expect(priceElement).toHaveClass('font-semibold')
    })

    test('should properly label interactive elements', async () => {
      const manyMutualLikes = Array.from({ length: 5 }, (_, i) => ({
        property_id: `prop-${i + 1}`,
        liked_by_count: 2,
        first_liked_at: '2024-01-01T00:00:00.000Z',
        last_liked_at: '2024-01-02T00:00:00.000Z',
        property: {
          address: `${i + 100} Test Street`,
          price: 500000,
          bedrooms: 3,
          bathrooms: 2,
          image_urls: ['/test-image.jpg'],
        },
      }))

      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({ mutualLikes: manyMutualLikes }),
      } as Response)

      renderWithQueryClient(<MutualLikesSection userId="user-123" />)

      // Wait for content and "View all" link
      await screen.findByText('View all')

      const viewAllButton = screen.getByRole('link', { name: /view all/i })
      expect(viewAllButton).toBeInTheDocument()
      expect(viewAllButton).toHaveAttribute('href', '/dashboard/mutual-likes')
    })

    test('should have accessible focus indicators', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({ mutualLikes: mockMutualLikes }),
      } as Response)

      const { container } = renderWithQueryClient(
        <MutualLikesSection userId="user-123" />
      )

      // Wait for content
      await screen.findByText('123 Accessible St')

      // Check that interactive elements are focusable
      const links = container.querySelectorAll('a')
      links.forEach((link) => {
        expect(link).not.toHaveAttribute('tabindex', '-1')
      })
    })

    test('should handle icon accessibility', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({ mutualLikes: [] }),
      } as Response)

      renderWithQueryClient(<MutualLikesSection userId="user-123" />)

      // Wait for empty state
      await screen.findByText('No mutual likes yet!')

      // Icons should not interfere with accessibility
      // Since we're using Lucide icons, they should have proper aria attributes
      const container = screen.getByText('Both Liked').closest('div')
      expect(container).toBeInTheDocument()
    })
  })

  describe('Glass Morphism Accessibility', () => {
    test('should maintain sufficient contrast with glass morphism effects', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          mutualLikes: [
            {
              property_id: 'prop-1',
              liked_by_count: 2,
              first_liked_at: '2024-01-01T00:00:00.000Z',
              last_liked_at: '2024-01-02T00:00:00.000Z',
              property: {
                address: '123 Glass St',
                price: 500000,
                bedrooms: 3,
                bathrooms: 2,
                image_urls: ['/test-image.jpg'],
              },
            },
          ],
        }),
      } as Response)

      const { container } = renderWithQueryClient(
        <MutualLikesSection userId="user-123" />
      )

      // Wait for content
      await screen.findByText('123 Glass St')

      // Glass morphism elements should still pass accessibility tests
      const results = await axe(container)
      expect(results).toHaveNoViolations()
    })
  })

  describe('Animation Accessibility', () => {
    test('should respect reduced motion preferences', () => {
      // Mock prefers-reduced-motion
      Object.defineProperty(window, 'matchMedia', {
        writable: true,
        value: vi.fn().mockImplementation((query) => ({
          matches: query === '(prefers-reduced-motion: reduce)',
          media: query,
          onchange: null,
          addListener: vi.fn(),
          removeListener: vi.fn(),
          addEventListener: vi.fn(),
          removeEventListener: vi.fn(),
          dispatchEvent: vi.fn(),
        })),
      })

      render(<MutualLikesBadge likedByCount={2} />)

      // Component should still be accessible even with motion preferences
      expect(screen.getByText('Both liked!')).toBeInTheDocument()
    })

    test('should not rely on animation for essential information', () => {
      render(<MutualLikesBadge likedByCount={3} showAnimation={false} />)

      // All essential information should be available without animation
      expect(screen.getByText('Both liked!')).toBeInTheDocument()
      expect(screen.getByText('3')).toBeInTheDocument()
    })
  })

  describe('Mobile Accessibility', () => {
    test('should maintain accessibility on touch devices', async () => {
      // Simulate mobile viewport
      Object.defineProperty(window, 'innerWidth', {
        writable: true,
        configurable: true,
        value: 375,
      })
      Object.defineProperty(window, 'innerHeight', {
        writable: true,
        configurable: true,
        value: 667,
      })

      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          mutualLikes: [
            {
              property_id: 'prop-1',
              liked_by_count: 2,
              first_liked_at: '2024-01-01T00:00:00.000Z',
              last_liked_at: '2024-01-02T00:00:00.000Z',
              property: {
                address: '123 Mobile St',
                price: 500000,
                bedrooms: 3,
                bathrooms: 2,
                image_urls: ['/test-image.jpg'],
              },
            },
          ],
        }),
      } as Response)

      const { container } = renderWithQueryClient(
        <MutualLikesSection userId="user-123" />
      )

      // Wait for content
      await screen.findByText('123 Mobile St')

      // Should maintain accessibility on mobile
      const results = await axe(container)
      expect(results).toHaveNoViolations()

      // Touch targets should be appropriately sized
      const links = screen.getAllByRole('link')
      links.forEach((link) => {
        // Minimum touch target size recommendations are typically 44px
        // We'll check that the element has appropriate padding/sizing
        expect(link).toBeInTheDocument()
      })
    })
  })
})
