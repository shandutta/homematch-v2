/* eslint-env node */
import { config, parse } from 'dotenv'
import { createClient as createSupabaseClient } from '@supabase/supabase-js'
import '@testing-library/jest-dom'
import {
  fetch as undiciFetch,
  Headers as UndiciHeaders,
  Request as UndiciRequest,
  Response as UndiciResponse,
} from 'undici'
import { execSync } from 'child_process'
import { vi } from 'vitest'
import * as fs from 'fs'
import * as path from 'path'

// Suppress known harmless warnings during tests
const originalWarn = console.warn
console.warn = (...args: unknown[]) => {
  const message = args[0]
  if (
    typeof message === 'string' &&
    message.includes('Multiple GoTrueClient instances detected')
  ) {
    // This warning is expected in test environment where multiple clients
    // are created for different test scenarios. It doesn't affect test validity.
    return
  }
  originalWarn.apply(console, args)
}

type UndiciFetchResponse = Awaited<ReturnType<typeof undiciFetch>>
type UndiciFetchArgs = Parameters<typeof undiciFetch>
type UndiciFetchInput = UndiciFetchArgs[0]
type UndiciFetchInit = UndiciFetchArgs[1]
type SupabaseModule = typeof import('@supabase/supabase-js')
type SupabaseSsrModule = typeof import('@supabase/ssr')
type SupabaseCreateClient = SupabaseModule['createClient']
type CachedSupabaseClient = ReturnType<SupabaseCreateClient>
type SupabaseCreateClientOptions = Parameters<SupabaseCreateClient>[2]

// Unique storage key prefix per worker to avoid GoTrue collisions
const storageKeyPrefix = `vitest-${process.env.VITEST_POOL_ID || process.pid || '1'}`

// In-memory storage implementation for tests to avoid GoTrueClient collision warnings
class TestMemoryStorage {
  private store = new Map<string, string>()
  private id: string

  constructor(id: string) {
    this.id = id
  }

  getItem(key: string): string | null {
    return this.store.get(`${this.id}:${key}`) ?? null
  }

  setItem(key: string, value: string): void {
    this.store.set(`${this.id}:${key}`, value)
  }

  removeItem(key: string): void {
    this.store.delete(`${this.id}:${key}`)
  }
}

// Deduplicate Supabase clients in Vitest to avoid multiple GoTrue instances sharing storage
const supabaseClientCache = new Map<string, CachedSupabaseClient>()
let clientCounter = 0

const createCachedClient = (
  actualCreateClient: SupabaseCreateClient,
  url: string,
  key: string,
  options?: SupabaseCreateClientOptions
): CachedSupabaseClient => {
  // Include auth header and test user index in cache key to ensure different auth contexts get different clients
  const globalHeaders = (
    options?.global as { headers?: Record<string, string> }
  )?.headers
  const authHeader = globalHeaders?.Authorization
  const testUserIndex = globalHeaders?.['X-Test-User-Index']

  // Build cache key suffix: prefer auth header, then test user index, then noauth
  const authKey = authHeader
    ? `:auth:${authHeader.slice(-8)}`
    : testUserIndex
      ? `:user:${testUserIndex}`
      : ':noauth'
  const cacheKey = `${url}:${key}:${storageKeyPrefix}${authKey}`
  if (!supabaseClientCache.has(cacheKey)) {
    const clientId = `${storageKeyPrefix}-${++clientCounter}`
    const mergedOptions: SupabaseCreateClientOptions = {
      ...(options ?? {}),
      auth: {
        ...options?.auth,
        autoRefreshToken: false,
        persistSession: false,
        // Use custom in-memory storage to avoid GoTrueClient collision detection
        storage: new TestMemoryStorage(clientId),
        storageKey: clientId,
      },
    }
    const client = actualCreateClient(url, key, mergedOptions)
    supabaseClientCache.set(cacheKey, client)
  }
  return supabaseClientCache.get(cacheKey)!
}

vi.mock('@supabase/supabase-js', async () => {
  const actual = await vi.importActual<SupabaseModule>('@supabase/supabase-js')
  return {
    ...actual,
    createClient: (
      url: string,
      key: string,
      options?: SupabaseCreateClientOptions
    ) => createCachedClient(actual.createClient, url, key, options),
  }
})

// Also mock @supabase/ssr to use consistent auth options
vi.mock('@supabase/ssr', async () => {
  const actual = await vi.importActual<SupabaseSsrModule>('@supabase/ssr')
  const supabaseJs = await vi.importActual<SupabaseModule>(
    '@supabase/supabase-js'
  )

  return {
    ...actual,
    createBrowserClient: (
      url: string,
      key: string,
      options?: SupabaseCreateClientOptions
    ) => createCachedClient(supabaseJs.createClient, url, key, options),
    createServerClient: (
      url: string,
      key: string,
      options?: SupabaseCreateClientOptions
    ) => createCachedClient(supabaseJs.createClient, url, key, options),
  }
})

// Resilient fetch wrapper with exponential backoff and jitter
// Smooths out transient Supabase "upstream" 502s and network issues
const RETRYABLE_STATUS = new Set([502, 503, 504])
const RETRYABLE_ERROR =
  /(ECONNREFUSED|ENOTFOUND|ECONNRESET|ETIMEDOUT|EAI_AGAIN|socket hang up|network timeout)/i

// Configurable via environment variables (CI can use higher values for resilience)
const maxFetchRetries = Number(process.env.SUPABASE_FETCH_RETRIES ?? 3)
const fetchBaseDelayMs = Number(
  process.env.SUPABASE_FETCH_RETRY_DELAY_MS ?? 100
)
const fetchMaxDelayMs = 10000
const fetchTimeoutMs = Number(process.env.SUPABASE_FETCH_TIMEOUT_MS ?? 30000)
const JITTER_PERCENT = 0.25 // Add 0-25% random jitter to prevent thundering herd

const sleep = (ms: number) =>
  new Promise((resolve) => {
    setTimeout(resolve, ms)
  })

/**
 * Calculate exponential backoff delay with jitter.
 * @param attempt - Current attempt number (0-indexed)
 * @returns Delay in milliseconds
 */
function calculateBackoffDelay(attempt: number): number {
  const exponentialDelay = Math.min(
    fetchBaseDelayMs * Math.pow(2, attempt),
    fetchMaxDelayMs
  )
  const jitter = exponentialDelay * Math.random() * JITTER_PERCENT
  return Math.round(exponentialDelay + jitter)
}

async function fetchWithRetry(
  input: RequestInfo | URL,
  init?: RequestInit,
  attempt = 0
): Promise<UndiciFetchResponse> {
  const url = input.toString()
  // Only log API requests to avoid noise
  if (url.includes('/api/')) {
    console.log(
      `[Fetch] ${init?.method || 'GET'} ${url} (Attempt ${attempt + 1})`
    )
  }

  try {
    // Add timeout to prevent hanging requests
    const controller = new AbortController()
    const timeoutId = setTimeout(() => controller.abort(), fetchTimeoutMs)

    const response = await undiciFetch(
      input as unknown as UndiciFetchInput,
      {
        ...init,
        signal: controller.signal,
      } as unknown as UndiciFetchInit
    )

    clearTimeout(timeoutId)

    if (attempt < maxFetchRetries && RETRYABLE_STATUS.has(response.status)) {
      // Clean up the current response stream before retrying
      if (response.body && typeof response.body.cancel === 'function') {
        response.body.cancel()
      }
      const delay = calculateBackoffDelay(attempt)
      await sleep(delay)
      return fetchWithRetry(input, init, attempt + 1)
    }
    return response
  } catch (error) {
    // Handle AggregateError from Node fetch - errors are nested
    let message = error instanceof Error ? error.message : String(error)
    if (
      error &&
      typeof error === 'object' &&
      'errors' in error &&
      Array.isArray((error as { errors: unknown[] }).errors)
    ) {
      const nestedErrors = (error as { errors: Error[] }).errors
      message = nestedErrors.map((e) => e.message).join(' ')
    }

    const isRetryable =
      RETRYABLE_ERROR.test(message) || message.includes('aborted')
    if (attempt < maxFetchRetries && isRetryable) {
      const delay = calculateBackoffDelay(attempt)
      await sleep(delay)
      return fetchWithRetry(input, init, attempt + 1)
    }
    throw error
  }
}

// Apply the resilient fetch globally for integration tests
// eslint-disable-next-line @typescript-eslint/no-explicit-any
;(globalThis as any).fetch = fetchWithRetry
// Ensure associated fetch globals are available (helps when Node lacks them)
if (typeof globalThis.Headers === 'undefined') {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  ;(globalThis as any).Headers = UndiciHeaders
}
if (typeof globalThis.Request === 'undefined') {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  ;(globalThis as any).Request = UndiciRequest
}
if (typeof globalThis.Response === 'undefined') {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  ;(globalThis as any).Response = UndiciResponse
}

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

// Mock window.matchMedia for framer-motion (required for prefers-reduced-motion detection)
Object.defineProperty(window, 'matchMedia', {
  writable: true,
  value: vi.fn().mockImplementation((query: string) => ({
    matches: false,
    media: query,
    onchange: null,
    addListener: vi.fn(), // deprecated
    removeListener: vi.fn(), // deprecated
    addEventListener: vi.fn(),
    removeEventListener: vi.fn(),
    dispatchEvent: vi.fn(),
  })),
})

// Mock ResizeObserver for framer-motion projection system
class MockResizeObserver {
  observe = vi.fn()
  unobserve = vi.fn()
  disconnect = vi.fn()
}
Object.defineProperty(globalThis, 'ResizeObserver', {
  writable: true,
  configurable: true,
  value: MockResizeObserver,
})

// Mock visualViewport for framer-motion resize listener
Object.defineProperty(window, 'visualViewport', {
  writable: true,
  configurable: true,
  value: {
    addEventListener: vi.fn(),
    removeEventListener: vi.fn(),
    width: 1024,
    height: 768,
    offsetLeft: 0,
    offsetTop: 0,
    pageLeft: 0,
    pageTop: 0,
    scale: 1,
    onresize: null,
    onscroll: null,
  },
})

// Mock clipboard API for @testing-library/user-event
Object.defineProperty(navigator, 'clipboard', {
  writable: true,
  configurable: true,
  value: {
    writeText: vi.fn().mockResolvedValue(undefined),
    readText: vi.fn().mockResolvedValue(''),
    write: vi.fn().mockResolvedValue(undefined),
    read: vi.fn().mockResolvedValue([]),
    addEventListener: vi.fn(),
    removeEventListener: vi.fn(),
    dispatchEvent: vi.fn(),
  },
})

// Mock framer-motion to avoid projection system issues in JSDOM
vi.mock('framer-motion', async () => {
  const actual =
    await vi.importActual<typeof import('framer-motion')>('framer-motion')
  const React = await import('react')

  // Create a simple passthrough component that renders children without animations
  const createMotionComponent = (tag: string) => {
    const Component = React.forwardRef<
      HTMLElement,
      React.HTMLAttributes<HTMLElement> & {
        children?: React.ReactNode
        initial?: unknown
        animate?: unknown
        exit?: unknown
        transition?: unknown
        variants?: unknown
        whileHover?: unknown
        whileTap?: unknown
        whileFocus?: unknown
        whileInView?: unknown
        layout?: unknown
        layoutId?: string
        drag?: unknown
        dragConstraints?: unknown
        onDragEnd?: unknown
        onDragStart?: unknown
        onAnimationStart?: unknown
        onAnimationComplete?: unknown
      }
    >((props, ref) => {
      // Strip framer-motion specific props
      const {
        initial: _initial,
        animate: _animate,
        exit: _exit,
        transition: _transition,
        variants: _variants,
        whileHover: _whileHover,
        whileTap: _whileTap,
        whileFocus: _whileFocus,
        whileInView: _whileInView,
        layout: _layout,
        layoutId: _layoutId,
        drag: _drag,
        dragConstraints: _dragConstraints,
        onDragEnd: _onDragEnd,
        onDragStart: _onDragStart,
        onAnimationStart: _onAnimationStart,
        onAnimationComplete: _onAnimationComplete,
        ...htmlProps
      } = props
      return React.createElement(tag, { ...htmlProps, ref })
    })
    Component.displayName = `motion.${tag}`
    return Component
  }

  const motion = new Proxy(
    {},
    {
      get: (_, tag: string) => createMotionComponent(tag),
    }
  ) as typeof actual.motion

  return {
    ...actual,
    motion,
    AnimatePresence: ({ children }: { children?: React.ReactNode }) => children,
    LazyMotion: ({ children }: { children?: React.ReactNode }) => children,
    MotionConfig: ({ children }: { children?: React.ReactNode }) => children,
    domAnimation: {},
    domMax: {},
  }
})

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

  const message = `Supabase integration prerequisites failed: ${reason}`
  process.env.SUPABASE_INTEGRATION_DISABLED_REASON = reason
  throw new Error(message)
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
    // Use fetchWithRetry for resilience against transient connection failures
    // (Kong gateway may still be initializing after DB reset)
    const response = await fetchWithRetry(`${url}/rest/v1/`, {
      headers: { apikey: anonKey },
    })

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

async function ensureBaselinePropertyData(
  url: string,
  serviceKey: string
): Promise<void> {
  try {
    const adminClient = createSupabaseClient(url, serviceKey)
    const { count, error } = await adminClient
      .from('properties')
      .select('id', { count: 'exact', head: true })
      .eq('is_active', true)

    if (error) {
      console.warn(
        '⚠️  Unable to verify baseline property data:',
        error?.message ?? String(error)
      )
      return
    }

    // Seed if we have fewer than 3 properties (ensures diverse test data)
    if (count && count >= 3) {
      return
    }

    // Diverse test properties to support filter-builder-patterns.test.ts
    const neighborhoodId = '99999999-aaaa-bbbb-cccc-000000000001'

    await adminClient.from('neighborhoods').upsert(
      [
        {
          id: neighborhoodId,
          name: 'Integration Test Neighborhood',
          city: 'Test City',
          state: 'CA',
          bounds:
            '((-122.52,37.70),(-122.52,37.82),(-122.36,37.82),(-122.36,37.70))',
          median_price: 750000,
          walk_score: 80,
          transit_score: 70,
        },
      ],
      { onConflict: 'id' }
    )

    // Seed multiple properties with diverse attributes for filter tests
    // Include images to prevent marketing route from hitting slow fallback paths
    const testProperties = [
      {
        id: '99999999-aaaa-bbbb-cccc-000000000002',
        zpid: 'test-zpid-1',
        address: '1 Integration Test Way',
        city: 'Test City',
        state: 'CA',
        zip_code: '99999',
        price: 825000,
        bedrooms: 3,
        bathrooms: 2.5,
        square_feet: 1650,
        property_type: 'single_family',
        listing_status: 'active',
        coordinates: '(-122.45,37.77)',
        neighborhood_id: neighborhoodId,
        year_built: 2010,
        lot_size_sqft: 5000,
        parking_spots: 2,
        amenities: ['pool', 'garage'],
        images: ['https://example.com/test-property-1.jpg'],
        property_hash: 'integration-test-hash-1',
        is_active: true,
      },
      {
        id: '99999999-aaaa-bbbb-cccc-000000000003',
        zpid: 'test-zpid-2',
        address: '2 Vintage Lane',
        city: 'Test City',
        state: 'CA',
        zip_code: '99999',
        price: 450000,
        bedrooms: 2,
        bathrooms: 1,
        square_feet: 1200,
        property_type: 'condo',
        listing_status: 'pending',
        coordinates: '(-122.44,37.76)',
        neighborhood_id: neighborhoodId,
        year_built: 1985,
        lot_size_sqft: null,
        parking_spots: 1,
        amenities: ['gym'],
        images: ['https://example.com/test-property-2.jpg'],
        property_hash: 'integration-test-hash-2',
        is_active: true,
      },
      {
        id: '99999999-aaaa-bbbb-cccc-000000000004',
        zpid: 'test-zpid-3',
        address: '3 Modern Ave',
        city: 'Test City',
        state: 'CA',
        zip_code: '99999',
        price: 1200000,
        bedrooms: 4,
        bathrooms: 3,
        square_feet: 2500,
        property_type: 'single_family',
        listing_status: 'active',
        coordinates: '(-122.46,37.78)',
        neighborhood_id: neighborhoodId,
        year_built: 2022,
        lot_size_sqft: 8000,
        parking_spots: 3,
        amenities: ['pool', 'spa', 'smart-home'],
        images: ['https://example.com/test-property-3.jpg'],
        property_hash: 'integration-test-hash-3',
        is_active: true,
      },
    ]

    await adminClient
      .from('properties')
      .upsert(testProperties, { onConflict: 'id' })
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : String(err)
    console.warn('⚠️  Could not seed baseline property data:', message)
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

  // Ensure core property/neighborhood fixtures exist so integration tests have deterministic data
  await ensureBaselinePropertyData(supabaseUrl, supabaseServiceRoleKey)
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

let _testStartTime = 0

beforeEach(() => {
  // Record test start time for isolation
  _testStartTime = Date.now()
})

afterEach(() => {
  // No delay needed for sequential tests
})
