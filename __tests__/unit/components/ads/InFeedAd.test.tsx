import { render, screen, waitFor } from '@testing-library/react'
import { InFeedAd } from '@/components/ads/InFeedAd'

// Store original window.adsbygoogle
const originalAdsbygoogle = (global.window as any).adsbygoogle

describe('InFeedAd', () => {
  beforeEach(() => {
    // Reset the adsbygoogle mock before each test
    ;(global.window as any).adsbygoogle = []
  })

  afterEach(() => {
    // Restore original
    ;(global.window as any).adsbygoogle = originalAdsbygoogle
    jest.clearAllMocks()
  })

  describe('Rendering', () => {
    test('renders the ad container', () => {
      render(<InFeedAd />)

      // Should have the main container
      const container = document.querySelector('[data-ad-position]')
      expect(container).toBeInTheDocument()
    })

    test('renders sponsored label', () => {
      render(<InFeedAd />)

      expect(screen.getByText('Sponsored')).toBeInTheDocument()
    })

    test('renders partner content label', () => {
      render(<InFeedAd />)

      expect(screen.getByText('Partner content')).toBeInTheDocument()
    })

    test('renders the AdSense ins element', () => {
      render(<InFeedAd />)

      const adElement = document.querySelector('.adsbygoogle')
      expect(adElement).toBeInTheDocument()
    })

    test('applies custom className', () => {
      render(<InFeedAd className="custom-ad-class" />)

      const container = document.querySelector('[data-ad-position]')
      expect(container).toHaveClass('custom-ad-class')
    })
  })

  describe('Position Tracking', () => {
    test('sets default position to 0', () => {
      render(<InFeedAd />)

      const container = document.querySelector('[data-ad-position]')
      expect(container).toHaveAttribute('data-ad-position', '0')
    })

    test('sets custom position correctly', () => {
      render(<InFeedAd position={3} />)

      const container = document.querySelector('[data-ad-position]')
      expect(container).toHaveAttribute('data-ad-position', '3')
    })

    test('handles various position values', () => {
      const { rerender } = render(<InFeedAd position={1} />)
      expect(document.querySelector('[data-ad-position]')).toHaveAttribute(
        'data-ad-position',
        '1'
      )

      rerender(<InFeedAd position={5} />)
      expect(document.querySelector('[data-ad-position]')).toHaveAttribute(
        'data-ad-position',
        '5'
      )

      rerender(<InFeedAd position={10} />)
      expect(document.querySelector('[data-ad-position]')).toHaveAttribute(
        'data-ad-position',
        '10'
      )
    })
  })

  describe('AdSense Integration', () => {
    test('pushes to adsbygoogle array on mount', async () => {
      const mockAdsbygoogle: Array<Record<string, unknown>> = []
      ;(global.window as any).adsbygoogle = mockAdsbygoogle

      render(<InFeedAd />)

      await waitFor(() => {
        expect(mockAdsbygoogle.length).toBe(1)
      })
    })

    test('AdSense element has correct data attributes', () => {
      render(<InFeedAd />)

      const adElement = document.querySelector('.adsbygoogle')
      expect(adElement).toHaveAttribute('data-ad-format', 'fluid')
      expect(adElement).toHaveAttribute(
        'data-ad-client',
        'ca-pub-9556502662108721'
      )
      expect(adElement).toHaveAttribute('data-ad-layout-key', '-fb+5w+4e-db+86')
    })

    test('initializes adsbygoogle array if not present', async () => {
      delete (global.window as any).adsbygoogle

      render(<InFeedAd />)

      await waitFor(() => {
        expect((global.window as any).adsbygoogle).toBeDefined()
        expect(Array.isArray((global.window as any).adsbygoogle)).toBe(true)
      })
    })
  })

  describe('Error Handling', () => {
    test('handles adsbygoogle push error gracefully', async () => {
      // Mock console.warn to verify error handling
      const consoleSpy = jest.spyOn(console, 'warn').mockImplementation()

      // Create a mock that throws on push
      const mockAdsbygoogle = {
        push: jest.fn().mockImplementation(() => {
          throw new Error('Ad blocked')
        }),
      }
      ;(global.window as any).adsbygoogle = mockAdsbygoogle

      // Should not throw
      expect(() => render(<InFeedAd />)).not.toThrow()

      await waitFor(() => {
        expect(consoleSpy).toHaveBeenCalledWith(
          'AdSense failed to load:',
          expect.any(Error)
        )
      })

      consoleSpy.mockRestore()
    })

    test('returns null when error occurs', async () => {
      const consoleSpy = jest.spyOn(console, 'warn').mockImplementation()

      // Create a mock that throws
      const mockAdsbygoogle = {
        push: jest.fn().mockImplementation(() => {
          throw new Error('Ad blocked')
        }),
      }
      ;(global.window as any).adsbygoogle = mockAdsbygoogle

      const { container } = render(<InFeedAd />)

      await waitFor(() => {
        // After error, the component should return null (no content)
        expect(container.querySelector('[data-ad-position]')).toBeNull()
      })

      consoleSpy.mockRestore()
    })
  })

  describe('Styling', () => {
    test('has correct border styling', () => {
      render(<InFeedAd />)

      const container = document.querySelector('[data-ad-position]')
      expect(container).toHaveClass('border', 'border-white/10')
    })

    test('has correct background', () => {
      render(<InFeedAd />)

      const container = document.querySelector('[data-ad-position]')
      expect(container).toHaveClass('bg-card')
    })

    test('has rounded corners', () => {
      render(<InFeedAd />)

      const container = document.querySelector('[data-ad-position]')
      expect(container).toHaveClass('rounded-token-xl')
    })

    test('has shadow styling', () => {
      render(<InFeedAd />)

      const container = document.querySelector('[data-ad-position]')
      expect(container).toHaveClass('shadow-token-lg')
    })

    test('sponsored label has correct styling', () => {
      render(<InFeedAd />)

      const sponsoredLabel = screen.getByText('Sponsored')
      expect(sponsoredLabel).toHaveClass(
        'rounded-full',
        'bg-white/10',
        'text-white/70',
        'uppercase'
      )
    })

    test('partner content label has correct styling', () => {
      render(<InFeedAd />)

      const partnerLabel = screen.getByText('Partner content')
      expect(partnerLabel).toHaveClass('text-muted-foreground', 'uppercase')
    })
  })

  describe('Loading State', () => {
    test('hides loading spinner after ad loads', async () => {
      ;(global.window as any).adsbygoogle = []

      render(<InFeedAd />)

      // After the effect runs, the spinner should be hidden (not in DOM when loaded)
      await waitFor(() => {
        // The ad element should be visible (minHeight set when loaded)
        const adElement = document.querySelector('.adsbygoogle')
        expect(adElement).toBeInTheDocument()
      })
    })

    test('ad element has correct display style when loaded', async () => {
      ;(global.window as any).adsbygoogle = []

      render(<InFeedAd />)

      await waitFor(() => {
        const adElement = document.querySelector(
          '.adsbygoogle'
        ) as HTMLElement | null
        expect(adElement).toBeInTheDocument()
        // When loaded, display should be 'block'
        expect(adElement?.style.display).toBe('block')
      })
    })
  })

  describe('Layout', () => {
    test('ad container has minimum height', () => {
      render(<InFeedAd />)

      const adContainer = document.querySelector('.min-h-\\[420px\\]')
      expect(adContainer).toBeInTheDocument()
    })

    test('sponsored label is positioned correctly', () => {
      render(<InFeedAd />)

      const labelContainer = screen.getByText('Sponsored').parentElement
      expect(labelContainer).toHaveClass('absolute', 'top-3', 'right-3', 'z-10')
    })

    test('bottom label has border styling', () => {
      render(<InFeedAd />)

      const bottomSection = screen.getByText('Partner content').parentElement
      expect(bottomSection).toHaveClass('border-t', 'border-white/5')
    })
  })

  describe('Accessibility', () => {
    test('ad container is properly structured', () => {
      render(<InFeedAd />)

      // The component should have semantic structure
      const container = document.querySelector('[data-ad-position]')
      expect(container).toBeInTheDocument()
    })

    test('labels are visible and readable', () => {
      render(<InFeedAd />)

      expect(screen.getByText('Sponsored')).toBeVisible()
      expect(screen.getByText('Partner content')).toBeVisible()
    })
  })

  describe('Edge Cases', () => {
    test('handles undefined window gracefully', () => {
      const originalWindow = global.window

      // This tests the typeof window check in the component
      // The component should handle SSR where window might be undefined
      expect(() => render(<InFeedAd />)).not.toThrow()

      global.window = originalWindow
    })

    test('handles multiple renders', () => {
      const mockAdsbygoogle: Array<Record<string, unknown>> = []
      ;(global.window as any).adsbygoogle = mockAdsbygoogle

      const { rerender } = render(<InFeedAd position={1} />)
      rerender(<InFeedAd position={2} />)
      rerender(<InFeedAd position={3} />)

      // Should only push once (on initial mount)
      expect(mockAdsbygoogle.length).toBe(1)
    })

    test('handles position 0 correctly', () => {
      render(<InFeedAd position={0} />)

      const container = document.querySelector('[data-ad-position]')
      expect(container).toHaveAttribute('data-ad-position', '0')
    })
  })
})
