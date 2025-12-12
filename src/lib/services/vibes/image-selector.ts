/**
 * Strategic Image Selection for Property Vibes Analysis
 *
 * Selects up to 18 strategic images per property for comprehensive LLM analysis.
 * Using Qwen 3 VL which supports more images than NVIDIA free tier.
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
 * Simple seeded PRNG (mulberry32) for deterministic shuffles when desired.
 * https://stackoverflow.com/a/47593316
 */
function mulberry32(seed: number): () => number {
  let t = seed >>> 0
  return () => {
    t += 0x6d2b79f5
    let r = Math.imul(t ^ (t >>> 15), 1 | t)
    r ^= r + Math.imul(r ^ (r >>> 7), 61 | r)
    return ((r ^ (r >>> 14)) >>> 0) / 4294967296
  }
}

/**
 * Fisher-Yates shuffle for random selection.
 */
function shuffleArray<T>(array: T[], random: () => number): T[] {
  const shuffled = [...array]
  for (let i = shuffled.length - 1; i > 0; i--) {
    const j = Math.floor(random() * (i + 1))
    ;[shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]]
  }
  return shuffled
}

/**
 * Select strategic images from property image array
 *
 * Expanded Strategy (15-20 images):
 * - Prefer interior shots over repeating exterior hero photos.
 * - Pull from across the gallery (not just sequential early photos),
 *   to avoid skew (e.g., gate/facade dominance).
 *
 * @param images - Array of image URLs from Zillow
 * @param propertyType - Property type for selection strategy
 * @param lotSizeSqft - Lot size to determine outdoor relevance
 * @param maxImages - Maximum images to select (default 18 for comprehensive analysis)
 * @param seed - Optional deterministic seed for repeatable selection
 */
export function selectStrategicImages(
  images: string[] | null,
  propertyType: string | null,
  lotSizeSqft: number | null,
  maxImages: number = 18,
  seed?: number
): ImageSelectionResult {
  if (!images || images.length === 0) {
    return {
      selectedImages: [],
      strategy: 'single',
      totalAvailable: 0,
    }
  }

  const random = seed == null ? Math.random : mulberry32(seed)

  const selected: SelectedImage[] = []
  const usedIndices = new Set<number>()
  const maxAllowed = Math.min(maxImages, images.length)

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

  const nonHeroIndices: number[] = []
  for (let i = 1; i < images.length; i++) {
    nonHeroIndices.push(i)
  }

  // For larger galleries, prioritize interior-ish images first to avoid overweighting exterior hero shots.
  // We don't have reliable room labels, so we use rough gallery-position heuristics.
  const headCutoff = Math.min(
    images.length - 1,
    Math.max(1, Math.floor(images.length * 0.12))
  )
  const tailStart = Math.max(1, Math.floor(images.length * 0.82))
  const interiorCandidates = nonHeroIndices.filter(
    (i) => i >= headCutoff && i < tailStart
  )
  const exteriorCandidates = nonHeroIndices.filter((i) => i < headCutoff)
  const tailCandidates = nonHeroIndices.filter((i) => i >= tailStart)

  const addFromPools = (pools: number[][], category: string, count: number) => {
    let added = 0
    for (const pool of pools) {
      if (added >= count) break
      if (selected.length >= maxAllowed) break
      for (const idx of shuffleArray(pool, random)) {
        if (added >= count) break
        if (selected.length >= maxAllowed) break
        if (addImage(idx, category)) added++
      }
    }
  }

  // Always include at least one hero (often exterior).
  addImage(0, 'hero')

  // If only 1 image, return early
  if (images.length === 1) {
    return {
      selectedImages: selected,
      strategy: 'single',
      totalAvailable: images.length,
    }
  }

  // Interior-heavy selection (reduces exterior skew)
  addFromPools([interiorCandidates, nonHeroIndices], 'kitchen', 2)
  addFromPools([interiorCandidates, nonHeroIndices], 'living', 2)
  addFromPools([interiorCandidates, nonHeroIndices], 'bedroom', 3)
  addFromPools([interiorCandidates, nonHeroIndices], 'bathroom', 2)

  // 6. Outdoor space (2) for houses with adequate yards
  const isHouse =
    propertyType === 'single_family' ||
    propertyType === 'house' ||
    propertyType === 'townhome'
  const hasYard = lotSizeSqft && lotSizeSqft > 3000

  if (isHouse && hasYard) {
    // Outdoor shots are often later in the gallery
    addFromPools([tailCandidates, nonHeroIndices], 'outdoor', 2)
  }

  // 7. Dining area (1) - often near kitchen/living shots
  addFromPools([interiorCandidates, nonHeroIndices], 'dining', 1)

  // 8. Office/flex space (1) - common buyer need, often later in gallery
  addFromPools(
    [interiorCandidates, tailCandidates, nonHeroIndices],
    'office',
    1
  )

  // 9. Garage/storage (1) - practical, usually near end
  addFromPools(
    [tailCandidates, interiorCandidates, nonHeroIndices],
    'garage',
    1
  )

  // 10. Fill remaining slots with diverse images
  if (selected.length < maxAllowed) {
    const interiorUnused = interiorCandidates.filter((i) => !usedIndices.has(i))
    const tailUnused = tailCandidates.filter((i) => !usedIndices.has(i))
    const exteriorUnused = exteriorCandidates.filter((i) => !usedIndices.has(i))

    for (const pool of [interiorUnused, tailUnused, exteriorUnused]) {
      if (selected.length >= maxAllowed) break
      for (const idx of shuffleArray(pool, random)) {
        if (selected.length >= maxAllowed) break
        addImage(idx, 'additional')
      }
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

  const categoryPriority: Record<string, number> = {
    kitchen: 0,
    living: 1,
    dining: 2,
    bedroom: 3,
    bathroom: 4,
    office: 5,
    garage: 6,
    hero: 7,
    outdoor: 8,
    additional: 9,
  }

  return {
    selectedImages: [...selected].sort((a, b) => {
      const priorityDelta =
        (categoryPriority[a.category] ?? 99) -
        (categoryPriority[b.category] ?? 99)
      if (priorityDelta !== 0) return priorityDelta
      return a.index - b.index
    }),
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
