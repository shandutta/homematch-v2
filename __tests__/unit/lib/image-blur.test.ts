import {
  generateBlurDataURL,
  getPropertyBlurPlaceholder,
  PROPERTY_BLUR_PLACEHOLDERS,
} from '@/lib/image-blur'

describe('image-blur utilities', () => {
  // Helper to mock canvas for this suite
  const mockCanvas = (shouldSucceed = true) => {
    const originalCreateElement = document.createElement
    const mockContext = {
      createLinearGradient: jest.fn().mockReturnValue({
        addColorStop: jest.fn(),
      }),
      fillStyle: null,
      fillRect: jest.fn(),
    }

    document.createElement = jest.fn().mockImplementation((tagName: string) => {
      if (tagName === 'canvas') {
        return {
          width: 0,
          height: 0,
          getContext: jest
            .fn()
            .mockReturnValue(shouldSucceed ? mockContext : null),
          toDataURL: jest
            .fn()
            .mockReturnValue('data:image/png;base64,mockDataURL'),
        }
      }
      return originalCreateElement.call(document, tagName)
    })

    return () => {
      document.createElement = originalCreateElement
    }
  }

  describe('generateBlurDataURL', () => {
    test('returns server-side fallback when canvas creation returns null', () => {
      // Mock document.createElement to return null for canvas, simulating server-side
      const originalCreateElement = document.createElement
      document.createElement = jest
        .fn()
        .mockImplementation((tagName: string) => {
          if (tagName === 'canvas') {
            return null // Simulate server-side where canvas is not available
          }
          return originalCreateElement.call(document, tagName)
        })

      const result = generateBlurDataURL()

      // Should return the base64 SVG fallback when canvas is null
      expect(result).toBe(
        'data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iNDAiIGhlaWdodD0iNDAiIHZpZXdCb3g9IjAgMCA0MCA0MCIgZmlsbD0ibm9uZSIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj4KPGRlZnM+CjxsaW5lYXJHcmFkaWVudCBpZD0iYmciIHgxPSIwJSIgeTE9IjAlIiB4Mj0iMTAwJSIgeTI9IjEwMCUiPgo8c3RvcCBvZmZzZXQ9IjAlIiBzdHlsZT0ic3RvcC1jb2xvcjojZjNmNGY2O3N0b3Atb3BhY2l0eToxIiAvPgo8c3RvcCBvZmZzZXQ9IjEwMCUiIHN0eWxlPSJzdG9wLWNvbG9yOiNlNWU3ZWI7c3RvcC1vcGFjaXR5OjEiIC8+CjwvbGluZWFyR3JhZGllbnQ+CjwvZGVmcz4KPHJlY3Qgd2lkdGg9IjQwIiBoZWlnaHQ9IjQwIiBmaWxsPSJ1cmwoI2JnKSIvPgo8L3N2Zz4K'
      )

      // Restore original method
      document.createElement = originalCreateElement
    })

    test('creates canvas blur when browser environment is available', () => {
      const restore = mockCanvas(true)

      // Ensure we have window/document available (jsdom provides this)
      expect(typeof window).toBe('object')
      expect(typeof document).toBe('object')

      const result = generateBlurDataURL()

      // Should return our mocked canvas data URL
      expect(result).toBe('data:image/png;base64,mockDataURL')

      restore()
    })

    test('creates canvas with custom dimensions', () => {
      const restore = mockCanvas(true)
      const result = generateBlurDataURL(16, 20)

      // Should still return mocked data URL regardless of dimensions
      expect(result).toBe('data:image/png;base64,mockDataURL')
      restore()
    })

    test('handles getContext returning null', () => {
      const restore = mockCanvas(false) // mock canvas where getContext returns null

      const result = generateBlurDataURL()

      // Should return empty string when context is null
      expect(result).toBe('')

      restore()
    })
  })

  describe('getPropertyBlurPlaceholder', () => {
    // We need mockCanvas for the fallback case

    test('returns house-1 placeholder for house-1 images', () => {
      const result = getPropertyBlurPlaceholder(
        '/images/house-1-living-room.jpg'
      )
      expect(result).toBe(PROPERTY_BLUR_PLACEHOLDERS['house-1'])
    })

    test('returns house-2 placeholder for house-2 images', () => {
      const result = getPropertyBlurPlaceholder('/images/house-2-kitchen.jpg')
      expect(result).toBe(PROPERTY_BLUR_PLACEHOLDERS['house-2'])
    })

    test('returns house-3 placeholder for house-3 images', () => {
      const result = getPropertyBlurPlaceholder('/images/house-3-bedroom.jpg')
      expect(result).toBe(PROPERTY_BLUR_PLACEHOLDERS['house-3'])
    })

    test('returns generated blur for unknown images', () => {
      const restore = mockCanvas(true)
      const result = getPropertyBlurPlaceholder('/images/random-property.jpg')
      expect(result).toBe('data:image/png;base64,mockDataURL')
      restore()
    })

    test('matches house patterns anywhere in path', () => {
      const result1 = getPropertyBlurPlaceholder(
        '/some/deep/path/house-1-bathroom.jpg'
      )
      const result2 = getPropertyBlurPlaceholder(
        'https://example.com/house-2-exterior.jpg'
      )

      expect(result1).toBe(PROPERTY_BLUR_PLACEHOLDERS['house-1'])
      expect(result2).toBe(PROPERTY_BLUR_PLACEHOLDERS['house-2'])
    })

    test('is case sensitive', () => {
      const restore = mockCanvas(true)
      const result = getPropertyBlurPlaceholder(
        '/images/House-1-living-room.jpg'
      )
      // Should not match because of capital H
      expect(result).toBe('data:image/png;base64,mockDataURL')
      restore()
    })
  })

  describe('PROPERTY_BLUR_PLACEHOLDERS', () => {
    test('contains all expected house placeholders', () => {
      expect(PROPERTY_BLUR_PLACEHOLDERS).toHaveProperty('house-1')
      expect(PROPERTY_BLUR_PLACEHOLDERS).toHaveProperty('house-2')
      expect(PROPERTY_BLUR_PLACEHOLDERS).toHaveProperty('house-3')
    })

    test('all placeholders are base64 SVG data URIs', () => {
      Object.values(PROPERTY_BLUR_PLACEHOLDERS).forEach((placeholder) => {
        expect(placeholder).toMatch(/^data:image\/svg\+xml;base64,/)
      })
    })

    test('placeholders are non-empty strings', () => {
      Object.values(PROPERTY_BLUR_PLACEHOLDERS).forEach((placeholder) => {
        expect(placeholder).toBeTruthy()
        expect(typeof placeholder).toBe('string')
      })
    })
  })
})
