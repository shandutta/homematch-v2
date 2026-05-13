import { NextResponse } from 'next/server'
import { createApiClient } from '@/lib/supabase/server'
import type { MapNeighborhoodInput } from '@/lib/maps/geometry'
import { ApiErrorHandler } from '@/lib/api/errors'
import { checkRateLimit, rateLimitKey } from '@/lib/middleware/rateLimiter'

const CACHE_TTL_MS = 1000 * 60 * 60
const metroCache = new Map<string, { expiresAt: number; data: unknown }>()

const getRequestIp = (request: Request): string => {
  const forwarded = request.headers.get('x-forwarded-for')
  if (forwarded) return forwarded.split(',')[0]?.trim() || 'unknown'
  return request.headers.get('x-real-ip') || 'unknown'
}

export async function GET(request: Request) {
  // Per-IP rate limit — endpoint is unauthenticated and hits the DB.
  const rateLimited = await checkRateLimit(
    rateLimitKey('maps:metro-boundaries', getRequestIp(request))
  )
  if (rateLimited) return rateLimited

  const { searchParams } = new URL(request.url)
  const metro = searchParams.get('metro')?.trim()
  const debug = searchParams.get('debug') === '1'

  if (!metro) {
    return ApiErrorHandler.badRequest('Missing metro parameter')
  }

  const cacheKey = metro.toLowerCase()
  const cached = metroCache.get(cacheKey)
  if (cached && cached.expiresAt > Date.now()) {
    return NextResponse.json(cached.data, {
      headers: { 'Cache-Control': 'public, max-age=3600' },
    })
  }

  const supabase = createApiClient()
  const { data, error } = await supabase
    .from('neighborhoods')
    .select('id,name,city,state,bounds')
    .eq('metro_area', metro)
    .order('name')

  if (error) {
    return ApiErrorHandler.serverError(
      `Failed to load neighborhoods: ${error.message}`,
      error
    )
  }

  const { buildMeceNeighborhoods } = await import('@/lib/maps/geometry')
  const neighborhoods: MapNeighborhoodInput[] = data || []
  const processed = buildMeceNeighborhoods(neighborhoods)
  const response = {
    metro,
    precomputed: true,
    neighborhoods: processed.items,
    debug: debug ? processed.debug : undefined,
  }

  metroCache.set(cacheKey, {
    expiresAt: Date.now() + CACHE_TTL_MS,
    data: response,
  })

  return NextResponse.json(response, {
    headers: { 'Cache-Control': 'public, max-age=3600' },
  })
}
