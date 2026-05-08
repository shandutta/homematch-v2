import { spawnSync } from 'child_process'
import * as fs from 'fs'
import * as path from 'path'

const scriptPath = path.join(
  process.cwd(),
  'scripts/run-local-seeded-auth-lifecycle.js'
)
const source = fs.readFileSync(scriptPath, 'utf8')

const runHarness = (
  envOverrides: Record<string, string | undefined> = {}
): { status: number | null; stdout: string; stderr: string } => {
  const hermeticEnv: Record<string, string> = {
    PATH: process.env.PATH || '',
    HOME: process.env.HOME || '',
  }
  for (const [key, value] of Object.entries(envOverrides)) {
    if (value === undefined) continue
    hermeticEnv[key] = value
  }

  const result = spawnSync(process.execPath, [scriptPath], {
    cwd: process.cwd(),
    env: hermeticEnv,
    encoding: 'utf8',
    timeout: 5000,
  })

  return {
    status: result.status,
    stdout: result.stdout || '',
    stderr: result.stderr || '',
  }
}

describe('run-local-seeded-auth-lifecycle wrapper readiness guards', () => {
  it('defaults missing prerequisites to skip instead of infrastructure startup or remote mutation', () => {
    expect(source).toContain('Safe default')
    expect(source).toContain('SKIP:')
    expect(source).toContain('process.exit(0)')
    expect(source).toContain('LOCAL_SEEDED_AUTH_LIFECYCLE_STRICT')
  })

  it('refuses non-local app and Supabase URLs before seeding users', () => {
    const supabaseGuardIndex = source.indexOf(
      'refusing non-local Supabase URL'
    )
    const appGuardIndex = source.indexOf('refusing non-local app URL')
    const seedIndex = source.indexOf('seed local Supabase test users')

    expect(supabaseGuardIndex).toBeGreaterThan(-1)
    expect(appGuardIndex).toBeGreaterThan(-1)
    expect(seedIndex).toBeGreaterThan(-1)
    expect(supabaseGuardIndex).toBeLessThan(seedIndex)
    expect(appGuardIndex).toBeLessThan(seedIndex)
  })

  it('checks for an existing local app and local Supabase before launching Playwright', () => {
    const appProbeIndex = source.indexOf('/api/health?expectTest=true')
    const supabaseProbeIndex = source.indexOf('/auth/v1/health')
    const playwrightIndex = source.indexOf('scripts/playwright-wrapper.js')

    expect(appProbeIndex).toBeGreaterThan(-1)
    expect(supabaseProbeIndex).toBeGreaterThan(-1)
    expect(playwrightIndex).toBeGreaterThan(-1)
    expect(appProbeIndex).toBeLessThan(playwrightIndex)
    expect(supabaseProbeIndex).toBeLessThan(playwrightIndex)
  })

  it('runs the lifecycle with a single worker against normalized loopback URLs', () => {
    expect(source).toContain("PLAYWRIGHT_WORKERS: '1'")
    expect(source).toContain('normalizeLocalhostUrl')
    expect(source).toContain("ALLOW_REMOTE_SUPABASE: 'false'")
    expect(source).toContain("SUPABASE_ALLOW_REMOTE: 'false'")
  })

  it('points operators at the documented seeded-user setup in skip/error output', () => {
    expect(source).toContain('SETUP_DOCS_HINT')
    expect(source).toContain('pnpm test:setup-users')
    expect(source).toContain('scripts/setup-test-users-admin.js')
    expect(source).toContain('docs/SETUP_GUIDE.md')
  })

  it('never interpolates secret-shaped env values into log output', () => {
    const sensitiveEnvVars = [
      'SUPABASE_SERVICE_ROLE_KEY',
      'SUPABASE_ANON_KEY',
      'NEXT_PUBLIC_SUPABASE_ANON_KEY',
      'TEST_USER_1_PASSWORD',
      'TEST_USER_2_PASSWORD',
      'TEST_USER_3_PASSWORD',
    ]
    for (const name of sensitiveEnvVars) {
      const interpolatedReadPattern = new RegExp(
        '\\$\\{[^}]*process\\.env\\.' + name + '[^}]*\\}'
      )
      const directReadPattern = new RegExp(
        'process\\.env\\.' + name + '[^A-Z_]'
      )
      expect(source).not.toMatch(interpolatedReadPattern)
      const directReads = source.match(directReadPattern) || []
      // The script may *check* SUPABASE_SERVICE_ROLE_KEY presence (truthy
      // guard) but must never log/print the value. The presence-check
      // appears as `env.SUPABASE_SERVICE_ROLE_KEY`, not in a log string.
      for (const occurrence of directReads) {
        expect(occurrence.startsWith('process.env.' + name)).toBe(true)
      }
    }
  })

  it('skips safely with exit 0 and a documented setup pointer when the local session is absent', () => {
    const result = runHarness({
      LOCAL_SUPABASE_URL: 'http://127.0.0.1:54200',
      BASE_URL: 'http://127.0.0.1:3000',
    })

    expect(result.status).toBe(0)
    expect(result.stdout).toContain('[local-seeded-auth-lifecycle] SKIP:')
    expect(result.stdout).toContain('SUPABASE_SERVICE_ROLE_KEY is absent')
    expect(result.stdout).toContain('pnpm test:setup-users')
    expect(result.stdout).toContain('docs/SETUP_GUIDE.md')

    const combined = `${result.stdout}\n${result.stderr}`
    // No JWT-shaped strings (Supabase keys are JWTs starting with "eyJ").
    expect(combined).not.toMatch(/\beyJ[A-Za-z0-9_-]{10,}/)
    // No leaked test password defaults.
    expect(combined).not.toContain('testpassword123')
    expect(combined).not.toContain('testpassword456')
    expect(combined).not.toContain('testpassword789')
  })

  it('exits non-zero in strict mode without leaking secret-shaped values', () => {
    const result = runHarness({
      LOCAL_SUPABASE_URL: 'http://127.0.0.1:54200',
      BASE_URL: 'http://127.0.0.1:3000',
      LOCAL_SEEDED_AUTH_LIFECYCLE_STRICT: 'true',
    })

    expect(result.status).toBe(1)
    expect(result.stderr).toContain('[local-seeded-auth-lifecycle] ERROR:')
    expect(result.stderr).toContain('pnpm test:setup-users')

    const combined = `${result.stdout}\n${result.stderr}`
    expect(combined).not.toMatch(/\beyJ[A-Za-z0-9_-]{10,}/)
  })
})
