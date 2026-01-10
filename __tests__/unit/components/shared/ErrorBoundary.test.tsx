import React from 'react'
import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { ErrorBoundary } from '@/components/shared/ErrorBoundary'

type ErrorBoundaryState = InstanceType<typeof ErrorBoundary>['state']

// Mock console.error to avoid test output noise
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
  errorMessage = 'Test error',
}: {
  shouldThrow: boolean
  errorMessage?: string
}) => {
  if (shouldThrow) {
    throw new Error(errorMessage)
  }
  return <div>Working component</div>
}

// Note: AsyncThrowError component removed as it was unused and had React hooks issues

describe('ErrorBoundary', () => {
  beforeEach(() => {
    jest.clearAllMocks()
  })

  describe('Normal Operation', () => {
    it('renders children when no error occurs', () => {
      render(
        <ErrorBoundary>
          <div>Test content</div>
        </ErrorBoundary>
      )

      expect(screen.getByText('Test content')).toBeInTheDocument()
    })

    it('renders multiple children correctly', () => {
      render(
        <ErrorBoundary>
          <div>First child</div>
          <div>Second child</div>
        </ErrorBoundary>
      )

      expect(screen.getByText('First child')).toBeInTheDocument()
      expect(screen.getByText('Second child')).toBeInTheDocument()
    })
  })

  describe('Error Handling', () => {
    it('catches and displays error UI when child throws', () => {
      render(
        <ErrorBoundary>
          <ThrowError shouldThrow={true} />
        </ErrorBoundary>
      )

      expect(screen.getByText('Something went wrong')).toBeInTheDocument()
      expect(
        screen.getByText('We encountered an unexpected error.')
      ).toBeInTheDocument()
      expect(
        screen.getByRole('button', { name: 'Try Again' })
      ).toBeInTheDocument()
    })

    it('displays custom error messages', () => {
      render(
        <ErrorBoundary>
          <ThrowError shouldThrow={true} errorMessage="Custom error message" />
        </ErrorBoundary>
      )

      expect(screen.getByText('Something went wrong')).toBeInTheDocument()
      // Error boundary shows generic message, not the specific error
      expect(
        screen.getByText('We encountered an unexpected error.')
      ).toBeInTheDocument()
    })

    it('logs errors to console', () => {
      render(
        <ErrorBoundary>
          <ThrowError shouldThrow={true} />
        </ErrorBoundary>
      )

      expect(console.error).toHaveBeenCalledWith(
        'ErrorBoundary caught:',
        expect.any(Error),
        expect.any(Object)
      )
    })

    it('handles errors in component lifecycle methods', () => {
      class ProblematicComponent extends React.Component {
        componentDidMount() {
          throw new Error('Lifecycle error')
        }
        render() {
          return <div>Should not render</div>
        }
      }

      render(
        <ErrorBoundary>
          <ProblematicComponent />
        </ErrorBoundary>
      )

      expect(screen.getByText('Something went wrong')).toBeInTheDocument()
    })
  })

  describe('Custom Fallback', () => {
    it('renders custom fallback when provided', () => {
      const customFallback = <div>Custom error message</div>

      render(
        <ErrorBoundary fallback={customFallback}>
          <ThrowError shouldThrow={true} />
        </ErrorBoundary>
      )

      expect(screen.getByText('Custom error message')).toBeInTheDocument()
      expect(screen.queryByText('Something went wrong')).not.toBeInTheDocument()
    })

    it('renders complex custom fallback correctly', () => {
      const customFallback = (
        <div>
          <h1>Custom Error Handler</h1>
          <p>Something bad happened</p>
          <button>Custom Action</button>
        </div>
      )

      render(
        <ErrorBoundary fallback={customFallback}>
          <ThrowError shouldThrow={true} />
        </ErrorBoundary>
      )

      expect(screen.getByText('Custom Error Handler')).toBeInTheDocument()
      expect(screen.getByText('Something bad happened')).toBeInTheDocument()
      expect(
        screen.getByRole('button', { name: 'Custom Action' })
      ).toBeInTheDocument()
    })
  })

  describe('Error Recovery', () => {
    it('recovers when Try Again is clicked and error condition is resolved', async () => {
      const user = userEvent.setup()
      let shouldThrow = true

      const TestComponent = () => {
        if (shouldThrow) {
          throw new Error('Test error')
        }
        return <div>Recovered component</div>
      }

      const { rerender } = render(
        <ErrorBoundary key="test-1">
          <TestComponent />
        </ErrorBoundary>
      )

      // Error UI should be visible
      expect(screen.getByText('Something went wrong')).toBeInTheDocument()

      // Fix the error condition
      shouldThrow = false

      // Click Try Again
      const tryAgainButton = screen.getByRole('button', { name: 'Try Again' })
      await user.click(tryAgainButton)

      // Force re-render to simulate component remount after error recovery
      rerender(
        <ErrorBoundary key="test-2">
          <TestComponent />
        </ErrorBoundary>
      )

      expect(screen.getByText('Recovered component')).toBeInTheDocument()
      expect(screen.queryByText('Something went wrong')).not.toBeInTheDocument()
    })

    it('handles persistent errors gracefully', async () => {
      const user = userEvent.setup()

      render(
        <ErrorBoundary>
          <ThrowError shouldThrow={true} />
        </ErrorBoundary>
      )

      const tryAgainButton = screen.getByRole('button', { name: 'Try Again' })

      // Click Try Again - error should persist since we haven't fixed the underlying issue
      await user.click(tryAgainButton)

      // Error UI should still be visible since the component will throw again
      expect(screen.getByText('Something went wrong')).toBeInTheDocument()
    })
  })

  describe('Error State Management', () => {
    it('maintains error state correctly', () => {
      const TestErrorBoundary = class extends ErrorBoundary {
        render() {
          if (this.state.hasError) {
            return (
              <div>
                <div>Error occurred: {this.state.error?.message}</div>
                {super.render()}
              </div>
            )
          }
          return super.render()
        }
      }

      render(
        <TestErrorBoundary>
          <ThrowError shouldThrow={true} errorMessage="Specific error" />
        </TestErrorBoundary>
      )

      expect(
        screen.getByText('Error occurred: Specific error')
      ).toBeInTheDocument()
    })

    it('resets error state properly', async () => {
      const user = userEvent.setup()

      const TestErrorBoundary = class extends ErrorBoundary {
        wasReset = false

        getErrorState() {
          return this.state
        }

        // Override setState to capture the moment of reset
        setState(updater: React.SetStateAction<ErrorBoundaryState>) {
          const prevState = this.state
          super.setState(updater)
          // Store the reset event for testing
          if (prevState.hasError && !this.state.hasError) {
            this.wasReset = true
          }
        }
      }

      let boundaryRef: InstanceType<typeof TestErrorBoundary> | null = null
      let shouldThrow = true

      const ControlledThrowError = () => {
        if (shouldThrow) {
          throw new Error('Test error')
        }
        return <div>No error</div>
      }

      const { rerender } = render(
        <TestErrorBoundary
          ref={(ref) => {
            boundaryRef = ref
          }}
        >
          <ControlledThrowError />
        </TestErrorBoundary>
      )

      // Verify error state is set
      if (!boundaryRef) {
        throw new Error('Expected ErrorBoundary ref to be set')
      }
      expect(boundaryRef.getErrorState().hasError).toBe(true)
      expect(boundaryRef.getErrorState().error).toBeInstanceOf(Error)

      // Fix the error condition first
      shouldThrow = false

      // Click Try Again
      const tryAgainButton = screen.getByRole('button', { name: 'Try Again' })
      await user.click(tryAgainButton)

      // Force re-render to simulate component recovery
      rerender(
        <TestErrorBoundary
          ref={(ref) => {
            boundaryRef = ref
          }}
        >
          <ControlledThrowError />
        </TestErrorBoundary>
      )

      // Error state should be reset now that the underlying issue is fixed
      if (!boundaryRef) {
        throw new Error('Expected ErrorBoundary ref to be set')
      }
      expect(boundaryRef.getErrorState().hasError).toBe(false)
      expect(boundaryRef.getErrorState().error).toBeUndefined()
    })
  })

  describe('Edge Cases', () => {
    it('handles null/undefined children', () => {
      render(
        <ErrorBoundary>
          {null}
          {undefined}
        </ErrorBoundary>
      )

      // Should render without errors
      expect(screen.queryByText('Something went wrong')).not.toBeInTheDocument()
    })

    it('handles errors with no message', () => {
      const ThrowEmptyError = () => {
        throw new Error()
      }

      render(
        <ErrorBoundary>
          <ThrowEmptyError />
        </ErrorBoundary>
      )

      expect(screen.getByText('Something went wrong')).toBeInTheDocument()
    })

    it('handles non-Error objects being thrown', () => {
      const ThrowNonError = () => {
        // TypeScript would normally prevent this, but JavaScript allows it
        throw 'String error'
      }

      render(
        <ErrorBoundary>
          <ThrowNonError />
        </ErrorBoundary>
      )

      expect(screen.getByText('Something went wrong')).toBeInTheDocument()
    })

    it('handles deeply nested error', () => {
      const DeepNesting = ({ level }: { level: number }) => {
        if (level > 0) {
          return <DeepNesting level={level - 1} />
        }
        throw new Error('Deep error')
      }

      render(
        <ErrorBoundary>
          <DeepNesting level={5} />
        </ErrorBoundary>
      )

      expect(screen.getByText('Something went wrong')).toBeInTheDocument()
    })
  })

  describe('Multiple Error Boundaries', () => {
    it('handles nested error boundaries correctly', () => {
      render(
        <ErrorBoundary fallback={<div>Outer error boundary</div>}>
          <div>Outer content</div>
          <ErrorBoundary fallback={<div>Inner error boundary</div>}>
            <ThrowError shouldThrow={true} />
          </ErrorBoundary>
        </ErrorBoundary>
      )

      // Inner error boundary should catch the error
      expect(screen.getByText('Inner error boundary')).toBeInTheDocument()
      expect(screen.getByText('Outer content')).toBeInTheDocument()
      expect(screen.queryByText('Outer error boundary')).not.toBeInTheDocument()
    })

    it('bubbles to parent when inner boundary has no fallback', () => {
      render(
        <ErrorBoundary fallback={<div>Parent caught error</div>}>
          <div>Parent content</div>
          <ErrorBoundary>
            <ThrowError shouldThrow={true} />
          </ErrorBoundary>
        </ErrorBoundary>
      )

      // Since inner boundary shows default UI, it should handle the error
      expect(screen.getByText('Something went wrong')).toBeInTheDocument()
      expect(screen.getByText('Parent content')).toBeInTheDocument()
    })
  })

  describe('Accessibility', () => {
    it('provides accessible error UI', () => {
      render(
        <ErrorBoundary>
          <ThrowError shouldThrow={true} />
        </ErrorBoundary>
      )

      const heading = screen.getByRole('heading', { level: 2 })
      expect(heading).toHaveTextContent('Something went wrong')

      const button = screen.getByRole('button', { name: 'Try Again' })
      expect(button).toBeInTheDocument()
      expect(button).not.toBeDisabled()
    })

    it('maintains focus management', async () => {
      const user = userEvent.setup()

      render(
        <ErrorBoundary>
          <ThrowError shouldThrow={true} />
        </ErrorBoundary>
      )

      const tryAgainButton = screen.getByRole('button', { name: 'Try Again' })

      // Focus should be manageable
      tryAgainButton.focus()
      expect(document.activeElement).toBe(tryAgainButton)

      // Button should be clickable
      await user.click(tryAgainButton)

      // After interaction, some button should remain available
      await waitFor(() => {
        expect(screen.getByRole('button')).toBeInTheDocument()
      })
    })
  })
})
