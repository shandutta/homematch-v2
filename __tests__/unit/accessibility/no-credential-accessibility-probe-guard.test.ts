/**
 * @jest-environment node
 */

import { existsSync, readFileSync } from 'node:fs'
import { join } from 'node:path'
import { isProtectedPath } from '../../../src/lib/routing/protected-routes'

type AccessibilityProbeRoute = {
  path: string
  routeFile: string
  posture: 'public-no-credential' | 'protected-anonymous-redirect'
  matrixLabel: string
  matrixPath?: string
}

const publicProbeRoutes: AccessibilityProbeRoute[] = [
  {
    path: '/',
    routeFile: 'src/app/page.tsx',
    posture: 'public-no-credential',
    matrixLabel: 'Public landing',
  },
  {
    path: '/about',
    routeFile: 'src/app/about/page.tsx',
    posture: 'public-no-credential',
    matrixLabel: 'Marketing/about',
  },
  {
    path: '/contact',
    routeFile: 'src/app/contact/page.tsx',
    posture: 'public-no-credential',
    matrixLabel: 'Marketing/about',
  },
  {
    path: '/terms',
    routeFile: 'src/app/terms/page.tsx',
    posture: 'public-no-credential',
    matrixLabel: 'Legal/privacy',
  },
  {
    path: '/privacy',
    routeFile: 'src/app/privacy/page.tsx',
    posture: 'public-no-credential',
    matrixLabel: 'Legal/privacy',
  },
  {
    path: '/cookies',
    routeFile: 'src/app/cookies/page.tsx',
    posture: 'public-no-credential',
    matrixLabel: 'Legal/privacy',
  },
  {
    path: '/login',
    routeFile: 'src/app/login/page.tsx',
    posture: 'public-no-credential',
    matrixLabel: 'Auth login',
  },
  {
    path: '/signup',
    routeFile: 'src/app/signup/page.tsx',
    posture: 'public-no-credential',
    matrixLabel: 'Auth signup',
  },
  {
    path: '/reset-password',
    routeFile: 'src/app/reset-password/page.tsx',
    posture: 'public-no-credential',
    matrixLabel: 'Auth support',
  },
  {
    path: '/verify-email',
    routeFile: 'src/app/verify-email/page.tsx',
    posture: 'public-no-credential',
    matrixLabel: 'Auth support',
  },
  {
    path: '/auth/auth-code-error',
    routeFile: 'src/app/auth/auth-code-error/page.tsx',
    posture: 'public-no-credential',
    matrixLabel: 'Auth support',
  },
]

const protectedProbeRoutes: AccessibilityProbeRoute[] = [
  {
    path: '/dashboard',
    routeFile: 'src/app/dashboard/page.tsx',
    posture: 'protected-anonymous-redirect',
    matrixLabel: 'Dashboard home',
  },
  {
    path: '/dashboard/liked',
    routeFile: 'src/app/dashboard/liked/page.tsx',
    posture: 'protected-anonymous-redirect',
    matrixLabel: 'Dashboard lists',
  },
  {
    path: '/profile',
    routeFile: 'src/app/profile/page.tsx',
    posture: 'protected-anonymous-redirect',
    matrixLabel: 'Profile',
  },
  {
    path: '/settings',
    routeFile: 'src/app/settings/page.tsx',
    posture: 'protected-anonymous-redirect',
    matrixLabel: 'Settings',
  },
  {
    path: '/household/create',
    routeFile: 'src/app/household/create/page.tsx',
    posture: 'protected-anonymous-redirect',
    matrixLabel: 'Household create/join',
  },
  {
    path: '/household/join',
    routeFile: 'src/app/household/join/page.tsx',
    posture: 'protected-anonymous-redirect',
    matrixLabel: 'Household create/join',
  },
  {
    path: '/couples',
    routeFile: 'src/app/couples/page.tsx',
    posture: 'protected-anonymous-redirect',
    matrixLabel: 'Couples overview',
  },
  {
    path: '/couples/decisions',
    routeFile: 'src/app/couples/decisions/page.tsx',
    posture: 'protected-anonymous-redirect',
    matrixLabel: 'Couples decisions',
  },
  {
    path: '/properties/synthetic-property-id',
    routeFile: 'src/app/properties/[id]/page.tsx',
    posture: 'protected-anonymous-redirect',
    matrixLabel: 'Property detail',
  },
  {
    path: '/validation',
    routeFile: 'src/app/validation/page.tsx',
    posture: 'protected-anonymous-redirect',
    matrixLabel: 'Dashboard home',
  },
]

const allProbeRoutes = [...publicProbeRoutes, ...protectedProbeRoutes]

const readRepoFile = (relativePath: string) =>
  readFileSync(join(process.cwd(), relativePath), 'utf8')

const routeFileExists = (relativePath: string) =>
  existsSync(join(process.cwd(), relativePath))

describe('no-credential accessibility probe guard', () => {
  const matrix = readRepoFile(
    'reports/home-match-revival/accessibility-core-flow-matrix.md'
  )
  const smokeReport = readRepoFile(
    'reports/home-match-revival/no-auth-public-accessibility-smoke.md'
  )
  const playwrightSpec = readRepoFile(
    '__tests__/e2e/no-auth-public-accessibility.spec.ts'
  )

  it('keeps every no-credential accessibility probe route backed by a repo-local page file', () => {
    for (const route of allProbeRoutes) {
      expect(routeFileExists(route.routeFile)).toBe(true)
    }
  })

  it('keeps public accessibility probes outside protected middleware', () => {
    for (const route of publicProbeRoutes) {
      expect(isProtectedPath(route.path)).toBe(false)
      expect(playwrightSpec).toContain(`{ path: '${route.path}'`)
      expect(smokeReport).toContain(route.path)
    }
  })

  it('keeps anonymous protected accessibility probes redirect-only and credentialless', () => {
    for (const route of protectedProbeRoutes) {
      expect(isProtectedPath(route.path)).toBe(true)
      expect(playwrightSpec).toContain(`'${route.path}'`)
      expect(smokeReport).toContain(route.path)
    }

    expect(playwrightSpec).toContain('storageState: { cookies: [], origins: [] }')
    expect(playwrightSpec).toContain('redirectTo')
    expect(playwrightSpec).not.toMatch(/SUPABASE_SERVICE_ROLE_KEY|service_role/i)
  })

  it('keeps the accessibility matrix aligned with the no-credential probe posture', () => {
    for (const route of allProbeRoutes) {
      expect(matrix).toContain(route.matrixLabel)
      expect(matrix).toContain(route.matrixPath ?? route.path.replace('synthetic-property-id', '[id]'))
    }

    expect(matrix).toContain('Public no-credential')
    expect(matrix).toContain('Protected; anonymous redirect expected')
    expect(matrix).toContain('approved non-production test auth/session')
    expect(matrix).toMatch(/Do not use production user sessions, production household\/listing data, or real invite tokens/i)
  })
})
