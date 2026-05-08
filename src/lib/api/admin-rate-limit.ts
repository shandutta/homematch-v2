import { NextResponse } from 'next/server'
import { ApiErrorHandler } from '@/lib/api/errors'
import { apiRateLimiter } from '@/lib/utils/rate-limit'

const getRequestIp = (request: Request) => {
  const forwarded = request.headers.get('x-forwarded-for')
  if (forwarded) return forwarded.split(',')[0]?.trim() || 'unknown'
  return request.headers.get('x-real-ip') || 'unknown'
}

export async function rateLimitAdminRoute(
  request: Request,
  routeKey: string
): Promise<NextResponse | null> {
  const result = await apiRateLimiter.check(
    `${routeKey}:${getRequestIp(request)}`
  )

  if (result.success) return null

  return ApiErrorHandler.tooManyRequests()
}
