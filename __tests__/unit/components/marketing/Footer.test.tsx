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

describe('Footer', () => {
  test('renders HomeMatch brand name', () => {
    render(<Footer />)
    expect(screen.getByText('HomeMatch')).toBeInTheDocument()
  })

  test('renders Product links with correct hrefs', () => {
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

  test('renders Company links with correct hrefs', () => {
    render(<Footer />)

    expect(screen.getByText('About Us').closest('a')).toHaveAttribute(
      'href',
      '/about'
    )
    expect(screen.getByText('Contact').closest('a')).toHaveAttribute(
      'href',
      '/contact'
    )
  })

  test('renders Legal links with correct hrefs', () => {
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

  test('renders social media links with external attributes', () => {
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
  })

  test('renders "Built in the Bay Area" message', () => {
    render(<Footer />)
    expect(screen.getByText(/Built in the Bay Area/)).toBeInTheDocument()
  })

  test('renders copyright notice', () => {
    render(<Footer />)
    expect(
      screen.getByText(/© 2024 HomeMatch\. All rights reserved\./)
    ).toBeInTheDocument()
  })
})
