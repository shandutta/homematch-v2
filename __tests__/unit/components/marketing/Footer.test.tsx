import { render, screen } from '@testing-library/react'
import { Footer } from '@/components/marketing/Footer'

// Mock framer-motion
jest.mock('framer-motion', () => ({
  motion: {
    div: ({ children, ...props }: any) => <div {...props}>{children}</div>,
    a: ({ children, ...props }: any) => <a {...props}>{children}</a>,
    h3: ({ children, ...props }: any) => <h3 {...props}>{children}</h3>,
    h4: ({ children, ...props }: any) => <h4 {...props}>{children}</h4>,
    li: ({ children, ...props }: any) => <li {...props}>{children}</li>,
    span: ({ children, ...props }: any) => <span {...props}>{children}</span>,
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

// Mock lucide-react Heart icon
jest.mock('lucide-react', () => ({
  Heart: ({ className }: any) => (
    <svg data-testid="heart-icon" className={className} />
  ),
}))

describe('Footer', () => {
  test('renders HomeMatch brand name', () => {
    render(<Footer />)

    expect(screen.getByText('HomeMatch')).toBeInTheDocument()
  })

  test('renders Product links section', () => {
    render(<Footer />)

    expect(screen.getByText('Product')).toBeInTheDocument()
    expect(screen.getByText('Get Started')).toBeInTheDocument()
    expect(screen.getByText('Sign In')).toBeInTheDocument()
    expect(screen.getByText('Features')).toBeInTheDocument()
    expect(screen.getByText('How It Works')).toBeInTheDocument()
  })

  test('renders Company links section', () => {
    render(<Footer />)

    expect(screen.getByText('Company')).toBeInTheDocument()
    expect(screen.getByText('About Us')).toBeInTheDocument()
    expect(screen.getByText('Contact')).toBeInTheDocument()
    expect(screen.getByText('Blog')).toBeInTheDocument()
    expect(screen.getByText('Careers')).toBeInTheDocument()
  })

  test('renders Legal links section', () => {
    render(<Footer />)

    expect(screen.getByText('Legal')).toBeInTheDocument()
    expect(screen.getByText('Privacy Policy')).toBeInTheDocument()
    expect(screen.getByText('Terms of Service')).toBeInTheDocument()
    expect(screen.getByText('Cookie Policy')).toBeInTheDocument()
  })

  test('Product links have correct hrefs', () => {
    render(<Footer />)

    expect(screen.getByText('Get Started').closest('a')).toHaveAttribute(
      'href',
      '/signup'
    )
    expect(screen.getByText('Sign In').closest('a')).toHaveAttribute(
      'href',
      '/login'
    )
    expect(screen.getByText('Features').closest('a')).toHaveAttribute(
      'href',
      '#features'
    )
    expect(screen.getByText('How It Works').closest('a')).toHaveAttribute(
      'href',
      '#how-it-works'
    )
  })

  test('Company links have correct hrefs', () => {
    render(<Footer />)

    expect(screen.getByText('About Us').closest('a')).toHaveAttribute(
      'href',
      '/about'
    )
    expect(screen.getByText('Contact').closest('a')).toHaveAttribute(
      'href',
      '/contact'
    )
    expect(screen.getByText('Blog').closest('a')).toHaveAttribute(
      'href',
      '/blog'
    )
    expect(screen.getByText('Careers').closest('a')).toHaveAttribute(
      'href',
      '/careers'
    )
  })

  test('Legal links have correct hrefs', () => {
    render(<Footer />)

    expect(screen.getByText('Privacy Policy').closest('a')).toHaveAttribute(
      'href',
      '/privacy'
    )
    expect(screen.getByText('Terms of Service').closest('a')).toHaveAttribute(
      'href',
      '/terms'
    )
    expect(screen.getByText('Cookie Policy').closest('a')).toHaveAttribute(
      'href',
      '/cookies'
    )
  })

  test('renders social media links', () => {
    render(<Footer />)

    const twitterLink = screen.getByLabelText('X (formerly Twitter)')
    expect(twitterLink).toHaveAttribute('href', 'https://twitter.com/homematch')
    expect(twitterLink).toHaveAttribute('target', '_blank')
    expect(twitterLink).toHaveAttribute('rel', 'noopener noreferrer')

    const instagramLink = screen.getByLabelText('Instagram')
    expect(instagramLink).toHaveAttribute(
      'href',
      'https://instagram.com/homematch'
    )
    expect(instagramLink).toHaveAttribute('target', '_blank')
    expect(instagramLink).toHaveAttribute('rel', 'noopener noreferrer')
  })

  test('renders "Built with love" message with heart icon', () => {
    render(<Footer />)

    // Text is split by the heart icon, so use a more flexible matcher
    expect(screen.getByText(/Built with/)).toBeInTheDocument()
    expect(screen.getByText(/in the Bay Area/)).toBeInTheDocument()
    expect(screen.getByTestId('heart-icon')).toBeInTheDocument()
  })

  test('renders copyright notice', () => {
    render(<Footer />)

    expect(
      screen.getByText(/© 2024 HomeMatch\. All rights reserved\./)
    ).toBeInTheDocument()
  })

  test('footer has correct background gradient class', () => {
    const { container } = render(<Footer />)

    const footer = container.querySelector('footer')
    expect(footer).toHaveClass('bg-gradient-marketing-primary')
  })

  test('footer has correct padding', () => {
    const { container } = render(<Footer />)

    const footer = container.querySelector('footer')
    expect(footer).toHaveClass('px-4', 'py-6', 'sm:px-6', 'sm:py-8')
  })

  test('renders responsive grid layout', () => {
    const { container } = render(<Footer />)

    const grid = container.querySelector('.grid')
    expect(grid).toHaveClass('grid-cols-2', 'sm:grid-cols-2', 'lg:grid-cols-4')
  })

  test('brand section has heading with correct font', () => {
    render(<Footer />)

    const brandHeading = screen.getByText('HomeMatch')
    expect(brandHeading).toHaveStyle({ fontFamily: 'var(--font-heading)' })
  })
})
