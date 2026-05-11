import { render, screen, fireEvent } from '@testing-library/react'
import GlobalError from '@/app/global-error'

jest.mock('@/components/shared/home-match-logo', () => ({
  HomeMatchLogo: ({ size }: { size?: number }) => (
    <span data-testid="logo" data-size={size}>
      HomeMatch
    </span>
  ),
}))

describe('global-error page', () => {
  const fakeError = new Error('Fatal error')

  test('renders error heading', () => {
    render(<GlobalError error={fakeError} reset={() => {}} />)
    expect(screen.getByText(/something went wrong/i)).toBeInTheDocument()
  })

  test('renders a retry button', () => {
    const reset = jest.fn()
    render(<GlobalError error={fakeError} reset={reset} />)
    const button = screen.getByRole('button', { name: /try again/i })
    expect(button).toBeInTheDocument()
    fireEvent.click(button)
    expect(reset).toHaveBeenCalledTimes(1)
  })

  test('renders with dark background', () => {
    render(<GlobalError error={fakeError} reset={() => {}} />)
    const container = document.querySelector('.min-h-screen')
    const classes = container?.className || ''
    const hasDarkClasses =
      classes.includes('bg-') &&
      (classes.includes('[#') ||
        classes.includes('slate') ||
        classes.includes('030712'))
    expect(hasDarkClasses).toBe(true)
  })
})
