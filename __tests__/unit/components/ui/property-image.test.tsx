import { describe, expect, it } from '@jest/globals'
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
})
