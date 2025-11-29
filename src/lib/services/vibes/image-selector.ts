/**
 * Strategic Image Selection for Property Vibes Analysis
 *
 * Selects 15-20 strategic images per property for comprehensive LLM analysis.
 * Expanded coverage for richer vibe extraction.
 */

export interface SelectedImage {
  url: string
  category: string
  index: number
}

export interface ImageSelectionResult {
  selectedImages: SelectedImage[]
  strategy: 'comprehensive' | 'balanced' | 'limited' | 'single'
  totalAvailable: number
}

/**
 * Fisher-Yates shuffle for random selection
 */
function shuffleArray<T>(array: T[]): T[] {
  const shuffled = [...array]
  for (let i = shuffled.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1))
    ;[shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]]
  }
  return shuffled
}

/**
 * Select strategic images from property image array
 *
 * Expanded Strategy (15-20 images):
 * 1. Hero shot (exterior/facade) - always first
 * 2. Kitchen shots (2) - high buyer impact
 * 3. Living/great room (2) - lifestyle visualization
 * 4. Bedrooms (3) - primary + secondary
 * 5. Bathrooms (2) - primary + secondary
 * 6. Outdoor/yard (2) - for houses with yards
 * 7. Dining area (1) - if distinct from living
 * 8. Office/flex space (1) - common buyer need
 * 9. Garage/storage (1) - practical consideration
 * 10. Fill remaining with diverse shots
 *
 * @param images - Array of image URLs from Zillow
 * @param propertyType - Property type for selection strategy
 * @param lotSizeSqft - Lot size to determine outdoor relevance
 * @param maxImages - Maximum images to select (default 18)
 */
export function selectStrategicImages(
  images: string[] | null,
  propertyType: string | null,
  lotSizeSqft: number | null,
  maxImages: number = 18
): ImageSelectionResult {
  if (!images || images.length === 0) {
    return {
      selectedImages: [],
      strategy: 'single',
      totalAvailable: 0,
    }
  }

  const selected: SelectedImage[] = []
  const usedIndices = new Set<number>()

  // Helper to add image if not already selected
  const addImage = (index: number, category: string): boolean => {
    if (index >= 0 && index < images.length && !usedIndices.has(index)) {
      selected.push({
        url: images[index],
        category,
        index,
      })
      usedIndices.add(index)
      return true
    }
    return false
  }

  // Helper to add multiple images from candidate positions
  const addMultiple = (
    candidates: number[],
    category: string,
    count: number
  ): void => {
    let added = 0
    for (const idx of candidates) {
      if (added >= count) break
      if (selected.length >= maxImages) break
      if (addImage(idx, category)) added++
    }
  }

  // 1. Hero shot (exterior/facade) - always first
  addImage(0, 'hero')

  // If only 1 image, return early
  if (images.length === 1) {
    return {
      selectedImages: selected,
      strategy: 'single',
      totalAvailable: images.length,
    }
  }

  // 2. Kitchen shots (2) - typically in positions 3-6 for Zillow
  // Kitchen is high-impact, so we try to get multiple angles
  addMultiple([3, 4, 5, 2, 6], 'kitchen', 2)

  // 3. Living/great room (2) - typically positions 1-4
  addMultiple([1, 2, 4, 5], 'living', 2)

  // 4. Bedrooms (3) - typically middle positions 5-12
  if (images.length > 5) {
    addMultiple([6, 7, 8, 9, 10, 11, 5], 'bedroom', 3)
  }

  // 5. Bathrooms (2) - typically positions 8-14
  if (images.length > 7) {
    addMultiple([9, 10, 11, 12, 8, 13, 14], 'bathroom', 2)
  }

  // 6. Outdoor space (2) for houses with adequate yards
  const isHouse =
    propertyType === 'single_family' ||
    propertyType === 'house' ||
    propertyType === 'townhome'
  const hasYard = lotSizeSqft && lotSizeSqft > 3000

  if (isHouse && hasYard) {
    // Outdoor shots are often at the end of the gallery
    const lastImages = [
      images.length - 1,
      images.length - 2,
      images.length - 3,
      images.length - 4,
    ].filter((i) => i > 0)
    addMultiple(lastImages, 'outdoor', 2)
  }

  // 7. Dining area (1) - often near kitchen/living shots
  if (images.length > 10) {
    addMultiple([5, 6, 4, 7], 'dining', 1)
  }

  // 8. Office/flex space (1) - common buyer need, often later in gallery
  if (images.length > 12) {
    addMultiple([12, 13, 14, 11, 15], 'office', 1)
  }

  // 9. Garage/storage (1) - practical, usually near end
  if (images.length > 15) {
    const nearEnd = [images.length - 5, images.length - 6, images.length - 4]
    addMultiple(nearEnd, 'garage', 1)
  }

  // 10. Fill remaining slots with diverse images
  if (selected.length < Math.min(maxImages, images.length)) {
    const unusedIndices: number[] = []
    for (let i = 0; i < images.length; i++) {
      if (!usedIndices.has(i)) {
        unusedIndices.push(i)
      }
    }

    // Shuffle for variety
    const shuffledUnused = shuffleArray(unusedIndices)

    for (const idx of shuffledUnused) {
      if (selected.length >= maxImages) break
      addImage(idx, 'additional')
    }
  }

  // Determine strategy based on coverage
  let strategy: 'comprehensive' | 'balanced' | 'limited' | 'single'
  if (selected.length >= 12) {
    strategy = 'comprehensive'
  } else if (selected.length >= 6) {
    strategy = 'balanced'
  } else if (selected.length >= 2) {
    strategy = 'limited'
  } else {
    strategy = 'single'
  }

  return {
    selectedImages: selected,
    strategy,
    totalAvailable: images.length,
  }
}

/**
 * Validate that image URLs are accessible
 * (Optional - can be used for pre-validation)
 */
export async function validateImageUrls(
  images: SelectedImage[],
  timeoutMs: number = 5000
): Promise<SelectedImage[]> {
  const validImages: SelectedImage[] = []

  for (const image of images) {
    try {
      const controller = new AbortController()
      const timeoutId = setTimeout(() => controller.abort(), timeoutMs)

      const response = await fetch(image.url, {
        method: 'HEAD',
        signal: controller.signal,
      })

      clearTimeout(timeoutId)

      if (response.ok) {
        validImages.push(image)
      } else {
        console.warn(
          `[ImageSelector] Invalid image URL (${response.status}): ${image.url}`
        )
      }
    } catch (error) {
      console.warn(
        `[ImageSelector] Failed to validate image: ${image.url}`,
        error
      )
    }
  }

  return validImages
}
