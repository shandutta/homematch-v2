import { render } from '@testing-library/react'
import { DisplayAd } from '@/components/ads/DisplayAd'

describe('DisplayAd', () => {
  let mockAdsbygoogle: any[]
  const originalEnv = process.env

  beforeEach(() => {
    mockAdsbygoogle = []
    // Reset window.adsbygoogle
    ;(global.window as any).adsbygoogle = mockAdsbygoogle
    jest.resetModules()
    process.env = { ...originalEnv }
    jest.clearAllMocks()
  })

  afterEach(() => {
    process.env = originalEnv
    jest.restoreAllMocks()
    document.body.innerHTML = ''
  })

  test('renders without crashing', () => {
    render(<DisplayAd slot="12345" />)
    const adElement = document.querySelector('.adsbygoogle')
    expect(adElement).toBeInTheDocument()
  })

  test('uses correct client ID from env', () => {
    process.env.NEXT_PUBLIC_ADSENSE_PUBLISHER_ID = 'ca-pub-test-env'
    render(<DisplayAd slot="12345" />)
    const adElement = document.querySelector('.adsbygoogle')
    expect(adElement).toHaveAttribute('data-ad-client', 'ca-pub-test-env')
  })

  test('uses default client ID if env missing', () => {
    delete process.env.NEXT_PUBLIC_ADSENSE_PUBLISHER_ID
    render(<DisplayAd slot="12345" />)
    const adElement = document.querySelector('.adsbygoogle')
    expect(adElement).toHaveAttribute('data-ad-client', 'ca-pub-9556502662108721')
  })

  test('pushes to adsbygoogle array on mount', () => {
    render(<DisplayAd slot="12345" />)

    expect(mockAdsbygoogle).toHaveLength(1)
    expect(mockAdsbygoogle[0]).toEqual({})
  })

  test('does not push again if already has status', () => {
     const { rerender } = render(<DisplayAd slot="12345" />)
     expect(mockAdsbygoogle).toHaveLength(1)

     // Rerender (update) should not run effect
     rerender(<DisplayAd slot="12345" />)
     expect(mockAdsbygoogle).toHaveLength(1)
  })
})
