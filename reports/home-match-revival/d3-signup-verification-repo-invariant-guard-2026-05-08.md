# D3 Signup Verification Repo-Side Invariant Guard

Generated: 2026-05-08T10:48Z
Scope: repo-local assertion only. No Supabase dashboard changes, Vercel changes, Google changes, CAPTCHA-provider calls, paid APIs, production env mutation, browser swarms, Docker, real email, or real user data were used.

## Guarded invariant

supabase/config.toml is local-development configuration only and is not production-policy evidence. Its current local values (`auth.email.enable_confirmations = false` and commented `auth.captcha`) are allowed only as local/test bypass posture and must not be read as approval for production signup behavior.

Production email/password signup must not launch with email confirmations disabled or CAPTCHA absent. The D3 policy decision remains: production requires email confirmation plus CAPTCHA for public email/password signup, while Google OAuth can rely on provider-side abuse controls for Phase 0/1 subject to rate limiting and monitoring.

Local and E2E bypasses are valid only for local Supabase plus local email capture, such as Inbucket/Mailpit, or for seeded already-confirmed local test users. Any bypass flag, local config override, seeded-user path, or email-sink path is test-only and must stay impossible to confuse with the production policy.

## External execution approval gate

External execution remains approval-gated: no Supabase dashboard, Vercel, Google, CAPTCHA provider, real email, paid API, production env, or real-user-data action may run without explicit human approval.

Closure-grade E2E execution requires an approved local Supabase/Inbucket or safeguarded non-production test path before any live signup verification flow runs. Until that environment is approved and available, repo-local closure is limited to static guards, docs, and tests.

## Evidence

- `reports/home-match-revival/d3-signup-verification-policy-decision-2026-05-08.md` decides that production must require email confirmation and CAPTCHA for public email/password signup and that local/E2E bypasses must be impossible to confuse with production.
- `supabase/config.toml` is the local Supabase config: email confirmations are disabled locally and CAPTCHA remains commented.
- `__tests__/unit/auth/signup-verification-policy-invariants.test.ts` statically guards this report, the D3 policy artifact, and the local config distinction.

## Non-goals

- This does not implement production Supabase dashboard settings.
- This does not configure a CAPTCHA provider or secrets.
- This does not run live signup, email, browser, or external-service verification.
