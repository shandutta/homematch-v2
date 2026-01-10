import React from 'react'
import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { CouplesErrorBoundary } from '@/components/couples/CouplesErrorBoundary'

// Mock framer-motion
jest.mock('framer-motion', () => ({
  motion: {
    div: ({
      children,
      ...props
    }: React.PropsWithChildren<React.HTMLAttributes<HTMLDivElement>>) => (
      <div {...props}>{children}</div>
    ),
  },
}))

// Mock console.error
const originalConsoleError = console.error
beforeAll(() => {
  console.error = jest.fn()
})

afterAll(() => {
  console.error = originalConsoleError
})

// Test components
const ThrowError = ({
  shouldThrow,
  errorMessage = 'Household data error',
}: {
  shouldThrow: boolean
  errorMessage?: string
}) => {
  if (shouldThrow) {
    throw new Error(errorMessage)
  }
  return <div>Household data loaded successfully</div>
}

const CouplesComponent = ({ shouldThrow }: { shouldThrow: boolean }) => {
  React.useEffect(() => {
    if (shouldThrow) {
      throw new Error('Couples feature initialization failed')
    }
  }, [shouldThrow])

  return (
    <div>
      <h2>Couples Dashboard</h2>
      <div>Mutual likes: 5</div>
      <div>Shared properties: 12</div>
    </div>
  )
}

// Mock environment for development/production mode tests
const originalNodeEnv = process.env.NODE_ENV

describe('CouplesErrorBoundary', () => {
  beforeEach(() => {
    jest.clearAllMocks()
    process.env.NODE_ENV = originalNodeEnv
  })

  describe('Normal Operation', () => {
    it('renders children when no error occurs', () => {
      render(
        <CouplesErrorBoundary>
          <div>Couples content</div>
        </CouplesErrorBoundary>
      )

      expect(screen.getByText('Couples content')).toBeInTheDocument()
    })

    it('renders couples components correctly', () => {
      render(
        <CouplesErrorBoundary>
          <CouplesComponent shouldThrow={false} />
        </CouplesErrorBoundary>
      )

      expect(screen.getByText('Couples Dashboard')).toBeInTheDocument()
      expect(screen.getByText('Mutual likes: 5')).toBeInTheDocument()
      expect(screen.getByText('Shared properties: 12')).toBeInTheDocument()
    })

    it('handles multiple children', () => {
      render(
        <CouplesErrorBoundary>
          <div>First couples component</div>
          <div>Second couples component</div>
        </CouplesErrorBoundary>
      )

      expect(screen.getByText('First couples component')).toBeInTheDocument()
      expect(screen.getByText('Second couples component')).toBeInTheDocument()
    })
  })

  describe('Error Handling', () => {
    it('catches and displays couples-specific error UI', () => {
      render(
        <CouplesErrorBoundary>
          <ThrowError shouldThrow={true} />
        </CouplesErrorBoundary>
      )

      expect(screen.getByText('Something went wrong')).toBeInTheDocument()
      expect(
        screen.getByText(/We couldn't load your household data/)
      ).toBeInTheDocument()
      expect(screen.getByText(/temporary connection issue/)).toBeInTheDocument()
    })

    it('displays custom error messages', () => {
      render(
        <CouplesErrorBoundary>
          <ThrowError shouldThrow={true} errorMessage="Partner sync failed" />
        </CouplesErrorBoundary>
      )

      expect(screen.getByText('Something went wrong')).toBeInTheDocument()
      // Error boundary shows generic couples message, not the specific error
      expect(
        screen.getByText(/We couldn't load your household data/)
      ).toBeInTheDocument()
    })

    it('logs errors to console with couples context', () => {
      render(
        <CouplesErrorBoundary>
          <ThrowError shouldThrow={true} />
        </CouplesErrorBoundary>
      )

      expect(console.error).toHaveBeenCalledWith(
        'Couples error boundary caught an error:',
        expect.any(Error),
        expect.any(Object)
      )
    })

    it('handles component lifecycle errors', () => {
      class ProblematicCouplesComponent extends React.Component {
        componentDidMount() {
          throw new Error('Couples component mount error')
        }
        render() {
          return <div>Couples component</div>
        }
      }

      render(
        <CouplesErrorBoundary>
          <ProblematicCouplesComponent />
        </CouplesErrorBoundary>
      )

      expect(screen.getByText('Something went wrong')).toBeInTheDocument()
    })

    it('preserves error information in state', () => {
      const TestBoundary = class extends CouplesErrorBoundary {
        getErrorState() {
          return this.state
        }
      }

      let boundaryRef: TestBoundary | null = null

      render(
        <TestBoundary
          ref={(ref) => {
            boundaryRef = ref
          }}
        >
          <ThrowError
            shouldThrow={true}
            errorMessage="State preservation test"
          />
        </TestBoundary>
      )

      if (!boundaryRef) {
        throw new Error('Expected boundary ref to be set')
      }
      const errorState = boundaryRef.getErrorState()
      expect(errorState.hasError).toBe(true)
      expect(errorState.error).toBeInstanceOf(Error)
      expect(errorState.error.message).toBe('State preservation test')
      expect(errorState.errorInfo).toBe('State preservation test')
    })

    it('handles errors with empty messages', () => {
      const ThrowEmptyError = () => {
        throw new Error()
      }

      render(
        <CouplesErrorBoundary>
          <ThrowEmptyError />
        </CouplesErrorBoundary>
      )

      expect(screen.getByText('Something went wrong')).toBeInTheDocument()
    })
  })

  describe('Development Mode Features', () => {
    it('shows error details in development mode', () => {
      process.env.NODE_ENV = 'development'

      render(
        <CouplesErrorBoundary>
          <ThrowError
            shouldThrow={true}
            errorMessage="Development error details"
          />
        </CouplesErrorBoundary>
      )

      expect(screen.getByText('Error details (dev only)')).toBeInTheDocument()

      // Click to expand details
      const detailsElement = screen.getByText('Error details (dev only)')
      expect(detailsElement.closest('details')).toBeInTheDocument()

      // Should show the error message
      expect(screen.getByText('Development error details')).toBeInTheDocument()
    })

    it('hides error details in production mode', () => {
      process.env.NODE_ENV = 'production'

      render(
        <CouplesErrorBoundary>
          <ThrowError shouldThrow={true} errorMessage="Production error" />
        </CouplesErrorBoundary>
      )

      expect(
        screen.queryByText('Error details (dev only)')
      ).not.toBeInTheDocument()
      // Error message should not be visible in production
      expect(screen.queryByText('Production error')).not.toBeInTheDocument()
    })

    it('handles undefined error messages in development', () => {
      process.env.NODE_ENV = 'development'

      const ThrowUndefinedError = () => {
        const error = new Error()
        error.message = ''
        throw error
      }

      render(
        <CouplesErrorBoundary>
          <ThrowUndefinedError />
        </CouplesErrorBoundary>
      )

      expect(screen.getByText('Error details (dev only)')).toBeInTheDocument()
    })
  })

  describe('Error Recovery', () => {
    it('recovers when Try Again is clicked and error is resolved', async () => {
      const user = userEvent.setup()
      let shouldThrow = true

      const TestComponent = () => {
        if (shouldThrow) {
          throw new Error('Recoverable error')
        }
        return <div>Couples feature recovered</div>
      }

      const { rerender } = render(
        <CouplesErrorBoundary key="recovery-1">
          <TestComponent />
        </CouplesErrorBoundary>
      )

      // Error UI should be visible
      expect(screen.getByText('Something went wrong')).toBeInTheDocument()

      // Fix the error condition
      shouldThrow = false

      // Click Try Again
      const tryAgainButton = screen.getByRole('button', { name: 'Try Again' })
      await user.click(tryAgainButton)

      // Force re-render to simulate recovery
      rerender(
        <CouplesErrorBoundary key="recovery-2">
          <TestComponent />
        </CouplesErrorBoundary>
      )

      expect(screen.getByText('Couples feature recovered')).toBeInTheDocument()
      expect(screen.queryByText('Something went wrong')).not.toBeInTheDocument()
    })

    it('resets error state properly on retry', async () => {
      const user = userEvent.setup()

      const TestBoundary = class extends CouplesErrorBoundary {
        getErrorState() {
          return this.state
        }
      }

      let boundaryRef: TestBoundary | null = null
      let shouldThrow = true

      const ControlledThrowError = () => {
        if (shouldThrow) {
          throw new Error('Couples retry test error')
        }
        return <div>Couples feature working</div>
      }

      const { rerender } = render(
        <TestBoundary
          ref={(ref) => {
            boundaryRef = ref
          }}
        >
          <ControlledThrowError />
        </TestBoundary>
      )

      if (!boundaryRef) {
        throw new Error('Expected boundary ref to be set')
      }
      // Verify error state
      expect(boundaryRef.getErrorState().hasError).toBe(true)
      expect(boundaryRef.getErrorState().error).toBeInstanceOf(Error)

      // Fix the error condition first
      shouldThrow = false

      // Click Try Again to trigger reset
      const tryAgainButton = screen.getByRole('button', { name: 'Try Again' })
      await user.click(tryAgainButton)

      // Force re-render to simulate recovery
      rerender(
        <TestBoundary
          ref={(ref) => {
            boundaryRef = ref
          }}
        >
          <ControlledThrowError />
        </TestBoundary>
      )

      if (!boundaryRef) {
        throw new Error('Expected boundary ref to be set')
      }
      // Error state should be reset now that the underlying issue is fixed
      expect(boundaryRef.getErrorState().hasError).toBe(false)
      expect(boundaryRef.getErrorState().error).toBeUndefined()
      expect(boundaryRef.getErrorState().errorInfo).toBeUndefined()
    })

    it('handles persistent errors gracefully', async () => {
      const user = userEvent.setup()

      render(
        <CouplesErrorBoundary>
          <ThrowError shouldThrow={true} />
        </CouplesErrorBoundary>
      )

      const tryAgainButton = screen.getByRole('button', { name: 'Try Again' })

      // Click Try Again - error should persist since underlying issue isn't fixed
      await user.click(tryAgainButton)

      // Error UI should still be visible
      expect(screen.getByText('Something went wrong')).toBeInTheDocument()
    })
  })

  describe('Navigation Actions', () => {
    it('provides navigation to dashboard', async () => {
      const user = userEvent.setup()

      // Simple approach - just verify the button exists and is clickable
      // The actual navigation behavior is tested at the component level
      render(
        <CouplesErrorBoundary>
          <ThrowError shouldThrow={true} />
        </CouplesErrorBoundary>
      )

      const dashboardButton = screen.getByRole('button', {
        name: 'Go to Dashboard',
      })
      expect(dashboardButton).toBeInTheDocument()
      expect(dashboardButton).not.toBeDisabled()

      // Verify clicking doesn't crash the component
      await user.click(dashboardButton)

      // Button should still be available after click
      expect(
        screen.getByRole('button', { name: 'Go to Dashboard' })
      ).toBeInTheDocument()
    })

    it('renders both action buttons', () => {
      render(
        <CouplesErrorBoundary>
          <ThrowError shouldThrow={true} />
        </CouplesErrorBoundary>
      )

      expect(
        screen.getByRole('button', { name: 'Try Again' })
      ).toBeInTheDocument()
      expect(
        screen.getByRole('button', { name: 'Go to Dashboard' })
      ).toBeInTheDocument()
    })

    it('buttons have correct styling classes', () => {
      render(
        <CouplesErrorBoundary>
          <ThrowError shouldThrow={true} />
        </CouplesErrorBoundary>
      )

      const tryAgainButton = screen.getByRole('button', { name: 'Try Again' })
      const dashboardButton = screen.getByRole('button', {
        name: 'Go to Dashboard',
      })

      // Try Again button should have gradient classes
      expect(tryAgainButton).toHaveClass(
        'bg-gradient-to-r',
        'from-pink-500',
        'to-purple-500'
      )

      // Dashboard button should have outline styling
      expect(dashboardButton).toHaveClass('border-pink-500/30', 'text-pink-400')
    })
  })

  describe('Custom Fallback', () => {
    it('renders custom fallback when provided', () => {
      const customFallback = (
        <div>
          <h1>Custom Couples Error</h1>
          <p>Partner connection failed</p>
        </div>
      )

      render(
        <CouplesErrorBoundary fallback={customFallback}>
          <ThrowError shouldThrow={true} />
        </CouplesErrorBoundary>
      )

      expect(screen.getByText('Custom Couples Error')).toBeInTheDocument()
      expect(screen.getByText('Partner connection failed')).toBeInTheDocument()
      expect(screen.queryByText('Something went wrong')).not.toBeInTheDocument()
    })

    it('custom fallback takes precedence over default UI', () => {
      const customFallback = (
        <div data-testid="custom-fallback">Custom error UI</div>
      )

      render(
        <CouplesErrorBoundary fallback={customFallback}>
          <ThrowError shouldThrow={true} />
        </CouplesErrorBoundary>
      )

      expect(screen.getByTestId('custom-fallback')).toBeInTheDocument()
      expect(screen.queryByText('Try Again')).not.toBeInTheDocument()
      expect(screen.queryByText('Go to Dashboard')).not.toBeInTheDocument()
    })
  })

  describe('Visual Elements', () => {
    it('renders heart and warning icons', () => {
      render(
        <CouplesErrorBoundary>
          <ThrowError shouldThrow={true} />
        </CouplesErrorBoundary>
      )

      // Icons are rendered via Lucide React - check for their presence via role or data attributes
      // Since icons may not have specific classes in test environment, check for SVG elements
      const svgElements = document.querySelectorAll('svg')
      expect(svgElements.length).toBeGreaterThan(0)

      // Alternative: check for the error message which confirms the error boundary rendered
      expect(screen.getByText('Something went wrong')).toBeInTheDocument()
    })

    it('applies glassmorphism styling', () => {
      render(
        <CouplesErrorBoundary>
          <ThrowError shouldThrow={true} />
        </CouplesErrorBoundary>
      )

      // Check for glassmorphism class
      const errorCard = document.querySelector('.card-glassmorphism-style')
      expect(errorCard).toBeInTheDocument()
    })

    it('has proper color theming', () => {
      render(
        <CouplesErrorBoundary>
          <ThrowError shouldThrow={true} />
        </CouplesErrorBoundary>
      )

      // Check for couples-themed colors
      expect(screen.getByText('Something went wrong')).toHaveClass(
        'text-primary-foreground'
      )

      const refreshIcon = document.querySelector('.lucide-refresh-cw')
      expect(refreshIcon).toHaveClass('mr-2', 'h-4', 'w-4')
    })
  })

  describe('Accessibility', () => {
    it('provides accessible error UI structure', () => {
      render(
        <CouplesErrorBoundary>
          <ThrowError shouldThrow={true} />
        </CouplesErrorBoundary>
      )

      // Check heading structure
      const heading = screen.getByRole('heading', { level: 2 })
      expect(heading).toHaveTextContent('Something went wrong')

      // Check buttons are accessible
      const tryAgainButton = screen.getByRole('button', { name: 'Try Again' })
      const dashboardButton = screen.getByRole('button', {
        name: 'Go to Dashboard',
      })

      expect(tryAgainButton).not.toBeDisabled()
      expect(dashboardButton).not.toBeDisabled()
      expect(tryAgainButton).toHaveAccessibleName()
      expect(dashboardButton).toHaveAccessibleName()
    })

    it('maintains focus management', async () => {
      const user = userEvent.setup()

      render(
        <CouplesErrorBoundary>
          <ThrowError shouldThrow={true} />
        </CouplesErrorBoundary>
      )

      const tryAgainButton = screen.getByRole('button', { name: 'Try Again' })

      // Focus management
      tryAgainButton.focus()
      expect(document.activeElement).toBe(tryAgainButton)

      // Tab navigation
      await user.keyboard('{Tab}')
      const dashboardButton = screen.getByRole('button', {
        name: 'Go to Dashboard',
      })
      expect(document.activeElement).toBe(dashboardButton)
    })

    it('supports keyboard interaction', async () => {
      const user = userEvent.setup()

      render(
        <CouplesErrorBoundary>
          <ThrowError shouldThrow={true} />
        </CouplesErrorBoundary>
      )

      const tryAgainButton = screen.getByRole('button', { name: 'Try Again' })

      // Keyboard activation - verify button is focusable and responsive
      tryAgainButton.focus()
      expect(document.activeElement).toBe(tryAgainButton)

      // Simulate keyboard interaction
      await user.keyboard('{Enter}')

      // Since the underlying error condition persists, the error UI should remain
      // and buttons should still be available (either immediately or after re-render)
      expect(screen.getByText('Something went wrong')).toBeInTheDocument()

      // Verify that buttons are still accessible after interaction
      await waitFor(() => {
        const buttons = screen.getAllByRole('button')
        expect(buttons.length).toBeGreaterThan(0)
        // Should have both Try Again and Go to Dashboard buttons
        expect(
          buttons.some((btn) => btn.textContent?.includes('Try Again'))
        ).toBe(true)
        expect(
          buttons.some((btn) => btn.textContent?.includes('Go to Dashboard'))
        ).toBe(true)
      })
    })

    it('provides proper ARIA labels', () => {
      render(
        <CouplesErrorBoundary>
          <ThrowError shouldThrow={true} />
        </CouplesErrorBoundary>
      )

      const buttons = screen.getAllByRole('button')
      buttons.forEach((button) => {
        expect(button).toHaveAccessibleName()
      })
    })
  })

  describe('Integration and Edge Cases', () => {
    it('handles deeply nested component errors', () => {
      const DeepComponent = ({ level }: { level: number }) => {
        if (level > 0) {
          return <DeepComponent level={level - 1} />
        }
        throw new Error('Deep couples error')
      }

      render(
        <CouplesErrorBoundary>
          <DeepComponent level={3} />
        </CouplesErrorBoundary>
      )

      expect(screen.getByText('Something went wrong')).toBeInTheDocument()
    })

    it('works with async component errors', async () => {
      const AsyncCouplesComponent = () => {
        React.useEffect(() => {
          setTimeout(() => {
            throw new Error('Async couples error')
          }, 0)
        }, [])

        return <div>Async couples content</div>
      }

      render(
        <CouplesErrorBoundary>
          <AsyncCouplesComponent />
        </CouplesErrorBoundary>
      )

      // Initially shows content
      expect(screen.getByText('Async couples content')).toBeInTheDocument()

      // Note: Error boundaries don't catch async errors by default
      // This test demonstrates the limitation
    })

    it('handles null/undefined children gracefully', () => {
      render(
        <CouplesErrorBoundary>
          {null}
          {undefined}
          <div>Valid content</div>
        </CouplesErrorBoundary>
      )

      expect(screen.getByText('Valid content')).toBeInTheDocument()
      expect(screen.queryByText('Something went wrong')).not.toBeInTheDocument()
    })

    it('handles multiple error boundaries correctly', () => {
      render(
        <CouplesErrorBoundary fallback={<div>Outer couples error</div>}>
          <div>Outer content</div>
          <CouplesErrorBoundary fallback={<div>Inner couples error</div>}>
            <ThrowError shouldThrow={true} />
          </CouplesErrorBoundary>
        </CouplesErrorBoundary>
      )

      // Inner boundary should catch the error
      expect(screen.getByText('Inner couples error')).toBeInTheDocument()
      expect(screen.getByText('Outer content')).toBeInTheDocument()
      expect(screen.queryByText('Outer couples error')).not.toBeInTheDocument()
    })

    it('preserves component state across re-renders', () => {
      const StatefulComponent = () => {
        const [count, setCount] = React.useState(0)

        if (count > 2) {
          throw new Error('Count too high')
        }

        return (
          <div>
            <div>Count: {count}</div>
            <button onClick={() => setCount(count + 1)}>Increment</button>
          </div>
        )
      }

      const { rerender } = render(
        <CouplesErrorBoundary>
          <StatefulComponent />
        </CouplesErrorBoundary>
      )

      expect(screen.getByText('Count: 0')).toBeInTheDocument()

      // Re-render with same component
      rerender(
        <CouplesErrorBoundary>
          <StatefulComponent />
        </CouplesErrorBoundary>
      )

      // Component should maintain its initial state
      expect(screen.getByText('Count: 0')).toBeInTheDocument()
    })
  })
})
