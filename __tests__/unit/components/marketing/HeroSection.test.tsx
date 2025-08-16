import { render, screen } from '@testing-library/react'
// import userEvent from '@testing-library/user-event'
import { HeroSection } from '@/components/marketing/HeroSection'

// Framer-motion is mocked globally in jest.setup.ts

// Mock Next.js Link
jest.mock('next/link', () => ({
  __esModule: true,
  default: ({ children, href, ...props }: any) => (
    <a href={href} {...props}>
      {children}
    </a>
  ),
}))

// Mock child components
jest.mock('@/components/marketing/PhoneMockup', () => ({
  PhoneMockup: () => <div data-testid="phone-mockup">Phone Mockup</div>,
}))

jest.mock('@/components/marketing/ParallaxStarsCanvas', () => ({
  ParallaxStarsCanvas: ({ className }: any) => (
    <div data-testid="parallax-stars" className={className}>
      Stars
    </div>
  ),
}))

describe('HeroSection', () => {
  test('renders hero section with all content', () => {
    render(<HeroSection />)

    // Check main heading by role
    const heading = screen.getByRole('heading', { level: 1 })
    expect(heading).toBeInTheDocument()
    expect(heading.textContent).toContain('Swipe.')
    expect(heading.textContent).toContain('Match.')
    expect(heading.textContent).toContain('Move In.')

    // Check description
    expect(
      screen.getByText(
        /House hunting just became your favorite couples activity/
      )
    ).toBeInTheDocument()

    // Check CTAs
    expect(screen.getByText('Get started')).toBeInTheDocument()
    expect(screen.getByText('Log in')).toBeInTheDocument()

    // Check mockup components
    expect(screen.getByTestId('phone-mockup')).toBeInTheDocument()
    expect(screen.getByTestId('parallax-stars')).toBeInTheDocument()
  })

  test('renders with correct data-testid', () => {
    render(<HeroSection />)
    expect(screen.getByTestId('hero')).toBeInTheDocument()
  })

  test('primary CTA links to signup', () => {
    render(<HeroSection />)
    const primaryCTA = screen.getByText('Get started').closest('a')
    expect(primaryCTA).toHaveAttribute('href', '/signup')
    expect(primaryCTA).toHaveAttribute('data-cta', 'dopamine-hero')
  })

  test('secondary CTA links to login', () => {
    render(<HeroSection />)
    const secondaryCTA = screen.getByText('Log in').closest('a')
    expect(secondaryCTA).toHaveAttribute('href', '/login')
  })

  test('renders gradient background', () => {
    render(<HeroSection />)

    // Check for gradient background div with Tailwind class
    const gradientDiv = screen
      .getByTestId('hero')
      .querySelector('.bg-gradient-marketing-primary')
    expect(gradientDiv).toBeInTheDocument()
    expect(gradientDiv).toHaveClass('bg-gradient-marketing-primary')
  })

  test('renders vignette overlay', () => {
    render(<HeroSection />)

    // Check for vignette overlay
    const vignetteDiv = screen
      .getByTestId('hero')
      .querySelector('div[style*="radial-gradient"]')
    expect(vignetteDiv).toBeInTheDocument()
  })

  test('button variants are applied correctly', () => {
    render(<HeroSection />)

    const primaryButton = screen.getByText('Get started').closest('a')
    const secondaryButton = screen.getByText('Log in').closest('a')

    // Check button classes - responsive design tokens
    expect(primaryButton).toHaveClass('sm:px-8', 'sm:py-4')
    expect(secondaryButton).toHaveClass('border-2', 'sm:px-8', 'sm:py-4')
  })

  test('responsive grid layout is applied', () => {
    render(<HeroSection />)

    const gridContainer = screen.getByTestId('hero').querySelector('.grid')
    expect(gridContainer).toHaveClass('lg:grid-cols-2', 'lg:items-center')
  })

  test('text content has correct styling classes', () => {
    render(<HeroSection />)

    // Find the h1 containing all the heading text
    const heading = screen.getByRole('heading', { level: 1 })
    expect(heading).toHaveClass(
      'text-4xl',
      'sm:text-5xl',
      'md:text-6xl',
      'lg:text-7xl',
      'xl:text-8xl',
      'text-white'
    )

    const description = screen.getByText(/House hunting/)
    expect(description).toHaveClass(
      'text-base',
      'sm:text-lg',
      'md:text-xl',
      'text-white/80'
    )
  })

  test('CTA container has responsive flex layout', () => {
    render(<HeroSection />)

    const ctaContainer = screen
      .getByText('Get started')
      .closest('a')?.parentElement
    expect(ctaContainer).toHaveClass('flex', 'flex-col', 'sm:flex-row')
  })

  test('accessibility attributes are present', () => {
    render(<HeroSection />)

    const primaryCTA = screen.getByText('Get started').closest('a')
    expect(primaryCTA).toHaveAttribute('aria-label', 'Start Swiping')

    const particlesHost = primaryCTA?.querySelector('#particles-host')
    expect(particlesHost).toHaveAttribute('aria-hidden', 'true')
  })

  test('script tag for particle animation is included', () => {
    render(<HeroSection />)

    const scriptContent = document.querySelector('script')?.innerHTML
    expect(scriptContent).toContain('burst')
    expect(scriptContent).toContain('particles-host')
    expect(scriptContent).toContain('mousedown')
    expect(scriptContent).toContain('touchstart')
  })
})
