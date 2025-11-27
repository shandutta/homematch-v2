import { render, screen } from '@testing-library/react'
import { MarketingPreviewCard } from '@/components/marketing/MarketingPreviewCard'

// Mock framer-motion
jest.mock('framer-motion', () => ({
  motion: {
    div: ({ children, ...props }: any) => <div {...props}>{children}</div>,
    button: ({ children, ...props }: any) => (
      <button {...props}>{children}</button>
    ),
  },
  useScroll: () => ({ scrollY: { get: () => 0 } }),
  useTransform: () => ({ get: () => 0 }),
  useMotionValue: () => ({ set: jest.fn(), get: () => 0.5 }),
  useSpring: (value: any) => value,
}))

// Mock Next.js Image
jest.mock('next/image', () => ({
  __esModule: true,
  default: ({ src, alt, ...props }: any) => (
    // eslint-disable-next-line @next/next/no-img-element
    <img src={src} alt={alt} {...props} />
  ),
}))

// Mock lucide-react icons
jest.mock('lucide-react', () => ({
  Bed: ({ className }: any) => (
    <svg data-testid="bed-icon" className={className} />
  ),
  Bath: ({ className }: any) => (
    <svg data-testid="bath-icon" className={className} />
  ),
  MapPin: ({ className }: any) => (
    <svg data-testid="mappin-icon" className={className} />
  ),
  Heart: ({ className }: any) => (
    <svg data-testid="heart-icon" className={className} />
  ),
  X: ({ className }: any) => <svg data-testid="x-icon" className={className} />,
  ShieldCheck: ({ className }: any) => (
    <svg data-testid="shieldcheck-icon" className={className} />
  ),
}))

describe('MarketingPreviewCard', () => {
  beforeEach(() => {
    // Mock matchMedia for reduced motion preference
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

  test('renders property image', () => {
    render(<MarketingPreviewCard />)

    const image = screen.getByAltText('Sample property interior')
    expect(image).toBeInTheDocument()
    expect(image).toHaveAttribute(
      'src',
      expect.stringContaining('unsplash.com')
    )
  })

  test('renders price badge', () => {
    render(<MarketingPreviewCard />)

    expect(screen.getByText('$975,000')).toBeInTheDocument()
  })

  test('renders property address', () => {
    render(<MarketingPreviewCard />)

    expect(
      screen.getByText('1200 Lakeview Dr, Oakland, CA 94610')
    ).toBeInTheDocument()
  })

  test('renders location label', () => {
    render(<MarketingPreviewCard />)

    expect(screen.getByText('Listing · Lake Merritt')).toBeInTheDocument()
  })

  test('renders property details', () => {
    render(<MarketingPreviewCard />)

    expect(screen.getByText('3 beds')).toBeInTheDocument()
    expect(screen.getByText('2 baths')).toBeInTheDocument()
    expect(screen.getByText('Near parks')).toBeInTheDocument()
  })

  test('renders action buttons', () => {
    render(<MarketingPreviewCard />)

    expect(screen.getByText('Pass')).toBeInTheDocument()
    expect(screen.getByText('Love')).toBeInTheDocument()
  })

  test('renders floating feature badges', () => {
    render(<MarketingPreviewCard />)

    // Check badge titles
    expect(screen.getByText('Built for couples')).toBeInTheDocument()
    expect(screen.getByText('See nearby spots')).toBeInTheDocument()
    expect(screen.getByText('Real listings, quick swipes')).toBeInTheDocument()

    // Check badge descriptions
    expect(
      screen.getByText('Stay in sync on likes, tours, and moves.')
    ).toBeInTheDocument()
    expect(
      screen.getByText('Peek at parks and cafés without leaving the card.')
    ).toBeInTheDocument()
    expect(screen.getByText('Decide together in one tap.')).toBeInTheDocument()
  })

  test('renders property icons', () => {
    render(<MarketingPreviewCard />)

    expect(screen.getByTestId('bed-icon')).toBeInTheDocument()
    expect(screen.getByTestId('bath-icon')).toBeInTheDocument()
    expect(screen.getAllByTestId('mappin-icon').length).toBeGreaterThan(0)
  })

  test('renders action button icons', () => {
    render(<MarketingPreviewCard />)

    expect(screen.getByTestId('x-icon')).toBeInTheDocument()
    expect(screen.getAllByTestId('heart-icon').length).toBeGreaterThan(0)
  })

  test('applies custom className', () => {
    const { container } = render(
      <MarketingPreviewCard className="custom-class" />
    )

    const wrapper = container.firstChild as HTMLElement
    expect(wrapper).toHaveClass('custom-class')
  })

  test('card has correct styling classes', () => {
    const { container } = render(<MarketingPreviewCard />)

    const card = container.firstChild as HTMLElement
    expect(card).toHaveClass(
      'relative',
      'overflow-hidden',
      'rounded-[24px]',
      'backdrop-blur-xl'
    )
  })

  test('Pass button has correct styling', () => {
    render(<MarketingPreviewCard />)

    const passButton = screen.getByText('Pass').closest('button')
    expect(passButton).toHaveClass(
      'border-rose-500/30',
      'bg-rose-500/10',
      'text-rose-400'
    )
  })

  test('Love button has correct styling', () => {
    render(<MarketingPreviewCard />)

    const loveButton = screen.getByText('Love').closest('button')
    expect(loveButton).toHaveClass(
      'border-emerald-500/30',
      'bg-emerald-500/20',
      'text-emerald-400'
    )
  })

  test('renders image with aspect ratio container', () => {
    const { container } = render(<MarketingPreviewCard />)

    const aspectContainer = container.querySelector('.aspect-\\[4\\/3\\]')
    expect(aspectContainer).toBeInTheDocument()
  })

  test('renders gradient overlay on image', () => {
    const { container } = render(<MarketingPreviewCard />)

    const gradient = container.querySelector('.bg-gradient-to-t')
    expect(gradient).toBeInTheDocument()
  })
})
