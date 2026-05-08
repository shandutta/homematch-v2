import { ApiErrorHandler } from '@/lib/api/errors'
import type { RateLimiterMemory as RateLimiterMemoryType } from 'rate-limiter-flexible'
import RateLimiterMemory from 'rate-limiter-flexible/lib/RateLimiterMemory'
import { NextRequest, NextResponse } from 'next/server'

// Different rate limit tiers
type RateLimitTierConfig = {
  points: number
  duration: number
  blockDuration: number
}

type RateLimitTierKey = 'strict' | 'standard' | 'relaxed' | 'auth' | 'testing'

const RATE_LIMIT_TIERS: Record<RateLimitTierKey, RateLimitTierConfig> = {
  strict: {
    points: 10,
    duration: 60, // 10 requests per minute
    blockDuration: 60 * 5, // Block for 5 minutes
  },
  standard: {
    points: 30,
    duration: 60, // 30 requests per minute
    blockDuration: 60 * 2, // Block for 2 minutes
  },
  relaxed: {
    points: 100,
    duration: 60, // 100 requests per minute
    blockDuration: 60, // Block for 1 minute
  },
  auth: {
    points: 5,
    duration: 60 * 15, // 5 attempts per 15 minutes
    blockDuration: 60 * 30, // Block for 30 minutes on failure
  },
  testing: {
    points: 1000,
    duration: 60, // 1000 requests per minute for testing
    blockDuration: 5, // Block for 5 seconds only
  },
}

// Create rate limiter instances
// Deep import to avoid pulling optional adapters (e.g. Drizzle) from the package entrypoint
const rateLimiters = new Map<string, RateLimiterMemoryType>()

const isRateLimiterResponse = (
  value: unknown
): value is { msBeforeNext?: number; remainingPoints?: number } =>
  typeof value === 'object' &&
  value !== null &&
  ('msBeforeNext' in value || 'remainingPoints' in value)

function getRateLimiter(
  tier: keyof typeof RATE_LIMIT_TIERS
): RateLimiterMemoryType {
  const key = tier
  if (!rateLimiters.has(key)) {
    const config = RATE_LIMIT_TIERS[tier]
    rateLimiters.set(
      key,
      new RateLimiterMemory({
        points: config.points,
        duration: config.duration,
        blockDuration: config.blockDuration,
        keyPrefix: `rl_${tier}_`,
      })
    )
  }
  return rateLimiters.get(key)!
}

export type RateLimitTier = keyof typeof RATE_LIMIT_TIERS

const shouldBypassRateLimit = () => {
  const enforceInTest =
    process.env.RATE_LIMIT_ENFORCE_IN_TESTS === 'true' ||
    process.env.RATE_LIMIT_ENFORCE === 'true'

  if (enforceInTest) {
    return false
  }

  return (
    process.env.NEXT_PUBLIC_TEST_MODE === 'true' ||
    process.env.NODE_ENV === 'test'
  )
}

export const resetRateLimiters = () => rateLimiters.clear()

const rateLimitExceededResponse = (
  tier: RateLimitTier,
  rateLimiterRes: unknown,
  message = 'Rate limit exceeded. Please try again later.'
) => {
  const res = isRateLimiterResponse(rateLimiterRes) ? rateLimiterRes : {}
  const msBeforeNext =
    typeof res.msBeforeNext === 'number' ? res.msBeforeNext : 60000
  const remainingPoints =
    typeof res.remainingPoints === 'number' ? res.remainingPoints : 0
  const retryAfter = Math.round(msBeforeNext / 1000) || 60

  return ApiErrorHandler.tooManyRequests(message, {
    'Retry-After': String(retryAfter),
    'X-RateLimit-Limit': String(RATE_LIMIT_TIERS[tier].points),
    'X-RateLimit-Remaining': String(remainingPoints),
    'X-RateLimit-Reset': new Date(Date.now() + msBeforeNext).toISOString(),
  })
}

// Get client identifier from request without touching auth/session state.
function getClientIdentifier(request: NextRequest): string {
  const forwarded = request.headers.get('x-forwarded-for')
  const realIp = request.headers.get('x-real-ip')
  const ip = forwarded ? forwarded.split(',')[0]?.trim() : realIp || 'unknown'
  return `ip_${ip || 'unknown'}`
}

export async function checkRateLimit(
  identifier: string,
  tier: RateLimitTier = 'relaxed'
): Promise<NextResponse | null> {
  if (shouldBypassRateLimit()) {
    return null
  }

  try {
    await getRateLimiter(tier).consume(identifier)
    return null
  } catch (rateLimiterRes: unknown) {
    return rateLimitExceededResponse(tier, rateLimiterRes)
  }
}

// Rate limiting middleware
export async function rateLimit(
  request: NextRequest,
  tier: RateLimitTier = 'standard'
): Promise<NextResponse | null> {
  return checkRateLimit(getClientIdentifier(request), tier)
}

// Utility function for API route usage
export async function withRateLimit(
  request: NextRequest,
  handler: () => Promise<NextResponse>,
  tier: RateLimitTier = 'standard'
): Promise<NextResponse> {
  try {
    const rateLimitResponse = await rateLimit(request, tier)
    if (rateLimitResponse) {
      return rateLimitResponse
    }

    // Execute handler with proper error handling
    try {
      return await handler()
    } catch (handlerError) {
      console.error('[withRateLimit] Handler error:', handlerError)

      // Check if it's an auth error (common pattern)
      if (handlerError instanceof Error) {
        if (
          handlerError.message.includes('Unauthorized') ||
          handlerError.message.includes('auth') ||
          handlerError.message.includes('token')
        ) {
          return ApiErrorHandler.unauthorized()
        }
      }

      // Return generic 500 for other errors
      return ApiErrorHandler.serverError('Internal Server Error', handlerError)
    }
  } catch (rateLimitError) {
    console.error('[withRateLimit] Rate limit error:', rateLimitError)

    // If rate limiting itself fails, allow the request but log the error
    try {
      return await handler()
    } catch (handlerError) {
      console.error(
        '[withRateLimit] Handler error after rate limit failure:',
        handlerError
      )
      return ApiErrorHandler.serverError('Internal Server Error', handlerError)
    }
  }
}

// Enhanced rate limiting for authentication endpoints
export async function authRateLimit(
  request: NextRequest,
  identifier?: string
): Promise<NextResponse | null> {
  try {
    const clientId = identifier || getClientIdentifier(request)
    const rateLimiter = getRateLimiter('auth')

    // Try to consume a point
    await rateLimiter.consume(clientId)

    // Request allowed
    return null
  } catch (rateLimiterRes: unknown) {
    // Auth rate limit exceeded - potential brute force attempt
    const res = isRateLimiterResponse(rateLimiterRes) ? rateLimiterRes : {}
    const msBeforeNext =
      typeof res.msBeforeNext === 'number' ? res.msBeforeNext : 1800000
    const remainingPoints =
      typeof res.remainingPoints === 'number' ? res.remainingPoints : 0
    const retryAfter = Math.round(msBeforeNext / 1000) || 1800

    // Log potential security incident
    console.warn('[Security] Auth rate limit exceeded:', {
      clientId: identifier || 'unknown',
      remainingPoints,
      msBeforeNext,
    })

    return ApiErrorHandler.tooManyRequests(
      'Too many authentication attempts. Your account has been temporarily locked for security.',
      {
        'Retry-After': String(retryAfter),
        'X-RateLimit-Limit': String(RATE_LIMIT_TIERS.auth.points),
        'X-RateLimit-Remaining': String(remainingPoints),
        'X-RateLimit-Reset': new Date(Date.now() + msBeforeNext).toISOString(),
      }
    )
  }
}
