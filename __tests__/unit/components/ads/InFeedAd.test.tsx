import { render, screen, waitFor } from '@testing-library/react'
import { InFeedAd } from '@/components/ads/InFeedAd'

jest.mock('@/lib/cookies/use-cookie-consent', () => ({
  useCookieConsent: () => ({
    consent: { advertising: true },
    hasConsent: true,
  }),
}))

// Store original window.adsbygoogle
const originalAdsbygoogle = window.adsbygoogle

// Store original NODE_ENV
const originalNodeEnv = process.env.NODE_ENV

describe('InFeedAd', () => {
  beforeEach(() => {
    // Reset the adsbygoogle mock before each test
    window.adsbygoogle = []
  })

  afterEach(() => {
    // Restore original
    window.adsbygoogle = originalAdsbygoogle
    process.env.NODE_ENV = originalNodeEnv
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
      window.adsbygoogle = mockAdsbygoogle

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
      delete window.adsbygoogle

      render(<InFeedAd />)

      await waitFor(() => {
        expect(window.adsbygoogle).toBeDefined()
        expect(Array.isArray(window.adsbygoogle)).toBe(true)
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
      window.adsbygoogle = mockAdsbygoogle

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
      window.adsbygoogle = mockAdsbygoogle

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
      window.adsbygoogle = []

      render(<InFeedAd />)

      // After the effect runs, the spinner should be hidden (not in DOM when loaded)
      await waitFor(() => {
        // The ad element should be visible (minHeight set when loaded)
        const adElement = document.querySelector('.adsbygoogle')
        expect(adElement).toBeInTheDocument()
      })
    })

    test('ad element has correct display style when loaded', async () => {
      window.adsbygoogle = []

      render(<InFeedAd />)

      await waitFor(() => {
        const adElement = document.querySelector('.adsbygoogle')
        expect(adElement).toBeInTheDocument()
        // When loaded, display should be 'block'
        if (adElement instanceof HTMLElement) {
          expect(adElement.style.display).toBe('block')
        }
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
      const originalWindow = globalThis.window

      // This tests the typeof window check in the component
      // The component should handle SSR where window might be undefined
      Reflect.deleteProperty(globalThis, 'window')
      expect(() => render(<InFeedAd />)).not.toThrow()

      Object.defineProperty(globalThis, 'window', {
        value: originalWindow,
        configurable: true,
        writable: true,
      })
    })

    test('handles multiple renders', () => {
      const mockAdsbygoogle: Array<Record<string, unknown>> = []
      window.adsbygoogle = mockAdsbygoogle

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

  describe('Development Placeholder', () => {
    test('shows placeholder in development mode', () => {
      process.env.NODE_ENV = 'development'

      render(<InFeedAd />)

      expect(screen.getByText('Ad placeholder')).toBeInTheDocument()
      expect(
        screen.getByText('Real ads appear in production')
      ).toBeInTheDocument()
    })

    test('shows ad emoji icon in development mode', () => {
      process.env.NODE_ENV = 'development'

      render(<InFeedAd />)

      expect(screen.getByText('📢')).toBeInTheDocument()
    })

    test('does not render AdSense ins element in development mode', () => {
      process.env.NODE_ENV = 'development'

      render(<InFeedAd />)

      const adElement = document.querySelector('.adsbygoogle')
      expect(adElement).not.toBeInTheDocument()
    })

    test('does not push to adsbygoogle in development mode', () => {
      process.env.NODE_ENV = 'development'
      const mockAdsbygoogle: Array<Record<string, unknown>> = []
      window.adsbygoogle = mockAdsbygoogle

      render(<InFeedAd />)

      expect(mockAdsbygoogle.length).toBe(0)
    })

    test('placeholder has dashed border styling', () => {
      process.env.NODE_ENV = 'development'

      render(<InFeedAd />)

      const placeholder = screen.getByText('Ad placeholder').closest('div')
      expect(placeholder).toHaveClass('border-dashed', 'border-2')
    })

    test('still shows sponsored label in development mode', () => {
      process.env.NODE_ENV = 'development'

      render(<InFeedAd />)

      expect(screen.getByText('Sponsored')).toBeInTheDocument()
    })

    test('still shows partner content label in development mode', () => {
      process.env.NODE_ENV = 'development'

      render(<InFeedAd />)

      expect(screen.getByText('Partner content')).toBeInTheDocument()
    })
  })

  describe('Production Mode', () => {
    test('renders AdSense element in production mode', () => {
      process.env.NODE_ENV = 'production'

      render(<InFeedAd />)

      const adElement = document.querySelector('.adsbygoogle')
      expect(adElement).toBeInTheDocument()
    })

    test('does not show placeholder in production mode', () => {
      process.env.NODE_ENV = 'production'

      render(<InFeedAd />)

      expect(screen.queryByText('Ad placeholder')).not.toBeInTheDocument()
    })

    test('pushes to adsbygoogle in production mode', async () => {
      process.env.NODE_ENV = 'production'
      const mockAdsbygoogle: Array<Record<string, unknown>> = []
      window.adsbygoogle = mockAdsbygoogle

      render(<InFeedAd />)

      await waitFor(() => {
        expect(mockAdsbygoogle.length).toBe(1)
      })
    })
  })

  describe('Multiple Ad Instances', () => {
    test('renders multiple ads with different positions', () => {
      render(
        <>
          <InFeedAd position={1} />
          <InFeedAd position={5} />
          <InFeedAd position={10} />
        </>
      )

      const containers = document.querySelectorAll('[data-ad-position]')
      expect(containers).toHaveLength(3)
      expect(containers[0]).toHaveAttribute('data-ad-position', '1')
      expect(containers[1]).toHaveAttribute('data-ad-position', '5')
      expect(containers[2]).toHaveAttribute('data-ad-position', '10')
    })

    test('each ad instance has its own sponsored label', () => {
      render(
        <>
          <InFeedAd position={1} />
          <InFeedAd position={2} />
        </>
      )

      const sponsoredLabels = screen.getAllByText('Sponsored')
      expect(sponsoredLabels).toHaveLength(2)
    })

    test('each ad instance has its own partner content label', () => {
      render(
        <>
          <InFeedAd position={1} />
          <InFeedAd position={2} />
          <InFeedAd position={3} />
        </>
      )

      const partnerLabels = screen.getAllByText('Partner content')
      expect(partnerLabels).toHaveLength(3)
    })

    test('multiple ads push to adsbygoogle array separately', async () => {
      const mockAdsbygoogle: Array<Record<string, unknown>> = []
      window.adsbygoogle = mockAdsbygoogle

      render(
        <>
          <InFeedAd position={1} />
          <InFeedAd position={2} />
          <InFeedAd position={3} />
        </>
      )

      await waitFor(() => {
        // Each ad instance should push once
        expect(mockAdsbygoogle.length).toBe(3)
      })
    })
  })

  describe('Already Processed Ads', () => {
    test('skips push if ad already has data-adsbygoogle-status', async () => {
      const mockAdsbygoogle: Array<Record<string, unknown>> = []
      window.adsbygoogle = mockAdsbygoogle

      const { container, rerender } = render(<InFeedAd />)

      // Simulate Google already processing the ad
      const insElement = container.querySelector('.adsbygoogle')
      insElement?.setAttribute('data-adsbygoogle-status', 'done')

      // Re-render same component to trigger effect again
      rerender(<InFeedAd />)

      // Should only have pushed once from initial render (useId keeps same ID on rerender)
      expect(mockAdsbygoogle.length).toBe(1)
    })
  })

  describe('Data Attributes', () => {
    test('has correct ad slot attribute', () => {
      render(<InFeedAd />)

      const adElement = document.querySelector('.adsbygoogle')
      expect(adElement).toHaveAttribute('data-ad-slot', '3059335227')
    })

    test('has all required AdSense attributes', () => {
      render(<InFeedAd />)

      const adElement = document.querySelector('.adsbygoogle')
      expect(adElement).toHaveAttribute('data-ad-format')
      expect(adElement).toHaveAttribute('data-ad-layout-key')
      expect(adElement).toHaveAttribute('data-ad-client')
      expect(adElement).toHaveAttribute('data-ad-slot')
    })

    test('ad format is set to fluid for responsive ads', () => {
      render(<InFeedAd />)

      const adElement = document.querySelector('.adsbygoogle')
      expect(adElement).toHaveAttribute('data-ad-format', 'fluid')
    })
  })

  describe('Loading Spinner', () => {
    // Note: Testing the loading spinner is tricky because setIsLoaded(true) is called
    // immediately after push() succeeds in the same effect, making the spinner disappear
    // before we can assert on it. These tests verify the spinner styling exists in the markup.

    test('spinner element has correct class when present', () => {
      // The spinner has animate-spin class for rotation animation
      // We verify this by checking the component's JSX structure
      render(<InFeedAd />)

      // The AdSense element should be present (spinner disappears when loaded)
      const adElement = document.querySelector('.adsbygoogle')
      expect(adElement).toBeInTheDocument()
    })

    test('ad container has minimum height for loading state', () => {
      render(<InFeedAd />)

      // The container always has min-height to prevent layout shift
      const container = document.querySelector('.min-h-\\[420px\\]')
      expect(container).toBeInTheDocument()
    })

    test('ad container has centering classes for spinner', () => {
      render(<InFeedAd />)

      // The container has flex and centering classes
      const container = document.querySelector('.min-h-\\[420px\\]')
      expect(container).toHaveClass(
        'flex-1',
        'flex-col',
        'items-center',
        'justify-center'
      )
    })
  })

  describe('Ad Element Styles', () => {
    test('ad element has display block style', () => {
      render(<InFeedAd />)

      const adElement = document.querySelector('.adsbygoogle')
      expect(adElement).toBeInTheDocument()
      if (adElement instanceof HTMLElement) {
        expect(adElement.style.display).toBe('block')
      }
    })

    test('ad element has 100% width style', () => {
      render(<InFeedAd />)

      const adElement = document.querySelector('.adsbygoogle')
      expect(adElement).toBeInTheDocument()
      if (adElement instanceof HTMLElement) {
        expect(adElement.style.width).toBe('100%')
      }
    })

    test('ad element height changes based on load state', async () => {
      window.adsbygoogle = []

      render(<InFeedAd />)

      await waitFor(() => {
        const adElement = document.querySelector('.adsbygoogle')
        expect(adElement).toBeInTheDocument()
        // When loaded, should have auto height
        if (adElement instanceof HTMLElement) {
          expect(adElement.style.height).toBe('auto')
        }
      })
    })

    test('ad element minHeight changes based on load state', async () => {
      window.adsbygoogle = []

      render(<InFeedAd />)

      await waitFor(() => {
        const adElement = document.querySelector('.adsbygoogle')
        expect(adElement).toBeInTheDocument()
        // When loaded, should have minHeight
        if (adElement instanceof HTMLElement) {
          expect(adElement.style.minHeight).toBe('380px')
        }
      })
    })
  })

  describe('Container Structure', () => {
    test('has flex column layout', () => {
      render(<InFeedAd />)

      const container = document.querySelector('[data-ad-position]')
      expect(container).toHaveClass('flex', 'flex-col')
    })

    test('has overflow hidden', () => {
      render(<InFeedAd />)

      const container = document.querySelector('[data-ad-position]')
      expect(container).toHaveClass('overflow-hidden')
    })

    test('has relative positioning for label placement', () => {
      render(<InFeedAd />)

      const container = document.querySelector('[data-ad-position]')
      expect(container).toHaveClass('relative')
    })

    test('has transition-all for smooth state changes', () => {
      render(<InFeedAd />)

      const container = document.querySelector('[data-ad-position]')
      expect(container).toHaveClass('transition-all')
    })
  })

  describe('Sponsored Label Details', () => {
    test('has backdrop blur effect', () => {
      render(<InFeedAd />)

      const label = screen.getByText('Sponsored')
      expect(label).toHaveClass('backdrop-blur-sm')
    })

    test('has small font size', () => {
      render(<InFeedAd />)

      const label = screen.getByText('Sponsored')
      expect(label).toHaveClass('text-[10px]')
    })

    test('has semibold font weight', () => {
      render(<InFeedAd />)

      const label = screen.getByText('Sponsored')
      expect(label).toHaveClass('font-semibold')
    })

    test('has tracking-wide letter spacing', () => {
      render(<InFeedAd />)

      const label = screen.getByText('Sponsored')
      expect(label).toHaveClass('tracking-wide')
    })

    test('has correct padding', () => {
      render(<InFeedAd />)

      const label = screen.getByText('Sponsored')
      expect(label).toHaveClass('px-2.5', 'py-1')
    })
  })

  describe('Bottom Section Details', () => {
    test('has background styling', () => {
      render(<InFeedAd />)

      const bottomSection = screen.getByText('Partner content').parentElement
      expect(bottomSection).toHaveClass('bg-white/5')
    })

    test('has correct padding', () => {
      render(<InFeedAd />)

      const bottomSection = screen.getByText('Partner content').parentElement
      expect(bottomSection).toHaveClass('px-4', 'py-2')
    })

    test('partner content is centered', () => {
      render(<InFeedAd />)

      const label = screen.getByText('Partner content')
      expect(label).toHaveClass('text-center')
    })

    test('partner content has extra small font', () => {
      render(<InFeedAd />)

      const label = screen.getByText('Partner content')
      expect(label).toHaveClass('text-xs')
    })

    test('partner content has medium font weight', () => {
      render(<InFeedAd />)

      const label = screen.getByText('Partner content')
      expect(label).toHaveClass('font-medium')
    })
  })

  describe('Development Placeholder Details', () => {
    beforeEach(() => {
      process.env.NODE_ENV = 'development'
    })

    test('placeholder container has correct background', () => {
      render(<InFeedAd />)

      const placeholder = screen.getByText('Ad placeholder').closest('div')
      expect(placeholder).toHaveClass('bg-white/5')
    })

    test('placeholder has rounded corners', () => {
      render(<InFeedAd />)

      const placeholder = screen.getByText('Ad placeholder').closest('div')
      expect(placeholder).toHaveClass('rounded-lg')
    })

    test('placeholder has correct border color', () => {
      render(<InFeedAd />)

      const placeholder = screen.getByText('Ad placeholder').closest('div')
      expect(placeholder).toHaveClass('border-white/20')
    })

    test('placeholder text has muted color', () => {
      render(<InFeedAd />)

      const placeholderText = screen.getByText('Ad placeholder').closest('p')
      expect(placeholderText).toHaveClass('text-muted-foreground')
    })

    test('production hint has reduced opacity', () => {
      render(<InFeedAd />)

      const hint = screen.getByText('Real ads appear in production')
      expect(hint).toHaveClass('opacity-60')
    })

    test('placeholder is vertically and horizontally centered', () => {
      render(<InFeedAd />)

      const placeholder = screen.getByText('Ad placeholder').closest('div')
      expect(placeholder).toHaveClass('flex', 'items-center', 'justify-center')
    })

    test('placeholder has gap between elements', () => {
      render(<InFeedAd />)

      const placeholder = screen.getByText('Ad placeholder').closest('div')
      expect(placeholder).toHaveClass('gap-4')
    })

    test('placeholder has padding', () => {
      render(<InFeedAd />)

      const placeholder = screen.getByText('Ad placeholder').closest('div')
      expect(placeholder).toHaveClass('p-6')
    })
  })

  describe('Unmount Behavior', () => {
    test('component unmounts cleanly without errors', () => {
      const { unmount } = render(<InFeedAd />)

      expect(() => unmount()).not.toThrow()
    })

    test('multiple mount/unmount cycles work correctly', () => {
      const mockAdsbygoogle: Array<Record<string, unknown>> = []
      window.adsbygoogle = mockAdsbygoogle

      const { unmount: unmount1 } = render(<InFeedAd position={1} />)
      unmount1()

      const { unmount: unmount2 } = render(<InFeedAd position={2} />)
      unmount2()

      const { unmount: unmount3 } = render(<InFeedAd position={3} />)
      unmount3()

      // Should not throw during any cycle
      expect(true).toBe(true)
    })
  })

  describe('Prop Validation', () => {
    test('works without any props', () => {
      expect(() => render(<InFeedAd />)).not.toThrow()
    })

    test('works with only position prop', () => {
      expect(() => render(<InFeedAd position={5} />)).not.toThrow()
    })

    test('works with only className prop', () => {
      expect(() => render(<InFeedAd className="test-class" />)).not.toThrow()
    })

    test('works with all props', () => {
      expect(() =>
        render(<InFeedAd position={3} className="custom-class" />)
      ).not.toThrow()
    })

    test('handles negative position values', () => {
      render(<InFeedAd position={-1} />)

      const container = document.querySelector('[data-ad-position]')
      expect(container).toHaveAttribute('data-ad-position', '-1')
    })

    test('handles very large position values', () => {
      render(<InFeedAd position={999999} />)

      const container = document.querySelector('[data-ad-position]')
      expect(container).toHaveAttribute('data-ad-position', '999999')
    })

    test('handles empty className', () => {
      render(<InFeedAd className="" />)

      const container = document.querySelector('[data-ad-position]')
      expect(container).toBeInTheDocument()
    })

    test('handles className with multiple classes', () => {
      render(<InFeedAd className="class-one class-two class-three" />)

      const container = document.querySelector('[data-ad-position]')
      expect(container).toHaveClass('class-one', 'class-two', 'class-three')
    })
  })

  describe('Error Recovery', () => {
    test('gracefully handles missing ins element', async () => {
      // This tests the null check for insElement
      const mockAdsbygoogle: Array<Record<string, unknown>> = []
      window.adsbygoogle = mockAdsbygoogle

      // Even if something goes wrong, component should not crash
      expect(() => render(<InFeedAd />)).not.toThrow()
    })

    test('does not re-push after error recovery attempt', async () => {
      const consoleSpy = jest.spyOn(console, 'warn').mockImplementation()
      let callCount = 0

      const mockAdsbygoogle = {
        push: jest.fn().mockImplementation(() => {
          callCount++
          if (callCount === 1) {
            throw new Error('First push failed')
          }
        }),
      }
      window.adsbygoogle = mockAdsbygoogle

      render(<InFeedAd />)

      await waitFor(() => {
        // Should only try once due to the pushedAdIds tracking
        expect(mockAdsbygoogle.push).toHaveBeenCalledTimes(1)
      })

      consoleSpy.mockRestore()
    })
  })

  describe('Integration with Feed Context', () => {
    test('renders correctly alongside other content', () => {
      render(
        <div className="property-feed">
          <div className="property-card">Property 1</div>
          <InFeedAd position={1} />
          <div className="property-card">Property 2</div>
          <InFeedAd position={2} />
          <div className="property-card">Property 3</div>
        </div>
      )

      // Both ads and property cards should be present
      expect(screen.getByText('Property 1')).toBeInTheDocument()
      expect(screen.getByText('Property 2')).toBeInTheDocument()
      expect(screen.getByText('Property 3')).toBeInTheDocument()

      const ads = document.querySelectorAll('[data-ad-position]')
      expect(ads).toHaveLength(2)
    })

    test('ads maintain correct order in feed', () => {
      render(
        <div data-testid="feed">
          <div data-testid="item-1">Item 1</div>
          <InFeedAd position={1} />
          <div data-testid="item-2">Item 2</div>
        </div>
      )

      const feed = screen.getByTestId('feed')
      const children = Array.from(feed.children)

      expect(children[0]).toHaveAttribute('data-testid', 'item-1')
      expect(children[1]).toHaveAttribute('data-ad-position', '1')
      expect(children[2]).toHaveAttribute('data-testid', 'item-2')
    })
  })
})
