import { NextResponse } from 'next/server'
import { checkRateLimit, rateLimitKey } from '@/lib/middleware/rateLimiter'

const getRequestIp = (request: Request) => {
  const forwarded = request.headers.get('x-forwarded-for')
  if (forwarded) return forwarded.split(',')[0]?.trim() || 'unknown'
  return request.headers.get('x-real-ip') || 'unknown'
}

export async function rateLimitAdminRoute(
  request: Request,
  routeKey: string
): Promise<NextResponse | null> {
  return checkRateLimit(rateLimitKey(routeKey, getRequestIp(request)))
}
