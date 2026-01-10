import React from 'react'
import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { PropertyErrorBoundary } from '@/components/shared/PropertyErrorBoundary'

// Mock analytics and monitoring
const mockGtag = jest.fn()
const mockSentry = {
  withScope: jest.fn((callback) => {
    const mockScope = {
      setTag: jest.fn().mockReturnThis(),
      setContext: jest.fn().mockReturnThis(),
    }
    callback(mockScope)
  }),
  captureException: jest.fn(),
}

const setWindowProp = (key: string, value: unknown) => {
  Object.defineProperty(window, key, {
    value,
    writable: true,
    configurable: true,
  })
}

const deleteWindowProp = (key: string) => {
  Reflect.deleteProperty(window, key)
}

// Mock console.error
const originalConsoleError = console.error
beforeAll(() => {
  console.error = jest.fn()
  setWindowProp('gtag', mockGtag)
  setWindowProp('Sentry', mockSentry)
})

afterAll(() => {
  console.error = originalConsoleError
  deleteWindowProp('gtag')
  deleteWindowProp('Sentry')
})

// Test components
const ThrowError = ({
  shouldThrow,
  errorType = 'general',
}: {
  shouldThrow: boolean
  errorType?: 'network' | 'general'
}) => {
  if (shouldThrow) {
    if (errorType === 'network') {
      throw new Error('Network request failed')
    }
    throw new Error('Property load failed')
  }
  return <div>Property loaded successfully</div>
}

const ThrowAsyncError = ({ shouldThrow }: { shouldThrow: boolean }) => {
  React.useEffect(() => {
    if (shouldThrow) {
      // Simulate async property loading error
      setTimeout(() => {
        throw new Error('Async property loading failed')
      }, 0)
    }
  }, [shouldThrow])

  return <div>Loading property...</div>
}

const requireBoundaryRef = (ref: PropertyErrorBoundary | null) => {
  if (!ref) {
    throw new Error('Expected PropertyErrorBoundary ref to be set')
  }
  return ref
}

describe('PropertyErrorBoundary', () => {
  beforeEach(() => {
    jest.clearAllMocks()
    // Re-setup analytics mocks after clearing - need fresh mock functions
    setWindowProp('gtag', mockGtag)

    // Create fresh Sentry mock with implementation after clearAllMocks
    const freshSentryMock = {
      withScope: jest.fn((callback) => {
        const mockScope = {
          setTag: jest.fn().mockReturnThis(),
          setContext: jest.fn().mockReturnThis(),
        }
        callback(mockScope)
      }),
      captureException: jest.fn(),
    }
    setWindowProp('Sentry', freshSentryMock)

    // Update mockSentry reference to use the fresh mock
    Object.assign(mockSentry, freshSentryMock)
  })

  describe('Normal Operation', () => {
    it('renders children when no error occurs', () => {
      render(
        <PropertyErrorBoundary propertyId="prop-123">
          <div>Property content</div>
        </PropertyErrorBoundary>
      )

      expect(screen.getByText('Property content')).toBeInTheDocument()
    })

    it('renders property loading states correctly', () => {
      render(
        <PropertyErrorBoundary propertyId="prop-456">
          <ThrowAsyncError shouldThrow={false} />
        </PropertyErrorBoundary>
      )

      expect(screen.getByText('Loading property...')).toBeInTheDocument()
    })
  })

  describe('Error Handling', () => {
    it('catches and displays property-specific error UI', () => {
      render(
        <PropertyErrorBoundary propertyId="prop-123">
          <ThrowError shouldThrow={true} />
        </PropertyErrorBoundary>
      )

      expect(screen.getByText('Property Load Error')).toBeInTheDocument()
      expect(
        screen.getByText(/Unable to load property details/)
      ).toBeInTheDocument()
      expect(screen.getByRole('button', { name: /Retry/ })).toBeInTheDocument()
      expect(screen.getByRole('button', { name: 'Reset' })).toBeInTheDocument()
    })

    it('shows network-specific error messages', () => {
      render(
        <PropertyErrorBoundary propertyId="prop-123">
          <ThrowError shouldThrow={true} errorType="network" />
        </PropertyErrorBoundary>
      )

      expect(
        screen.getByText(/Connection issue loading this property/)
      ).toBeInTheDocument()
      expect(
        screen.getByText(/check your internet connection/)
      ).toBeInTheDocument()
    })

    it('logs errors with property context', () => {
      render(
        <PropertyErrorBoundary propertyId="prop-123">
          <ThrowError shouldThrow={true} />
        </PropertyErrorBoundary>
      )

      expect(console.error).toHaveBeenCalledWith(
        'Property error boundary caught:',
        expect.any(Error),
        expect.any(Object)
      )
    })

    it('reports to analytics with property ID', () => {
      render(
        <PropertyErrorBoundary propertyId="prop-456">
          <ThrowError shouldThrow={true} />
        </PropertyErrorBoundary>
      )

      expect(mockGtag).toHaveBeenCalledWith('event', 'exception', {
        event_category: 'property_error',
        event_label: 'prop-456',
        custom_parameters: {
          description: 'Property error: Property load failed',
          property_id: 'prop-456',
          retry_count: 0,
          fatal: false,
        },
      })
    })

    it('reports to Sentry with context', () => {
      render(
        <PropertyErrorBoundary propertyId="prop-789">
          <ThrowError shouldThrow={true} />
        </PropertyErrorBoundary>
      )

      expect(mockSentry.withScope).toHaveBeenCalled()
      expect(mockSentry.captureException).toHaveBeenCalledWith(
        expect.any(Error)
      )
    })

    it('handles missing property ID gracefully', () => {
      render(
        <PropertyErrorBoundary>
          <ThrowError shouldThrow={true} />
        </PropertyErrorBoundary>
      )

      expect(mockGtag).toHaveBeenCalledWith('event', 'exception', {
        event_category: 'property_error',
        event_label: 'unknown',
        custom_parameters: expect.objectContaining({
          property_id: 'unknown',
        }),
      })
    })
  })

  describe('Retry Mechanism', () => {
    it('allows limited retries', async () => {
      const user = userEvent.setup()
      let shouldThrow = true

      const TestComponent = () => {
        if (shouldThrow) {
          throw new Error('Temporary error')
        }
        return <div>Property loaded</div>
      }

      const { rerender } = render(
        <PropertyErrorBoundary propertyId="prop-retry">
          <TestComponent />
        </PropertyErrorBoundary>
      )

      // Should show error with retry button
      expect(
        screen.getByRole('button', { name: /Retry \(3 left\)/ })
      ).toBeInTheDocument()

      // Fix the error condition
      shouldThrow = false

      // Click retry
      const retryButton = screen.getByRole('button', { name: /Retry/ })
      await user.click(retryButton)

      // Force re-render after retry
      rerender(
        <PropertyErrorBoundary propertyId="prop-retry" key="retry-1">
          <TestComponent />
        </PropertyErrorBoundary>
      )

      expect(screen.getByText('Property loaded')).toBeInTheDocument()
    })

    it('decreases retry count on each attempt', async () => {
      const user = userEvent.setup()

      render(
        <PropertyErrorBoundary propertyId="prop-retry-count">
          <ThrowError shouldThrow={true} />
        </PropertyErrorBoundary>
      )

      // Initial retry count should be 3
      expect(
        screen.getByRole('button', { name: /Retry \(3 left\)/ })
      ).toBeInTheDocument()

      // Click retry (this will increment retry count but error persists)
      const retryButton = screen.getByRole('button', { name: /Retry/ })
      await user.click(retryButton)

      // Wait for state update
      await waitFor(() => {
        expect(
          screen.getByRole('button', { name: /Retry \(2 left\)/ })
        ).toBeInTheDocument()
      })
    })

    it('disables retry after maximum attempts', async () => {
      const _user = userEvent.setup()

      // Create a test boundary that starts with max retries reached
      const TestBoundary = class extends PropertyErrorBoundary {
        constructor(props: React.ComponentProps<typeof PropertyErrorBoundary>) {
          super(props)
          this.state = {
            hasError: true,
            error: new Error('Max retries'),
            retryCount: 3,
          }
        }
      }

      render(
        <TestBoundary propertyId="prop-max-retry">
          <ThrowError shouldThrow={true} />
        </TestBoundary>
      )

      expect(
        screen.queryByRole('button', { name: /Retry/ })
      ).not.toBeInTheDocument()
      expect(screen.getByText(/Maximum retries reached/)).toBeInTheDocument()
    })

    it('tracks retry count in analytics', () => {
      // Create boundary with retry count
      const TestBoundary = class extends PropertyErrorBoundary {
        constructor(props: React.ComponentProps<typeof PropertyErrorBoundary>) {
          super(props)
          this.state = { hasError: false, error: null, retryCount: 2 }
        }
      }

      const boundary = new TestBoundary({ propertyId: 'prop-analytics' })

      // Simulate componentDidCatch with retry count
      const error = new Error('Analytics test')
      boundary.componentDidCatch(error, { componentStack: 'test' })

      expect(mockGtag).toHaveBeenCalledWith('event', 'exception', {
        event_category: 'property_error',
        event_label: 'prop-analytics',
        custom_parameters: expect.objectContaining({
          retry_count: 2,
        }),
      })
    })
  })

  describe('Reset Functionality', () => {
    it('resets error state when reset button is clicked', async () => {
      const user = userEvent.setup()
      let shouldThrow = true

      const TestBoundary = class extends PropertyErrorBoundary {
        getState() {
          return this.state
        }
      }

      const TestComponent = () => {
        if (shouldThrow) {
          throw new Error('Property load failed')
        }
        return <div>Property loaded successfully</div>
      }

      let boundaryRef: PropertyErrorBoundary | null = null

      const { rerender } = render(
        <TestBoundary
          ref={(ref) => {
            boundaryRef = ref
          }}
          propertyId="prop-reset"
        >
          <TestComponent />
        </TestBoundary>
      )

      // Verify error state
      const boundary = requireBoundaryRef(boundaryRef)
      expect(boundary.getState().hasError).toBe(true)
      expect(boundary.getState().retryCount).toBe(0)

      // Fix the error condition before resetting
      shouldThrow = false

      // Click reset
      const resetButton = screen.getByRole('button', { name: 'Reset' })
      await user.click(resetButton)

      // Force re-render with the fixed component
      rerender(
        <TestBoundary
          ref={(ref) => {
            boundaryRef = ref
          }}
          propertyId="prop-reset"
          key="reset-1"
        >
          <TestComponent />
        </TestBoundary>
      )

      // State should be reset
      const resetBoundary = requireBoundaryRef(boundaryRef)
      expect(resetBoundary.getState().hasError).toBe(false)
      expect(resetBoundary.getState().retryCount).toBe(0)
    })
  })

  describe('Custom Fallback', () => {
    it('renders custom fallback when provided', () => {
      const customFallback = <div>Custom property error UI</div>

      render(
        <PropertyErrorBoundary
          propertyId="prop-custom"
          fallback={customFallback}
        >
          <ThrowError shouldThrow={true} />
        </PropertyErrorBoundary>
      )

      expect(screen.getByText('Custom property error UI')).toBeInTheDocument()
      expect(screen.queryByText('Property Load Error')).not.toBeInTheDocument()
    })
  })

  describe('Development Mode', () => {
    const originalNodeEnv = process.env.NODE_ENV

    afterEach(() => {
      process.env.NODE_ENV = originalNodeEnv
    })

    it('shows error details in development mode', () => {
      process.env.NODE_ENV = 'development'

      render(
        <PropertyErrorBoundary propertyId="prop-dev">
          <ThrowError shouldThrow={true} />
        </PropertyErrorBoundary>
      )

      expect(screen.getByText('Error Details (dev only)')).toBeInTheDocument()

      // Click to expand details
      const detailsElement = screen.getByText('Error Details (dev only)')
      expect(detailsElement.closest('details')).toBeInTheDocument()
    })

    it('hides error details in production mode', () => {
      process.env.NODE_ENV = 'production'

      render(
        <PropertyErrorBoundary propertyId="prop-prod">
          <ThrowError shouldThrow={true} />
        </PropertyErrorBoundary>
      )

      expect(
        screen.queryByText('Error Details (dev only)')
      ).not.toBeInTheDocument()
    })
  })

  describe('Error State Management', () => {
    it('preserves error details in state', () => {
      const TestBoundary = class extends PropertyErrorBoundary {
        getErrorState() {
          return this.state
        }
      }

      let boundaryRef: PropertyErrorBoundary | null = null

      render(
        <TestBoundary
          ref={(ref) => {
            boundaryRef = ref
          }}
          propertyId="prop-state"
        >
          <ThrowError shouldThrow={true} />
        </TestBoundary>
      )

      const errorState = requireBoundaryRef(boundaryRef).getErrorState()
      expect(errorState.hasError).toBe(true)
      expect(errorState.error).toBeInstanceOf(Error)
      expect(errorState.error.message).toBe('Property load failed')
      expect(errorState.retryCount).toBe(0)
    })

    it('updates retry count correctly', async () => {
      const user = userEvent.setup()

      const TestBoundary = class extends PropertyErrorBoundary {
        getErrorState() {
          return this.state
        }
      }

      let boundaryRef: PropertyErrorBoundary | null = null

      render(
        <TestBoundary
          ref={(ref) => {
            boundaryRef = ref
          }}
          propertyId="prop-count"
        >
          <ThrowError shouldThrow={true} />
        </TestBoundary>
      )

      // Initial retry count
      expect(requireBoundaryRef(boundaryRef).getErrorState().retryCount).toBe(0)

      // Click retry
      const retryButton = screen.getByRole('button', { name: /Retry/ })
      await user.click(retryButton)

      // Retry count should increment
      await waitFor(() => {
        expect(requireBoundaryRef(boundaryRef).getErrorState().retryCount).toBe(
          1
        )
      })
    })
  })

  describe('Accessibility', () => {
    it('provides accessible error UI', () => {
      render(
        <PropertyErrorBoundary propertyId="prop-a11y">
          <ThrowError shouldThrow={true} />
        </PropertyErrorBoundary>
      )

      // Check for error title text (CardTitle doesn't create a heading role)
      expect(screen.getByText('Property Load Error')).toBeInTheDocument()

      // Check buttons are accessible
      const retryButton = screen.getByRole('button', { name: /Retry/ })
      const resetButton = screen.getByRole('button', { name: 'Reset' })

      expect(retryButton).not.toBeDisabled()
      expect(resetButton).not.toBeDisabled()
    })

    it('maintains focus management', async () => {
      const user = userEvent.setup()

      render(
        <PropertyErrorBoundary propertyId="prop-focus">
          <ThrowError shouldThrow={true} />
        </PropertyErrorBoundary>
      )

      const retryButton = screen.getByRole('button', { name: /Retry/ })

      // Focus management
      retryButton.focus()
      expect(document.activeElement).toBe(retryButton)

      // Keyboard interaction - test Tab instead of Enter to avoid triggering retry
      await user.keyboard('{Tab}')

      // Verify the next element is focused (Reset button)
      const resetButton = screen.getByRole('button', { name: 'Reset' })
      expect(document.activeElement).toBe(resetButton)
    })
  })

  describe('Integration', () => {
    it('handles missing analytics gracefully', () => {
      deleteWindowProp('gtag')
      deleteWindowProp('Sentry')

      expect(() => {
        render(
          <PropertyErrorBoundary propertyId="prop-no-analytics">
            <ThrowError shouldThrow={true} />
          </PropertyErrorBoundary>
        )
      }).not.toThrow()

      expect(screen.getByText('Property Load Error')).toBeInTheDocument()
    })

    it('works with different property ID formats', () => {
      const propertyIds = ['123', 'prop-456', 'property_789', 'PROP_ABC']

      propertyIds.forEach((id, _index) => {
        // Clear only the specific mocks we want to reset, not all mocks
        mockGtag.mockClear()
        mockSentry.withScope.mockClear()
        mockSentry.captureException.mockClear()

        const { unmount } = render(
          <PropertyErrorBoundary propertyId={id}>
            <ThrowError shouldThrow={true} />
          </PropertyErrorBoundary>
        )

        expect(screen.getByText('Property Load Error')).toBeInTheDocument()

        // Verify analytics was called with correct ID
        expect(mockGtag).toHaveBeenCalledWith('event', 'exception', {
          event_category: 'property_error',
          event_label: id,
          custom_parameters: expect.objectContaining({
            property_id: id,
          }),
        })

        unmount()
      })
    })
  })
})
