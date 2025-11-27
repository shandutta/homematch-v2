/**
 * Strategic Image Selection for Property Vibes Analysis
 *
 * Selects 3-5 strategic images per property for LLM analysis,
 * optimizing for cost while maintaining quality coverage.
 */

export interface SelectedImage {
  url: string
  category: string
  index: number
}

export interface ImageSelectionResult {
  selectedImages: SelectedImage[]
  strategy: 'balanced' | 'limited' | 'single'
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
 * Strategy:
 * 1. First image is always the hero shot (exterior/facade)
 * 2. Kitchen (typically image 3-5) - high buyer impact
 * 3. Living area (typically image 2-4) - lifestyle visualization
 * 4. Bedroom/bathroom - typically in middle positions
 * 5. Outdoor space or unique feature (if house type)
 * 6. Fill remaining slots with random diverse images
 *
 * @param images - Array of image URLs from Zillow
 * @param propertyType - Property type for selection strategy
 * @param maxImages - Maximum images to select (default 8)
 */
export function selectStrategicImages(
  images: string[] | null,
  propertyType: string | null,
  lotSizeSqft: number | null,
  maxImages: number = 8
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

  // 1. Always include first image (hero shot)
  addImage(0, 'hero')

  // If only 1 image, return early
  if (images.length === 1) {
    return {
      selectedImages: selected,
      strategy: 'single',
      totalAvailable: images.length,
    }
  }

  // 2. Kitchen - typically in positions 3-5 for Zillow listings
  const kitchenIndices = [3, 4, 2, 5]
  for (const idx of kitchenIndices) {
    if (addImage(idx, 'kitchen')) break
  }

  // 3. Living area - typically in positions 1-3
  const livingIndices = [1, 2]
  for (const idx of livingIndices) {
    if (addImage(idx, 'living')) break
  }

  // 4. Bedroom or bathroom - typically in positions 5-8
  if (selected.length < maxImages && images.length > 5) {
    const bedroomIndices = [5, 6, 7, 8]
    for (const idx of bedroomIndices) {
      if (addImage(idx, 'bedroom')) break
    }
  }

  // 5. Bathroom - try to get a separate bathroom shot
  if (selected.length < maxImages && images.length > 7) {
    const bathroomIndices = [7, 8, 9, 6]
    for (const idx of bathroomIndices) {
      if (addImage(idx, 'bathroom')) break
    }
  }

  // 6. Outdoor space for houses with yards
  const isHouse =
    propertyType === 'single_family' ||
    propertyType === 'house' ||
    propertyType === 'townhome'
  const hasYard = lotSizeSqft && lotSizeSqft > 3000

  if (isHouse && hasYard && selected.length < maxImages && images.length > 6) {
    // Outdoor shots are often later in the gallery
    const outdoorIndices = [images.length - 1, images.length - 2, 8, 9, 10]
    for (const idx of outdoorIndices) {
      if (addImage(idx, 'outdoor')) break
    }
  }

  // 7. Fill remaining slots with randomly selected diverse images
  if (selected.length < Math.min(maxImages, images.length)) {
    // Get all unused indices and shuffle them for random selection
    const unusedIndices = []
    for (let i = 0; i < images.length; i++) {
      if (!usedIndices.has(i)) {
        unusedIndices.push(i)
      }
    }

    // Shuffle to randomize which additional images we pick
    const shuffledUnused = shuffleArray(unusedIndices)

    for (const idx of shuffledUnused) {
      if (selected.length >= maxImages) break
      addImage(idx, 'additional')
    }
  }

  // Determine strategy based on what we selected
  let strategy: 'balanced' | 'limited' | 'single' = 'balanced'
  if (selected.length === 1) {
    strategy = 'single'
  } else if (selected.length < 4) {
    strategy = 'limited'
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
