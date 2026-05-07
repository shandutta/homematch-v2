import { render, screen } from '@testing-library/react'
import NotFound from '@/app/not-found'

jest.mock('next/link', () => {
  // eslint-disable-next-line react/display-name
  return ({ children, href }: { children: React.ReactNode; href: string }) => (
    <a href={href}>{children}</a>
  )
})

jest.mock('@/components/shared/home-match-logo', () => ({
  HomeMatchLogo: ({ size }: { size?: number }) => (
    <span data-testid="logo" data-size={size}>
      HomeMatch
    </span>
  ),
}))

describe('not-found page', () => {
  test('renders 404 heading', () => {
    render(<NotFound />)
    expect(screen.getByText(/404/)).toBeInTheDocument()
  })

  test('renders descriptive help text', () => {
    render(<NotFound />)
    expect(
      screen.getByText(/you'?re looking for|can'?t find|doesn'?t exist/i)
    ).toBeInTheDocument()
  })

  test('renders link back to home', () => {
    render(<NotFound />)
    const link = screen.getByRole('link', { name: /home/i })
    expect(link).toBeInTheDocument()
    expect(link).toHaveAttribute('href', '/')
  })

  test('renders with dark background styling', () => {
    render(<NotFound />)
    // Verify the page uses dark background and text styling
    const container = document.querySelector('.min-h-screen')
    expect(container).toBeInTheDocument()
    // Should have dark-friendly classes (not just plain white)
    const classes = container?.className || ''
    const hasDarkClasses =
      classes.includes('bg-') &&
      (classes.includes('dark') ||
        classes.includes('[#') ||
        classes.includes('slate') ||
        classes.includes('gray-9'))
    expect(hasDarkClasses).toBe(true)
  })

  test('renders branded heading text beyond just 404', () => {
    render(<NotFound />)
    // Should have more descriptive content than just "404 - Page Not Found"
    const headings = screen.getAllByRole('heading')
    expect(headings.length).toBeGreaterThanOrEqual(2)
    // Should feel part of HomeMatch brand
    const pageContent = document.body.textContent || ''
    expect(pageContent.length).toBeGreaterThan(50)
  })
})
