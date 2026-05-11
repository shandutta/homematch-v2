/**
 * @jest-environment node
 */

// Phase 0/1 closure: D6-db-reset-readiness
import { readFileSync } from 'fs'
import { join } from 'path'

const repoPath = (...parts: string[]) => join(process.cwd(), ...parts)
const readRepoFile = (relativePath: string) =>
  readFileSync(repoPath(relativePath), 'utf8')
const readRepoJson = (relativePath: string) =>
  JSON.parse(readRepoFile(relativePath))
const normalize = (value: string) =>
  value.replace(/\\\*/g, '*').replace(/\s+/g, ' ').trim()

describe('D10 DB integration execution environment policy', () => {
  const policy = readRepoJson('config/db-integration-execution-policy.json')
  const report = normalize(
    readRepoFile(
      'reports/home-match-revival/d10-db-integration-environment-guard-2026-05-08.md'
    )
  )
  const packageJson = readRepoJson('package.json')
  const scriptText = Object.entries(packageJson.scripts)
    .map(([name, command]) => `${name}: ${command}`)
    .join('\n')

  it('keeps DB reset execution fail-closed to approved local Supabase only', () => {
    expect(policy.scope).toBe('repo-local-db-integration-execution-policy')
    expect(policy.externalExecutionApprovalRequired).toBe(true)
    expect(policy.defaultState).toBe('static-only-until-approved-environment')
    expect(policy.requiredSignals.dbReset.allowedOnlyWhen).toEqual(
      expect.arrayContaining([
        expect.stringContaining('loopback/local'),
        expect.stringContaining(
          'Docker/local Supabase is intentionally approved'
        ),
        expect.stringContaining('scripts/dev-supabase-reset.js'),
        expect.stringContaining('no --db-url remote reset flag'),
      ])
    )
    expect(policy.requiredSignals.dbReset.mustNotRunWhen).toEqual(
      expect.arrayContaining([
        expect.stringContaining('hosted *.supabase.co'),
        expect.stringContaining('remote database'),
        expect.stringContaining('prohibits Docker'),
      ])
    )
    expect(scriptText).not.toMatch(/supabase\s+db\s+reset[^\n]*--db-url/i)
  })

  it('documents lint, rollback, and integration execution gates in repo evidence', () => {
    expect(report).toContain(
      'D10 is repo-side/static closed for environment execution criteria'
    )
    expect(report).toContain(
      'Allowed only as static migration-file review or against an approved disposable local/non-production project'
    )
    expect(report).toContain(
      'Allowed only against a disposable local database or approved non-production clone'
    )
    expect(report).toContain(
      'ALLOW_REMOTE_SUPABASE=true / SUPABASE_ALLOW_REMOTE=true is never sufficient production approval by itself'
    )
  })

  it('requires explicit environment evidence before integration closure', () => {
    expect(policy.requiredSignals.integrationSuite.allowedOnlyWhen).toEqual(
      expect.arrayContaining([
        expect.stringContaining('local Supabase plus local seeded test users'),
        expect.stringContaining(
          'non-production remote test path is explicitly approved'
        ),
        expect.stringContaining(
          'never treated as production approval by itself'
        ),
        expect.stringContaining('paid provider calls remain disabled'),
      ])
    )
    expect(policy.closureCriteria).toEqual(
      expect.arrayContaining([
        'D6 static reset-readiness guard remains green',
        'this policy guard remains green',
        expect.stringContaining('approved environment class'),
        expect.stringContaining('commands deliberately not run'),
      ])
    )
  })

  it('records commands that remain deliberately unrun in this bounded slice', () => {
    expect(report).toContain('No supabase db reset')
    expect(report).toContain('No Docker/Supabase local stack startup')
    expect(report).toContain(
      'No live Supabase or hosted *.supabase.co mutation'
    )
    expect(report).toContain(
      'No remote DB URL, paid API, deploy, dependency install, secret read/write, or real-user-data action'
    )
  })
})
