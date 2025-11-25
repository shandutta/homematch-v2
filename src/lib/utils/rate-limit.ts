/**
 * Simple in-memory rate limiter for API routes
 * For production, consider using Redis or similar
 */

type RateLimitStore = Map<string, { count: number; resetTime: number }>

const store: RateLimitStore = new Map()

export interface RateLimitConfig {
  windowMs: number // Time window in milliseconds
  max: number // Max requests per window
}

export interface RateLimiterOptions {
  /**
   * When true (default), rate limiting is bypassed in test environments.
   * Useful for e2e/integration tests that shouldn't be blocked.
   */
  enableTestBypass?: boolean
}

export class RateLimiter {
  constructor(
    private config: RateLimitConfig,
    private options: RateLimiterOptions = {}
  ) {}

  private shouldBypassRateLimit() {
    if (this.options.enableTestBypass === false) {
      return false
    }
    return (
      process.env.NEXT_PUBLIC_TEST_MODE === 'true' ||
      process.env.NODE_ENV === 'test'
    )
  }

  async check(
    identifier: string
  ): Promise<{ success: boolean; remaining: number; resetTime: number }> {
    const enforceInTest =
      process.env.RATE_LIMIT_ENFORCE_IN_TESTS === 'true' ||
      process.env.RATE_LIMIT_ENFORCE === 'true'

    // Bypass rate limiting in test mode
    if (!enforceInTest && this.shouldBypassRateLimit()) {
      return {
        success: true,
        remaining: 999,
        resetTime: Date.now() + this.config.windowMs,
      }
    }

    const now = Date.now()
    const record = store.get(identifier)

    // Clean up expired entries periodically
    if (store.size > 1000) {
      this.cleanup(now)
    }

    if (!record || now > record.resetTime) {
      // New window
      const resetTime = now + this.config.windowMs
      store.set(identifier, { count: 1, resetTime })
      return { success: true, remaining: this.config.max - 1, resetTime }
    }

    if (record.count >= this.config.max) {
      // Rate limit exceeded
      return { success: false, remaining: 0, resetTime: record.resetTime }
    }

    // Increment counter
    record.count++
    return {
      success: true,
      remaining: this.config.max - record.count,
      resetTime: record.resetTime,
    }
  }

  private cleanup(now: number) {
    for (const [key, value] of store.entries()) {
      if (now > value.resetTime) {
        store.delete(key)
      }
    }
  }
}

// Default rate limiters
export const apiRateLimiter = new RateLimiter({
  windowMs: 60 * 1000, // 1 minute
  max: 100, // 100 requests per minute
})

export const authRateLimiter = new RateLimiter({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 5, // 5 auth attempts per 15 minutes
})

// Test helpers
export const resetRateLimitStore = () => store.clear()
