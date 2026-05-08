/**
 * @jest-environment node
 *
 * D2 durable rate-limiter approval-gate guard.
 *
 * Phase 0/1 launch posture: only the in-memory provider is executable.
 * Any other provider name must fail closed at startup so a Vercel KV /
 * Upstash / Redis / Memcached / Dragonfly env value cannot silently
 * promote the limiter into "durable" mode without an approved adapter.
 *
 * This guard exists alongside `rate-limiter-check.test.ts`, which already
 * covers the `redis` example. This file enumerates the broader set of
 * paid/external provider names that have come up in past discussion so
 * a future config change cannot bypass the gate by picking a name that
 * happens not to be exercised by the existing tests.
 *
 * Non-goals: this guard does NOT select, provision, import, or call any
 * external/paid limiter store. It only verifies that the repo continues
 * to fail closed and that no paid limiter SDK has been pulled in.
 */

import { readFileSync } from 'fs'
import { join } from 'path'
import {
  getConfiguredRateLimitStorageProvider,
  resetRateLimiters,
} from '@/lib/middleware/rateLimiter'

const RATE_LIMITER_SOURCE_PATH = 'src/lib/middleware/rateLimiter.ts'
const PACKAGE_JSON_PATH = 'package.json'
const CLOSURE_MATRIX_PATH =
  'reports/home-match-revival/phase0-phase1-closure-matrix.md'

const readRepoFile = (relativePath: string) =>
  readFileSync(join(process.cwd(), relativePath), 'utf8')

// Known durable / external / paid provider names that have been mentioned
// as future candidates or are well-known limiter backends. None of these
// are approved for Phase 0/1 launch; all must throw the approval-required
// adapter error from `getConfiguredRateLimitStorageProvider()`.
const APPROVAL_GATED_PROVIDER_NAMES = [
  'upstash',
  'upstash-redis',
  '@upstash/redis',
  'vercel-kv',
  '@vercel/kv',
  'redis',
  'ioredis',
  'redis-cluster',
  'memcached',
  'dragonfly',
  'cloudflare-kv',
  'cloudflare-durable-objects',
  'fly-redis',
  'postgres',
  'supabase',
  'edge-config',
  'durable',
  'kv',
  'external',
  'production',
  'unknown-provider',
  '',
  '   ',
] as const

// Paid/external limiter SDKs that must NOT be imported by the limiter
// source while D2 remains approval-gated. Catches both bare specifiers
// and require-style references.
const FORBIDDEN_SDK_IMPORT_PATTERNS: ReadonlyArray<RegExp> = [
  /['"]@upstash\/redis['"]/,
  /['"]@upstash\/ratelimit['"]/,
  /['"]@vercel\/kv['"]/,
  /['"]ioredis['"]/,
  /['"]redis['"]/,
  /['"]node-redis['"]/,
  /['"]memcached['"]/,
  /['"]memjs['"]/,
  /['"]dragonfly['"]/,
  /['"]cloudflare:.*kv['"]/i,
]

// Paid/external limiter SDK package names that must NOT appear as
// dependencies in package.json while D2 remains approval-gated.
const FORBIDDEN_DEPENDENCY_NAMES: ReadonlyArray<string> = [
  '@upstash/redis',
  '@upstash/ratelimit',
  '@vercel/kv',
  'ioredis',
  'redis',
  'node-redis',
  'memcached',
  'memjs',
]

describe('D2 durable rate-limiter approval-gate guard', () => {
  const originalEnv = { ...process.env }

  beforeEach(() => {
    process.env = { ...originalEnv }
    delete process.env.NEXT_PUBLIC_TEST_MODE
    process.env.NODE_ENV = 'production'
    resetRateLimiters()
  })

  afterEach(() => {
    process.env = originalEnv
    resetRateLimiters()
  })

  it('returns the in-memory contract only for the approved "memory" provider name', () => {
    delete process.env.RATE_LIMIT_STORAGE_PROVIDER
    expect(getConfiguredRateLimitStorageProvider()).toEqual({
      provider: 'memory',
      durable: false,
    })

    process.env.RATE_LIMIT_STORAGE_PROVIDER = 'memory'
    expect(getConfiguredRateLimitStorageProvider()).toEqual({
      provider: 'memory',
      durable: false,
    })

    process.env.RATE_LIMIT_STORAGE_PROVIDER = '  MEMORY  '
    expect(getConfiguredRateLimitStorageProvider()).toEqual({
      provider: 'memory',
      durable: false,
    })
  })

  it.each(APPROVAL_GATED_PROVIDER_NAMES)(
    'fails closed when RATE_LIMIT_STORAGE_PROVIDER="%s" (no silent durable promotion)',
    (providerName) => {
      process.env.RATE_LIMIT_STORAGE_PROVIDER = providerName
      const isBlankProvider = providerName.trim().length === 0

      if (isBlankProvider) {
        expect(getConfiguredRateLimitStorageProvider()).toEqual({
          provider: 'memory',
          durable: false,
        })
        return
      }

      expect(() => getConfiguredRateLimitStorageProvider()).toThrow(
        /requires an approved adapter before production use/
      )
    }
  )

  it('does not import any paid/external limiter SDK from the rate limiter source', () => {
    const source = readRepoFile(RATE_LIMITER_SOURCE_PATH)
    const offenders = FORBIDDEN_SDK_IMPORT_PATTERNS.filter((pattern) =>
      pattern.test(source)
    ).map((pattern) => pattern.source)

    expect(offenders).toEqual([])
    expect(source).toContain('rate-limiter-flexible/lib/RateLimiterMemory')
  })

  it('does not list any paid/external limiter SDK as a dependency in package.json', () => {
    const pkg = JSON.parse(readRepoFile(PACKAGE_JSON_PATH)) as {
      dependencies?: Record<string, string>
      devDependencies?: Record<string, string>
      optionalDependencies?: Record<string, string>
    }

    const declared = new Set([
      ...Object.keys(pkg.dependencies ?? {}),
      ...Object.keys(pkg.devDependencies ?? {}),
      ...Object.keys(pkg.optionalDependencies ?? {}),
    ])

    const offenders = FORBIDDEN_DEPENDENCY_NAMES.filter((name) =>
      declared.has(name)
    )
    expect(offenders).toEqual([])
  })

  it('preserves the documented approval-gate seam in the limiter source', () => {
    const source = readRepoFile(RATE_LIMITER_SOURCE_PATH)

    expect(source).toContain(
      "RATE_LIMIT_STORAGE_PROVIDER_ENV = 'RATE_LIMIT_STORAGE_PROVIDER'"
    )
    expect(source).toContain('getConfiguredRateLimitStorageProvider')
    expect(source).toContain(
      'requires an approved adapter before production use'
    )
    expect(source).toContain("provider === 'memory'")
  })

  it('keeps D2 recorded as owner/ops approval-gated in the closure matrix', () => {
    const closureMatrix = readRepoFile(CLOSURE_MATRIX_PATH)

    expect(closureMatrix).toContain(
      'durable provider choice/provisioning remains owner/ops approval-gated'
    )
    expect(closureMatrix).toContain('only `memory` executable')
    expect(closureMatrix).toContain(
      'd2-durable-rate-limiter-approval-gate-guard-2026-05-08.md'
    )
  })
})
