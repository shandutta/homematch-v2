import { readFileSync } from 'fs'
import * as path from 'path'

const readRepoFile = (relativePath: string) =>
  readFileSync(path.join(process.cwd(), relativePath), 'utf8')

const normalize = (value: string) => value.replace(/\s+/g, ' ').trim()

describe('D3 signup verification repo-side invariants', () => {
  const policy = normalize(
    readRepoFile(
      'reports/home-match-revival/d3-signup-verification-policy-decision-2026-05-08.md'
    )
  )
  const repoGuard = normalize(
    readRepoFile(
      'reports/home-match-revival/d3-signup-verification-repo-invariant-guard-2026-05-08.md'
    )
  )
  const supabaseConfig = readRepoFile('supabase/config.toml')

  it('keeps production email confirmation and CAPTCHA distinct from local/E2E bypasses', () => {
    expect(policy).toContain(
      'production must require email confirmation and CAPTCHA for public email/password signup'
    )
    expect(policy).toContain(
      'Local and E2E test environments may use explicit bypasses, but the bypasses must be impossible to confuse with production'
    )
    expect(supabaseConfig).toContain('enable_confirmations = false')
    expect(supabaseConfig).toContain('# [auth.captcha]')

    expect(repoGuard).toContain(
      'supabase/config.toml is local-development configuration only and is not production-policy evidence'
    )
    expect(repoGuard).toContain(
      'Production email/password signup must not launch with email confirmations disabled or CAPTCHA absent'
    )
    expect(repoGuard).toContain(
      'Local and E2E bypasses are valid only for local Supabase plus local email capture'
    )
  })

  it('keeps external signup-verification execution approval-gated', () => {
    expect(repoGuard).toContain(
      'External execution remains approval-gated: no Supabase dashboard, Vercel, Google, CAPTCHA provider, real email, paid API, production env, or real-user-data action may run without explicit human approval'
    )
    expect(repoGuard).toContain(
      'Closure-grade E2E execution requires an approved local Supabase/Inbucket or safeguarded non-production test path before any live signup verification flow runs'
    )
  })
})
