import { render, screen } from '@testing-library/react'
import { DisplayAd } from '@/components/ads/DisplayAd'

describe('DisplayAd', () => {
  const mockAdsbygoogle: any[] = []

  beforeEach(() => {
    // Reset window.adsbygoogle
    ;(global.window as any).adsbygoogle = []
    jest.clearAllMocks()
  })

  afterEach(() => {
    jest.restoreAllMocks()
    document.body.innerHTML = ''
  })

  test('renders without crashing', () => {
    render(<DisplayAd slot="12345" />)
    const adElement = document.querySelector('.adsbygoogle')
    expect(adElement).toBeInTheDocument()
  })

  test('passes correct props to ins element', () => {
    render(<DisplayAd slot="12345" format="rectangle" responsive={false} />)
    const adElement = document.querySelector('.adsbygoogle')

    expect(adElement).toHaveAttribute('data-ad-slot', '12345')
    expect(adElement).toHaveAttribute('data-ad-format', 'rectangle')
    expect(adElement).toHaveAttribute('data-full-width-responsive', 'false')
    expect(adElement).toHaveAttribute('data-ad-client', 'ca-pub-9556502662108721')
  })

  test('pushes to adsbygoogle array on mount', () => {
    ;(global.window as any).adsbygoogle = mockAdsbygoogle
    render(<DisplayAd slot="12345" />)

    expect(mockAdsbygoogle).toHaveLength(1)
    expect(mockAdsbygoogle[0]).toEqual({})
  })

  test('does not render in development environment', () => {
    const originalEnv = process.env.NODE_ENV
    process.env.NODE_ENV = 'development'

    render(<DisplayAd slot="12345" />)

    // In dev, it renders a placeholder, not the ins tag directly or maybe it does?
    // Let's check the component implementation.
    // It renders a placeholder div in development.
    expect(screen.getByText(/Ad Slot: 12345/)).toBeInTheDocument()

    process.env.NODE_ENV = originalEnv
  })
})
