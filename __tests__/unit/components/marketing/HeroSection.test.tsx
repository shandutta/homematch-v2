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
    expect(heading.textContent).toContain('Find the home you both love.')

    // Check description
    expect(
      screen.getByText(/Swipe through real listings together/i)
    ).toBeInTheDocument()

    // Check CTAs
    expect(screen.getByText('Start matching')).toBeInTheDocument()
    expect(screen.getByText('Resume your search')).toBeInTheDocument()

    // Preview highlight copy
    expect(screen.getByText('Built for couples')).toBeInTheDocument()
    expect(screen.getByText('See nearby spots')).toBeInTheDocument()
    expect(screen.getByText(/Real listings, quick swipes/i)).toBeInTheDocument()

    // Check mockup components
    expect(screen.getByTestId('parallax-stars')).toBeInTheDocument()
  })

  test('renders with correct data-testid', () => {
    render(<HeroSection />)
    expect(screen.getByTestId('hero')).toBeInTheDocument()
  })

  test('primary CTA links to signup', () => {
    render(<HeroSection />)
    const primaryCTA = screen.getByText('Start matching').closest('a')
    expect(primaryCTA).toHaveAttribute('href', '/signup')
  })

  test('secondary CTA links to login', () => {
    render(<HeroSection />)
    const secondaryCTA = screen.getByText('Resume your search').closest('a')
    expect(secondaryCTA).toHaveAttribute('href', '/login')
  })

  test('renders gradient background', () => {
    render(<HeroSection />)

    // Check for gradient background layer
    const gradientDiv = screen
      .getByTestId('hero')
      .querySelector('[class*="bg-gradient-to-b from-white/10"]')
    expect(gradientDiv).toBeInTheDocument()
  })

  test('renders vignette overlay', () => {
    render(<HeroSection />)

    const overlayWrapper = screen
      .getByTestId('hero')
      .querySelector('.pointer-events-none')

    const vignetteDiv = Array.from(overlayWrapper?.children ?? []).find(
      (child) =>
        (child as HTMLElement).className.includes(
          'bg-[radial-gradient(circle_at_50%_120%'
        )
    )

    expect(vignetteDiv).toBeTruthy()
  })

  test('button variants are applied correctly', () => {
    render(<HeroSection />)

    const primaryButton = screen.getByText('Start matching').closest('a')
    const secondaryButton = screen.getByText('Resume your search').closest('a')

    expect(primaryButton).toHaveClass('rounded-full', 'px-9', 'py-7')
    expect(secondaryButton).toHaveClass('border-white/40')
    expect(secondaryButton).toHaveClass('bg-white/5')
    expect(secondaryButton).toHaveClass('hover:bg-white/10')
    expect(secondaryButton).toHaveClass('text-white')
  })

  test('responsive grid layout is applied', () => {
    render(<HeroSection />)

    const gridContainer = screen.getByTestId('hero').querySelector('.grid')
    expect(gridContainer).toHaveClass(
      'lg:grid-cols-[1.05fr,0.95fr]',
      'lg:items-center'
    )
  })

  test('text content has correct styling classes', () => {
    render(<HeroSection />)

    // Find the h1 containing all the heading text
    const heading = screen.getByRole('heading', { level: 1 })
    expect(heading).toHaveClass(
      'text-4xl',
      'font-black',
      'leading-[1.05]',
      'sm:text-5xl',
      'md:text-6xl',
      'lg:text-7xl'
    )

    const description = screen.getByText(
      /Swipe through real listings together/i
    )
    expect(description).toHaveClass(
      'max-w-2xl',
      'text-lg',
      'leading-relaxed',
      'text-white/80',
      'sm:text-xl'
    )
  })

  test('CTA container has responsive flex layout', () => {
    render(<HeroSection />)

    const ctaContainer = screen
      .getByText('Start matching')
      .closest('a')?.parentElement
    expect(ctaContainer).toHaveClass(
      'flex',
      'flex-col',
      'sm:flex-row',
      'sm:items-center',
      'gap-3',
      'sm:gap-3'
    )
  })

  test('accessibility attributes are present', () => {
    render(<HeroSection />)

    const primaryCTA = screen.getByText('Start matching').closest('a')
    expect(primaryCTA).toHaveAttribute('href', '/signup')
    expect(primaryCTA).toHaveAttribute(
      'aria-label',
      'Start matching with HomeMatch'
    )
    expect(primaryCTA).toHaveAttribute('data-testid', 'primary-cta')
  })

  test('renders preview card details', () => {
    render(<HeroSection />)

    expect(screen.getByAltText('Sample property interior')).toBeInTheDocument()
    expect(screen.getByText('Listing · Lake Merritt')).toBeInTheDocument()
    expect(
      screen.getByText('1200 Lakeview Dr, Oakland, CA 94610')
    ).toBeInTheDocument()
    expect(screen.getByText('3 beds')).toBeInTheDocument()
    expect(screen.getByText('Love')).toBeInTheDocument()
  })
})
