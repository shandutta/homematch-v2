# D3 Signup Verification Launch-Policy Readiness Checklist

Generated: 2026-05-08T17:38Z
Scope: repo-local launch-policy readiness evidence only. No Supabase dashboard mutation, no CAPTCHA-provider provisioning, no production secret/env mutation, no real email, no live signup, no browser swarms, no paid APIs, no external dashboards.

## Purpose

This artifact consolidates the repo-local evidence that public production email/password signup must launch with email confirmation plus CAPTCHA, and that local/E2E bypass remains explicit, local-sink-only, and impossible to confuse with production. It is a launch-decision aid for the owner-approval gate; it does not authorize external execution.

## Production launch invariants (must all be true before launch)

1. Email confirmation is required for public production email/password signup.
2. CAPTCHA is required for public production email/password signup, with Cloudflare Turnstile as the preferred provider.
3. A pre-verification app session is not allowed: a signup may create an auth user record, but it must not grant access to protected app routes before email verification.
4. Local and E2E bypasses are valid only for local Supabase plus local email capture (Inbucket or Mailpit) and must never call an external CAPTCHA provider.
5. External execution (Supabase dashboard mutation, CAPTCHA provider provisioning, real email, paid API, production env, real user data) remains approval-gated and out of scope for repo-local closure.

## Repo-local readiness evidence

- `config/signup-verification-launch-policy.json` is the machine-readable launch-policy guard. It records `production.emailPasswordSignup.emailConfirmationRequired = true`, `production.emailPasswordSignup.captchaRequired = true`, `production.emailPasswordSignup.preferredCaptchaProvider = "turnstile"`, and `production.emailPasswordSignup.preVerificationSessionAllowed = false`. It also records `localAndE2E.bypassAllowed = true`, `localAndE2E.allowedEmailCapture = ["inbucket", "mailpit"]`, and `localAndE2E.externalCaptchaCallsAllowed = false`. The `nonGoals` array explicitly disallows Supabase dashboard mutation, CAPTCHA provider provisioning, production secret/env mutation, and live signup or real email execution.
- `reports/home-match-revival/d3-signup-verification-policy-decision-2026-05-08.md` is the underlying decision: production must require email confirmation and CAPTCHA for public email/password signup, and local/E2E bypasses must be impossible to confuse with production.
- `reports/home-match-revival/d3-signup-verification-repo-invariant-guard-2026-05-08.md` is the repo-side invariant narrative tying the machine-readable guard, the policy decision, and the local-only `supabase/config.toml` posture together.
- `supabase/config.toml` is local-development configuration only. Its current `auth.email.enable_confirmations = false` and commented `# [auth.captcha]` block are the local-bypass posture, not production launch evidence.
- `src/components/features/auth/SignupForm.tsx` aligns with invariant 3: on a successful `supabase.auth.signUp(...)` it sets a local `success` state and renders a verification-required card with a `/verify-email` link and a resend control. It does not call `router.push`, `router.replace`, or otherwise route to any protected app surface (e.g. `/dashboard`, `/profile`, `/settings`, `/couples`, `/properties`, `/household`, `/validation`) on signup success, so a Supabase response without a session cannot grant pre-verification protected access through this form.
- `src/components/features/auth/VerifyEmailForm.tsx` aligns with invariant 3: it calls `supabase.auth.verifyOtp(...)` for `type: 'signup'`, then re-checks `supabase.auth.getSession()` if no session was returned, and only calls `router.replace(nextPath)` when a session is present. When no session is returned, it shows the explicit "Email verified. You can now sign in with your password." state instead of granting access.
- `__tests__/unit/auth/signup-verification-policy-invariants.test.ts` statically guards (a) the production-vs-local distinction in the policy decision and the repo-invariant report, (b) the local-only posture of `supabase/config.toml`, (c) the machine-readable launch-policy JSON shape and values, (d) this readiness checklist, and (e) the `SignupForm`/`VerifyEmailForm` code-level alignment with invariant 3.

## Local and E2E bypass posture (test-only, must stay impossible to confuse with production)

- Bypass is allowed only against local Supabase, with email capture limited to `inbucket` or `mailpit` and no external CAPTCHA calls.
- Seeded already-confirmed local test users (per `scripts/setup-test-users-admin.js`) remain the right path for login/session/protected-route/logout closure tests.
- A signup-verification E2E must use local email capture and a unique local test email; it must not exercise any real CAPTCHA provider.
- `NEXT_PUBLIC_TEST_MODE` is the existing client-side test-mode flag in `SignupForm` and `VerifyEmailForm`. It only relaxes client-side validity gating to avoid disabled-submit flakiness in the harness. It does not bypass Supabase email confirmation or CAPTCHA.

## External handoffs that remain approval-gated (out of repo-local scope)

- Confirm production email confirmation is on in the external Supabase project settings or dashboard.
- Provision and enable Cloudflare Turnstile (or hCaptcha if explicitly chosen) for public email/password signup, plus resend-verification and reset-password if the same challenge path applies cleanly.
- Verify Google OAuth abuse controls and signup rate limits are acceptable for Phase 0/1.
- Run a signup-verification live execution only against a local Supabase/Inbucket or an explicitly approved non-production safeguarded test path.

## Launch readiness checklist

- [x] Repo-local machine-readable launch-policy guard exists and is statically verified.
- [x] Repo-local invariant narrative exists and is statically verified.
- [x] Repo-local production-vs-local distinction is statically verified against `supabase/config.toml`.
- [x] Repo-local signup/verify code is statically verified to deny pre-verification protected access.
- [x] Repo-local readiness checklist (this file) is statically verified.
- [ ] External Supabase dashboard / project settings: email confirmation enabled. (owner/ops, approval-gated)
- [ ] External CAPTCHA provider provisioned and enabled for public email/password signup. (owner/ops, approval-gated)
- [ ] Approved local Supabase/Inbucket or safeguarded non-production test path for closure-grade signup-verification E2E. (owner/ops, approval-gated)

## Non-goals

- This does not change Supabase dashboard or project settings.
- This does not provision, enable, or call any CAPTCHA provider.
- This does not run live signup, real email, browser swarms, or any external service verification.
- This does not introduce a production-side bypass path. Local/E2E bypasses remain test-only and local-sink-only.
