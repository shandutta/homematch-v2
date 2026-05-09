// Phase 0/1 closure: D3-signup-verification
import { readFileSync } from 'fs'
import * as path from 'path'

const readRepoFile = (relativePath: string) =>
  readFileSync(path.join(process.cwd(), relativePath), 'utf8')

const readRepoJson = (relativePath: string) =>
  JSON.parse(readRepoFile(relativePath))

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
  const readinessChecklist = normalize(
    readRepoFile(
      'reports/home-match-revival/d3-signup-verification-launch-policy-readiness-2026-05-08.md'
    )
  )
  const launchPolicy = readRepoJson(
    'config/signup-verification-launch-policy.json'
  )
  const supabaseConfig = readRepoFile('supabase/config.toml')
  const signupForm = readRepoFile('src/components/features/auth/SignupForm.tsx')
  const verifyEmailForm = readRepoFile(
    'src/components/features/auth/VerifyEmailForm.tsx'
  )

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

  it('keeps the machine-readable launch policy fail-closed for production signup', () => {
    expect(launchPolicy.scope).toBe('repo-local-launch-policy-guard')
    expect(launchPolicy.externalExecutionApprovalRequired).toBe(true)
    expect(launchPolicy.production.emailPasswordSignup).toEqual({
      emailConfirmationRequired: true,
      captchaRequired: true,
      preferredCaptchaProvider: 'turnstile',
      preVerificationSessionAllowed: false,
    })
    expect(launchPolicy.localAndE2E.bypassAllowed).toBe(true)
    expect(launchPolicy.localAndE2E.allowedEmailCapture).toEqual(
      expect.arrayContaining(['inbucket', 'mailpit'])
    )
    expect(launchPolicy.localAndE2E.externalCaptchaCallsAllowed).toBe(false)
  })

  it('preserves the launch-policy non-goals against external execution', () => {
    expect(Array.isArray(launchPolicy.nonGoals)).toBe(true)
    expect(launchPolicy.nonGoals).toEqual(
      expect.arrayContaining([
        'No Supabase dashboard mutation',
        'No CAPTCHA provider provisioning',
        'No production secret or environment mutation',
        'No live signup or real email execution',
      ])
    )
  })

  it('keeps the launch-policy readiness checklist consistent with the production invariants', () => {
    expect(readinessChecklist).toContain(
      'Email confirmation is required for public production email/password signup'
    )
    expect(readinessChecklist).toContain(
      'CAPTCHA is required for public production email/password signup, with Cloudflare Turnstile as the preferred provider'
    )
    expect(readinessChecklist).toContain(
      'A pre-verification app session is not allowed'
    )
    expect(readinessChecklist).toContain(
      'Local and E2E bypasses are valid only for local Supabase plus local email capture (Inbucket or Mailpit) and must never call an external CAPTCHA provider'
    )
    expect(readinessChecklist).toContain(
      'External execution (Supabase dashboard mutation, CAPTCHA provider provisioning, real email, paid API, production env, real user data) remains approval-gated'
    )
    expect(readinessChecklist).toContain(
      'External Supabase dashboard / project settings: email confirmation enabled. (owner/ops, approval-gated)'
    )
    expect(readinessChecklist).toContain(
      'External CAPTCHA provider provisioned and enabled for public email/password signup. (owner/ops, approval-gated)'
    )
  })

  it('keeps SignupForm.tsx aligned with the no-pre-verification-session invariant', () => {
    expect(signupForm).toContain('supabase.auth.signUp')
    expect(signupForm).toContain('setSuccess(true)')
    expect(signupForm).toContain('/verify-email')
    expect(signupForm).not.toMatch(/router\.(push|replace)\(/)
  })

  it('keeps VerifyEmailForm.tsx gating the post-verification redirect on a Supabase session', () => {
    expect(verifyEmailForm).toContain("type: 'signup'")
    expect(verifyEmailForm).toContain('supabase.auth.verifyOtp')
    expect(verifyEmailForm).toContain('supabase.auth.getSession()')
    expect(verifyEmailForm).toContain('if (session) {')
    expect(verifyEmailForm).toContain('router.replace(nextPath)')
    expect(verifyEmailForm).toContain(
      'Email verified. You can now sign in with your password.'
    )
  })
})
