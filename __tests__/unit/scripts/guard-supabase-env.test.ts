// Phase 0/1 closure: P0-local-dev-guard-bypass
import { mkdtempSync, mkdirSync, rmSync, writeFileSync } from 'fs'
import * as os from 'os'
import * as path from 'path'

import {
  evaluateSupabaseGuard,
  runGuard,
} from '../../../scripts/guard-supabase-env.js'

const createRoot = () => {
  const root = mkdtempSync(path.join(os.tmpdir(), 'homematch-guard-'))
  mkdirSync(path.join(root, 'config'), { recursive: true })
  writeFileSync(
    path.join(root, 'config', 'supabase-production-hosts.json'),
    JSON.stringify({ hosts: ['lpwlbbowavozpywnpamn.supabase.co'] })
  )
  return root
}

describe('Supabase env guard precision', () => {
  it('blocks the tracked non-secret production Supabase host when .env.prod is absent', () => {
    const root = createRoot()
    const logger = { log: jest.fn(), warn: jest.fn(), error: jest.fn() }
    const exit = jest.fn()

    runGuard({
      env: { SUPABASE_URL: 'https://lpwlbbowavozpywnpamn.supabase.co/rest/v1' },
      root,
      logger,
      exit,
    })

    expect(exit).toHaveBeenCalledWith(1)
    expect(logger.error.mock.calls.join('\n')).toContain('SUPABASE_URL_HOST')
    expect(logger.error.mock.calls.join('\n')).not.toContain(
      'https://lpwlbbowavozpywnpamn.supabase.co/rest/v1'
    )

    rmSync(root, { recursive: true, force: true })
  })

  it('allows SKIP_SUPABASE_GUARD=true from .env.local before checking production-looking hosts', () => {
    const root = createRoot()
    writeFileSync(
      path.join(root, '.env.local'),
      'SKIP_SUPABASE_GUARD=true\nSUPABASE_URL=https://lpwlbbowavozpywnpamn.supabase.co\n'
    )
    const logger = { log: jest.fn(), warn: jest.fn(), error: jest.fn() }
    const exit = jest.fn()

    runGuard({ env: {}, root, logger, exit })

    expect(exit).toHaveBeenCalledWith(0)
    expect(logger.log).toHaveBeenCalledWith(
      '⏩ Skipping Supabase env guard (SKIP_SUPABASE_GUARD=true)'
    )
    expect(logger.error).not.toHaveBeenCalled()

    rmSync(root, { recursive: true, force: true })
  })

  it('blocks real Supabase suffixes but not lookalike suffix-bypass domains', () => {
    const blocked = evaluateSupabaseGuard({
      env: { SUPABASE_URL: 'https://project.supabase.co' },
      prodEnv: {},
      productionHostsPath: '/tmp/no-such-production-hosts.json',
    })
    const allowed = evaluateSupabaseGuard({
      env: { SUPABASE_URL: 'https://project.supabase.co.evil.example' },
      prodEnv: {},
      productionHostsPath: '/tmp/no-such-production-hosts.json',
    })

    expect(blocked.blocked).toBe(true)
    expect(blocked.offenders).toContain('SUPABASE_HOST_PATTERN')
    expect(allowed.blocked).toBe(false)
  })

  it('allows documented local and dev-proxy hosts without secrets', () => {
    const result = evaluateSupabaseGuard({
      env: {
        SUPABASE_URL: 'http://127.0.0.1:54321',
        NEXT_PUBLIC_SUPABASE_URL: 'https://dev.homematch.pro',
        POSTGRES_HOST: 'localhost',
      },
      prodEnv: {},
      productionHostsPath: '/tmp/no-such-production-hosts.json',
    })

    expect(result.blocked).toBe(false)
  })

  it('emits offender categories only and never raw env values when secrets look like production', () => {
    const root = createRoot()

    // Synthetic non-real secret-shaped values. They must never reach logger output.
    const fakeAnonKey =
      'sb_anon_REDACTION_TEST_VALUE_aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa'
    const fakeServiceRoleKey =
      'sb_service_role_REDACTION_TEST_VALUE_bbbbbbbbbbbbbbbbbbbbbbbb'
    const fakePostgresPassword =
      'pg_password_REDACTION_TEST_VALUE_cccccccccccccccccccccccc'
    const productionHost = 'lpwlbbowavozpywnpamn.supabase.co'

    writeFileSync(
      path.join(root, '.env.prod'),
      [
        `SUPABASE_URL=https://${productionHost}`,
        `NEXT_PUBLIC_SUPABASE_URL=https://${productionHost}`,
        `SUPABASE_ANON_KEY=${fakeAnonKey}`,
        `NEXT_PUBLIC_SUPABASE_ANON_KEY=${fakeAnonKey}`,
        `SUPABASE_SERVICE_ROLE_KEY=${fakeServiceRoleKey}`,
        `POSTGRES_HOST=${productionHost}`,
        '',
      ].join('\n')
    )

    const logger = { log: jest.fn(), warn: jest.fn(), error: jest.fn() }
    const exit = jest.fn()

    runGuard({
      env: {
        SUPABASE_URL: `https://${productionHost}`,
        NEXT_PUBLIC_SUPABASE_URL: `https://${productionHost}`,
        SUPABASE_ANON_KEY: fakeAnonKey,
        NEXT_PUBLIC_SUPABASE_ANON_KEY: fakeAnonKey,
        SUPABASE_SERVICE_ROLE_KEY: fakeServiceRoleKey,
        POSTGRES_HOST: productionHost,
        POSTGRES_URL: `postgresql://postgres:${fakePostgresPassword}@${productionHost}:5432/postgres`,
      },
      root,
      logger,
      exit,
    })

    expect(exit).toHaveBeenCalledWith(1)

    const allOutput = [
      ...logger.error.mock.calls,
      ...logger.warn.mock.calls,
      ...logger.log.mock.calls,
    ]
      .flat()
      .map((arg) => (typeof arg === 'string' ? arg : JSON.stringify(arg)))
      .join('\n')

    // Category-style offenders (key names + synthetic categories) ARE emitted.
    expect(allOutput).toContain('SUPABASE_ANON_KEY')
    expect(allOutput).toContain('SUPABASE_SERVICE_ROLE_KEY')
    expect(allOutput).toContain('SUPABASE_URL_HOST')
    expect(allOutput).toContain('SUPABASE_HOST_PATTERN')

    // Raw secret values, passwords, and full URLs MUST NEVER appear in diagnostics.
    expect(allOutput).not.toContain(fakeAnonKey)
    expect(allOutput).not.toContain(fakeServiceRoleKey)
    expect(allOutput).not.toContain(fakePostgresPassword)
    expect(allOutput).not.toContain(`postgresql://postgres:`)
    expect(allOutput).not.toContain(`https://${productionHost}`)
    // The bare hostname is permitted only via category labels; the guard must
    // not echo it as a standalone diagnostic value. Escape ALL regex
    // metacharacters (including \) before interpolating into a RegExp — the
    // .replace(/\./g) we used before tripped the CodeQL "Incomplete string
    // escaping" alert because backslashes / other metas weren't handled.
    const escapeRegex = (s: string) => s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
    expect(allOutput).not.toMatch(
      new RegExp(`(^|[^A-Z_])${escapeRegex(productionHost)}`)
    )

    rmSync(root, { recursive: true, force: true })
  })
})
