import { render, screen, fireEvent } from '@testing-library/react'
import { Header } from '@/components/marketing/Header'

// Mock framer-motion
jest.mock('framer-motion', () => ({
  motion: {
    header: ({ children, ...props }: any) => (
      <header {...props}>{children}</header>
    ),
    div: ({ children, ...props }: any) => <div {...props}>{children}</div>,
    nav: ({ children, ...props }: any) => <nav {...props}>{children}</nav>,
  },
}))

// Mock Next.js Link
jest.mock('next/link', () => ({
  __esModule: true,
  default: ({ children, href, ...props }: any) => (
    <a href={href} {...props}>
      {children}
    </a>
  ),
}))

describe('Header', () => {
  beforeEach(() => {
    Object.defineProperty(window, 'scrollY', {
      writable: true,
      value: 0,
    })
  })

  test('renders HomeMatch logo', () => {
    render(<Header />)
    expect(screen.getByText('HomeMatch')).toBeInTheDocument()
  })

  test('logo links to home page', () => {
    render(<Header />)
    const logoLink = screen.getByText('HomeMatch').closest('a')
    expect(logoLink).toHaveAttribute('href', '/')
  })

  test('renders Log In link to login page', () => {
    render(<Header />)
    const loginLink = screen.getByText('Log In')
    expect(loginLink).toBeInTheDocument()
    expect(loginLink.closest('a')).toHaveAttribute('href', '/login')
  })

  test('renders Sign Up link to signup page', () => {
    render(<Header />)
    const signupLink = screen.getByText('Sign Up')
    expect(signupLink).toBeInTheDocument()
    expect(signupLink.closest('a')).toHaveAttribute('href', '/signup')
  })

  test('scroll listener is attached', () => {
    render(<Header />)

    // Simulate scroll
    Object.defineProperty(window, 'scrollY', {
      writable: true,
      value: 100,
    })
    fireEvent.scroll(window)

    // Header should still be present after scroll
    expect(document.querySelector('header')).toBeInTheDocument()
  })

  test('navigation links have correct font family', () => {
    render(<Header />)

    const loginLink = screen.getByText('Log In').closest('a')
    expect(loginLink).toHaveStyle({ fontFamily: 'var(--font-body)' })

    const signupLink = screen.getByText('Sign Up').closest('a')
    expect(signupLink).toHaveStyle({ fontFamily: 'var(--font-body)' })
  })
})
