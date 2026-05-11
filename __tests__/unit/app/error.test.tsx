import { render, screen, fireEvent } from '@testing-library/react'
import Error from '@/app/error'

jest.mock('@/components/shared/home-match-logo', () => ({
  HomeMatchLogo: ({ size }: { size?: number }) => (
    <span data-testid="logo" data-size={size}>
      HomeMatch
    </span>
  ),
}))

describe('error page', () => {
  const fakeError = new Error('Test error')

  test('renders error heading', () => {
    render(<Error error={fakeError} reset={() => {}} />)
    expect(
      screen.getByRole('heading', { name: /something went wrong/i })
    ).toBeInTheDocument()
  })

  test('renders a retry button', () => {
    const reset = jest.fn()
    render(<Error error={fakeError} reset={reset} />)
    const button = screen.getByRole('button', { name: /try again/i })
    expect(button).toBeInTheDocument()
    fireEvent.click(button)
    expect(reset).toHaveBeenCalledTimes(1)
  })

  test('renders with dark background', () => {
    render(<Error error={fakeError} reset={() => {}} />)
    const container = document.querySelector('.min-h-screen')
    const classes = container?.className || ''
    const hasDarkClasses =
      classes.includes('bg-') &&
      (classes.includes('[#') ||
        classes.includes('slate') ||
        classes.includes('030712'))
    expect(hasDarkClasses).toBe(true)
  })

  test('renders descriptive help text', () => {
    render(<Error error={fakeError} reset={() => {}} />)
    const text = document.body.textContent || ''
    expect(text.length).toBeGreaterThan(80)
    expect(text).toMatch(/try|refresh|reload/i)
  })

  test('renders HomeMatch logo', () => {
    render(<Error error={fakeError} reset={() => {}} />)
    expect(screen.getByTestId('logo')).toBeInTheDocument()
  })
})
