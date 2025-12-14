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
  default: ({ src, alt, priority, fill, ...props }: any) => (
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

// Mock lucide-react icons
jest.mock('lucide-react', () => ({
  Bed: () => <svg data-testid="bed-icon" />,
  Bath: () => <svg data-testid="bath-icon" />,
  MapPin: () => <svg data-testid="mappin-icon" />,
  Heart: () => <svg data-testid="heart-icon" />,
  X: () => <svg data-testid="x-icon" />,
  ShieldCheck: () => <svg data-testid="shieldcheck-icon" />,
}))

describe('MarketingPreviewCard', () => {
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

  test('renders property image with alt text', () => {
    render(<MarketingPreviewCard />)
    expect(screen.getByAltText('Sample home')).toBeInTheDocument()
  })

  test('renders property price', () => {
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

  test('renders Pass and Love action buttons', () => {
    render(<MarketingPreviewCard />)
    expect(screen.getByText('Pass')).toBeInTheDocument()
    expect(screen.getByText('Love')).toBeInTheDocument()
  })

  test('renders feature badges with titles and descriptions', () => {
    render(<MarketingPreviewCard />)

    // Badge titles
    expect(screen.getByText('Built for couples')).toBeInTheDocument()
    expect(screen.getByText('See nearby spots')).toBeInTheDocument()
    expect(screen.getByText('Real listings, quick swipes')).toBeInTheDocument()

    // Badge descriptions
    expect(
      screen.getByText('Stay in sync on likes, tours, and moves.')
    ).toBeInTheDocument()
    expect(
      screen.getByText('Peek at parks and cafés without leaving the card.')
    ).toBeInTheDocument()
    expect(screen.getByText('Decide together in one tap.')).toBeInTheDocument()
  })

  test('applies custom className', () => {
    const { container } = render(
      <MarketingPreviewCard className="custom-class" />
    )
    expect(container.firstChild).toHaveClass('custom-class')
  })
})
