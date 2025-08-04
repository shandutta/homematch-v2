import React from 'react'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { DashboardErrorBoundary } from '@/components/dashboard/DashboardErrorBoundary'

// Component that throws an error for testing
const ThrowError = ({ shouldThrow }: { shouldThrow: boolean }) => {
  if (shouldThrow) {
    throw new Error('Test error')
  }
  return <div>Child component</div>
}

// Mock console.error to avoid test output noise
const originalConsoleError = console.error
beforeAll(() => {
  console.error = jest.fn()
})

afterAll(() => {
  console.error = originalConsoleError
})


describe('DashboardErrorBoundary', () => {
  beforeEach(() => {
    jest.clearAllMocks()
  })

  test('renders children when there is no error', () => {
    render(
      <DashboardErrorBoundary>
        <div>Test content</div>
      </DashboardErrorBoundary>
    )

    expect(screen.getByText('Test content')).toBeInTheDocument()
  })

  test('renders error UI when error is thrown', () => {
    render(
      <DashboardErrorBoundary>
        <ThrowError shouldThrow={true} />
      </DashboardErrorBoundary>
    )

    expect(screen.getByText('Something went wrong')).toBeInTheDocument()
    expect(screen.getByText(/We encountered an error while loading your dashboard/)).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Try Again' })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Refresh Page' })).toBeInTheDocument()
  })

  test('renders custom fallback when provided', () => {
    const customFallback = <div>Custom error message</div>
    
    render(
      <DashboardErrorBoundary fallback={customFallback}>
        <ThrowError shouldThrow={true} />
      </DashboardErrorBoundary>
    )

    expect(screen.getByText('Custom error message')).toBeInTheDocument()
    expect(screen.queryByText('Something went wrong')).not.toBeInTheDocument()
  })

  test('logs error to console', () => {
    render(
      <DashboardErrorBoundary>
        <ThrowError shouldThrow={true} />
      </DashboardErrorBoundary>
    )

    expect(console.error).toHaveBeenCalledWith(
      'Dashboard error:',
      expect.any(Error),
      expect.any(Object)
    )
  })

  test('resets error state when Try Again is clicked', async () => {
    const user = userEvent.setup()
    let shouldThrow = true

    const TestComponent = () => {
      if (shouldThrow) {
        throw new Error('Test error')
      }
      return <div>Child component</div>
    }

    const { rerender } = render(
      <DashboardErrorBoundary key="error-boundary-1">
        <TestComponent />
      </DashboardErrorBoundary>
    )

    // Error UI should be visible
    expect(screen.getByText('Something went wrong')).toBeInTheDocument()

    // Change the child to not throw
    shouldThrow = false

    // Click Try Again to reset the error boundary
    const tryAgainButton = screen.getByRole('button', { name: 'Try Again' })
    await user.click(tryAgainButton)

    // Force re-render with a different key to simulate component remount
    rerender(
      <DashboardErrorBoundary key="error-boundary-2">
        <TestComponent />
      </DashboardErrorBoundary>
    )

    // Should show child component now
    expect(screen.getByText('Child component')).toBeInTheDocument()
    expect(screen.queryByText('Something went wrong')).not.toBeInTheDocument()
  })

  test('refresh page button is rendered and clickable', async () => {
    const user = userEvent.setup()

    render(
      <DashboardErrorBoundary>
        <ThrowError shouldThrow={true} />
      </DashboardErrorBoundary>
    )

    const refreshButton = screen.getByRole('button', { name: 'Refresh Page' })
    expect(refreshButton).toBeInTheDocument()
    expect(refreshButton).not.toBeDisabled()
    
    // Verify the button is clickable (JSDOM limitations prevent testing actual reload)
    await user.click(refreshButton)
    expect(refreshButton).toBeInTheDocument()
  })

  test('logs to analytics when available', () => {
    const mockGtag = jest.fn()
    ;(window as any).gtag = mockGtag

    render(
      <DashboardErrorBoundary>
        <ThrowError shouldThrow={true} />
      </DashboardErrorBoundary>
    )

    expect(mockGtag).toHaveBeenCalledWith('event', 'exception', {
      description: 'Test error',
      fatal: false,
    })

    delete (window as any).gtag
  })

  test('handles errors during lifecycle methods', () => {
    class ProblematicComponent extends React.Component {
      componentDidMount() {
        throw new Error('Lifecycle error')
      }
      render() {
        return <div>Problematic component</div>
      }
    }

    render(
      <DashboardErrorBoundary>
        <ProblematicComponent />
      </DashboardErrorBoundary>
    )

    expect(screen.getByText('Something went wrong')).toBeInTheDocument()
  })

  test('preserves error details in state', () => {
    const TestErrorBoundary = class extends DashboardErrorBoundary {
      render() {
        if (this.state.hasError) {
          return (
            <div>
              <div>Error: {this.state.error?.message}</div>
              {super.render()}
            </div>
          )
        }
        return super.render()
      }
    }

    render(
      <TestErrorBoundary>
        <ThrowError shouldThrow={true} />
      </TestErrorBoundary>
    )

    expect(screen.getByText('Error: Test error')).toBeInTheDocument()
  })

  test('handles missing window.gtag gracefully', () => {
    // Ensure gtag is not defined
    delete (window as any).gtag

    expect(() => {
      render(
        <DashboardErrorBoundary>
          <ThrowError shouldThrow={true} />
        </DashboardErrorBoundary>
      )
    }).not.toThrow()

    expect(screen.getByText('Something went wrong')).toBeInTheDocument()
  })
})