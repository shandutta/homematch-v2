/* eslint-env node */
import { config, parse } from 'dotenv'
import {
  createClient as createSupabaseClient,
} from '@supabase/supabase-js'
import '@testing-library/jest-dom'
import { fetch as undiciFetch } from 'undici'
import { execSync } from 'child_process'
import { vi } from 'vitest'
import * as fs from 'fs'
import * as path from 'path'

type SupabaseModule = typeof import('@supabase/supabase-js')
type SupabaseCreateClient = SupabaseModule['createClient']
type CachedSupabaseClient = ReturnType<SupabaseCreateClient>
type SupabaseCreateClientOptions = Parameters<SupabaseCreateClient>[2]

// Deduplicate Supabase clients in Vitest to avoid multiple GoTrue instances sharing storage
const supabaseClientCache = new Map<string, CachedSupabaseClient>()
vi.mock('@supabase/supabase-js', async () => {
  const actual = await vi.importActual<SupabaseModule>('@supabase/supabase-js')
  return {
    ...actual,
    createClient: (
      url: string,
      key: string,
      options?: SupabaseCreateClientOptions
    ) => {
      const cacheKey = `${url}:${key}`
      if (!supabaseClientCache.has(cacheKey)) {
        const mergedOptions: SupabaseCreateClientOptions = {
          ...(options ?? {}),
          auth: {
            ...options?.auth,
            autoRefreshToken: false,
            persistSession: false,
            storage: undefined,
            storageKey:
              options?.auth?.storageKey ||
              `vitest-${process.env.VITEST_POOL_ID || '1'}-${key.slice(0, 6)}`,
          },
        }
        const client = actual.createClient(url, key, mergedOptions)
        supabaseClientCache.set(
          cacheKey,
          client
        )
      }
      return supabaseClientCache.get(cacheKey)!
    },
  }
})

// Provide a minimal localStorage/sessionStorage implementation when Node's
// experimental storage API is unavailable or missing core methods.
if (
  typeof globalThis.localStorage === 'undefined' ||
  typeof globalThis.localStorage.clear !== 'function'
) {
  class MemoryStorage implements Storage {
    private store = new Map<string, string>()

    get length(): number {
      return this.store.size
    }

    clear(): void {
      this.store.clear()
    }

    getItem(key: string): string | null {
      const value = this.store.get(key)
      return typeof value === 'undefined' ? null : value
    }

    key(index: number): string | null {
      const keys = Array.from(this.store.keys())
      return keys[index] ?? null
    }

    removeItem(key: string): void {
      this.store.delete(key)
    }

    setItem(key: string, value: string): void {
      this.store.set(key, String(value))
    }
  }
  const createStorage = () => new MemoryStorage()

  if (typeof globalThis.Storage === 'undefined') {
    Object.defineProperty(globalThis, 'Storage', {
      value: MemoryStorage,
      configurable: true,
      writable: true,
    })
  }

  Object.defineProperty(globalThis, 'localStorage', {
    value: createStorage(),
    configurable: true,
    writable: true,
  })

  Object.defineProperty(globalThis, 'sessionStorage', {
    value: createStorage(),
    configurable: true,
    writable: true,
  })
}

// Mock canvas API for image-blur tests
Object.defineProperty(HTMLCanvasElement.prototype, 'getContext', {
  value: () => {
    return {
      fillStyle: '',
      fillRect: () => {},
      getImageData: () => ({ data: new Uint8ClampedArray(4) }),
      putImageData: () => {},
      createImageData: () => ({ data: new Uint8ClampedArray(4) }),
      setTransform: () => {},
      drawImage: () => {},
      save: () => {},
      fillText: () => {},
      restore: () => {},
      beginPath: () => {},
      moveTo: () => {},
      lineTo: () => {},
      closePath: () => {},
      stroke: () => {},
      translate: () => {},
      scale: () => {},
      rotate: () => {},
      arc: () => {},
      fill: () => {},
      measureText: () => ({ width: 0 }),
      transform: () => {},
      rect: () => {},
      clip: () => {},
    }
  },
})

// Mock HTMLCanvasElement.toDataURL
Object.defineProperty(HTMLCanvasElement.prototype, 'toDataURL', {
  value: () => 'data:image/png;base64,test',
})

// Vitest is used for integration tests only
// Unit tests use Jest directly

// Load test environment variables from .env.local (primary) and allow CI override with .env.test.local
config({ path: '.env.local' })
// Ensure .env.test.local can override .env.local values for local testing
config({ path: '.env.test.local', override: true })

const markSupabaseHeavyTestsSkipped = (reason: string) => {
  if (
    process.env.SKIP_HEAVY_TESTS === 'true' ||
    process.env.SKIP_HEAVY_INTEGRATION === 'true'
  ) {
    return
  }

  process.env.SKIP_HEAVY_TESTS = 'true'
  process.env.SKIP_HEAVY_INTEGRATION = 'true'
  process.env.SUPABASE_INTEGRATION_DISABLED_REASON = reason
  console.warn(
    `Skipping heavy Supabase integration tests: ${reason}. Set RUN_SUPABASE_INTEGRATION=true to force.`
  )
}

// Set NODE_ENV to test for integration tests
if (!process.env.NODE_ENV) {
  Object.defineProperty(process.env, 'NODE_ENV', {
    value: 'test',
    writable: true,
  })
}

// Set test environment variables for local Supabase (pull from env / .env.prod)
let supabaseUrl =
  process.env.SUPABASE_LOCAL_PROXY_TARGET ||
  process.env.NEXT_PUBLIC_SUPABASE_URL ||
  process.env.SUPABASE_URL ||
  'http://127.0.0.1:54321'

process.env.NEXT_PUBLIC_SUPABASE_URL = supabaseUrl
process.env.SUPABASE_URL = process.env.SUPABASE_URL || supabaseUrl

let supabaseAnonKey =
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ||
  process.env.SUPABASE_ANON_KEY ||
  ''
let supabaseServiceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY || ''
const forceSupabaseIntegration =
  process.env.RUN_SUPABASE_INTEGRATION === 'true' ||
  process.env.FORCE_SUPABASE_TESTS === 'true'

// Ensure we use the same AbortController brand as undici's fetch implementation
const AbortCtor = globalThis.AbortController

function loadFallbackSupabaseEnv(): {
  url: string
  anonKey: string
  serviceKey: string
} | null {
  const testEnvPath = path.join(process.cwd(), '.env.test.local')
  if (!fs.existsSync(testEnvPath)) {
    return null
  }

  try {
    const parsed = parse(fs.readFileSync(testEnvPath))
    const url = parsed.NEXT_PUBLIC_SUPABASE_URL || parsed.SUPABASE_URL
    const anonKey =
      parsed.NEXT_PUBLIC_SUPABASE_ANON_KEY || parsed.SUPABASE_ANON_KEY
    const serviceKey = parsed.SUPABASE_SERVICE_ROLE_KEY

    if (!url || !anonKey || !serviceKey) {
      return null
    }

    return { url, anonKey, serviceKey }
  } catch {
    return null
  }
}

async function performSupabaseHealthCheck(
  url: string | undefined,
  anonKey: string | undefined,
  serviceKey: string | undefined
): Promise<{ ok: boolean; reason?: string }> {
  if (!url || !anonKey || !serviceKey) {
    return {
      ok: false,
      reason:
        'Missing Supabase credentials (URL/anon/service role) for health check',
    }
  }

  try {
    const controller =
      typeof AbortCtor === 'function' ? new AbortCtor() : new AbortController()
    const timeoutId = setTimeout(() => controller.abort(), 5000)
    const response = await undiciFetch(`${url}/rest/v1/`, {
      headers: { apikey: anonKey },
      signal: controller.signal,
    })
    clearTimeout(timeoutId)

    const apiReachable = response.ok || response.status === 401
    if (!apiReachable) {
      return { ok: false, reason: `Supabase API not reachable at ${url}` }
    }

    const { data, error } = await createSupabaseClient(url, serviceKey)
      .from('user_profiles')
      .select('id')
      .limit(1)

    if (error || !data?.length) {
      return {
        ok: false,
        reason:
          'Supabase schema or seed data missing. Run pnpm test:integration to provision the local stack.',
      }
    }

    return { ok: true }
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'unknown error'
    return {
      ok: false,
      reason: `Supabase health check failed: ${message}`,
    }
  }
}

if (typeof AbortCtor === 'function') {
  // Align global AbortController for any downstream fetch usage
  globalThis.AbortController = AbortCtor as typeof AbortController
}

if (!supabaseAnonKey || !supabaseServiceRoleKey) {
  const fallback = loadFallbackSupabaseEnv()
  if (fallback) {
    supabaseUrl = fallback.url
    supabaseAnonKey = fallback.anonKey
    supabaseServiceRoleKey = fallback.serviceKey
    process.env.NEXT_PUBLIC_SUPABASE_URL = supabaseUrl
    process.env.SUPABASE_URL = supabaseUrl
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY = supabaseAnonKey
    process.env.SUPABASE_ANON_KEY = supabaseAnonKey
    process.env.SUPABASE_SERVICE_ROLE_KEY = supabaseServiceRoleKey
  } else {
    markSupabaseHeavyTestsSkipped(
      'Missing Supabase credentials (NEXT_PUBLIC_SUPABASE_ANON_KEY and SUPABASE_SERVICE_ROLE_KEY)'
    )
  }
} else {
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY = supabaseAnonKey
  process.env.SUPABASE_SERVICE_ROLE_KEY = supabaseServiceRoleKey
}

if (!forceSupabaseIntegration && supabaseAnonKey && supabaseServiceRoleKey) {
  const runSupabaseHealthCheck = async () => {
    const primary = await performSupabaseHealthCheck(
      supabaseUrl,
      supabaseAnonKey,
      supabaseServiceRoleKey
    )

    if (primary.ok) {
      return
    }

    const fallbackEnv = loadFallbackSupabaseEnv()
    if (fallbackEnv) {
      const fallback = await performSupabaseHealthCheck(
        fallbackEnv.url,
        fallbackEnv.anonKey,
        fallbackEnv.serviceKey
      )

      if (fallback.ok) {
        supabaseUrl = fallbackEnv.url
        supabaseAnonKey = fallbackEnv.anonKey
        supabaseServiceRoleKey = fallbackEnv.serviceKey
        process.env.NEXT_PUBLIC_SUPABASE_URL = supabaseUrl
        process.env.SUPABASE_URL = supabaseUrl
        process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY = supabaseAnonKey
        process.env.SUPABASE_ANON_KEY = supabaseAnonKey
        process.env.SUPABASE_SERVICE_ROLE_KEY = supabaseServiceRoleKey
        return
      }

      if (fallback.reason) {
        return markSupabaseHeavyTestsSkipped(fallback.reason)
      }
    }

    if (primary.reason) {
      return markSupabaseHeavyTestsSkipped(primary.reason)
    }

    markSupabaseHeavyTestsSkipped('Supabase health check failed')
  }

  await runSupabaseHealthCheck()
}

// Ensure test profiles exist before any suites run; reseed if empty
if (!supabaseServiceRoleKey) {
  if (process.env.DEBUG_TEST_SETUP) {
    console.warn(
      '⚠️  DEBUG_TEST_SETUP: skipping user_profiles verification because SUPABASE_SERVICE_ROLE_KEY is missing.'
    )
  }
} else {
  try {
    const { count, error } = await createSupabaseClient(
      supabaseUrl,
      supabaseServiceRoleKey
    )
      .from('user_profiles')
      .select('id', { count: 'exact', head: true })

    if (error || !count || count < 2) {
      console.warn(
        `⚠️  user_profiles missing or empty (count=${count || 0}). Reseeding test users...`
      )
      execSync('node scripts/setup-test-users-admin.js', {
        stdio: 'inherit',
        cwd: process.cwd(),
        env: { ...process.env },
      })

      const { count: afterCount, error: afterError } =
        await createSupabaseClient(supabaseUrl, supabaseServiceRoleKey)
          .from('user_profiles')
          .select('id', { count: 'exact', head: true })

      if (afterError || !afterCount || afterCount < 2) {
        console.warn(
          `⚠️  user_profiles still empty after reseed (count=${afterCount || 0}).`
        )
      } else if (process.env.DEBUG_TEST_SETUP) {
        console.debug(
          `✅ DEBUG_TEST_SETUP: user_profiles reseeded, count=${afterCount}`
        )
      }
    } else if (process.env.DEBUG_TEST_SETUP) {
      console.debug(
        `✅ DEBUG_TEST_SETUP: user_profiles count before tests = ${count}`
      )
    }
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : String(err)
    console.warn(
      '⚠️  DEBUG_TEST_SETUP: could not verify/seed user_profiles:',
      message
    )
  }
}

// Set default BASE_URL for integration tests - force override since it's being set incorrectly
process.env.BASE_URL = 'http://localhost:3000'

// Try to load auth token from temp file if it exists (for integration tests)
try {
  const tokenFile = path.join(process.cwd(), '.test-auth-token')
  if (fs.existsSync(tokenFile)) {
    const token = fs.readFileSync(tokenFile, 'utf8').trim()
    if (token) {
      process.env.TEST_AUTH_TOKEN = token
      if (process.env.DEBUG_TEST_SETUP) {
        console.debug('✅ Loaded TEST_AUTH_TOKEN from .test-auth-token')
      }
    }
  }
} catch {
  // Ignore - token may not be needed for all tests
}

// No mocks in integration tests - we use the real Supabase Docker stack

// Global test isolation: each test gets a clean database state
import { beforeEach, afterEach } from 'vitest'

let testStartTime = 0

beforeEach(() => {
  // Record test start time for isolation
  testStartTime = Date.now()

  // Force garbage collection if available (helps with memory isolation)
  if (global.gc) {
    global.gc()
  }
})

afterEach(() => {
  // Add small delay between tests to prevent race conditions
  const testDuration = Date.now() - testStartTime
  if (testDuration < 50) {
    // If test was very fast, add small delay to prevent DB race conditions
    return new Promise((resolve) => setTimeout(resolve, 50 - testDuration))
  }
})
