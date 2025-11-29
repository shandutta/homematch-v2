/**
 * Unit tests for image selector
 *
 * Tests the strategic image selection logic without any mocking -
 * this is pure function testing with real inputs/outputs.
 */

import {
  selectStrategicImages,
  type ImageSelectionResult,
} from '@/lib/services/vibes/image-selector'

describe('selectStrategicImages', () => {
  // Helper to generate fake image URLs
  const generateImages = (count: number): string[] =>
    Array.from(
      { length: count },
      (_, i) => `https://example.com/image-${i}.jpg`
    )

  describe('edge cases', () => {
    it('returns empty result for null images', () => {
      const result = selectStrategicImages(null, 'single_family', 5000)

      expect(result.selectedImages).toHaveLength(0)
      expect(result.strategy).toBe('single')
      expect(result.totalAvailable).toBe(0)
    })

    it('returns empty result for empty array', () => {
      const result = selectStrategicImages([], 'single_family', 5000)

      expect(result.selectedImages).toHaveLength(0)
      expect(result.strategy).toBe('single')
      expect(result.totalAvailable).toBe(0)
    })

    it('handles single image correctly', () => {
      const images = generateImages(1)
      const result = selectStrategicImages(images, 'condo', null)

      expect(result.selectedImages).toHaveLength(1)
      expect(result.selectedImages[0].category).toBe('hero')
      expect(result.selectedImages[0].index).toBe(0)
      expect(result.strategy).toBe('single')
      expect(result.totalAvailable).toBe(1)
    })
  })

  describe('strategic selection', () => {
    it('always includes hero image first', () => {
      const images = generateImages(10)
      const result = selectStrategicImages(images, 'single_family', 5000)

      expect(result.selectedImages[0].category).toBe('hero')
      expect(result.selectedImages[0].index).toBe(0)
      expect(result.selectedImages[0].url).toBe(images[0])
    })

    it('selects kitchen image from expected positions', () => {
      const images = generateImages(10)
      const result = selectStrategicImages(images, 'condo', null)

      const kitchenImage = result.selectedImages.find(
        (img) => img.category === 'kitchen'
      )
      expect(kitchenImage).toBeDefined()
      // Kitchen should be at index 3, 4, 2, or 5 (in that order of preference)
      expect([2, 3, 4, 5]).toContain(kitchenImage!.index)
    })

    it('selects living area image', () => {
      const images = generateImages(10)
      const result = selectStrategicImages(images, 'condo', null)

      const livingImage = result.selectedImages.find(
        (img) => img.category === 'living'
      )
      expect(livingImage).toBeDefined()
      expect([1, 2]).toContain(livingImage!.index)
    })

    it('selects bedroom image when enough images available', () => {
      const images = generateImages(10)
      const result = selectStrategicImages(images, 'condo', null)

      const bedroomImage = result.selectedImages.find(
        (img) => img.category === 'bedroom'
      )
      expect(bedroomImage).toBeDefined()
      expect([5, 6, 7, 8]).toContain(bedroomImage!.index)
    })

    it('selects bathroom image when enough images available', () => {
      const images = generateImages(12)
      const result = selectStrategicImages(images, 'condo', null)

      const bathroomImage = result.selectedImages.find(
        (img) => img.category === 'bathroom'
      )
      expect(bathroomImage).toBeDefined()
    })

    it('selects outdoor image for houses with yards', () => {
      const images = generateImages(15)
      const result = selectStrategicImages(images, 'single_family', 5000)

      const outdoorImage = result.selectedImages.find(
        (img) => img.category === 'outdoor'
      )
      expect(outdoorImage).toBeDefined()
    })

    it('does not select outdoor image for condos', () => {
      const images = generateImages(15)
      const result = selectStrategicImages(images, 'condo', null)

      const outdoorImage = result.selectedImages.find(
        (img) => img.category === 'outdoor'
      )
      expect(outdoorImage).toBeUndefined()
    })

    it('does not select outdoor image for houses without yards', () => {
      const images = generateImages(15)
      const result = selectStrategicImages(images, 'single_family', 1000) // small lot

      const outdoorImage = result.selectedImages.find(
        (img) => img.category === 'outdoor'
      )
      expect(outdoorImage).toBeUndefined()
    })
  })

  describe('image count and limits', () => {
    it('respects default maxImages of 18', () => {
      const images = generateImages(25)
      const result = selectStrategicImages(images, 'single_family', 5000)

      expect(result.selectedImages.length).toBeLessThanOrEqual(18)
      expect(result.selectedImages.length).toBeGreaterThan(8) // Should use more than old default
    })

    it('respects custom maxImages parameter', () => {
      const images = generateImages(20)
      const result = selectStrategicImages(images, 'single_family', 5000, 5)

      expect(result.selectedImages.length).toBeLessThanOrEqual(5)
    })

    it('selects all images when fewer than maxImages available', () => {
      const images = generateImages(4)
      const result = selectStrategicImages(images, 'condo', null, 8)

      expect(result.selectedImages.length).toBe(4)
      expect(result.totalAvailable).toBe(4)
    })

    it('fills remaining slots with additional images when strategic slots exhausted', () => {
      // With 30 images and maxImages=18, we should have some additional
      const images = generateImages(30)
      const result = selectStrategicImages(images, 'single_family', 5000, 18)

      const additionalImages = result.selectedImages.filter(
        (img) => img.category === 'additional'
      )
      // Should fill strategic categories first, then additional
      expect(result.selectedImages.length).toBe(18)
      expect(additionalImages.length).toBeGreaterThan(0)
    })
  })

  describe('strategy determination', () => {
    it('returns "single" strategy for 1 image', () => {
      const result = selectStrategicImages(generateImages(1), 'condo', null)
      expect(result.strategy).toBe('single')
    })

    it('returns "limited" strategy for 2-3 images', () => {
      const result2 = selectStrategicImages(generateImages(2), 'condo', null)
      expect(result2.strategy).toBe('limited')

      const result3 = selectStrategicImages(generateImages(3), 'condo', null)
      expect(result3.strategy).toBe('limited')
    })

    it('returns "balanced" strategy for 6-11 selected images', () => {
      const result = selectStrategicImages(generateImages(10), 'condo', null)
      expect(result.strategy).toBe('balanced')
    })

    it('returns "comprehensive" strategy for 12+ selected images', () => {
      const result = selectStrategicImages(
        generateImages(20),
        'single_family',
        5000
      )
      expect(result.strategy).toBe('comprehensive')
      expect(result.selectedImages.length).toBeGreaterThanOrEqual(12)
    })
  })

  describe('no duplicate selections', () => {
    it('never selects the same image twice', () => {
      const images = generateImages(20)
      const result = selectStrategicImages(images, 'single_family', 5000)

      const indices = result.selectedImages.map((img) => img.index)
      const uniqueIndices = new Set(indices)

      expect(uniqueIndices.size).toBe(indices.length)
    })

    it('never selects the same URL twice', () => {
      const images = generateImages(20)
      const result = selectStrategicImages(images, 'single_family', 5000)

      const urls = result.selectedImages.map((img) => img.url)
      const uniqueUrls = new Set(urls)

      expect(uniqueUrls.size).toBe(urls.length)
    })
  })

  describe('property type handling', () => {
    it('handles single_family property type', () => {
      const images = generateImages(15)
      const result = selectStrategicImages(images, 'single_family', 5000)

      expect(result.selectedImages.length).toBeGreaterThan(0)
      expect(
        result.selectedImages.find((img) => img.category === 'outdoor')
      ).toBeDefined()
    })

    it('handles townhome property type with yard', () => {
      const images = generateImages(15)
      const result = selectStrategicImages(images, 'townhome', 4000)

      expect(result.selectedImages.length).toBeGreaterThan(0)
      expect(
        result.selectedImages.find((img) => img.category === 'outdoor')
      ).toBeDefined()
    })

    it('handles house property type', () => {
      const images = generateImages(15)
      const result = selectStrategicImages(images, 'house', 6000)

      expect(
        result.selectedImages.find((img) => img.category === 'outdoor')
      ).toBeDefined()
    })

    it('handles null property type', () => {
      const images = generateImages(10)
      const result = selectStrategicImages(images, null, null)

      expect(result.selectedImages.length).toBeGreaterThan(0)
      // Should not have outdoor (null property type is not a house)
      expect(
        result.selectedImages.find((img) => img.category === 'outdoor')
      ).toBeUndefined()
    })
  })

  describe('randomization of additional images', () => {
    it('fills with additional images when more images than strategic slots', () => {
      // With 40 images and maxImages=18, we should have additional images
      const images = generateImages(40)
      const result = selectStrategicImages(images, 'single_family', 5000, 18)

      // Should have strategic images plus some additional
      const categories = result.selectedImages.map((img) => img.category)
      expect(categories).toContain('hero')
      expect(categories).toContain('additional')
      expect(result.selectedImages.length).toBe(18)
    })

    it('produces different additional images on multiple runs (probabilistic)', () => {
      // Run multiple times and check if we ever get different results
      // This is probabilistic but should pass with high probability
      // Use 50 images to ensure we have plenty of "additional" slots to randomize
      const images = generateImages(50)
      const results: ImageSelectionResult[] = []

      for (let i = 0; i < 10; i++) {
        results.push(selectStrategicImages(images, 'condo', null, 18))
      }

      // Get additional image indices from each run
      const additionalIndices = results.map((r) =>
        r.selectedImages
          .filter((img) => img.category === 'additional')
          .map((img) => img.index)
          .sort()
          .join(',')
      )

      // With 50 images and random selection, we should see some variation
      // Note: This could theoretically fail but is extremely unlikely
      const uniquePatterns = new Set(additionalIndices)
      expect(uniquePatterns.size).toBeGreaterThan(1)
    })
  })

  describe('totalAvailable tracking', () => {
    it('correctly reports total available images', () => {
      const images = generateImages(25)
      const result = selectStrategicImages(images, 'condo', null)

      expect(result.totalAvailable).toBe(25)
    })

    it('reports 0 for null input', () => {
      const result = selectStrategicImages(null, 'condo', null)
      expect(result.totalAvailable).toBe(0)
    })
  })

  describe('URL preservation', () => {
    it('preserves original URLs exactly', () => {
      const images = [
        'https://photos.zillowstatic.com/fp/abc123.jpg',
        'https://photos.zillowstatic.com/fp/def456.jpg',
        'https://photos.zillowstatic.com/fp/ghi789.jpg',
      ]

      const result = selectStrategicImages(images, 'condo', null)

      result.selectedImages.forEach((selected) => {
        expect(images).toContain(selected.url)
        expect(selected.url).toBe(images[selected.index])
      })
    })
  })
})
