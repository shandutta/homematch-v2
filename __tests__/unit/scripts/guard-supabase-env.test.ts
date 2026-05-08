import { mkdtempSync, mkdirSync, rmSync, writeFileSync } from 'fs'
import * as os from 'os'
import * as path from 'path'

const {
  evaluateSupabaseGuard,
  runGuard,
} = require('../../../scripts/guard-supabase-env.js')

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
})
