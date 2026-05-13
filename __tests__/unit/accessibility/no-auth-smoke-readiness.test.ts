// Phase 0/1 closure: P0-noauth-traversal-guard
import * as fs from 'node:fs'
import * as path from 'node:path'
import { isProtectedPath } from '../../../src/lib/routing/protected-routes'

const repoRoot = process.cwd()

const matrixPath = path.join(
  repoRoot,
  'reports/home-match-revival/accessibility-core-flow-matrix.md'
)
const e2eSpecPath = path.join(
  repoRoot,
  '__tests__/e2e/no-auth-public-accessibility.spec.ts'
)
const playwrightConfigPath = path.join(
  repoRoot,
  'playwright.no-auth-accessibility.config.ts'
)
const reconciliationReportPath = path.join(
  repoRoot,
  'reports/home-match-revival/no-auth-public-accessibility-smoke.md'
)

const matrix = fs.readFileSync(matrixPath, 'utf8')
const e2eSpec = fs.readFileSync(e2eSpecPath, 'utf8')
const playwrightConfig = fs.readFileSync(playwrightConfigPath, 'utf8')
const reconciliationReport = fs.readFileSync(reconciliationReportPath, 'utf8')

// /verify-email, /reset-password, /auth/auth-code-error retired in
// Phase 4 of the Supabase-auth elimination (2026-05-13) — Clerk owns
// those flows on its hosted pages.
const publicNoCredentialRoutes = [
  '/',
  '/about',
  '/contact',
  '/login',
  '/signup',
  '/terms',
  '/privacy',
  '/cookies',
] as const

const protectedAnonymousRedirectRoutes = [
  '/dashboard',
  '/dashboard/liked',
  '/profile',
  '/settings',
  '/household/create',
  '/household/join',
  '/couples',
  '/couples/decisions',
] as const

describe('no-credential accessibility smoke readiness', () => {
  it('keeps the bounded e2e harness and Playwright config files present without claiming a live pass', () => {
    expect(fs.existsSync(e2eSpecPath)).toBe(true)
    expect(fs.existsSync(playwrightConfigPath)).toBe(true)
    expect(fs.existsSync(reconciliationReportPath)).toBe(true)
  })

  it('enumerates every matrix public/no-credential route inside the bounded e2e spec', () => {
    for (const route of publicNoCredentialRoutes) {
      expect(matrix).toContain(`\`${route}\``)
      expect(e2eSpec).toMatch(new RegExp(`path:\\s*'${route}'`))
    }
  })

  it('keeps anonymous protected-redirect coverage aligned with isProtectedPath', () => {
    for (const route of protectedAnonymousRedirectRoutes) {
      expect(e2eSpec).toContain(`'${route}'`)
      expect(isProtectedPath(route)).toBe(true)
    }
  })

  it('keeps the e2e spec strictly anonymous and forbids carrying browser credentials', () => {
    expect(e2eSpec).toContain('storageState: { cookies: [], origins: [] }')
    expect(e2eSpec).not.toMatch(/SUPABASE_SERVICE_ROLE_KEY/)
    expect(e2eSpec).not.toMatch(/process\.env\.[A-Z_]*PASSWORD/)
    expect(e2eSpec).not.toMatch(/process\.env\.[A-Z_]*SESSION/)
  })

  it('keeps the Playwright config locked to local loopback with non-production placeholder credentials', () => {
    expect(playwrightConfig).toContain('127.0.0.1')
    expect(playwrightConfig).toContain('NEXT_PUBLIC_TEST_MODE')
    expect(playwrightConfig).toContain('NEXT_PUBLIC_SUPABASE_ANON_KEY')
    expect(playwrightConfig).toContain('no-credential-smoke-key')
    expect(playwrightConfig).not.toMatch(/SUPABASE_SERVICE_ROLE_KEY/)
    expect(playwrightConfig).not.toMatch(/sk_live_/)
    expect(playwrightConfig).not.toMatch(/eyJ[A-Za-z0-9_-]{20,}/)
  })

  it('keeps live/browser execution evidence explicitly gated and skippable in the reconciliation report', () => {
    expect(reconciliationReport).toMatch(
      /Harness is functional and committed|Live run reveals real accessibility gaps/i
    )
    expect(reconciliationReport).toContain('No credentials')
    expect(reconciliationReport).toMatch(
      /Harness is functional and committed|Live run reveals real accessibility gaps/i
    )
  })

  it('keeps the matrix advertising readiness for no-credential smoke without claiming a live pass', () => {
    expect(matrix).toContain('Ready for no-credential')
    expect(matrix).toContain(
      'Browser swarms are explicitly out of scope for this slice.'
    )
    expect(matrix).toContain(
      'Blocked until approved non-production test auth/session'
    )
  })
})
