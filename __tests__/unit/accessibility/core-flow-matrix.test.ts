// Phase 0/1 closure: P0-accessibility-core-flow
import * as fs from 'node:fs'
import * as path from 'node:path'
import { isProtectedPath } from '../../../src/lib/routing/protected-routes'

const repoRoot = process.cwd()
const matrixPath = path.join(
  repoRoot,
  'reports/home-match-revival/accessibility-core-flow-matrix.md'
)
const matrix = fs.readFileSync(matrixPath, 'utf8')

// /verify-email, /reset-password, /auth/auth-code-error retired in
// Phase 4 of the Supabase-auth elimination (2026-05-13) — Clerk owns
// password reset and email verification on its own hosted pages.
const requiredPublicRoutes = [
  '/',
  '/about',
  '/contact',
  '/login',
  '/signup',
  '/terms',
  '/privacy',
  '/cookies',
]

const requiredProtectedRoutes = [
  '/dashboard',
  '/dashboard/liked',
  '/dashboard/passed',
  '/dashboard/viewed',
  '/dashboard/mutual-likes',
  '/dashboard/activity',
  '/properties/[id]',
  '/couples',
  '/couples/decisions',
  '/settings',
  '/profile',
  '/household/create',
  '/household/join',
]

const routeFiles = [
  'src/app/page.tsx',
  'src/app/about/page.tsx',
  'src/app/contact/page.tsx',
  'src/app/login/page.tsx',
  'src/app/signup/page.tsx',
  'src/app/terms/page.tsx',
  'src/app/privacy/page.tsx',
  'src/app/cookies/page.tsx',
  'src/app/dashboard/page.tsx',
  'src/app/dashboard/liked/page.tsx',
  'src/app/dashboard/passed/page.tsx',
  'src/app/dashboard/viewed/page.tsx',
  'src/app/dashboard/mutual-likes/page.tsx',
  'src/app/dashboard/activity/page.tsx',
  'src/app/properties/[id]/page.tsx',
  'src/app/couples/page.tsx',
  'src/app/couples/decisions/page.tsx',
  'src/app/settings/page.tsx',
  'src/app/profile/page.tsx',
  'src/app/household/create/page.tsx',
  'src/app/household/join/page.tsx',
  'src/app/invite/[token]/page.tsx',
]

const concretePathForMatrixRoute = (route: string) =>
  route.replace('/[id]', '/test-property-id')

describe('accessibility core-flow matrix', () => {
  it('keeps required route files present for the launch-readiness surface', () => {
    for (const file of routeFiles) {
      expect(fs.existsSync(path.join(repoRoot, file))).toBe(true)
    }
  })

  it('documents no-credential public routes as public accessibility smoke targets', () => {
    for (const route of requiredPublicRoutes) {
      expect(matrix).toContain(`\`${route}\``)
    }

    expect(matrix).toContain('Public no-credential')
    expect(matrix).toContain('Ready for no-credential')
    expect(matrix).toContain('without real credentials')
  })

  it('documents protected routes with anonymous redirect evidence and keeps middleware coverage aligned', () => {
    for (const route of requiredProtectedRoutes) {
      expect(matrix).toContain(`\`${route}\``)
      expect(isProtectedPath(concretePathForMatrixRoute(route))).toBe(true)
    }

    expect(matrix).toContain('Protected; anonymous redirect expected')
    expect(matrix).toContain('redirect metadata')
  })

  it('keeps authenticated positive traversal explicitly approval-gated', () => {
    expect(matrix).toContain(
      'Blocked until approved non-production test auth/session'
    )
    expect(matrix).toContain(
      'Do not use production user sessions, production household/listing data, or real invite tokens.'
    )
  })

  it('treats invite as token-public with auth-gated acceptance, not as a normal protected route', () => {
    expect(matrix).toContain('`/invite/[token]`')
    expect(matrix).toContain(
      'Token-public invite view; acceptance is auth-gated'
    )
    expect(isProtectedPath('/invite/test-token')).toBe(false)
  })
})
