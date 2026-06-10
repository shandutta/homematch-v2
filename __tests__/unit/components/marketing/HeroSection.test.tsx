import { render, screen } from '@testing-library/react'
import { HeroSection } from '@/components/marketing/HeroSection'

// Mock framer-motion
jest.mock('framer-motion')

// Mock Next.js Link
jest.mock('next/link', () => ({
  __esModule: true,
  default: ({ children, href, ...props }: JSX.IntrinsicElements['a']) => (
    <a href={href} {...props}>
      {children}
    </a>
  ),
}))

// Mock Next.js Image
jest.mock('next/image', () => ({
  __esModule: true,
  default: ({
    src,
    alt,
    priority,
    fill,
    ...props
  }: JSX.IntrinsicElements['img'] & {
    priority?: boolean
    fill?: boolean
  }) => (
    // eslint-disable-next-line @next/next/no-img-element
    <img
      src={src}
      alt={alt}
      data-priority={priority ? 'true' : undefined}
      data-fill={fill ? 'true' : undefined}
      {...props}
    />
  ),
}))

// Mock child components
jest.mock('@/components/marketing/HeroMotionEnhancer', () => ({
  HeroMotionEnhancer: () => null,
}))

jest.mock('@/components/marketing/MarketingPreviewCardStatic', () => ({
  MarketingPreviewCardStatic: () => (
    <div data-testid="marketing-preview-card">
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img alt="Sample property interior" src="/test.jpg" />
      <span>Example Listing</span>
      <span>123 Sample Street, Anytown, USA</span>
      <span>3 beds</span>
      <button>Like</button>
      <span>Built for households</span>
      <span>See nearby spots</span>
      <span>Real listings, quick swipes</span>
    </div>
  ),
}))

// Mock lucide-react icons
jest.mock('lucide-react', () => ({
  Heart: () => <svg data-testid="heart-icon" />,
}))

describe('HeroSection', () => {
  beforeEach(() => {
    Object.defineProperty(window, 'matchMedia', {
      writable: true,
      value: jest.fn().mockImplementation((query) => ({
        matches: false,
        media: query,
        onchange: null,
        addListener: jest.fn(),
        removeListener: jest.fn(),
        addEventListener: jest.fn(),
        removeEventListener: jest.fn(),
        dispatchEvent: jest.fn(),
      })),
    })
  })

  test('renders main heading', () => {
    render(<HeroSection />)

    const heading = screen.getByRole('heading', { level: 1 })
    expect(heading).toBeInTheDocument()
    // TextReveal adds non-breaking spaces between words
    expect(heading.textContent?.replace(/\u00A0/g, ' ')).toContain(
      'Find a home that works for you.'
    )
  })

  test('renders description', () => {
    render(<HeroSection />)
    expect(
      screen.getByText(/Swipe on homes and match likes with your partner/i)
    ).toBeInTheDocument()
  })

  test('renders primary CTA linking to signup', () => {
    render(<HeroSection />)

    const primaryCTA = screen.getByText('Get Started').closest('a')
    expect(primaryCTA).toHaveAttribute('href', '/signup')
  })

  test('renders secondary CTA linking to login', () => {
    render(<HeroSection />)

    const secondaryCTA = screen.getByText('Sign in').closest('a')
    expect(secondaryCTA).toHaveAttribute('href', '/login')
  })

  test('renders hero test id', () => {
    render(<HeroSection />)
    expect(screen.getByTestId('hero')).toBeInTheDocument()
  })

  test('renders marketing preview card', () => {
    render(<HeroSection />)
    expect(screen.getByTestId('marketing-preview-card')).toBeInTheDocument()
  })

  test('renders preview card content', () => {
    render(<HeroSection />)

    expect(screen.getByText('Built for households')).toBeInTheDocument()
    expect(screen.getByText('See nearby spots')).toBeInTheDocument()
    expect(screen.getByText(/Real listings, quick swipes/i)).toBeInTheDocument()
  })

  test('primary CTA has accessibility attributes', () => {
    render(<HeroSection />)

    const primaryCTA = screen.getByText('Get Started').closest('a')
    expect(primaryCTA).toHaveAttribute('data-testid', 'primary-cta')
  })
})
