# D3 Signup Verification Policy Decision

Generated: 2026-05-08T08:49:17Z
Scope: decision artifact only. No dashboard changes, no Supabase config mutation, no code changes, no external services used.
Parent artifact: `reports/home-match-revival/p0-p1-credentialless-auth-lifecycle-verification-plan-2026-05-08.md`

## Decision

Adopt option A from the D3 register: production must require email confirmation and CAPTCHA for public email/password signup. Local and E2E test environments may use explicit bypasses, but the bypasses must be impossible to confuse with production.

This closes the policy decision for D3. Implementation remains a separate repo/config task.

## Production policy

1. Email confirmation: required for email/password signup.
   - Production Supabase auth should set `auth.email.enable_confirmations = true` or the dashboard equivalent.
   - Signup should send the user to the existing post-signup verification state and `/verify-email` flow.
   - Unverified email/password users must not be treated as authenticated app users.

2. Session before verification: not allowed for email/password signup.
   - A signup may create an auth user record, but it should not create an app session that can enter protected routes before verification.
   - Protected-route middleware stays the enforcement boundary: `/dashboard`, `/profile`, `/settings`, `/couples`, `/properties`, `/household`, and `/validation` remain unavailable until a verified session exists.
   - If Supabase returns no session after `verifyOtp`, `/verify-email` should show the existing “you can now sign in” state instead of granting access.

3. CAPTCHA: required for public production email/password signup.
   - Preferred provider: Cloudflare Turnstile, because it is lower-friction than hCaptcha and fits a consumer signup surface.
   - Apply CAPTCHA to email/password signup at minimum. Extend to resend-verification and reset-password if Supabase/project configuration supports the same challenge path cleanly.
   - Google OAuth can rely on provider-side abuse controls for Phase 0/1, but should still be rate-limited and monitored.

## Local and automated test policy

1. Seeded auth lifecycle tests may continue to bypass signup.
   - `scripts/setup-test-users-admin.js` is the right path for login/session/protected-route/logout closure tests.
   - Seeded users should be created as already confirmed local test users, then used for the P0/P1 lifecycle smoke.

2. Signup verification E2E must use local email capture, not real email.
   - Run against local Supabase only.
   - Enable local email confirmation for the signup-verification test profile.
   - Enable Supabase’s local email sink, preferably Inbucket from `supabase/config.toml`, or Mailpit if the team standardizes on it.
   - The E2E flow should create a unique local test email, submit `/signup`, fetch the confirmation email/code from the local sink, complete `/verify-email`, then prove the post-verification session policy: either protected access if Supabase returns a session, or successful login followed by protected access if it does not.

3. CAPTCHA is disabled or test-bypassed locally.
   - Local Playwright should not call Turnstile/hCaptcha or any paid/external CAPTCHA service.
   - The test harness should use a clear test-only flag or local config override.
   - Add a static/config assertion in the implementation task so production cannot launch with both `auth.email.enable_confirmations = false` and CAPTCHA disabled.

## Acceptance criteria for the implementation task

- Production policy is represented in Supabase config/dashboard runbook: email confirmation on, CAPTCHA on for public signup.
- Local seeded lifecycle tests still work without external email or CAPTCHA.
- Signup verification E2E captures the email/code from local Inbucket/Mailpit only.
- No production or real-user data is mutated by tests.
- Closure matrix D3 can move from “decision-needed” to “decided, implementation pending” after this artifact is linked.

## Evidence used

- `supabase/config.toml`: current local config has `auth.email.enable_confirmations = false`, CAPTCHA commented out, and Inbucket present but disabled.
- `src/components/features/auth/SignupForm.tsx`: signup already sends `emailRedirectTo`, shows a verification state, links to `/verify-email`, and supports resend verification.
- `src/components/features/auth/VerifyEmailForm.tsx`: `/verify-email` verifies a 6-digit signup OTP and redirects only when a session exists.
- `reports/home-match-revival/p1-decision-needed-register-2026-05-08.md`: D3 asks for production email confirmation and signup CAPTCHA policy closure.
- `reports/home-match-revival/p0-p1-credentialless-auth-lifecycle-verification-plan-2026-05-08.md`: signup/verify E2E remains policy-gated and should use local email capture or an approved non-production workflow.
