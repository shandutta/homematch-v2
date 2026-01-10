import { render, screen } from '@testing-library/react'
import { HeroSection } from '@/components/marketing/HeroSection'

// Mock framer-motion
jest.mock('framer-motion', () => ({
  motion: {
    div: ({ children, ...props }: JSX.IntrinsicElements['div']) => (
      <div {...props}>{children}</div>
    ),
    h1: ({ children, ...props }: JSX.IntrinsicElements['h1']) => (
      <h1 {...props}>{children}</h1>
    ),
    p: ({ children, ...props }: JSX.IntrinsicElements['p']) => (
      <p {...props}>{children}</p>
    ),
    section: ({ children, ...props }: JSX.IntrinsicElements['section']) => (
      <section {...props}>{children}</section>
    ),
    span: ({ children, ...props }: JSX.IntrinsicElements['span']) => (
      <span {...props}>{children}</span>
    ),
    button: ({ children, ...props }: JSX.IntrinsicElements['button']) => (
      <button {...props}>{children}</button>
    ),
  },
  useScroll: () => ({ scrollYProgress: { get: () => 0 } }),
  useTransform: () => ({ get: () => 0 }),
  useMotionValue: () => ({ set: jest.fn(), get: () => 0 }),
  useSpring: <T,>(value: T) => value,
}))

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
      <span>Listing · Lake Merritt</span>
      <span>1200 Lakeview Dr, Oakland, CA 94610</span>
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
      'Find a home that works for everyone.'
    )
  })

  test('renders description', () => {
    render(<HeroSection />)
    expect(
      screen.getByText(
        /Swipe through real listings, save the ones your household likes/i
      )
    ).toBeInTheDocument()
  })

  test('renders primary CTA linking to signup', () => {
    render(<HeroSection />)

    const primaryCTA = screen.getByText('Start swiping').closest('a')
    expect(primaryCTA).toHaveAttribute('href', '/signup')
  })

  test('renders secondary CTA linking to login', () => {
    render(<HeroSection />)

    const secondaryCTA = screen.getByText('Resume your search').closest('a')
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

    const primaryCTA = screen.getByText('Start swiping').closest('a')
    expect(primaryCTA).toHaveAttribute(
      'aria-label',
      'Start swiping with HomeMatch'
    )
    expect(primaryCTA).toHaveAttribute('data-testid', 'primary-cta')
  })
})
