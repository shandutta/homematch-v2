import type { RateLimiterMemory as RateLimiterMemoryType } from 'rate-limiter-flexible'
import RateLimiterMemory from 'rate-limiter-flexible/lib/RateLimiterMemory'
import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

// Different rate limit tiers
const RATE_LIMIT_TIERS = {
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
} as const

// Create rate limiter instances
// Deep import to avoid pulling optional adapters (e.g. Drizzle) from the package entrypoint
const rateLimiters = new Map<string, RateLimiterMemoryType>()

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

// Get client identifier from request
async function getClientIdentifier(request: NextRequest): Promise<string> {
  // Try to get user ID from auth session
  try {
    const supabase = await createClient()
    const {
      data: { user },
    } = await supabase.auth.getUser()
    if (user?.id) {
      return `user_${user.id}`
    }
  } catch {
    // Fallback to IP-based identification
  }

  // Fallback to IP address
  const forwarded = request.headers.get('x-forwarded-for')
  const realIp = request.headers.get('x-real-ip')
  const ip = forwarded ? forwarded.split(',')[0] : realIp || 'unknown'
  return `ip_${ip}`
}

// Rate limiting middleware
export async function rateLimit(
  request: NextRequest,
  tier: keyof typeof RATE_LIMIT_TIERS = 'standard'
): Promise<NextResponse | null> {
  // Use testing tier during test mode
  if (
    process.env.NEXT_PUBLIC_TEST_MODE === 'true' ||
    process.env.NODE_ENV === 'test'
  ) {
    tier = 'testing'
  }
  try {
    const clientId = await getClientIdentifier(request)
    const rateLimiter = getRateLimiter(tier)

    // Try to consume a point
    await rateLimiter.consume(clientId)

    // Request allowed
    return null
  } catch (rateLimiterRes: unknown) {
    // Rate limit exceeded
    const res = rateLimiterRes as {
      msBeforeNext?: number
      remainingPoints?: number
    }
    const retryAfter = Math.round(res.msBeforeNext || 60000 / 1000) || 60

    return NextResponse.json(
      {
        error: 'Too Many Requests',
        message: 'Rate limit exceeded. Please try again later.',
        retryAfter,
      },
      {
        status: 429,
        headers: {
          'Retry-After': String(retryAfter),
          'X-RateLimit-Limit': String(RATE_LIMIT_TIERS[tier].points),
          'X-RateLimit-Remaining': String(res.remainingPoints || 0),
          'X-RateLimit-Reset': new Date(
            Date.now() + (res.msBeforeNext || 60000)
          ).toISOString(),
        },
      }
    )
  }
}

// Utility function for API route usage
export async function withRateLimit(
  request: NextRequest,
  handler: () => Promise<NextResponse>,
  tier: keyof typeof RATE_LIMIT_TIERS = 'standard'
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
          return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
        }
      }

      // Return generic 500 for other errors
      return NextResponse.json(
        { error: 'Internal Server Error' },
        { status: 500 }
      )
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
      return NextResponse.json(
        { error: 'Internal Server Error' },
        { status: 500 }
      )
    }
  }
}

// Enhanced rate limiting for authentication endpoints
export async function authRateLimit(
  request: NextRequest,
  identifier?: string
): Promise<NextResponse | null> {
  try {
    const clientId = identifier || (await getClientIdentifier(request))
    const rateLimiter = getRateLimiter('auth')

    // Try to consume a point
    await rateLimiter.consume(clientId)

    // Request allowed
    return null
  } catch (rateLimiterRes: unknown) {
    // Auth rate limit exceeded - potential brute force attempt
    const res = rateLimiterRes as {
      msBeforeNext?: number
      remainingPoints?: number
    }
    const retryAfter = Math.round((res.msBeforeNext || 1800000) / 1000) || 1800

    // Log potential security incident
    console.warn('[Security] Auth rate limit exceeded:', {
      clientId: identifier || 'unknown',
      remainingPoints: res.remainingPoints || 0,
      msBeforeNext: res.msBeforeNext,
    })

    return NextResponse.json(
      {
        error: 'Too Many Authentication Attempts',
        message:
          'Too many authentication attempts. Your account has been temporarily locked for security.',
        retryAfter,
      },
      {
        status: 429,
        headers: {
          'Retry-After': String(retryAfter),
          'X-RateLimit-Limit': String(RATE_LIMIT_TIERS.auth.points),
          'X-RateLimit-Remaining': String(res.remainingPoints || 0),
          'X-RateLimit-Reset': new Date(
            Date.now() + (res.msBeforeNext || 1800000)
          ).toISOString(),
        },
      }
    )
  }
}
