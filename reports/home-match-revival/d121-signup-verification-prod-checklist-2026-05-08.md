# D121 Signup Verification Production Checklist

Generated: 2026-05-08
Scope: repo-local mapping artifact only. No Supabase dashboard mutation, no Vercel/Google/CAPTCHA-provider calls, no production env or secret mutation, no live signup, no real email, no browser swarms, no paid APIs, no deploys.
Parent artifacts:

- `reports/home-match-revival/d3-signup-verification-policy-decision-2026-05-08.md`
- `reports/home-match-revival/d3-signup-verification-repo-invariant-guard-2026-05-08.md`
- `config/signup-verification-launch-policy.json`

## Purpose

D3 closed the policy decision (production email/password signup requires email confirmation plus CAPTCHA, with Google OAuth relying on provider-side abuse controls for Phase 0/1). This checklist freezes the boundary between what the repo already guards locally and what still must be verified externally before public launch. It is a pre-flight map, not an execution plan: every external item below stays approval-gated and out of scope for repo work.

## Repo-side guards already in place

- `config/signup-verification-launch-policy.json`: machine-readable launch policy. `production.emailPasswordSignup.emailConfirmationRequired = true`, `captchaRequired = true`, `preferredCaptchaProvider = "turnstile"`, `preVerificationSessionAllowed = false`; local/E2E permits bypass only with `inbucket`/`mailpit` capture and `externalCaptchaCallsAllowed = false`.
- `reports/home-match-revival/d3-signup-verification-repo-invariant-guard-2026-05-08.md`: invariant guard stating that `supabase/config.toml` is local-development only and not production-policy evidence.
- `reports/home-match-revival/d3-signup-verification-policy-decision-2026-05-08.md`: Option A decision recorded; lists post-signup `/verify-email` flow, no-pre-verification-session rule, and Turnstile preference.
- `__tests__/unit/auth/signup-verification-policy-invariants.test.ts`: static guard pinning the policy invariants and their cross-references.
- `src/components/features/auth/SignupForm.tsx`: already sends `emailRedirectTo`, surfaces a verification state, links to `/verify-email`, and supports resend.
- `src/components/features/auth/VerifyEmailForm.tsx`: `/verify-email` verifies a 6-digit OTP and only redirects when Supabase returns a session (no pre-verification access).
- Protected-route middleware: keeps `/dashboard`, `/profile`, `/settings`, `/couples`, `/properties`, `/household`, `/validation` gated on a verified session.

## External settings still requiring verification before launch

Each item below is approval-gated. The repo cannot close these; they need a human-driven, dashboard-side check. Mark each "Verified" only after a screenshot or written confirmation is attached out-of-band.

### Supabase project (production)

- [ ] Auth → Email provider: `Confirm email` is enabled (production equivalent of `auth.email.enable_confirmations = true`).
- [ ] Auth → Email provider: `Secure email change` and `Secure password change` review consistent with the no-pre-verification-session rule.
- [ ] Auth → URL configuration: Site URL and additional redirect URLs match the production domain set used by `emailRedirectTo` in `SignupForm.tsx`. No localhost/dev URLs in the production allow list.
- [ ] Auth → Attack protection / CAPTCHA: provider set to `Turnstile` (preferred per D3); production CAPTCHA secret stored only in Supabase project settings, not in the repo.
- [ ] Auth → Attack protection: rate limits for sign-up, sign-in, OTP, and email send reviewed against the D2 rate-limit posture and not left at unbounded defaults.
- [ ] Auth → Email templates: Confirm signup template links resolve to the production `/verify-email` route and use the production sender identity (no Inbucket/Mailpit host).
- [ ] Auth → Providers → Google: client ID/secret present, redirect URI matches production, and provider-side abuse controls relied on for Phase 0/1 are documented.
- [ ] Auth → Sessions: no policy override that grants an authenticated app session before the email is confirmed.
- [ ] Auth → Logs: signup, confirmation, and CAPTCHA-failure events visible and retained long enough for the launch-week observation window.

### CAPTCHA provider (Cloudflare Turnstile)

- [ ] Turnstile site exists for the production domain only; sitekey is the value Supabase Auth is configured to challenge.
- [ ] Turnstile secret is stored exclusively in Supabase Auth project settings; never committed, never logged, never echoed in this repo.
- [ ] Local and E2E environments do not call Turnstile; they continue to honor `localAndE2E.externalCaptchaCallsAllowed = false` in `config/signup-verification-launch-policy.json`.

### Email deliverability

- [ ] Production SMTP/sender configured at the Supabase project level (not via local Inbucket/Mailpit).
- [ ] SPF, DKIM, and DMARC validated for the sending domain so confirmation mail does not silently land in spam.
- [ ] A real human has received and clicked one production confirmation email end-to-end before public launch (recorded out-of-band).

### Application environment

- [ ] Production `NEXT_PUBLIC_SUPABASE_URL` and `NEXT_PUBLIC_SUPABASE_ANON_KEY` point at the production project, not a preview or local one.
- [ ] No build of the production bundle ships a Turnstile or CAPTCHA bypass flag, test-only header, or seeded-user shortcut from the local/E2E lane.
- [ ] Vercel (or hosting equivalent) production environment variables match `config/supabase-production-hosts.json` expectations and do not include local Supabase hosts.

### Observability and abuse response

- [ ] Sentry/PostHog dashboards have a saved view for signup failures, verification failures, and CAPTCHA-blocked attempts.
- [ ] On-call has a written response for a Turnstile outage (e.g., temporary signup pause vs. provider failover) decided before launch, not during an incident.

## Out of scope for this artifact

- Implementing any of the above settings.
- Mutating Supabase, Vercel, Google, Cloudflare, or any external dashboard.
- Provisioning or rotating CAPTCHA, SMTP, or OAuth secrets.
- Running live signup, real email, or browser-swarm verification.
- Phase 2+ work (account recovery hardening, MFA enrollment policy, abuse heuristics tuning).

## Closure rule

This checklist closes only when every external box above is marked Verified by a human with screenshots or a written confirmation attached out-of-band. Until then, repo-side D3 guards remain authoritative for what the codebase asserts, and production launch of public email/password signup stays blocked on this checklist.
