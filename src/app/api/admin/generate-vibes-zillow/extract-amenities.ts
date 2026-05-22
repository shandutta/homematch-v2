export interface ZillowSchool {
  name?: string
  rating?: number
  level?: string
  distance?: number
  grades?: string
  type?: string
}

export interface ZillowPriceHistoryEntry {
  date?: string
  time?: number
  price?: number
  event?: string
  priceChangeRate?: number
  pricePerSquareFoot?: number
}

export interface ZillowTaxHistoryEntry {
  time?: number
  taxPaid?: number
  taxIncreaseRate?: number
  value?: number
  valueIncreaseRate?: number
}

export interface ZillowPropertyResponse {
  zpid?: number | string
  address?: {
    streetAddress?: string
    city?: string
    state?: string
    zipcode?: string
  }
  streetAddress?: string
  city?: string
  state?: string
  zipcode?: string
  price?: number
  bedrooms?: number
  bathrooms?: number
  livingArea?: number
  lotAreaValue?: number
  yearBuilt?: number
  homeType?: string
  propertyType?: string
  homeStatus?: string
  imgSrc?: string
  // Listing-enrichment fields (inline in /property; previously discarded).
  schools?: ZillowSchool[]
  priceHistory?: ZillowPriceHistoryEntry[]
  taxHistory?: ZillowTaxHistoryEntry[]
  zestimate?: number
  rentZestimate?: number
  datePosted?: string
  monthlyHoaFee?: number
  hoaFee?: number
  attributionInfo?: {
    brokerName?: string
    agentName?: string
    agentPhoneNumber?: string
    brokerPhoneNumber?: string
  }
  // Simple flat array of URLs (most common)
  images?: string[]
  // Complex nested structure with multiple sizes
  originalPhotos?: Array<{
    mixedSources?: {
      jpeg?: Array<{ url?: string; width?: number }>
      webp?: Array<{ url?: string; width?: number }>
    }
  }>
  // Object array with url field
  photos?: Array<{ url?: string }>
  // Alternative media array format
  media?: Array<{ url?: string; type?: string }>
  description?: string
  latitude?: number
  longitude?: number
  // INGEST-001: Zillow's response also includes structured amenity fields.
  // The previous code hardcoded `amenities: null` on the LLM input which is
  // a major contributor to the systematic hallucination findings in Section
  // 1 of the audit. Capturing the common ones so extractAmenities() can map
  // them into a single string[].
  appliances?: string[]
  interiorFeatures?: string[]
  exteriorFeatures?: string[]
  parkingFeatures?: string[]
  coolingFeatures?: string[]
  heatingFeatures?: string[]
  flooring?: string[] | string
  view?: string[] | string
  homeFacts?: Array<{ factLabel?: string; factValue?: string }>
  atAGlanceFacts?: Array<{ factLabel?: string; factValue?: string }>
  hasGarage?: boolean
  hasPool?: boolean
  hasFireplace?: boolean
  // INGEST-001 v2: live RapidAPI responses nest the amenity fields under
  // resoFacts (RESO MLS standard fields). Top-level fields are kept for
  // backward compatibility with the simpler shape some properties
  // returned, but resoFacts is where the actual data is for the modern
  // listings (verified against the prod 10-row sample on 2026-05-13 —
  // every property had top-level nulls and rich resoFacts entries).
  resoFacts?: {
    appliances?: string[]
    interiorFeatures?: string[]
    exteriorFeatures?: string[]
    parkingFeatures?: string[]
    cooling?: string[]
    coolingFeatures?: string[]
    heating?: string[]
    heatingFeatures?: string[]
    flooring?: string[] | string
    view?: string[] | string
    fireplaceFeatures?: string[]
    poolFeatures?: string[]
    spaFeatures?: string[]
    laundryFeatures?: string[]
    patioAndPorchFeatures?: string[]
    lotFeatures?: string[]
    communityFeatures?: string[]
    associationAmenities?: string[]
    accessibilityFeatures?: string[]
    waterSource?: string[] | string
    sewer?: string[] | string
    roofType?: string[] | string
    foundationDetails?: string[] | string
    architecturalStyle?: string[] | string
    hasGarage?: boolean
    hasPool?: boolean
    hasFireplace?: boolean
    hoaFee?: number | string
    monthlyHoaFee?: number | string
    associationFee?: number | string
    homeFacts?: Array<{ factLabel?: string; factValue?: string }>
    atAGlanceFacts?: Array<{ factLabel?: string; factValue?: string }>
  }
  [key: string]: unknown
}

/**
 * INGEST-001: pull a string[] of amenity-like signals out of a Zillow
 * property payload. The shape varies by listing — some fields are arrays,
 * some are scalars, and homeFacts is a label/value pair list — so we
 * normalize everything into a deduped, trimmed string[].
 *
 * Returns null when nothing was extracted, matching the schema's null
 * sentinel and preventing downstream code from interpreting an empty
 * array as "no amenities" vs "data unavailable".
 */
export function extractAmenities(z: ZillowPropertyResponse): string[] | null {
  const items: string[] = []
  const reso = z.resoFacts

  const pushArr = (v: unknown) => {
    if (Array.isArray(v)) {
      for (const entry of v) {
        if (typeof entry === 'string' && entry.trim()) items.push(entry.trim())
      }
    } else if (typeof v === 'string' && v.trim()) {
      items.push(v.trim())
    }
  }

  // Walk both the top level (legacy/simpler responses) and the resoFacts
  // sub-object (RESO standard fields, where modern Zillow responses
  // actually carry the data). The 10-row prod validation on 2026-05-13
  // surfaced every amenity field at resoFacts.* with all top-level
  // counterparts NULL.
  pushArr(z.appliances)
  pushArr(reso?.appliances)
  pushArr(z.interiorFeatures)
  pushArr(reso?.interiorFeatures)
  pushArr(z.exteriorFeatures)
  pushArr(reso?.exteriorFeatures)
  pushArr(z.parkingFeatures)
  pushArr(reso?.parkingFeatures)
  pushArr(z.coolingFeatures)
  pushArr(reso?.coolingFeatures)
  pushArr(reso?.cooling)
  pushArr(z.heatingFeatures)
  pushArr(reso?.heatingFeatures)
  pushArr(reso?.heating)
  pushArr(z.flooring)
  pushArr(reso?.flooring)
  pushArr(z.view)
  pushArr(reso?.view)
  pushArr(reso?.fireplaceFeatures)
  pushArr(reso?.poolFeatures)
  pushArr(reso?.spaFeatures)
  pushArr(reso?.laundryFeatures)
  pushArr(reso?.patioAndPorchFeatures)
  pushArr(reso?.lotFeatures)
  pushArr(reso?.communityFeatures)
  pushArr(reso?.associationAmenities)
  pushArr(reso?.accessibilityFeatures)
  pushArr(reso?.waterSource)
  pushArr(reso?.sewer)
  pushArr(reso?.roofType)
  pushArr(reso?.foundationDetails)
  pushArr(reso?.architecturalStyle)

  if (z.hasGarage || reso?.hasGarage) items.push('Garage')
  if (z.hasPool || reso?.hasPool) items.push('Pool')
  if (z.hasFireplace || reso?.hasFireplace) items.push('Fireplace')

  // Codex P2 (PR #38): `z.homeFacts || z.atAGlanceFacts` was buggy because
  // an empty array is truthy in JavaScript. Listings with
  // `homeFacts: []` and a populated `atAGlanceFacts` would skip the fallback
  // and lose the amenity facts entirely. Pick whichever array actually has
  // entries — checking both top-level and resoFacts since modern responses
  // nest these too.
  const factsCandidates = [
    Array.isArray(z.homeFacts) && z.homeFacts.length > 0 ? z.homeFacts : null,
    Array.isArray(z.atAGlanceFacts) && z.atAGlanceFacts.length > 0
      ? z.atAGlanceFacts
      : null,
    Array.isArray(reso?.homeFacts) && reso.homeFacts.length > 0
      ? reso.homeFacts
      : null,
    Array.isArray(reso?.atAGlanceFacts) && reso.atAGlanceFacts.length > 0
      ? reso.atAGlanceFacts
      : null,
  ]
  const facts = factsCandidates.find((f): f is NonNullable<typeof f> => !!f)
  if (Array.isArray(facts)) {
    for (const fact of facts) {
      if (
        fact &&
        typeof fact.factLabel === 'string' &&
        typeof fact.factValue === 'string' &&
        fact.factValue.trim()
      ) {
        items.push(`${fact.factLabel.trim()}: ${fact.factValue.trim()}`)
      }
    }
  }

  if (!items.length) return null

  // Dedupe case-insensitively but keep the first-encountered casing.
  const seen = new Set<string>()
  const unique: string[] = []
  for (const item of items) {
    const key = item.toLowerCase()
    if (!seen.has(key)) {
      seen.add(key)
      unique.push(item)
    }
  }
  return unique
}
