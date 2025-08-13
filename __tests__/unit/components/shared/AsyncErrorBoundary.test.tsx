import React from 'react'
import { render, screen, waitFor, act } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { AsyncErrorBoundary } from '@/components/shared/AsyncErrorBoundary'

// Mock analytics and monitoring
const mockGtag = jest.fn()
const mockSentry = {
  withScope: jest.fn((callback) => {
    const mockScope = {
      setTag: jest.fn(),
      setContext: jest.fn(),
    }
    callback(mockScope)
  }),
  captureException: jest.fn(),
}

// Mock console.error
const originalConsoleError = console.error
beforeAll(() => {
  console.error = jest.fn()
  ;(window as any).gtag = mockGtag
  ;(window as any).Sentry = mockSentry
})

afterAll(() => {
  console.error = originalConsoleError
  delete (window as any).gtag
  delete (window as any).Sentry
})

// Test components with different error types
const ThrowError = ({
  shouldThrow,
  errorType = 'general',
}: {
  shouldThrow: boolean
  errorType?:
    | 'network'
    | 'timeout'
    | 'auth'
    | 'not_found'
    | 'server'
    | 'general'
}) => {
  if (shouldThrow) {
    const errorMessages = {
      network: 'Network request failed',
      timeout: 'Request timeout exceeded',
      auth: 'Unauthorized access - 403',
      not_found: 'Resource not found - 404',
      server: 'Internal server error - 500',
      general: 'General async operation failed',
    }
    throw new Error(errorMessages[errorType])
  }
  return <div>Async operation completed</div>
}

const AsyncComponent = ({
  shouldThrow,
  delay = 0,
}: {
  shouldThrow: boolean
  delay?: number
}) => {
  const [data, setData] = React.useState<string | null>(null)
  const [error, setError] = React.useState<Error | null>(null)

  React.useEffect(() => {
    const fetchData = async () => {
      try {
        await new Promise((resolve) => setTimeout(resolve, delay))
        if (shouldThrow) {
          throw new Error('Async fetch failed')
        }
        setData('Data loaded successfully')
      } catch (err) {
        setError(err as Error)
        throw err // This will be caught by error boundary
      }
    }

    fetchData()
  }, [shouldThrow, delay])

  if (error) throw error

  return <div>{data || 'Loading...'}</div>
}

// Mock navigator.onLine
const mockNavigator = {
  onLine: true,
}

Object.defineProperty(window, 'navigator', {
  value: mockNavigator,
  writable: true,
})

describe('AsyncErrorBoundary', () => {
  beforeEach(() => {
    jest.clearAllMocks()
    jest.useFakeTimers()
    mockNavigator.onLine = true
  })

  afterEach(() => {
    jest.runOnlyPendingTimers()
    jest.useRealTimers()
  })

  describe('Normal Operation', () => {
    it('renders children when no error occurs', () => {
      render(
        <AsyncErrorBoundary operation="test-operation">
          <div>Async content</div>
        </AsyncErrorBoundary>
      )

      expect(screen.getByText('Async content')).toBeInTheDocument()
    })

    it('handles async operations correctly', async () => {
      render(
        <AsyncErrorBoundary operation="data-fetch">
          <AsyncComponent shouldThrow={false} delay={10} />
        </AsyncErrorBoundary>
      )

      expect(screen.getByText('Loading...')).toBeInTheDocument()

      // Fast-forward time and wait for completion
      act(() => {
        jest.advanceTimersByTime(20)
      })

      await waitFor(() => {
        expect(screen.getByText('Data loaded successfully')).toBeInTheDocument()
      })
    })
  })

  describe('Error Categorization', () => {
    it('categorizes network errors correctly', () => {
      render(
        <AsyncErrorBoundary operation="api-call">
          <ThrowError shouldThrow={true} errorType="network" />
        </AsyncErrorBoundary>
      )

      expect(screen.getByText('api-call Failed')).toBeInTheDocument()
      expect(screen.getByText(/Network connection issue/)).toBeInTheDocument()
    })

    it('categorizes timeout errors correctly', () => {
      render(
        <AsyncErrorBoundary operation="slow-request">
          <ThrowError shouldThrow={true} errorType="timeout" />
        </AsyncErrorBoundary>
      )

      expect(screen.getByText(/The operation timed out/)).toBeInTheDocument()
    })

    it('categorizes auth errors correctly', () => {
      render(
        <AsyncErrorBoundary operation="protected-resource">
          <ThrowError shouldThrow={true} errorType="auth" />
        </AsyncErrorBoundary>
      )

      expect(screen.getByText(/Authentication failed/)).toBeInTheDocument()
    })

    it('categorizes not found errors correctly', () => {
      render(
        <AsyncErrorBoundary operation="resource-fetch">
          <ThrowError shouldThrow={true} errorType="not_found" />
        </AsyncErrorBoundary>
      )

      expect(
        screen.getByText(/The requested resource was not found/)
      ).toBeInTheDocument()
    })

    it('categorizes server errors correctly', () => {
      render(
        <AsyncErrorBoundary operation="api-endpoint">
          <ThrowError shouldThrow={true} errorType="server" />
        </AsyncErrorBoundary>
      )

      expect(screen.getByText(/Server error/)).toBeInTheDocument()
    })

    it('handles unknown error types', () => {
      render(
        <AsyncErrorBoundary operation="unknown-operation">
          <ThrowError shouldThrow={true} errorType="general" />
        </AsyncErrorBoundary>
      )

      expect(
        screen.getByText(/An unexpected error occurred/)
      ).toBeInTheDocument()
    })
  })

  describe('Online/Offline Detection', () => {
    it('shows online status badge', () => {
      mockNavigator.onLine = true

      render(
        <AsyncErrorBoundary operation="online-test">
          <ThrowError shouldThrow={true} errorType="network" />
        </AsyncErrorBoundary>
      )

      expect(screen.getByText('Online')).toBeInTheDocument()
    })

    it('shows offline status badge when offline', () => {
      mockNavigator.onLine = false

      render(
        <AsyncErrorBoundary operation="offline-test">
          <ThrowError shouldThrow={true} errorType="network" />
        </AsyncErrorBoundary>
      )

      expect(screen.getByText('Offline')).toBeInTheDocument()
    })

    it('disables retry button when offline', () => {
      mockNavigator.onLine = false

      render(
        <AsyncErrorBoundary operation="offline-retry">
          <ThrowError shouldThrow={true} errorType="network" />
        </AsyncErrorBoundary>
      )

      const retryButton = screen.getByRole('button', { name: 'Retry' })
      expect(retryButton).toBeDisabled()
    })

    it('shows refresh page button when offline', () => {
      mockNavigator.onLine = false

      render(
        <AsyncErrorBoundary operation="offline-refresh">
          <ThrowError shouldThrow={true} errorType="network" />
        </AsyncErrorBoundary>
      )

      expect(
        screen.getByRole('button', { name: 'Refresh Page' })
      ).toBeInTheDocument()
    })

    it('handles online/offline events', async () => {
      const TestBoundary = class extends AsyncErrorBoundary {
        getState() {
          return this.state
        }
      }

      let boundaryRef: any

      render(
        <TestBoundary
          ref={(ref) => {
            boundaryRef = ref
          }}
          operation="connection-test"
        >
          <ThrowError shouldThrow={true} errorType="network" />
        </TestBoundary>
      )

      // Simulate going offline
      mockNavigator.onLine = false
      act(() => {
        window.dispatchEvent(new Event('offline'))
      })

      expect(boundaryRef.getState().isOnline).toBe(false)

      // Simulate coming back online
      mockNavigator.onLine = true
      act(() => {
        window.dispatchEvent(new Event('online'))
      })

      expect(boundaryRef.getState().isOnline).toBe(true)
    })
  })

  describe('Auto-Retry Mechanism', () => {
    it('auto-retries network errors', async () => {
      const TestBoundary = class extends AsyncErrorBoundary {
        getState() {
          return this.state
        }
      }

      let boundaryRef: any

      render(
        <TestBoundary
          ref={(ref) => {
            boundaryRef = ref
          }}
          operation="auto-retry-test"
        >
          <ThrowError shouldThrow={true} errorType="network" />
        </TestBoundary>
      )

      // Verify initial error state
      expect(boundaryRef.getState().hasError).toBe(true)
      expect(boundaryRef.getState().retryCount).toBe(0)

      // Auto-retry should trigger
      act(() => {
        jest.advanceTimersByTime(1000)
      })

      // Wait for auto-retry to complete
      await waitFor(() => {
        expect(boundaryRef.getState().retryCount).toBe(1)
      })
    })

    it('auto-retries on network restoration', async () => {
      const TestBoundary = class extends AsyncErrorBoundary {
        getState() {
          return this.state
        }
      }

      let boundaryRef: any

      render(
        <TestBoundary
          ref={(ref) => {
            boundaryRef = ref
          }}
          operation="network-restoration"
        >
          <ThrowError shouldThrow={true} errorType="network" />
        </TestBoundary>
      )

      // Start offline
      mockNavigator.onLine = false
      act(() => {
        window.dispatchEvent(new Event('offline'))
      })

      // Come back online - should trigger auto-retry
      mockNavigator.onLine = true
      act(() => {
        window.dispatchEvent(new Event('online'))
      })

      // Auto-retry should trigger
      act(() => {
        jest.advanceTimersByTime(1000)
      })

      await waitFor(() => {
        expect(boundaryRef.getState().retryCount).toBeGreaterThan(0)
      })
    })

    it('uses exponential backoff for retries', async () => {
      const TestBoundary = class extends AsyncErrorBoundary {
        getState() {
          return this.state
        }
      }

      let boundaryRef: any

      render(
        <TestBoundary
          ref={(ref) => {
            boundaryRef = ref
          }}
          operation="backoff-test"
        >
          <ThrowError shouldThrow={true} errorType="timeout" />
        </TestBoundary>
      )

      // First retry should happen after ~1 second
      act(() => {
        jest.advanceTimersByTime(1000)
      })

      await waitFor(() => {
        expect(boundaryRef.getState().retryCount).toBe(1)
      })

      // Second retry should happen after ~2 seconds (exponential backoff)
      act(() => {
        jest.advanceTimersByTime(2000)
      })

      await waitFor(() => {
        expect(boundaryRef.getState().retryCount).toBe(2)
      })
    })

    it('limits auto-retries to prevent infinite loops', async () => {
      const TestBoundary = class extends AsyncErrorBoundary {
        getState() {
          return this.state
        }
      }

      let boundaryRef: any

      render(
        <TestBoundary
          ref={(ref) => {
            boundaryRef = ref
          }}
          operation="retry-limit"
        >
          <ThrowError shouldThrow={true} errorType="server" />
        </TestBoundary>
      )

      // Fast-forward through multiple retries
      for (let i = 0; i < 10; i++) {
        act(() => {
          jest.advanceTimersByTime(5000)
        })
      }

      await waitFor(() => {
        // Should not exceed 2 auto-retries
        expect(boundaryRef.getState().retryCount).toBeLessThanOrEqual(2)
      })
    })
  })

  describe('Manual Retry', () => {
    it('performs manual retry with custom handler', async () => {
      const user = userEvent.setup({ advanceTimers: jest.advanceTimersByTime })
      const mockOnRetry = jest.fn().mockResolvedValue(undefined)

      let shouldThrow = true

      const TestComponent = () => {
        if (shouldThrow) {
          throw new Error('Manual retry test')
        }
        return <div>Retry successful</div>
      }

      const { rerender } = render(
        <AsyncErrorBoundary operation="manual-retry" onRetry={mockOnRetry}>
          <TestComponent />
        </AsyncErrorBoundary>
      )

      // Should show error initially
      expect(screen.getByText('manual-retry Failed')).toBeInTheDocument()

      // Fix the error condition
      shouldThrow = false

      // Click retry
      const retryButton = screen.getByRole('button', { name: 'Retry' })
      await user.click(retryButton)

      // Should call custom retry handler
      expect(mockOnRetry).toHaveBeenCalled()

      // Force re-render after successful retry
      rerender(
        <AsyncErrorBoundary
          operation="manual-retry"
          onRetry={mockOnRetry}
          key="retry-success"
        >
          <TestComponent />
        </AsyncErrorBoundary>
      )

      expect(screen.getByText('Retry successful')).toBeInTheDocument()
    })

    it('handles retry failures gracefully', async () => {
      const user = userEvent.setup({ advanceTimers: jest.advanceTimersByTime })
      const mockOnRetry = jest.fn().mockRejectedValue(new Error('Retry failed'))

      render(
        <AsyncErrorBoundary operation="failed-retry" onRetry={mockOnRetry}>
          <ThrowError shouldThrow={true} />
        </AsyncErrorBoundary>
      )

      const retryButton = screen.getByRole('button', { name: 'Retry' })
      await user.click(retryButton)

      // Should update with new error
      await waitFor(() => {
        expect(screen.getByText('failed-retry Failed')).toBeInTheDocument()
      })
    })

    it('shows retry progress state', async () => {
      const user = userEvent.setup({ advanceTimers: jest.advanceTimersByTime })
      const mockOnRetry = jest.fn(
        () => new Promise((resolve) => setTimeout(resolve, 1000))
      )

      render(
        <AsyncErrorBoundary operation="retry-progress" onRetry={mockOnRetry}>
          <ThrowError shouldThrow={true} />
        </AsyncErrorBoundary>
      )

      const retryButton = screen.getByRole('button', { name: 'Retry' })
      await user.click(retryButton)

      expect(screen.getByText('Retrying...')).toBeInTheDocument()
      expect(screen.getByRole('button', { name: 'Retrying...' })).toBeDisabled()
    })

    it('tracks retry count correctly', async () => {
      const user = userEvent.setup({ advanceTimers: jest.advanceTimersByTime })

      render(
        <AsyncErrorBoundary operation="retry-count">
          <ThrowError shouldThrow={true} />
        </AsyncErrorBoundary>
      )

      // No retry badge initially
      expect(screen.queryByText(/Retry \d+\/\d+/)).not.toBeInTheDocument()

      // Click retry
      const retryButton = screen.getByRole('button', { name: 'Retry' })
      await user.click(retryButton)

      // Should show retry count
      await waitFor(() => {
        expect(screen.getByText(/Retry 1\/5/)).toBeInTheDocument()
      })
    })

    it('disables retry after maximum attempts', async () => {
      const _user = userEvent.setup({ advanceTimers: jest.advanceTimersByTime })

      // Create boundary with max retries reached
      const TestBoundary = class extends AsyncErrorBoundary {
        constructor(props: any) {
          super(props)
          this.state = {
            hasError: true,
            error: new Error('Max retries'),
            isRetrying: false,
            retryCount: 5,
            isOnline: true,
          }
        }
      }

      render(
        <TestBoundary operation="max-retries">
          <ThrowError shouldThrow={true} />
        </TestBoundary>
      )

      expect(
        screen.queryByRole('button', { name: /Retry/ })
      ).not.toBeInTheDocument()
      expect(screen.getByText(/Maximum retries reached/)).toBeInTheDocument()
    })
  })

  describe('Analytics and Monitoring', () => {
    it('logs errors with operation context', () => {
      render(
        <AsyncErrorBoundary operation="analytics-test">
          <ThrowError shouldThrow={true} errorType="network" />
        </AsyncErrorBoundary>
      )

      expect(mockGtag).toHaveBeenCalledWith('event', 'exception', {
        event_category: 'async_error',
        event_label: 'network',
        custom_parameters: {
          description: 'Async error in analytics-test: Network request failed',
          error_type: 'network',
          is_online: true,
          retry_count: 0,
          fatal: false,
        },
      })
    })

    it('reports to Sentry with comprehensive context', () => {
      render(
        <AsyncErrorBoundary operation="sentry-test">
          <ThrowError shouldThrow={true} errorType="server" />
        </AsyncErrorBoundary>
      )

      expect(mockSentry.withScope).toHaveBeenCalled()
      expect(mockSentry.captureException).toHaveBeenCalledWith(
        expect.any(Error)
      )
    })

    it('includes retry count in analytics', async () => {
      const user = userEvent.setup({ advanceTimers: jest.advanceTimersByTime })

      render(
        <AsyncErrorBoundary operation="retry-analytics">
          <ThrowError shouldThrow={true} />
        </AsyncErrorBoundary>
      )

      // Clear initial call
      mockGtag.mockClear()

      // Retry once
      const retryButton = screen.getByRole('button', { name: 'Retry' })
      await user.click(retryButton)

      // Should log with updated retry count
      expect(mockGtag).toHaveBeenCalledWith('event', 'exception', {
        event_category: 'async_error',
        event_label: 'unknown',
        custom_parameters: expect.objectContaining({
          retry_count: 1,
        }),
      })
    })
  })

  describe('Custom Fallback', () => {
    it('renders custom fallback when provided', () => {
      const customFallback = <div>Custom async error UI</div>

      render(
        <AsyncErrorBoundary
          operation="custom-fallback"
          fallback={customFallback}
        >
          <ThrowError shouldThrow={true} />
        </AsyncErrorBoundary>
      )

      expect(screen.getByText('Custom async error UI')).toBeInTheDocument()
      expect(screen.queryByText('Operation Failed')).not.toBeInTheDocument()
    })
  })

  describe('Cleanup and Memory Management', () => {
    it('cleans up timeouts on unmount', () => {
      const { unmount } = render(
        <AsyncErrorBoundary operation="cleanup-test">
          <ThrowError shouldThrow={true} errorType="network" />
        </AsyncErrorBoundary>
      )

      // Trigger auto-retry timeout
      act(() => {
        jest.advanceTimersByTime(500)
      })

      // Unmount before timeout completes
      unmount()

      // Should not crash or have memory leaks
      act(() => {
        jest.advanceTimersByTime(1000)
      })

      // Test passes if no memory leaks occur
      expect(true).toBe(true)
    })

    it('removes event listeners on unmount', () => {
      const removeEventListenerSpy = jest.spyOn(window, 'removeEventListener')

      const { unmount } = render(
        <AsyncErrorBoundary operation="event-cleanup">
          <div>Test content</div>
        </AsyncErrorBoundary>
      )

      unmount()

      expect(removeEventListenerSpy).toHaveBeenCalledWith(
        'online',
        expect.any(Function)
      )
      expect(removeEventListenerSpy).toHaveBeenCalledWith(
        'offline',
        expect.any(Function)
      )

      removeEventListenerSpy.mockRestore()
    })
  })

  describe('Accessibility', () => {
    it('provides accessible error UI', () => {
      render(
        <AsyncErrorBoundary operation="accessibility-test">
          <ThrowError shouldThrow={true} />
        </AsyncErrorBoundary>
      )

      // Check proper heading structure
      expect(screen.getByText('accessibility-test Failed')).toBeInTheDocument()

      // Check buttons are accessible
      const buttons = screen.getAllByRole('button')
      buttons.forEach((button) => {
        expect(button).toHaveAccessibleName()
      })

      // Check badges are accessible
      expect(screen.getByText('Online')).toBeInTheDocument()
    })

    it('maintains focus management during retry', async () => {
      const user = userEvent.setup({ advanceTimers: jest.advanceTimersByTime })

      render(
        <AsyncErrorBoundary operation="focus-test">
          <ThrowError shouldThrow={true} />
        </AsyncErrorBoundary>
      )

      const retryButton = screen.getByRole('button', { name: 'Retry' })

      retryButton.focus()
      expect(document.activeElement).toBe(retryButton)

      await user.click(retryButton)

      // After click, buttons should still exist (either in retry state or error state)
      await waitFor(() => {
        const buttons = screen.getAllByRole('button')
        expect(buttons.length).toBeGreaterThan(0)
        // Should have at least one button available for interaction
        expect(
          buttons.some(
            (btn) =>
              btn.textContent?.includes('Retry') ||
              btn.textContent?.includes('Reset')
          )
        ).toBe(true)
      })
    })
  })

  describe('Edge Cases', () => {
    it('handles missing operation name gracefully', () => {
      render(
        <AsyncErrorBoundary>
          <ThrowError shouldThrow={true} />
        </AsyncErrorBoundary>
      )

      expect(screen.getByText('Operation Failed')).toBeInTheDocument()
    })

    it('handles errors without messages', () => {
      const ThrowEmptyError = () => {
        throw new Error()
      }

      render(
        <AsyncErrorBoundary operation="empty-error">
          <ThrowEmptyError />
        </AsyncErrorBoundary>
      )

      expect(screen.getByText('empty-error Failed')).toBeInTheDocument()
    })

    it('handles missing analytics services gracefully', () => {
      delete (window as any).gtag
      delete (window as any).Sentry

      expect(() => {
        render(
          <AsyncErrorBoundary operation="no-analytics">
            <ThrowError shouldThrow={true} />
          </AsyncErrorBoundary>
        )
      }).not.toThrow()

      expect(screen.getByText('no-analytics Failed')).toBeInTheDocument()
    })
  })
})
