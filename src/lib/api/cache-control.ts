import { NextResponse } from 'next/server'

export const USER_SPECIFIC_NO_STORE_CACHE_CONTROL =
  'private, no-store, no-cache, must-revalidate, max-age=0'

export function withUserSpecificNoStoreHeaders(response: NextResponse) {
  response.headers.set('Cache-Control', USER_SPECIFIC_NO_STORE_CACHE_CONTROL)
  return response
}

export function noStoreJson<T>(
  body: T,
  init: ResponseInit = {}
): NextResponse<T> {
  const response = NextResponse.json(body, init)
  return withUserSpecificNoStoreHeaders(response) as NextResponse<T>
}
