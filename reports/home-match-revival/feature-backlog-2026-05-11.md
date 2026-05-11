# Feature backlog — items moved out of audit remediation

Date: 2026-05-11

This file collects items that originated in the full-app audit
(`reports/home-match-revival/audit-2026-05-11/full-app-audit-and-remediation-plan-2026-05-11.md`)
but are too large or infrastructure-dependent to land as cosmetic fixes.
Each entry should become its own product spec / plan before implementation.

## F1 — Contact form + Turnstile spam protection

**Audit origin:** Section 4, L7 ("Contact page email-only"). The audit suggested
adding a contact form with Turnstile spam protection. Verified on
`src/app/contact/page.tsx`: the page currently surfaces only `mailto:`
links to `privacy@homematch.pro` and `legal@homematch.pro` plus links to
the privacy / terms / cookies policy pages.

**Why this isn't a cosmetic fix:**

- Requires a Turnstile (or hCaptcha / reCAPTCHA) site key + secret in env
- Requires a form submission backend (Edge Function, API route, or third-party
  mailer like Resend / Postmark / Loops)
- Requires DLQ / observability for submissions so legitimate inquiries are not
  silently dropped
- Requires anti-abuse rate limiting at the API edge (Vercel firewall rule or
  Supabase Edge Function with KV-based limiter)
- Requires legal sign-off on what fields are collected (PII implications for
  the privacy policy and DPA)

**Scope (when prioritized):**

- `/contact` UI: keep the existing email/policy panels, add a form panel above
  with: name (optional), email (required), subject (select), message (textarea),
  Turnstile widget, submit button + loading + success + error states
- Server: API route `POST /api/contact/submit` that verifies Turnstile token,
  rate-limits by IP, forwards via transactional mail to the right inbox based
  on `subject` (support → support@, privacy → privacy@, legal → legal@)
- Observability: log submissions to Supabase or a webhook so we don't lose mail
  if the transactional provider fails
- Tests: unit tests for the Turnstile verifier, e2e for the happy path + a
  spam path (missing token → 400)

**Effort estimate:** 1-2 days end-to-end including dashboard inbox + tests.

**Dependencies:**

- Turnstile keys (sitekey + secret) provisioned in Vercel and pulled in via
  `TURNSTILE_SITE_KEY` / `TURNSTILE_SECRET_KEY`
- Decision on transactional mail provider (Resend recommended; aligns with
  the rest of the auth email flow if we ever move off Supabase email)

**Acceptance:**

- A real human can fill in the form on mobile + desktop and gets a success
  toast; the team receives a routed email within ~1 minute
- A no-JS user sees a graceful fallback (server-side rendered form posts to
  the same endpoint; Turnstile is optional in that path or replaced with
  `/cdn-cgi/turnstile/v0/challenge` no-script flow)
- Submissions appear in observability (Supabase table or log drain)
- Rate-limit triggers a 429 with a polite retry-after on repeated abuse

---

_Add new items below this line as future audits surface features that don't_
_belong in a cosmetic-fix sprint._
