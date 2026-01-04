import { NextResponse } from 'next/server'
import { getServiceRoleClient } from '@/lib/supabase/service-role-client'
import {
  buildMeceNeighborhoods,
  type MapNeighborhoodInput,
} from '@/lib/maps/geometry'

const CACHE_TTL_MS = 1000 * 60 * 60
const metroCache = new Map<string, { expiresAt: number; data: unknown }>()

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url)
  const metro = searchParams.get('metro')?.trim()
  const debug = searchParams.get('debug') === '1'

  if (!metro) {
    return NextResponse.json(
      { error: 'Missing metro parameter' },
      { status: 400 }
    )
  }

  const cacheKey = metro.toLowerCase()
  const cached = metroCache.get(cacheKey)
  if (cached && cached.expiresAt > Date.now()) {
    return NextResponse.json(cached.data, {
      headers: { 'Cache-Control': 'public, max-age=3600' },
    })
  }

  const supabase = await getServiceRoleClient()
  const { data, error } = await supabase
    .from('neighborhoods')
    .select('id,name,city,state,bounds')
    .eq('metro_area', metro)
    .order('name')

  if (error) {
    return NextResponse.json(
      { error: `Failed to load neighborhoods: ${error.message}` },
      { status: 500 }
    )
  }

  const neighborhoods = (data || []) as MapNeighborhoodInput[]
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
