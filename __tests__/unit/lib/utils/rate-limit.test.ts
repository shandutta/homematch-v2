import { describe, test, expect, beforeEach, jest } from '@jest/globals'
import { RateLimiter, resetRateLimitStore } from '@/lib/utils/rate-limit'

describe('RateLimiter', () => {
  const now = 1_000_000
  let nowSpy: jest.SpiedFunction<typeof Date.now>
  const originalEnv = process.env.RATE_LIMIT_ENFORCE_IN_TESTS

  beforeEach(() => {
    process.env.RATE_LIMIT_ENFORCE_IN_TESTS = 'true'
    resetRateLimitStore()
    nowSpy = jest.spyOn(Date, 'now').mockReturnValue(now)
  })

  afterEach(() => {
    process.env.RATE_LIMIT_ENFORCE_IN_TESTS = originalEnv
    resetRateLimitStore()
    nowSpy.mockRestore()
  })

  test('allows requests within limit and blocks after max', async () => {
    const limiter = new RateLimiter(
      { windowMs: 1000, max: 2 },
      { enableTestBypass: false }
    )

    const first = await limiter.check('user1')
    const second = await limiter.check('user1')
    const third = await limiter.check('user1')

    expect(first.success).toBe(true)
    expect(second.success).toBe(true)
    expect(third.success).toBe(false)
    expect(third.remaining).toBe(0)
  })

  test('resets after window passes', async () => {
    const limiter = new RateLimiter(
      { windowMs: 1000, max: 1 },
      { enableTestBypass: false }
    )

    const first = await limiter.check('user2')
    expect(first.success).toBe(true)

    nowSpy.mockReturnValue(now + 2000)
    const second = await limiter.check('user2')
    expect(second.success).toBe(true)
    expect(second.remaining).toBe(0)
  })
})
