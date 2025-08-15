import { NextResponse } from 'next/server'

type ZillowImagesResponse = {
  images?: string[]
  [k: string]: unknown
}

type ZillowCard = {
  zpid: string
  imageUrl: string
  price?: number
  bedrooms?: number
  bathrooms?: number
  address?: string
  latitude?: number
  longitude?: number
}

/**
 * Resolve actual ZPIDs at runtime using a fixed search query: "San Francisco, CA".
 * This increases variety without exposing credentials client-side.
 */

const DEFAULT_HOST = 'zillow-com1.p.rapidapi.com'
const DEFAULT_QUERY = 'San Francisco, CA'

type ZillowSearchResult = {
  zpid?: number | string
  price?: number
  bedrooms?: number
  bathrooms?: number
  address?: string
  latitude?: number
  longitude?: number
  imgSrc?: string
}
function toNumberOrUndefined(v: unknown): number | undefined {
  return typeof v === 'number' ? v : undefined
}
function toStringOrUndefined(v: unknown): string | undefined {
  return typeof v === 'string' ? v : undefined
}
function materializeCardFromSearch(
  item: ZillowSearchResult,
  imageUrl: string
): ZillowCard {
  return {
    zpid: String(item.zpid),
    imageUrl,
    price: toNumberOrUndefined(item.price),
    bedrooms: toNumberOrUndefined(item.bedrooms),
    bathrooms: toNumberOrUndefined(item.bathrooms),
    address: toStringOrUndefined(item.address),
    latitude: toNumberOrUndefined(item.latitude),
    longitude: toNumberOrUndefined(item.longitude),
  }
}

type ZillowSearchResponse = {
  props?: ZillowSearchResult[]
  results?: ZillowSearchResult[]
  [k: string]: unknown
}

/* eslint-disable @typescript-eslint/no-unused-vars */
function pickRandom<T>(arr: T[]): T {
  return arr[Math.floor(Math.random() * arr.length)]
}
/* eslint-enable @typescript-eslint/no-unused-vars */

export async function GET() {
  const RAPIDAPI_KEY = process.env.RAPIDAPI_KEY
  const RAPIDAPI_HOST = process.env.RAPIDAPI_HOST || DEFAULT_HOST

  if (!RAPIDAPI_KEY) {
    console.error('RAPIDAPI_KEY not configured')
    return NextResponse.json(
      { error: 'Application is not configured for Zillow API access.' },
      { status: 503 }
    )
  }

  // 1) Fetch search results (request up to 3 results via pageSize if supported)
  const searchUrl = `https://${RAPIDAPI_HOST}/propertyExtendedSearch?location=${encodeURIComponent(
    DEFAULT_QUERY
  )}&status_type=ForSale&home_type=Houses&page=1&pageSize=3`
  const searchRes = await fetch(searchUrl, {
    headers: {
      'X-RapidAPI-Key': RAPIDAPI_KEY,
      'X-RapidAPI-Host': RAPIDAPI_HOST,
    },
    cache: 'no-store',
  })

  if (!searchRes.ok) {
    return NextResponse.json(
      {
        error: `Zillow search failed: ${searchRes.status} ${searchRes.statusText}`,
      },
      { status: 502 }
    )
  }

  const searchData = (await searchRes.json()) as ZillowSearchResponse
  // propertyExtendedSearch returns results under props
  const pool = Array.isArray(searchData.props)
    ? searchData.props
    : Array.isArray(searchData.results)
      ? searchData.results
      : []
  const candidates = pool.filter(
    (p) => typeof p?.zpid === 'number' || typeof p?.zpid === 'string'
  )
  if (candidates.length === 0) {
    return NextResponse.json(
      { error: 'No properties found from search query' },
      { status: 204 }
    )
  }

  // take up to first 3 candidates to populate 3 phone cards
  const chosen = candidates.slice(0, 3)

  // 2) Retrieve images for each chosen zpid in parallel and build rich cards
  const cards: ZillowCard[] = []
  for (const item of chosen) {
    const zpid = String(item.zpid)
    const url = `https://${RAPIDAPI_HOST}/images?zpid=${encodeURIComponent(zpid)}`
    try {
      const res = await fetch(url, {
        headers: {
          'X-RapidAPI-Key': RAPIDAPI_KEY,
          'X-RapidAPI-Host': RAPIDAPI_HOST,
        },
        cache: 'no-store',
      })
      if (!res.ok) {
        continue
      }
      const data = (await res.json()) as ZillowImagesResponse
      const images = Array.isArray(data.images) ? data.images : []
      if (images.length === 0) continue

      // Prefer first image for consistency
      const imageUrl = images[0]
      cards.push(materializeCardFromSearch(item, imageUrl))
    } catch {
      // ignore this item on failure
      continue
    }
  }

  if (cards.length === 0) {
    return NextResponse.json(
      { error: 'No images returned for selected properties' },
      { status: 204 }
    )
  }

  // If only one card, return single card for backward-compat; else return array
  return NextResponse.json(cards.length === 1 ? cards[0] : cards)
}
