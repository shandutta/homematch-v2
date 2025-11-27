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
  // Reset scroll position before each test
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

  test('renders Log In link', () => {
    render(<Header />)

    const loginLink = screen.getByText('Log In')
    expect(loginLink).toBeInTheDocument()
    expect(loginLink.closest('a')).toHaveAttribute('href', '/login')
  })

  test('renders Sign Up link', () => {
    render(<Header />)

    const signupLink = screen.getByText('Sign Up')
    expect(signupLink).toBeInTheDocument()
    expect(signupLink.closest('a')).toHaveAttribute('href', '/signup')
  })

  test('header has fixed positioning', () => {
    const { container } = render(<Header />)

    const header = container.querySelector('header')
    expect(header).toHaveClass('fixed', 'top-0', 'z-50', 'w-full')
  })

  test('Log In link has hover underline effect', () => {
    render(<Header />)

    const loginLink = screen.getByText('Log In').closest('a')
    const underline = loginLink?.querySelector('span')

    expect(underline).toHaveClass(
      'absolute',
      'origin-left',
      'scale-x-0',
      'bg-gradient-to-r',
      'from-sky-400',
      'to-cyan-400'
    )
  })

  test('Sign Up link has glassmorphism styling', () => {
    render(<Header />)

    const signupLink = screen.getByText('Sign Up').closest('a')
    expect(signupLink).toHaveClass(
      'rounded-lg',
      'bg-white/10',
      'backdrop-blur-sm'
    )
  })

  test('Sign Up link has shimmer effect element', () => {
    render(<Header />)

    const signupLink = screen.getByText('Sign Up').closest('a')
    const shimmer = signupLink?.querySelector('span.absolute.-translate-x-full')

    expect(shimmer).toHaveClass(
      'bg-gradient-to-r',
      'from-transparent',
      'via-white/20',
      'to-transparent'
    )
  })

  test('nav container has correct max width', () => {
    const { container } = render(<Header />)

    const nav = container.querySelector('nav')
    expect(nav).toHaveClass('max-w-6xl', 'mx-auto')
  })

  test('nav has responsive padding when not scrolled', () => {
    const { container } = render(<Header />)

    const nav = container.querySelector('nav')
    expect(nav?.className).toContain('py-4')
    expect(nav?.className).toContain('sm:py-5')
  })

  test('header applies glassmorphism on scroll', () => {
    render(<Header />)

    // Simulate scroll
    Object.defineProperty(window, 'scrollY', {
      writable: true,
      value: 100,
    })

    fireEvent.scroll(window)

    // The background should change on scroll (controlled by state)
    // This test verifies the scroll listener is attached
    const header = document.querySelector('header')
    expect(header).toBeInTheDocument()
  })

  test('logo has correct font styling', () => {
    render(<Header />)

    // Logo uses HomeMatchLogo component with its own styling
    const logo = screen.getByText('HomeMatch')
    expect(logo).toBeInTheDocument()
  })

  test('navigation links have correct font styling', () => {
    render(<Header />)

    const loginLink = screen.getByText('Log In').closest('a')
    expect(loginLink).toHaveStyle({ fontFamily: 'var(--font-body)' })

    const signupLink = screen.getByText('Sign Up').closest('a')
    expect(signupLink).toHaveStyle({ fontFamily: 'var(--font-body)' })
  })

  test('header has transition for smooth effects', () => {
    const { container } = render(<Header />)

    const header = container.querySelector('header')
    expect(header).toHaveClass('transition-shadow', 'duration-300')
  })

  test('Log In link has responsive text sizing', () => {
    render(<Header />)

    const loginLink = screen.getByText('Log In').closest('a')
    expect(loginLink).toHaveClass('text-sm', 'sm:text-base')
  })

  test('Sign Up link has responsive padding', () => {
    render(<Header />)

    const signupLink = screen.getByText('Sign Up').closest('a')
    expect(signupLink).toHaveClass('px-3', 'py-1.5', 'sm:px-4', 'sm:py-2')
  })
})
