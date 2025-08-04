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

// No mocks in integration tests - we use the real Supabase Docker stack
