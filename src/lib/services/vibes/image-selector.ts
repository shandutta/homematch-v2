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
 * Select strategic images from property image array
 *
 * Strategy:
 * 1. First image is always the hero shot (exterior/facade)
 * 2. Kitchen (typically image 3-5) - high buyer impact
 * 3. Living area (typically image 2-4) - lifestyle visualization
 * 4. Bedroom/bathroom (if available)
 * 5. Outdoor space or unique feature (if house type)
 *
 * @param images - Array of image URLs from Zillow
 * @param propertyType - Property type for selection strategy
 * @param maxImages - Maximum images to select (default 5)
 */
export function selectStrategicImages(
  images: string[] | null,
  propertyType: string | null,
  lotSizeSqft: number | null,
  maxImages: number = 5
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
    const bedroomIndices = [5, 6, 7]
    for (const idx of bedroomIndices) {
      if (addImage(idx, 'bedroom')) break
    }
  }

  // 5. Outdoor space for houses with yards
  const isHouse =
    propertyType === 'single_family' ||
    propertyType === 'house' ||
    propertyType === 'townhome'
  const hasYard = lotSizeSqft && lotSizeSqft > 3000

  if (isHouse && hasYard && selected.length < maxImages && images.length > 6) {
    // Outdoor shots are often later in the gallery
    const outdoorIndices = [images.length - 1, images.length - 2, 8, 9]
    for (const idx of outdoorIndices) {
      if (addImage(idx, 'outdoor')) break
    }
  }

  // Fill remaining slots if we have room
  if (selected.length < Math.min(maxImages, images.length)) {
    for (let i = 0; i < images.length && selected.length < maxImages; i++) {
      if (!usedIndices.has(i)) {
        addImage(i, 'additional')
      }
    }
  }

  // Determine strategy based on what we selected
  let strategy: 'balanced' | 'limited' | 'single' = 'balanced'
  if (selected.length === 1) {
    strategy = 'single'
  } else if (selected.length < 3) {
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
      console.warn(`[ImageSelector] Failed to validate image: ${image.url}`, error)
    }
  }

  return validImages
}
