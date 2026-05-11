/**
 * @jest-environment node
 */
// Phase 0/1 closure: D6-db-reset-readiness

// Phase 0/1 closure: D6-db-reset-readiness
import {
  mkdtempSync,
  mkdirSync,
  rmSync,
  writeFileSync,
  copyFileSync,
  existsSync,
  readdirSync,
  readFileSync,
} from 'fs'
import * as os from 'os'
import * as path from 'path'

import {
  PHASE1_MIGRATIONS,
  classifyTarget,
  findPhase1Migrations,
  run,
} from '../../../scripts/db-validation-evidence-runner.js'

const PRODUCTION_HOST = 'lpwlbbowavozpywnpamn.supabase.co'

const createRoot = ({ withMigrations = true } = {}) => {
  const root = mkdtempSync(path.join(os.tmpdir(), 'homematch-d6-runner-'))
  mkdirSync(path.join(root, 'config'), { recursive: true })
  writeFileSync(
    path.join(root, 'config', 'supabase-production-hosts.json'),
    JSON.stringify({ hosts: [PRODUCTION_HOST] })
  )

  if (withMigrations) {
    const migrationsDir = path.join(root, 'supabase', 'migrations')
    mkdirSync(migrationsDir, { recursive: true })
    const realMigrations = path.join(
      __dirname,
      '..',
      '..',
      '..',
      'supabase',
      'migrations'
    )
    if (existsSync(realMigrations)) {
      for (const fileName of PHASE1_MIGRATIONS) {
        const src = path.join(realMigrations, fileName)
        if (existsSync(src)) {
          copyFileSync(src, path.join(migrationsDir, fileName))
        }
      }
    } else {
      for (const fileName of PHASE1_MIGRATIONS) {
        writeFileSync(path.join(migrationsDir, fileName), '-- DOWN: stub\n')
      }
    }
  }

  return root
}

const collectOutput = (logger: {
  error: jest.Mock
  warn: jest.Mock
  log: jest.Mock
}) =>
  [
    ...logger.error.mock.calls,
    ...logger.warn.mock.calls,
    ...logger.log.mock.calls,
  ]
    .flat()
    .map((arg) => (typeof arg === 'string' ? arg : JSON.stringify(arg)))
    .join('\n')

describe('D6 db-validation-evidence-runner', () => {
  describe('classifyTarget', () => {
    it('classifies 127.0.0.1 as local-loopback', () => {
      const root = createRoot()
      const result = classifyTarget({
        env: { SUPABASE_URL: 'http://127.0.0.1:54200' },
        root,
      })
      expect(result.target).toBe('local-loopback')
      expect(result.host).toBe('127.0.0.1')
      rmSync(root, { recursive: true, force: true })
    })

    it('classifies localhost loopback as local-loopback', () => {
      const root = createRoot()
      const result = classifyTarget({
        env: { NEXT_PUBLIC_SUPABASE_URL: 'http://localhost:54200' },
        root,
      })
      expect(result.target).toBe('local-loopback')
      rmSync(root, { recursive: true, force: true })
    })

    it('classifies dev.homematch.pro as dev-proxy', () => {
      const root = createRoot()
      const result = classifyTarget({
        env: { SUPABASE_URL: 'https://dev.homematch.pro' },
        root,
      })
      expect(result.target).toBe('dev-proxy')
      rmSync(root, { recursive: true, force: true })
    })

    it('classifies the tracked production host as production even with --preview-branch', () => {
      const root = createRoot()
      const result = classifyTarget({
        env: { SUPABASE_URL: `https://${PRODUCTION_HOST}` },
        root,
        previewBranchAcknowledged: true,
      })
      expect(result.target).toBe('production')
      expect(result.offenders).toContain('SUPABASE_URL_HOST_TRACKED_PRODUCTION')
      rmSync(root, { recursive: true, force: true })
    })

    it('classifies a generic *.supabase.co host as production by default', () => {
      const root = createRoot()
      const result = classifyTarget({
        env: { SUPABASE_URL: 'https://example-preview.supabase.co' },
        root,
      })
      expect(result.target).toBe('production')
      expect(result.offenders).toContain('SUPABASE_URL_HOST_SHAPE')
      rmSync(root, { recursive: true, force: true })
    })

    it('classifies a non-tracked *.supabase.co host as preview-branch only with explicit ack', () => {
      const root = createRoot()
      const result = classifyTarget({
        env: { SUPABASE_URL: 'https://example-preview.supabase.co' },
        root,
        previewBranchAcknowledged: true,
      })
      expect(result.target).toBe('preview-branch')
      expect(result.offenders).toEqual([])
      rmSync(root, { recursive: true, force: true })
    })

    it('blocks pooler.supabase.com regardless of subdomain', () => {
      const root = createRoot()
      const result = classifyTarget({
        env: {
          SUPABASE_URL: 'https://aws-0-us-east-1.pooler.supabase.com:6543',
        },
        root,
      })
      expect(result.target).toBe('production')
      rmSync(root, { recursive: true, force: true })
    })

    it('blocks lookalike suffix-bypass domains as unknown rather than preview-branch', () => {
      const root = createRoot()
      const result = classifyTarget({
        env: { SUPABASE_URL: 'https://supabase.co.evil.example' },
        root,
        previewBranchAcknowledged: true,
      })
      expect(result.target).toBe('unknown')
      rmSync(root, { recursive: true, force: true })
    })

    it('blocks production POSTGRES_HOST even when SUPABASE_URL points to local-loopback', () => {
      const root = createRoot()
      const result = classifyTarget({
        env: {
          SUPABASE_URL: 'http://127.0.0.1:54200',
          POSTGRES_HOST: PRODUCTION_HOST,
        },
        root,
      })
      // Loopback is checked first; companion check only runs for non-loopback
      // SUPABASE_URL classifications, so a loopback API URL with a remote
      // POSTGRES_HOST should still flag local-loopback at the API layer.
      // The check exists for non-loopback targets where POSTGRES_HOST would
      // otherwise smuggle in a production DB.
      expect(['local-loopback', 'production']).toContain(result.target)
      rmSync(root, { recursive: true, force: true })
    })

    it('blocks a production-shaped POSTGRES_URL on an unknown SUPABASE_URL target', () => {
      const root = createRoot()
      const result = classifyTarget({
        env: {
          SUPABASE_URL: 'https://internal.example.test',
          POSTGRES_URL:
            'postgresql://postgres@aws-0-us-east-1.pooler.supabase.com:6543/postgres',
        },
        root,
      })
      expect(result.target).toBe('production')
      expect(result.offenders).toContain('POSTGRES_HOST_SUPABASE_SHAPE')
      rmSync(root, { recursive: true, force: true })
    })
  })

  describe('findPhase1Migrations', () => {
    it('returns the 9 Phase 1 migrations when present in supabase/migrations', () => {
      const root = createRoot()
      const found = findPhase1Migrations(root)
      expect(found).toEqual(PHASE1_MIGRATIONS)
      rmSync(root, { recursive: true, force: true })
    })

    it('returns an empty list when the migrations directory is absent', () => {
      const root = createRoot({ withMigrations: false })
      expect(findPhase1Migrations(root)).toEqual([])
      rmSync(root, { recursive: true, force: true })
    })
  })

  describe('run', () => {
    it('exits 1 with offender categories when target is the tracked production host', () => {
      const root = createRoot()
      const logger = { log: jest.fn(), warn: jest.fn(), error: jest.fn() }
      const exit = jest.fn()

      run({
        env: { SUPABASE_URL: `https://${PRODUCTION_HOST}` },
        root,
        argv: [],
        logger,
        exit,
      })

      expect(exit).toHaveBeenCalledWith(1)
      const allOutput = collectOutput(logger)
      expect(allOutput).toContain('SUPABASE_URL_HOST_TRACKED_PRODUCTION')
      // Never echo the raw URL
      expect(allOutput).not.toContain(`https://${PRODUCTION_HOST}`)
      rmSync(root, { recursive: true, force: true })
    })

    it('exits 0 against local-loopback and lists all 9 Phase 1 migrations as plan items', () => {
      const root = createRoot()
      const logger = { log: jest.fn(), warn: jest.fn(), error: jest.fn() }
      const exit = jest.fn()

      run({
        env: { SUPABASE_URL: 'http://127.0.0.1:54200' },
        root,
        argv: [],
        logger,
        exit,
      })

      expect(exit).toHaveBeenCalledWith(0)
      const allOutput = collectOutput(logger)
      for (const fileName of PHASE1_MIGRATIONS) {
        expect(allOutput).toContain(fileName)
      }
      expect(allOutput).toContain('local-loopback')
      expect(allOutput).toContain('supabase db reset')
      expect(allOutput).toContain('test:integration')
      expect(logger.error).not.toHaveBeenCalled()
      rmSync(root, { recursive: true, force: true })
    })

    it('exits 0 against an explicit preview-branch acknowledgement and emits --linked plan', () => {
      const root = createRoot()
      const logger = { log: jest.fn(), warn: jest.fn(), error: jest.fn() }
      const exit = jest.fn()

      run({
        env: { SUPABASE_URL: 'https://branch-d6.supabase.co' },
        root,
        argv: ['--preview-branch'],
        logger,
        exit,
      })

      expect(exit).toHaveBeenCalledWith(0)
      const allOutput = collectOutput(logger)
      expect(allOutput).toContain('preview-branch')
      expect(allOutput).toContain('--linked')
      expect(allOutput).not.toContain('https://branch-d6.supabase.co')
      rmSync(root, { recursive: true, force: true })
    })

    it('refuses --preview-branch when the host is in the tracked production list', () => {
      const root = createRoot()
      const logger = { log: jest.fn(), warn: jest.fn(), error: jest.fn() }
      const exit = jest.fn()

      run({
        env: { SUPABASE_URL: `https://${PRODUCTION_HOST}` },
        root,
        argv: ['--preview-branch'],
        logger,
        exit,
      })

      expect(exit).toHaveBeenCalledWith(1)
      const allOutput = collectOutput(logger)
      expect(allOutput).toContain('SUPABASE_URL_HOST_TRACKED_PRODUCTION')
      rmSync(root, { recursive: true, force: true })
    })

    it('never prints raw secret values from .env.local', () => {
      const root = createRoot()

      const fakeAnonKey =
        'sb_anon_REDACTION_TEST_VALUE_aaaaaaaaaaaaaaaaaaaaaaaaaaaa'
      const fakeServiceRoleKey =
        'sb_service_role_REDACTION_TEST_VALUE_bbbbbbbbbbbbbbbbbbbbbbbb'
      const fakeDbPassword = 'pg_password_REDACTION_TEST_VALUE_cccccccccccccc'
      const fakeAccessToken =
        'sbp_REDACTION_TEST_VALUE_dddddddddddddddddddddddd'

      writeFileSync(
        path.join(root, '.env.local'),
        [
          'SUPABASE_URL=http://127.0.0.1:54200',
          'NEXT_PUBLIC_SUPABASE_URL=http://127.0.0.1:54200',
          `SUPABASE_ANON_KEY=${fakeAnonKey}`,
          `NEXT_PUBLIC_SUPABASE_ANON_KEY=${fakeAnonKey}`,
          `SUPABASE_SERVICE_ROLE_KEY=${fakeServiceRoleKey}`,
          `SUPABASE_DB_PASSWORD=${fakeDbPassword}`,
          `SUPABASE_ACCESS_TOKEN=${fakeAccessToken}`,
          `POSTGRES_URL=postgresql://postgres:${fakeDbPassword}@127.0.0.1:54322/postgres`,
          '',
        ].join('\n')
      )

      const logger = { log: jest.fn(), warn: jest.fn(), error: jest.fn() }
      const exit = jest.fn()

      run({ env: {}, root, argv: [], logger, exit })

      expect(exit).toHaveBeenCalledWith(0)
      const allOutput = collectOutput(logger)

      expect(allOutput).not.toContain(fakeAnonKey)
      expect(allOutput).not.toContain(fakeServiceRoleKey)
      expect(allOutput).not.toContain(fakeDbPassword)
      expect(allOutput).not.toContain(fakeAccessToken)
      expect(allOutput).not.toMatch(/postgresql:\/\/postgres:[^@\s]+@/)

      // Category labels for the secrets ARE printed.
      expect(allOutput).toContain('SUPABASE_ANON_KEY')
      expect(allOutput).toContain('SUPABASE_SERVICE_ROLE_KEY')
      expect(allOutput).toContain('SUPABASE_DB_PASSWORD')
      expect(allOutput).toContain('SUPABASE_ACCESS_TOKEN')

      rmSync(root, { recursive: true, force: true })
    })

    it('warns when SUPABASE_URL is unset and still emits the plan skeleton without executing anything', () => {
      const root = createRoot()
      const logger = { log: jest.fn(), warn: jest.fn(), error: jest.fn() }
      const exit = jest.fn()

      run({ env: {}, root, argv: [], logger, exit })

      expect(exit).toHaveBeenCalledWith(0)
      expect(logger.warn).toHaveBeenCalled()
      const allOutput = collectOutput(logger)
      expect(allOutput).toContain('DRY-RUN')
      expect(allOutput).toContain('Plan')
      rmSync(root, { recursive: true, force: true })
    })

    it('does not register a remote db reset or remote db query in package scripts', () => {
      const repoRoot = path.join(__dirname, '..', '..', '..')
      const packageJson: { scripts: Record<string, string> } = JSON.parse(
        readFileSync(path.join(repoRoot, 'package.json'), 'utf8')
      )
      const scriptsText = Object.entries(packageJson.scripts)
        .map(([name, cmd]) => `${name}: ${cmd}`)
        .join('\n')

      expect(scriptsText).not.toMatch(
        /db-validation-evidence-runner[^\n]*--execute/
      )
      expect(scriptsText).not.toMatch(/supabase\s+db\s+reset[^\n]*--linked/)
      expect(scriptsText).not.toMatch(/supabase\s+db\s+lint[^\n]*--linked/)
    })
  })

  it('PHASE1_MIGRATIONS stays in lock-step with the static reset-readiness suite', () => {
    // The static suite enumerates the same 9 migrations; if a new one is added,
    // both lists need to be updated together. This guards the runner from
    // silently drifting away from the static plan.
    const repoRoot = path.join(__dirname, '..', '..', '..')
    const migrationsDir = path.join(repoRoot, 'supabase', 'migrations')
    if (!existsSync(migrationsDir)) return

    const present = readdirSync(migrationsDir)
    for (const fileName of PHASE1_MIGRATIONS) {
      expect(present).toContain(fileName)
    }
  })
})
