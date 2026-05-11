import { describe, expect, it, beforeEach, afterEach } from '@jest/globals'
import { render, screen, fireEvent } from '@testing-library/react'
import '@testing-library/jest-dom'

import { PropertyImage } from '@/components/ui/property-image'

jest.mock('next/image', () => ({
  __esModule: true,
  default: ({
    src,
    alt,
    onError,
    onLoad,
  }: {
    src: string
    alt: string
    onError?: () => void
    onLoad?: () => void
  }) => (
    // eslint-disable-next-line @next/next/no-img-element
    <img
      data-testid="next-image"
      src={src}
      alt={alt}
      onError={onError}
      onLoad={onLoad}
    />
  ),
}))

describe('PropertyImage', () => {
  const originalTestMode = process.env.NEXT_PUBLIC_TEST_MODE

  beforeEach(() => {
    process.env.NEXT_PUBLIC_TEST_MODE = 'true'
  })

  afterEach(() => {
    if (originalTestMode === undefined) {
      delete process.env.NEXT_PUBLIC_TEST_MODE
    } else {
      process.env.NEXT_PUBLIC_TEST_MODE = originalTestMode
    }
  })

  it('uses the first local fallback when src is missing', () => {
    render(<PropertyImage alt="Property" width={100} height={100} />)
    expect(screen.getByTestId('next-image')).toHaveAttribute(
      'src',
      '/images/properties/house-1.svg'
    )
  })

  it('falls back for known blocked domains', () => {
    render(
      <PropertyImage
        alt="Property"
        width={100}
        height={100}
        src="https://loremflickr.com/600/400/house"
      />
    )

    expect(screen.getByTestId('next-image')).toHaveAttribute(
      'src',
      '/images/properties/house-1.svg'
    )
  })

  it('allows loremflickr when test mode is disabled', () => {
    process.env.NEXT_PUBLIC_TEST_MODE = 'false'

    render(
      <PropertyImage
        alt="Property"
        width={100}
        height={100}
        src="https://loremflickr.com/600/400/house"
      />
    )

    expect(screen.getByTestId('next-image')).toHaveAttribute(
      'src',
      'https://loremflickr.com/600/400/house'
    )
  })

  it('selects the first non-broken image in an array', () => {
    render(
      <PropertyImage
        alt="Property"
        width={100}
        height={100}
        src={[
          'https://loremflickr.com/600/400/house',
          'https://images.example.com/good.jpg',
        ]}
      />
    )

    expect(screen.getByTestId('next-image')).toHaveAttribute(
      'src',
      'https://images.example.com/good.jpg'
    )
  })

  it('rotates through fallbacks on image error and eventually shows a placeholder', () => {
    render(<PropertyImage alt="Property" width={100} height={100} />)

    const img = screen.getByTestId('next-image')
    expect(img).toHaveAttribute('src', '/images/properties/house-1.svg')

    fireEvent.error(img)
    expect(screen.getByTestId('next-image')).toHaveAttribute(
      'src',
      '/images/properties/house-2.svg'
    )

    fireEvent.error(screen.getByTestId('next-image'))
    expect(screen.getByTestId('next-image')).toHaveAttribute(
      'src',
      '/images/properties/house-3.svg'
    )

    // Final error: all fallbacks exhausted → placeholder (no image rendered)
    fireEvent.error(screen.getByTestId('next-image'))
    expect(screen.queryByTestId('next-image')).toBeNull()
  })

  // A5: when every fallback fails the placeholder must be VISUALLY DISTINCT
  // from a real photo so users can tell that the data is broken (not the
  // layout). The legacy state rendered a tasteful Home icon that looked like
  // it could be a real image; the new state shows a crossed-out image glyph,
  // an "Image unavailable" caption, and applies a greyscale treatment.
  it('renders a distinct broken-image state when all fallbacks fail', () => {
    render(<PropertyImage alt="123 Main St" width={100} height={100} />)

    // Exhaust the 3 local SVG fallbacks; the 3rd error trips the broken state.
    fireEvent.error(screen.getByTestId('next-image'))
    fireEvent.error(screen.getByTestId('next-image'))
    fireEvent.error(screen.getByTestId('next-image'))

    expect(screen.queryByTestId('next-image')).toBeNull()
    const broken = screen.getByTestId('property-image-broken')
    expect(broken).toBeInTheDocument()
    expect(broken).toHaveAttribute('role', 'img')
    expect(broken).toHaveAttribute('aria-label', 'Property image unavailable')
    expect(broken.className).toContain('grayscale')
    expect(screen.getByText('Image unavailable')).toBeInTheDocument()
  })
})
