import { render, screen } from '@testing-library/react'
import { HowItWorks } from '@/components/marketing/HowItWorks'

// Mock framer-motion
jest.mock('framer-motion', () => ({
  motion: {
    div: ({ children, ...props }: any) => <div {...props}>{children}</div>,
  },
}))

// Mock lucide-react icons
jest.mock('lucide-react', () => ({
  Heart: ({ className }: any) => (
    <svg data-testid="heart-icon" className={className} />
  ),
  MapPin: ({ className }: any) => (
    <svg data-testid="mappin-icon" className={className} />
  ),
  Sparkles: ({ className }: any) => (
    <svg data-testid="sparkles-icon" className={className} />
  ),
}))

describe('HowItWorks', () => {
  test('renders section heading and description', () => {
    render(<HowItWorks />)

    expect(screen.getByText('How It Works')).toBeInTheDocument()
    expect(
      screen.getByText('Three simple steps to go from scrolling to moving in.')
    ).toBeInTheDocument()
  })

  test('renders all three steps', () => {
    render(<HowItWorks />)

    // Step titles
    expect(screen.getByText('1. Tell Us Your Vibe')).toBeInTheDocument()
    expect(screen.getByText('2. Swipe Together')).toBeInTheDocument()
    expect(screen.getByText('3. Match With Neighborhoods')).toBeInTheDocument()
  })

  test('renders step descriptions', () => {
    render(<HowItWorks />)

    expect(
      screen.getByText(
        /Cozy craftsman or sleek modern\? Walkable cafés or quiet cul‑de‑sac\?/
      )
    ).toBeInTheDocument()
    expect(
      screen.getByText(/Make fast decisions with side‑by‑side swiping/)
    ).toBeInTheDocument()
    expect(
      screen.getByText(/Beyond bedrooms—discover areas that fit your lifestyle/)
    ).toBeInTheDocument()
  })

  test('renders all step icons', () => {
    render(<HowItWorks />)

    expect(screen.getByTestId('sparkles-icon')).toBeInTheDocument()
    expect(screen.getByTestId('heart-icon')).toBeInTheDocument()
    expect(screen.getByTestId('mappin-icon')).toBeInTheDocument()
  })

  test('section has correct id for navigation', () => {
    render(<HowItWorks />)

    const section = screen.getByText('How It Works').closest('section')
    expect(section).toHaveAttribute('id', 'how-it-works')
  })

  test('applies correct grid layout for steps', () => {
    render(<HowItWorks />)

    const stepsGrid = screen.getByText('1. Tell Us Your Vibe').closest('.grid')
    expect(stepsGrid).toHaveClass('grid', 'sm:grid-cols-3')
  })

  test('heading has correct typography classes', () => {
    render(<HowItWorks />)

    const heading = screen.getByText('How It Works')
    expect(heading).toHaveClass(
      'text-3xl',
      'font-bold',
      'text-gray-900',
      'sm:text-4xl',
      'md:text-5xl'
    )
  })

  test('description has correct typography classes', () => {
    render(<HowItWorks />)

    const description = screen.getByText(
      'Three simple steps to go from scrolling to moving in.'
    )
    expect(description).toHaveClass('text-lg', 'text-gray-600', 'sm:text-xl')
  })

  test('step cards have correct styling', () => {
    render(<HowItWorks />)

    const firstCard = screen
      .getByText('1. Tell Us Your Vibe')
      .closest('.overflow-hidden')
    expect(firstCard).toHaveClass(
      'relative',
      'h-full',
      'overflow-hidden',
      'border-white/60',
      'bg-white',
      'p-6'
    )
  })

  test('step icons have gradient background', () => {
    render(<HowItWorks />)

    const iconContainers = screen
      .getAllByTestId(/.*-icon/)
      .map((icon) => icon.parentElement)
    iconContainers.forEach((container) => {
      expect(container).toHaveClass(
        'inline-flex',
        'rounded-xl',
        'bg-gradient-to-br',
        'from-[#021A44]',
        'to-[#063A9E]',
        'p-3',
        'text-white'
      )
    })
  })

  test('section has correct container and spacing', () => {
    render(<HowItWorks />)

    const section = screen.getByText('How It Works').closest('section')
    expect(section).toHaveClass(
      'relative',
      'bg-transparent',
      'py-10',
      'sm:py-14'
    )

    const container = screen.getByText('How It Works').closest('.container')
    expect(container).toHaveClass('container', 'mx-auto', 'px-4')
  })

  test('step titles have correct font styling', () => {
    render(<HowItWorks />)

    const stepTitles = [
      '1. Tell Us Your Vibe',
      '2. Swipe Together',
      '3. Match With Neighborhoods',
    ]

    stepTitles.forEach((title) => {
      const element = screen.getByText(title)
      expect(element).toHaveClass('text-xl', 'font-semibold', 'text-gray-900')
      expect(element).toHaveStyle({ fontFamily: 'var(--font-heading)' })
    })
  })

  test('step descriptions have correct font styling', () => {
    render(<HowItWorks />)

    const descriptions = [
      /Cozy craftsman or sleek modern/,
      /Make fast decisions with side‑by‑side swiping/,
      /Beyond bedrooms—discover areas/,
    ]

    descriptions.forEach((desc) => {
      const element = screen.getByText(desc)
      expect(element).toHaveClass('text-gray-600')
      expect(element).toHaveStyle({ fontFamily: 'var(--font-body)' })
    })
  })

  test('renders with correct responsive grid gaps', () => {
    render(<HowItWorks />)

    const grid = screen.getByText('1. Tell Us Your Vibe').closest('.grid')
    expect(grid).toHaveClass('gap-5', 'mt-10', 'sm:mt-12', 'sm:grid-cols-3')
  })
})
