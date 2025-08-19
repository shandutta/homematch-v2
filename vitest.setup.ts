/* eslint-env node */
import { config } from 'dotenv'
import '@testing-library/jest-dom'

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

// Load test environment variables
// Integration tests use local Supabase Docker stack
config({ path: '.env.test.local' })

// Set NODE_ENV to test for integration tests
if (!process.env.NODE_ENV) {
  Object.defineProperty(process.env, 'NODE_ENV', {
    value: 'test',
    writable: true,
  })
}

// Set default test environment variables for local Supabase
process.env.NEXT_PUBLIC_SUPABASE_URL =
  process.env.NEXT_PUBLIC_SUPABASE_URL || 'http://127.0.0.1:54321'
process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY =
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ||
  'REDACTED_SUPABASE_ANON_KEY'
process.env.SUPABASE_SERVICE_ROLE_KEY =
  process.env.SUPABASE_SERVICE_ROLE_KEY ||
  'REDACTED_SUPABASE_SERVICE_ROLE_KEY'

// Set default BASE_URL for integration tests - force override since it's being set incorrectly
process.env.BASE_URL = 'http://localhost:3000'

// Try to load auth token from temp file if it exists (for integration tests)
import * as fs from 'fs'
import * as path from 'path'

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
