import { NextResponse } from 'next/server'
import { createClient as createSupabaseServerClient } from '@/lib/supabase/server'
import { ApiErrorHandler } from '@/lib/api/errors'
import { withPerformanceTracking } from '@/lib/utils/performance'

type MarketingCard = {
  zpid: string
  imageUrl: string | null
  price: number | null
  bedrooms: number | null
  bathrooms: number | null
  address: string
  latitude: number | null
  longitude: number | null
}

interface DbPropertyRow {
  zpid: string
  images: string[] | null
  price: number | null
  bedrooms: number | null
  bathrooms: number | null
  address: string | null
  city: string | null
  state: string | null
  zip_code: string | null
  coordinates?: unknown
  longitude: number | null
  latitude: number | null
}

async function getMarketingProperties(): Promise<NextResponse> {
  try {
    const supabase = await createSupabaseServerClient()

    // Select top 3 active properties ordered by updated_at DESC NULLS LAST, price DESC
    // Execute standard query (no custom RPC in this project)
    const error: null = null
    const data: null = null

    let rows: DbPropertyRow[] | null = null

    // In development, prefer reading from local seed JSON to ensure real Zillow image URLs
    const preferSeed = process.env.NODE_ENV !== 'production'

    if (!preferSeed && (error || data === null)) {
      // Fallback to standard query if RPC is not available
      const { data: qData, error: qErr } = await supabase
        .from('properties')
        .select(
          `
          zpid,
          images,
          price,
          bedrooms,
          bathrooms,
          address,
          city,
          state,
          zip_code,
          coordinates
        `
        )
        .eq('listing_status', 'active')
        .order('updated_at', { ascending: false, nullsFirst: false })
        .order('price', { ascending: false, nullsFirst: false })
        .limit(10)

      if (qErr) {
        console.error('Database query error:', qErr)
        return ApiErrorHandler.serverError('Failed to fetch properties', qErr)
      }

      rows =
        qData?.map((r): DbPropertyRow => {
          // coordinates is PostGIS POINT; in Supabase JS it often returns as GeoJSON or WKT depending on config.
          // Our migrations set geometry; by default, Supabase returns as GeoJSON if using PostgREST with `Accept-Profile: ...`.
          // We defensively parse longitude/latitude for common shapes.
          let longitude: number | null = null
          let latitude: number | null = null

          const coords = r.coordinates
          if (coords && typeof coords === 'object') {
            // GeoJSON: { type: 'Point', coordinates: [lng, lat] }
            if (
              coords.type === 'Point' &&
              Array.isArray(coords.coordinates) &&
              coords.coordinates.length === 2
            ) {
              longitude = Number(coords.coordinates[0])
              latitude = Number(coords.coordinates[1])
            }
          }

          return {
            zpid: r.zpid as string,
            images: (r.images as string[] | null) ?? null,
            price: r.price as number | null,
            bedrooms: r.bedrooms as number | null,
            bathrooms: r.bathrooms as number | null,
            address: (r.address as string | null) ?? null,
            city: (r.city as string | null) ?? null,
            state: (r.state as string | null) ?? null,
            zip_code: (r.zip_code as string | null) ?? null,
            longitude,
            latitude,
          }
        }) ?? null
    } else {
      rows = data
    }

    // If DB had no images (e.g. local env not seeded), fallback to local seed JSON
    // In dev, force using local seed JSON to ensure updated Zillow image URLs in the UI
    let effectiveRows = rows ?? []
    if (preferSeed || effectiveRows.length === 0) {
      try {
        // Dynamically read the local seed JSON to serve marketing images in dev
        const { promises: fsp } = await import('fs')
        const { default: path } = await import('path')
        const seedPath = path.join(
          process.cwd(),
          'migrated_data',
          'seed-properties.json'
        )
        const raw = await fsp.readFile(seedPath, 'utf-8')
        type SeedRow = {
          zpid?: string
          images?: string[]
          price?: number
          bedrooms?: number
          bathrooms?: number
          address?: string
          city?: string
          state?: string
          zip_code?: string
          latitude?: number
          longitude?: number
        }
        const seedArr = JSON.parse(raw) as SeedRow[]
        effectiveRows = (seedArr || []).slice(0, 10).map((r) => ({
          zpid: String(r.zpid ?? ''),
          images: Array.isArray(r.images) ? r.images : null,
          price: r.price ?? null,
          bedrooms: r.bedrooms ?? null,
          bathrooms: r.bathrooms ?? null,
          address: r.address ?? null,
          city: r.city ?? null,
          state: r.state ?? null,
          zip_code: r.zip_code ?? null,
          longitude: r.longitude ?? null,
          latitude: r.latitude ?? null,
        }))
      } catch {
        // ignore if seed file not available
      }
    }

    // Enforce images presence in app layer to avoid PostgREST array filter pitfalls
    const withImages = (effectiveRows || [])
      .filter(
        (r) =>
          Array.isArray(r.images) &&
          r.images.length > 0 &&
          typeof r.images[0] === 'string' &&
          r.images[0].length > 0
      )
      .slice(0, 3)

    const cards: MarketingCard[] =
      withImages?.map((r) => {
        const formattedAddress = [
          r.address ?? '',
          r.city ?? '',
          r.state ?? '',
          r.zip_code ?? '',
        ]
          .filter(Boolean)
          .join(', ')
          .replace(', ,', ',')

        // prefer first image from images[]
        const imageUrl =
          Array.isArray(r.images) && r.images.length > 0 ? r.images[0] : null

        return {
          zpid: r.zpid,
          imageUrl,
          price: r.price,
          bedrooms: r.bedrooms,
          bathrooms: r.bathrooms,
          address: formattedAddress,
          latitude: r.latitude,
          longitude: r.longitude,
        }
      }) ?? []

    if (cards.length > 0) {
      return NextResponse.json(cards, { status: 200 })
    }

    // Fallback: zero rows. Fetch a few images from existing RapidAPI Zillow route without persisting.
    try {
      const fallbackImages: string[] = []

      // Build absolute base URL for production if NEXT_PUBLIC_BASE_URL is not set
      // Using a dynamic base avoids relative URL issues in some serverless environments.
      const base =
        process.env.NEXT_PUBLIC_BASE_URL &&
        process.env.NEXT_PUBLIC_BASE_URL.length > 0
          ? process.env.NEXT_PUBLIC_BASE_URL
          : 'http://localhost:3000'

      for (let i = 0; i < 3; i++) {
        const res = await fetch(`${base}/api/zillow/random-image`, {
          method: 'GET',
          cache: 'no-store',
        })
        if (res.ok) {
          // Support both legacy single-card {url} and newer array of cards
          const payload = (await res.json()) as
            | { url?: string }
            | { imageUrl?: string }
            | Array<{ imageUrl?: string; url?: string }>
          const urls: string[] = Array.isArray(payload)
            ? payload
                .map((p) => p.imageUrl || p.url)
                .filter((s): s is string => typeof s === 'string')
            : [
                (payload as { imageUrl?: string }).imageUrl,
                (payload as { url?: string }).url,
              ].filter((s): s is string => typeof s === 'string')

          if (urls[0]) {
            fallbackImages.push(urls[0])
          }
        }
      }

      const placeholderCards: MarketingCard[] = fallbackImages.map(
        (url, idx) => ({
          zpid: `fallback-${idx + 1}`,
          imageUrl: url,
          price: null,
          bedrooms: null,
          bathrooms: null,
          address: 'Coming soon',
          latitude: null,
          longitude: null,
        })
      )

      return NextResponse.json(placeholderCards, { status: 200 })
    } catch {
      // As a last resort, return empty
      return NextResponse.json([], { status: 200 })
    }
  } catch (err) {
    return ApiErrorHandler.serverError('Failed to retrieve marketing properties', err)
  }
}

export const GET = withPerformanceTracking(getMarketingProperties, 'GET /api/properties/marketing')
