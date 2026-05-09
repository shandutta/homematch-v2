/**
 * @jest-environment node
 */
// Phase 0/1 closure: P0-noauth-traversal-guard

import { createServerClient } from '@supabase/ssr'
import { readFileSync } from 'node:fs'
import { join } from 'node:path'
import { NextRequest } from 'next/server'
import { middleware } from '../../../middleware'
import { isProtectedPath } from '../../../src/lib/routing/protected-routes'

jest.mock('@supabase/ssr', () => ({
  createServerClient: jest.fn(),
}))

type TraversalRoute = {
  path: string
  reportPath?: string
}

const publicNoCredentialRoutes: TraversalRoute[] = [
  { path: '/' },
  { path: '/about' },
  { path: '/contact' },
  { path: '/cookies' },
  { path: '/demo/ads' },
  { path: '/invite/synthetic-invalid-token', reportPath: '/invite/:token' },
  { path: '/login' },
  { path: '/privacy' },
  { path: '/reset-password' },
  { path: '/signup' },
  { path: '/sponsor-mockups' },
  { path: '/terms' },
  { path: '/verify-email' },
  { path: '/auth/auth-code-error' },
]

const protectedNoCredentialRoutes: TraversalRoute[] = [
  { path: '/dashboard' },
  { path: '/dashboard/activity' },
  { path: '/dashboard/liked' },
  { path: '/dashboard/mutual-likes' },
  { path: '/dashboard/passed' },
  { path: '/dashboard/viewed' },
  { path: '/dashboard/vibes-test' },
  { path: '/profile' },
  { path: '/settings' },
  { path: '/household/create' },
  { path: '/household/join' },
  { path: '/couples' },
  { path: '/couples/decisions' },
  { path: '/properties/synthetic-property-id', reportPath: '/properties/:id' },
  { path: '/validation' },
]

const matrixPaths = [
  'reports/home-match-revival/p0-site-traversal-acceptance-matrix-2026-05-08.md',
  'reports/home-match-revival/p0-full-route-api-endpoint-inventory-matrix-2026-05-08.md',
]

const makeRequest = (path: string) =>
  new NextRequest(new URL(path, 'http://localhost:3000'))

const mockedCreateServerClient = jest.mocked(createServerClient)

const readMatrix = (relativePath: string) =>
  readFileSync(join(process.cwd(), relativePath), 'utf8')

const expectedLoginRedirectFor = (path: string) =>
  `http://localhost:3000/login?redirectTo=${encodeURIComponent(path)}`

describe('P0 no-auth traversal smoke guard', () => {
  const originalEnv = { ...process.env }

  beforeEach(() => {
    process.env = {
      ...originalEnv,
      NEXT_PUBLIC_SUPABASE_URL: 'https://example.supabase.co',
      NEXT_PUBLIC_SUPABASE_ANON_KEY: 'anon-key',
      NODE_ENV: 'production',
    }
    mockedCreateServerClient.mockReset()
  })

  afterAll(() => {
    process.env = originalEnv
  })

  it('keeps the public no-credential route set outside middleware protection', () => {
    for (const route of publicNoCredentialRoutes) {
      expect(isProtectedPath(route.path)).toBe(false)
    }
  })

  it('keeps the protected route set inside middleware protection', () => {
    for (const route of protectedNoCredentialRoutes) {
      expect(isProtectedPath(route.path)).toBe(true)
    }
  })

  it('preserves anonymous public route access without a Supabase middleware auth call', async () => {
    for (const route of publicNoCredentialRoutes) {
      const response = await middleware(makeRequest(route.path))

      expect(response.status).toBe(200)
      expect(response.headers.get('location')).toBeNull()
      expect(response.headers.get('X-Frame-Options')).toBe('DENY')
    }

    expect(mockedCreateServerClient).not.toHaveBeenCalled()
  })

  it('preserves anonymous protected route redirects with redirectTo intact and no Supabase middleware auth call', async () => {
    for (const route of protectedNoCredentialRoutes) {
      const response = await middleware(makeRequest(route.path))

      expect(response.status).toBe(307)
      expect(response.headers.get('location')).toBe(
        expectedLoginRedirectFor(route.path)
      )
    }

    const queryRoute = '/couples?tab=activity'
    const queryResponse = await middleware(makeRequest(queryRoute))
    expect(queryResponse.status).toBe(307)
    expect(queryResponse.headers.get('location')).toBe(
      expectedLoginRedirectFor(queryRoute)
    )
    expect(mockedCreateServerClient).not.toHaveBeenCalled()
  })

  it('keeps no-auth route expectations documented in the P0 traversal and inventory matrices', () => {
    const matrices = matrixPaths.map(readMatrix).join('\n')

    for (const route of publicNoCredentialRoutes) {
      expect(matrices).toContain(route.reportPath ?? route.path)
    }
    for (const route of protectedNoCredentialRoutes) {
      expect(matrices).toContain(route.reportPath ?? route.path)
    }

    expect(matrices).toContain('Verify protected pages redirect to /login')
    expect(matrices).toContain('Authenticated traversal has not been run')
    expect(matrices).toContain('approved test auth/session')
  })
})
